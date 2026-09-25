import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Simulates fake bot challenges for the 3 slots directly below any human player.
// Runs 3x/day (every 8 hrs). Processes max 20 events per run to avoid rate limits.
// NEVER touches Nemesis Bot (nemesis_) slots or logic.

const seededRand = (seed) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Only fetch mayors_office slots, limit to 500 to avoid huge payloads
    const allSlots = (await base44.asServiceRole.entities.TerritorySlot.filter(
      { building_id: 'mayors_office' }, '-created_date', 500
    )) || [];

    // Group by city+state
    const groups = {};
    for (const slot of allSlots) {
      const key = `${slot.city}|${slot.state}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(slot);
    }

    const now = Date.now();
    const hourBucket = Math.floor(now / (1000 * 60 * 60 * 8));
    const MAX_EVENTS = 20; // hard cap per run to avoid rate limits

    let logged = 0;
    let skipped = 0;
    const results = [];
    const humanWinCredits = {};

    outerLoop:
    for (const key of Object.keys(groups)) {
      const slots = groups[key].sort((a, b) => a.slot_number - b.slot_number);
      const slotMap = {};
      for (const s of slots) slotMap[s.slot_number] = s;

      const humanSlots = slots.filter(s =>
        s.user_id &&
        !s.user_id.startsWith('bot_') &&
        !s.user_id.startsWith('nemesis_')
      );

      for (const humanSlot of humanSlots) {
        if (logged >= MAX_EVENTS) break outerLoop;

        for (let offset = 1; offset <= 3; offset++) {
          if (logged >= MAX_EVENTS) break outerLoop;

          const botSlotNum = humanSlot.slot_number + offset;
          if (botSlotNum > 50) continue;

          const botSlot = slotMap[botSlotNum];
          if (!botSlot || !botSlot.user_id || !botSlot.user_id.startsWith('bot_')) {
            skipped++;
            continue;
          }

          // ~33% chance per run
          const rng = seededRand(hashString(`${key}|slot${botSlotNum}|human${humanSlot.user_id}|${hourBucket}`));
          if (rng() > 0.33) { skipped++; continue; }

          // Log battle
          await base44.asServiceRole.entities.TerritoryBattleLog.create({
            building_id: 'mayors_office',
            city: botSlot.city,
            state: botSlot.state,
            challenger_user_id: botSlot.user_id,
            challenger_username: botSlot.username,
            challenger_profile_image_url: botSlot.profile_image_url || '',
            challenger_slot: botSlotNum,
            defender_user_id: humanSlot.user_id,
            defender_username: humanSlot.username,
            defender_slot: humanSlot.slot_number,
            outcome: 'LOSS',
            timestamp: now
          });
          await sleep(400);

          // Update bot losses
          await base44.asServiceRole.entities.TerritorySlot.update(botSlot.id, {
            bot_losses: (botSlot.bot_losses || 0) + 1
          });
          await sleep(400);

          if (!humanWinCredits[humanSlot.user_id]) humanWinCredits[humanSlot.user_id] = 0;
          humanWinCredits[humanSlot.user_id]++;

          logged++;
          results.push({
            city: botSlot.city, state: botSlot.state,
            bot: botSlot.username, bot_slot: botSlotNum,
            human: humanSlot.username, human_slot: humanSlot.slot_number
          });
        }
      }
    }

    // Update human win stats
    for (const [userId, winsToAdd] of Object.entries(humanWinCredits)) {
      const profiles = (await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: userId })) || [];
      if (profiles.length > 0) {
        await base44.asServiceRole.entities.PlayerProfile.update(profiles[0].id, {
          total_trade_war_wins: (profiles[0].total_trade_war_wins || 0) + winsToAdd
        });
        await sleep(400);
      }
    }

    return Response.json({
      success: true,
      summary: { logged, skipped, humans_credited: Object.keys(humanWinCredits).length },
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});