import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Permanent bots — single source of truth lives here on the server
const PERMANENT_BOTS = [
  { userId: 'permbot_mnb_001', name: 'Sable', level: 48, atk: 2376.18, def: 1238.49, fund_power: 864.0, isVip: true, slot: 3,
    profileImage: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cycleStart } = await req.json();
    if (!cycleStart) return Response.json({ error: 'cycleStart required' }, { status: 400 });

    const seeded = [];
    for (const bot of PERMANENT_BOTS) {
      const existing = await base44.asServiceRole.entities.CapitalClashSlot.filter({
        user_id: bot.userId, cycle_start: cycleStart
      });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.CapitalClashSlot.create({
          user_id: bot.userId,
          username: bot.name,
          profile_image_url: bot.profileImage,
          player_level: bot.level,
          atk: bot.atk,
          def: bot.def,
          fund_power: bot.fund_power || 0,
          slot_number: bot.slot,
          cycle_start: cycleStart,
          is_vip: bot.isVip,
        });
        seeded.push(bot.name);
      } else {
        // Update fund_power if it's missing/zero on existing record
        const rec = existing[0];
        if (!rec.fund_power && bot.fund_power) {
          await base44.asServiceRole.entities.CapitalClashSlot.update(rec.id, { fund_power: bot.fund_power });
        }
      }
      await new Promise(r => setTimeout(r, 80));
    }

    return Response.json({ success: true, seeded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});