import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Nemesis Bot Challenger — Targeted, Gradual Power Growth System
 * All processing done in-memory from a single DB fetch to avoid rate limits.
 *
 * FOR PRODUCTION: Change CHALLENGE_MIN_MS and CHALLENGE_MAX_MS to:
 *   24 * 60 * 60 * 1000  and  48 * 60 * 60 * 1000
 */

const CHALLENGE_MIN_MS = 24 * 60 * 60 * 1000;  // 24 hours
const CHALLENGE_MAX_MS = 48 * 60 * 60 * 1000;  // 48 hours
const MAX_NBs_PER_HUMAN = 3;

const randomMs = () => CHALLENGE_MIN_MS + Math.random() * (CHALLENGE_MAX_MS - CHALLENGE_MIN_MS);

// Random 1%–15% overshoot per challenge cycle (re-rolled each time)
const getOverFactor = () => 1.01 + Math.random() * 0.14;

const resolveFight = (nbPower, defenderPower) => {
  const total = nbPower + defenderPower;
  const winChance = Math.max(0.42, Math.min(0.90, nbPower / total));
  return Math.random() < winChance;
};

// NB = has is_nemesis flag true; Human = not nemesis and not a bot_ user
const isNemesis = (slot) => slot.is_nemesis === true;
const isHuman   = (slot) => !slot.is_nemesis && slot.user_id && !slot.user_id.startsWith('bot_');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const now = Date.now();
    // Fetch only mayors_office slots — sorted oldest first so older human slots aren't cut off
    const allSlots = await base44.asServiceRole.entities.TerritorySlot.filter({ building_id: 'mayors_office' }, 'created_date', 20000);

    // Reset stuck NBs: those with challenge_target_user_id set but challenge_ready_at is null or very old (>24h)
    const stuckNBs = allSlots.filter(s =>
      isNemesis(s) &&
      s.challenge_target_user_id &&
      (!s.challenge_ready_at || s.challenge_ready_at < now - 24 * 60 * 60 * 1000)
    );
    for (const nb of stuckNBs) {
      await base44.asServiceRole.entities.TerritorySlot.update(nb.id, {
        challenge_target_user_id: null,
        challenge_start_at: null,
        challenge_ready_at: null,
        target_player_power: null,
        initial_nb_power: null,
      });
      nb.challenge_target_user_id = null; // update in-memory too
      await new Promise(r => setTimeout(r, 80));
    }

    const humanSlots = allSlots.filter(s => isHuman(s));
    const allIdleNBs = allSlots.filter(s => isNemesis(s) && !s.challenge_target_user_id);

    // Debug: show all non-bot, non-nemesis slots so we can see if player is in there
    const allPossibleHumans = allSlots.filter(s => !s.is_nemesis && s.user_id);
    console.log('[DEBUG] total MO slots:', allSlots.length);
    console.log('[DEBUG] humanSlots found:', humanSlots.map(s => `${s.username}@${s.city}#${s.slot_number} uid=${s.user_id}`));
    console.log('[DEBUG] allPossibleHumans (non-nemesis):', allPossibleHumans.map(s => `${s.username}@${s.city}#${s.slot_number} uid=${s.user_id} isNemesis=${s.is_nemesis}`));
    console.log('[DEBUG] idleNBs count:', allIdleNBs.length);

    const assignedNBIds = new Set();

    const summary = { activated: 0, growing: 0, challenged: 0, won: 0, skipped: 0 };
    const results = [];
    const updates = []; // collect all DB updates, apply sequentially at end

    // ── PHASE A: Activate idle NBs for each human player ─────────────────────
    for (const human of humanSlots) {
      // Find NBs in same city below this human, or any idle global NB
      // Only use NBs in the SAME city/state/building — never relocate across cities
      const candidates = allIdleNBs
        .filter(nb => !assignedNBIds.has(nb.id) &&
          nb.city === human.city &&
          nb.state === human.state &&
          nb.building_id === human.building_id &&
          nb.slot_number > human.slot_number
        )
        .sort((a, b) => a.slot_number - b.slot_number)
        .slice(0, MAX_NBs_PER_HUMAN);

      for (const nb of candidates) {
        assignedNBIds.add(nb.id);
        const humanPower  = human.player_power || 50;
        const overFactor  = getOverFactor();
        const calculatedTarget = Math.round(humanPower * overFactor * 100) / 100;
        // Never throttle NB down — if already stronger, keep current power as the target
        const targetPower = Math.max(nb.player_power || 10, calculatedTarget);
        const readyAt     = now + randomMs();

        const nbUpdate = {
          challenge_target_user_id: human.user_id,
          challenge_start_at:       now,
          challenge_ready_at:       readyAt,
          target_player_power:      targetPower,
          initial_nb_power:         nb.player_power || 10,
        };
        // Relocate to human's city if from different group
        // No relocation — NBs stay in their own city always

        updates.push({ id: nb.id, data: nbUpdate });
        summary.activated++;
        results.push({ nb: nb.username, action: `activated → targeting ${human.username} (slot #${human.slot_number}), ready in ${Math.round((readyAt - now)/1000)}s, target power ${targetPower}` });
      }
    }

    // ── PHASE B & C: Handle NBs already in an active cycle ───────────────────
    const activeNBs = allSlots.filter(s => isNemesis(s) && s.challenge_target_user_id && !assignedNBIds.has(s.id));

    for (const nb of activeNBs) {
      // Phase B: interpolate power if timer still running
      if (now < nb.challenge_ready_at) {
        const elapsed  = now - nb.challenge_start_at;
        const total    = nb.challenge_ready_at - nb.challenge_start_at;
        const progress = total > 0 ? Math.min(1, elapsed / total) : 1;
        const initial  = nb.initial_nb_power || nb.player_power || 10;
        const target   = nb.target_player_power || initial;
        const interpolatedPower = Math.round((initial + (target - initial) * progress) * 100) / 100;

        if (Math.abs(interpolatedPower - (nb.player_power || 0)) > 0.01) {
          updates.push({ id: nb.id, data: { player_power: interpolatedPower } });
        }
        summary.growing++;
        continue;
      }

      // Phase C: timer elapsed — execute challenge
      if (nb.slot_number <= 1) { summary.skipped++; continue; }

      const targetSlotNum = nb.slot_number - 1;
      // Find the occupant of the slot above in the same city
      const targetSlot = allSlots.find(s =>
        s.slot_number === targetSlotNum &&
        s.city === nb.city &&
        s.state === nb.state &&
        s.building_id === nb.building_id &&
        s.id !== nb.id
      );

      // Don't fight another nemesis
      if (targetSlot && isNemesis(targetSlot)) { summary.skipped++; continue; }

      const nbFinalPower  = nb.target_player_power || nb.player_power || 10;
      const defenderPower = targetSlot ? (targetSlot.player_power || 50) : 1;
      const didWin        = !targetSlot || resolveFight(nbFinalPower, defenderPower);
      const nextTimer     = now + randomMs();
      const clearCycle    = { challenge_target_user_id: null, challenge_start_at: null, challenge_ready_at: null, target_player_power: null, initial_nb_power: null, next_victory_at: nextTimer };

      summary.challenged++;

      if (didWin) {
        updates.push({ id: nb.id, data: { slot_number: targetSlotNum, player_power: nbFinalPower, bot_wins: (nb.bot_wins || 0) + 1, ...clearCycle } });
        if (targetSlot) {
          updates.push({ id: targetSlot.id, data: { slot_number: nb.slot_number } });
        }
        summary.won++;
        results.push({ nb: nb.username, action: `WON vs ${targetSlot?.username ?? 'empty'} → moved to slot #${targetSlotNum}` });
      } else {
        updates.push({ id: nb.id, data: { player_power: nbFinalPower, bot_losses: (nb.bot_losses || 0) + 1, ...clearCycle } });
        results.push({ nb: nb.username, action: `LOST to ${targetSlot?.username} at slot #${targetSlotNum}` });
      }

      // Log to TerritoryBattleLog
      updates.push({ entity: 'TerritoryBattleLog', create: {
        building_id:                  nb.building_id,
        city:                         nb.city,
        state:                        nb.state,
        challenger_user_id:           nb.user_id,
        challenger_username:          nb.username,
        challenger_profile_image_url: nb.profile_image_url || '',
        challenger_slot:              nb.slot_number,
        defender_user_id:             targetSlot && isHuman(targetSlot) ? targetSlot.user_id : null,
        defender_username:            targetSlot?.username ?? '',
        defender_slot:                targetSlotNum,
        outcome:                      didWin ? 'WIN' : 'LOSS',
        timestamp:                    now,
      }});
    }

    // ── Apply all DB updates sequentially (rate-limit friendly) ──────────────
    for (const u of updates) {
      if (u.entity === 'TerritoryBattleLog') {
        await base44.asServiceRole.entities.TerritoryBattleLog.create(u.create);
      } else {
        await base44.asServiceRole.entities.TerritorySlot.update(u.id, u.data);
      }
      await new Promise(r => setTimeout(r, 120));
    }

    return Response.json({
      success: true,
      timer_config: `${CHALLENGE_MIN_MS / 3600000}–${CHALLENGE_MAX_MS / 3600000} hours (PRODUCTION)`,
      debug: { totalSlots: allSlots.length, humanCount: humanSlots.length, idleNBCount: allIdleNBs.length, humans: humanSlots.map(s => `${s.username}@${s.city}#${s.slot_number}`), idleNBs: allIdleNBs.map(s => `${s.username}@${s.city}#${s.slot_number}`) },
      summary,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});