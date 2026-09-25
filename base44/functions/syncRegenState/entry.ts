/**
 * syncRegenState — Calculates and applies regen on-demand (no deltas).
 * Called by client when entering inventory pages to ensure fresh regen state.
 * 
 * Server-side regen math:
 * - Energy: +1 per 3 min
 * - Stamina: +1 per 3 min
 * - Op Cover: +1 per 3 min
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REGEN_INTERVAL_MS = 180000; // 3 minutes

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch current profile
  const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
  if (profiles.length === 0) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  const profile = profiles[0];
  const now = Date.now();

  const update = {};

  // --- Daily reset check ---
  // If the server date has changed since last_daily_reset, zero out all
  // daily counters so the player gets fresh limits for the new day.
  const todayStr = new Date().toISOString().split('T')[0];
  if (profile.last_daily_reset !== todayStr) {
    update.trades_completed_today = 0;
    update.jobs_completed_today = 0;
    update.trade_wars_won_today = 0;
    update.last_daily_reset = todayStr;
  }

  // Calculate regen for each resource
  // IMPORTANT: If lastTimestamp is null/0/missing, skip regen entirely — no basis to calculate from.
  const calcRegen = (currentValue, lastTimestamp) => {
    if (!lastTimestamp) return { value: currentValue || 0, newTimestamp: null };
    const elapsed = now - lastTimestamp;
    if (elapsed < 0) return { value: currentValue || 0, newTimestamp: now };
    const gained = Math.min(100 - (currentValue || 0), Math.floor(elapsed / REGEN_INTERVAL_MS));
    const newValue = Math.min(100, (currentValue || 0) + Math.max(0, gained));
    // Advance timestamp to the precise regen tick boundary — prevents double-counting
    // on the next call (client or server) since elapsed resets from the new baseline.
    const newTimestamp = (currentValue || 0) + gained >= 100 ? now : lastTimestamp + (gained * REGEN_INTERVAL_MS);
    return { value: newValue, newTimestamp: gained > 0 ? newTimestamp : null };
  };

  const energyResult = calcRegen(profile.energy, profile.last_energy_timestamp);
  const staminaResult = calcRegen(profile.stamina, profile.last_stamina_timestamp);
  const opCoverResult = calcRegen(profile.op_cover, profile.last_op_cover_timestamp);

  if (energyResult.value !== profile.energy) {
    update.energy = energyResult.value;
    if (energyResult.newTimestamp) update.last_energy_timestamp = energyResult.newTimestamp;
  }
  if (staminaResult.value !== profile.stamina) {
    update.stamina = staminaResult.value;
    if (staminaResult.newTimestamp) update.last_stamina_timestamp = staminaResult.newTimestamp;
  }
  if (opCoverResult.value !== profile.op_cover) {
    update.op_cover = opCoverResult.value;
    if (opCoverResult.newTimestamp) update.last_op_cover_timestamp = opCoverResult.newTimestamp;
  }

  if (Object.keys(update).length > 0) {
    await base44.asServiceRole.entities.PlayerProfile.update(profile.id, update);
  }

  // Return fresh authoritative values WITH updated timestamps
  return Response.json({
    success: true,
    energy: update.energy ?? profile.energy,
    stamina: update.stamina ?? profile.stamina,
    op_cover: update.op_cover ?? profile.op_cover,
    last_energy_timestamp: update.last_energy_timestamp ?? profile.last_energy_timestamp,
    last_stamina_timestamp: update.last_stamina_timestamp ?? profile.last_stamina_timestamp,
    last_op_cover_timestamp: update.last_op_cover_timestamp ?? profile.last_op_cover_timestamp,
    trades_completed_today: update.trades_completed_today ?? profile.trades_completed_today ?? 0,
    jobs_completed_today: update.jobs_completed_today ?? profile.jobs_completed_today ?? 0,
    trade_wars_won_today: update.trade_wars_won_today ?? profile.trade_wars_won_today ?? 0,
  });
});