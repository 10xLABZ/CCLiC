import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Seeded random for deterministic daily variance
const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allSlots = await base44.asServiceRole.entities.TerritorySlot.filter({});
    const botSlots = allSlots.filter(s => s.is_bot === true || (s.user_id && s.user_id.startsWith('bot_territory_')));

    if (botSlots.length === 0) {
      return Response.json({ message: 'No bot territory slots found', updated: 0 });
    }

    const rng = seededRandom(Date.now());
    let updated = 0;

    for (const slot of botSlots) {
      const winsGain = 1 + Math.floor(rng() * 7);  // +1 to +7
      const lossesGain = 1 + Math.floor(rng() * 7); // +1 to +7
      const levelGain = rng() < 0.1 ? 1 : 0; // 10% chance to gain a level

      await base44.asServiceRole.entities.TerritorySlot.update(slot.id, {
        bot_wins: (slot.bot_wins || 0) + winsGain,
        bot_losses: (slot.bot_losses || 0) + lossesGain,
        player_level: Math.min(57, (slot.player_level || 11) + levelGain),
        player_power: Math.round((1 + Math.min(57, (slot.player_level || 11) + levelGain) * 0.25) * 100) / 100
      });
      updated++;
    }

    return Response.json({ message: `Updated ${updated} bot territory slots`, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});