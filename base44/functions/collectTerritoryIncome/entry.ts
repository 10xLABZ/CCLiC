import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const getSlotPayout = (slot) => {
  if (slot === 1) return 10;
  if (slot === 2) return 8;
  if (slot === 3) return 6;
  if (slot <= 9) return 5;
  if (slot <= 19) return 4;
  if (slot <= 29) return 3;
  if (slot <= 39) return 2;
  return 1;
};

// Daily rate = hourly * 24
const getSlotDailyPayout = (slot) => getSlotPayout(slot) * 24;

// Get today's date string in America/New_York (ET) timezone
const getETDateString = (ms) => {
  const d = ms ? new Date(ms) : new Date();
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [, month, day, year] = etStr.match(/(\d+)\/(\d+)\/(\d+)/);
  return `${year}-${month}-${day}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find ALL territory slots this user holds (across all buildings) using service role
    // to avoid RLS issues and ensure atomic reads
    const allSlots = await base44.asServiceRole.entities.TerritorySlot.filter({ user_id: user.id });
    if (!allSlots || allSlots.length === 0) {
      return Response.json({ error: 'No territories held', claimed: 0, alreadyClaimed: false });
    }

    // Push-off validation: only pay for valid slots (1-50), deduplicated by building+city+slot.
    // Stale/orphan/duplicate records (slot 51+, or duplicates from old push-off bugs) are excluded.
    const validSlots = allSlots.filter(s => s.slot_number >= 1 && s.slot_number <= 50);
    const slotMap = new Map();
    const slotPriority = (s) =>
      (!s.user_id?.startsWith('bot_') && !s.user_id?.startsWith('nemesis_') && !s.user_id?.startsWith('gen_') ? 2
       : s.user_id?.startsWith('nemesis_') ? 1 : 0);
    for (const slot of validSlots) {
      const key = `${slot.building_id}|${slot.city}|${slot.state}|${slot.slot_number}`;
      const existing = slotMap.get(key);
      if (!existing) { slotMap.set(key, slot); continue; }
      const sp = slotPriority(slot), ep = slotPriority(existing);
      if (sp > ep || (sp === ep && (slot.updated_date || '') > (existing.updated_date || ''))) {
        slotMap.set(key, slot);
      }
    }
    const payableSlots = Array.from(slotMap.values());

    if (payableSlots.length === 0) {
      return Response.json({ error: 'No valid territories held', claimed: 0, alreadyClaimed: false });
    }

    // Check if already claimed today (ET timezone) — server-authoritative idempotency lock
    const todayStr = getETDateString();
    const territoryClaimKey = `territory_daily_${todayStr}`;

    // SystemMessage lock — same pattern as VIP and event rewards, prevents double-claim across devices
    const existingClaim = await base44.asServiceRole.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: territoryClaimKey,
    });

    if (existingClaim.length > 0) {
      const dailyTotal = payableSlots.reduce((sum, slot) => sum + getSlotDailyPayout(slot.slot_number), 0);
      return Response.json({ error: 'Already claimed today', claimed: 0, alreadyClaimed: true, dailyTotal });
    }

    // Also check legacy last_payout_at timestamps (defense in depth)
    const alreadyClaimed = payableSlots.some(slot => {
      if (!slot.last_payout_at) return false;
      return getETDateString(slot.last_payout_at) === todayStr;
    });

    if (alreadyClaimed) {
      const dailyTotal = payableSlots.reduce((sum, slot) => sum + getSlotDailyPayout(slot.slot_number), 0);
      return Response.json({ error: 'Already claimed today', claimed: 0, alreadyClaimed: true, dailyTotal });
    }

    // Calculate total daily payout from validated slots only
    const now = Date.now();
    const totalDaily = payableSlots.reduce((sum, slot) => sum + getSlotDailyPayout(slot.slot_number), 0);

    // Add cash to player profile ATOMICALLY using service role (server is source of truth)
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    let newCash = null;
    if (profiles[0]) {
      const currentCash = profiles[0].cash || 0;
      newCash = Math.round((currentCash + totalDaily) * 100) / 100;
      await base44.asServiceRole.entities.PlayerProfile.update(profiles[0].id, {
        cash: newCash
      });
    }

    // Mark all payable slots as claimed for today
    await Promise.all(payableSlots.map(slot =>
      base44.asServiceRole.entities.TerritorySlot.update(slot.id, { last_payout_at: now })
    ));

    // Create server-side idempotency lock — prevents double-claim across devices
    await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'reward_claimed',
      title: 'Territory daily income claimed',
      body: `Claimed territory income (${territoryClaimKey})`,
      item_id: territoryClaimKey,
      item_name: 'territory_daily',
      category: 'territory_daily',
      is_consumable: false,
      restored: false,
      timestamp: now,
      meta: JSON.stringify({ claimed_at: new Date().toISOString(), slots: payableSlots.length }),
    });

    return Response.json({
      message: 'Territory income claimed',
      claimed: totalDaily,
      alreadyClaimed: false,
      dailyTotal: totalDaily,
      new_cash: newCash,
      slots: payableSlots.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});