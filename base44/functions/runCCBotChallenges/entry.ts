import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PERM_BOT_IDS = new Set(['permbot_mnb_001']);

const CC_REFERENCE = new Date('2026-03-30T04:00:00Z').getTime();
const CC_CYCLE     = 7 * 24 * 60 * 60 * 1000;
const CC_DURATION  = 5 * 24 * 60 * 60 * 1000;

// Sable's growth: +0.05% per day, level +1 every 28 days
// Stored in her CapitalClashSlot DB record — no localStorage
const SABLE_DAILY_GROWTH = 0.0005;
const SABLE_LEVEL_INTERVAL_DAYS = 28;
const SABLE_BASE_ATK = 2376.18;
const SABLE_BASE_DEF = 1238.49;
const SABLE_BASE_LEVEL = 48;
const SABLE_FIRST_DAY = new Date('2026-03-30T04:00:00Z').getTime(); // reference start

function getCurrentCCStart() {
  const now = Date.now();
  let start = CC_REFERENCE;
  while (start + CC_CYCLE <= now) start += CC_CYCLE;
  return start;
}

function isActiveCycle(cycleStart) {
  const now = Date.now();
  return now >= cycleStart && now < cycleStart + CC_DURATION;
}

// Compute Sable's grown stats based on days since her first appearance
function computeSableGrowth() {
  const now = Date.now();
  const daysSinceStart = (now - SABLE_FIRST_DAY) / (24 * 60 * 60 * 1000);
  const growthFactor = Math.pow(1 + SABLE_DAILY_GROWTH, daysSinceStart);
  const atk = Math.round(SABLE_BASE_ATK * growthFactor * 100) / 100;
  const def = Math.round(SABLE_BASE_DEF * growthFactor * 100) / 100;
  const level = SABLE_BASE_LEVEL + Math.floor(daysSinceStart / SABLE_LEVEL_INTERVAL_DAYS);
  return { atk, def, level };
}

// HP-based battle sim — power difference dominates, ±3% variance only
function simulateHPBattle(aAtk, aDef, bAtk, bDef) {
  let aHP = Math.max(5, Math.round(aDef * 2 + aAtk));
  let bHP = Math.max(5, Math.round(bDef * 2 + bAtk));
  for (let i = 0; i < 60 && aHP > 0 && bHP > 0; i++) {
    const aVar = (Math.random() * 0.06 - 0.03) * aAtk;
    const bVar = (Math.random() * 0.06 - 0.03) * bAtk;
    bHP -= Math.max(0.5, aAtk - bDef * 0.5 + aVar);
    if (bHP <= 0) break;
    aHP -= Math.max(0.5, bAtk - aAtk * 0.5 + bVar);
  }
  return aHP > bHP;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // cycleStart can be passed explicitly (client) or computed server-side (automation)
    let cycleStart;
    try {
      const body = await req.json();
      cycleStart = body?.cycleStart || getCurrentCCStart();
    } catch {
      cycleStart = getCurrentCCStart();
    }

    if (!isActiveCycle(cycleStart)) {
      return Response.json({ success: true, skipped: true, reason: 'CC not active' });
    }

    // Fetch all DB slots for this cycle
    const allSlots = await base44.asServiceRole.entities.CapitalClashSlot.filter({ cycle_start: cycleStart });

    // Update Sable's grown stats in the DB every run (server-authoritative growth)
    const sableGrowth = computeSableGrowth();
    for (const s of allSlots) {
      if (PERM_BOT_IDS.has(s.user_id)) {
        await base44.asServiceRole.entities.CapitalClashSlot.update(s.id, {
          atk: sableGrowth.atk,
          def: sableGrowth.def,
          player_level: sableGrowth.level,
        });
        s.atk = sableGrowth.atk;
        s.def = sableGrowth.def;
        s.player_level = sableGrowth.level;
      }
    }

    const updates = [];
    const log = [];
    const challengeEvents = [];

    // Sable challenges the nearest human ABOVE her (lower slot number = higher rank).
    // On Sable WIN:  Sable swaps up to human's slot, human drops to Sable's old slot.
    // On Sable LOSS: No position change. Human successfully defended.
    const permBotSlots = allSlots
      .filter(s => PERM_BOT_IDS.has(s.user_id))
      .sort((a, b) => a.slot_number - b.slot_number);

    for (const botRecord of permBotSlots) {
      const botSlotNum = botRecord.slot_number;

      // Re-read from working copy (apply pending updates)
      const workingSlots = allSlots.map(s => {
        const pending = updates.find(u => u.id === s.id);
        return pending ? { ...s, slot_number: pending.slot_number } : s;
      });

      // Find nearest human ABOVE Sable (slot_number < botSlotNum = higher rank)
      // Nearest = highest slot number still less than Sable's
      const humanAbove = workingSlots
        .filter(s => !PERM_BOT_IDS.has(s.user_id) && s.slot_number < botSlotNum)
        .sort((a, b) => b.slot_number - a.slot_number)[0];

      if (!humanAbove) {
        log.push(`${botRecord.username} (slot ${botSlotNum}): no human above to challenge`);
        continue;
      }

      const humanSlotNum = humanAbove.slot_number;
      const botAtk = botRecord.atk || 10;
      const botDef = botRecord.def || 10;
      const targAtk = humanAbove.atk || 10;
      const targDef = humanAbove.def || 10;

      const botWon = simulateHPBattle(botAtk, botDef, targAtk, targDef);

      if (botWon) {
        // Sable wins: swap — Sable moves UP to human's slot, human drops to Sable's old slot
        const existingBotUpd = updates.find(u => u.id === botRecord.id);
        const existingHumanUpd = updates.find(u => u.id === humanAbove.id);
        if (existingBotUpd) existingBotUpd.slot_number = humanSlotNum;
        else updates.push({ id: botRecord.id, slot_number: humanSlotNum });
        if (existingHumanUpd) existingHumanUpd.slot_number = botSlotNum;
        else updates.push({ id: humanAbove.id, slot_number: botSlotNum });

        log.push(`${botRecord.username} (${botSlotNum}) beat ${humanAbove.username} (${humanSlotNum}) → Sable→${humanSlotNum}, human→${botSlotNum}`);

        challengeEvents.push({
          user_id: humanAbove.user_id,
          botWon: true,
          challengerName: botRecord.username,
          challengerAtk: botAtk,
          challengerSlot: botSlotNum,
          fromSlot: humanSlotNum,
          pushedToSlot: botSlotNum,
        });

        // Update local copy for subsequent iterations
        const bidx = allSlots.findIndex(s => s.id === botRecord.id);
        if (bidx !== -1) allSlots[bidx] = { ...allSlots[bidx], slot_number: humanSlotNum };
        const hidx = allSlots.findIndex(s => s.id === humanAbove.id);
        if (hidx !== -1) allSlots[hidx] = { ...allSlots[hidx], slot_number: botSlotNum };

      } else {
        // Sable loses: no position change — human successfully defended
        log.push(`${botRecord.username} (${botSlotNum}) LOST to ${humanAbove.username} (${humanSlotNum}) → no change, human defended`);

        challengeEvents.push({
          user_id: humanAbove.user_id,
          botWon: false,
          challengerName: botRecord.username,
          challengerAtk: botAtk,
          challengerSlot: botSlotNum,
          fromSlot: humanSlotNum,
          pushedToSlot: null,
        });
      }
    }

    // Persist defensive battle logs to DB for each challenged human
    for (const e of challengeEvents) {
      await base44.asServiceRole.entities.CCBattleLog.create({
        user_id: e.user_id,
        cycle_start: cycleStart,
        type: 'DEFENSIVE',
        outcome: e.botWon ? 'LOST' : 'DEFENDED',
        challenger_name: e.challengerName,
        challenger_level: sableGrowth.level,
        challenger_slot: e.challengerSlot,
        challenger_atk: e.challengerAtk,
        my_slot: e.fromSlot,
        pushed_to_slot: e.pushedToSlot || null,
        timestamp: Date.now(),
      });
    }

    // Apply all slot updates to DB
    for (const update of updates) {
      await base44.asServiceRole.entities.CapitalClashSlot.update(update.id, { slot_number: update.slot_number });
      await new Promise(r => setTimeout(r, 50));
    }

    return Response.json({ success: true, updates: updates.length, log, challengeEvents, sableStats: sableGrowth });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});