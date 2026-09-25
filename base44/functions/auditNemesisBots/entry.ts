import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch ALL territory slots
    const allSlots = await base44.asServiceRole.entities.TerritorySlot.list('-created_date', 10000);

    // Filter nemesis bots (user_id starts with 'nemesis_')
    const nemesisSlots = allSlots.filter(s => s.user_id && s.user_id.startsWith('nemesis_'));

    // Group by username
    const byUsername = {};
    for (const s of nemesisSlots) {
      if (!byUsername[s.username]) byUsername[s.username] = [];
      byUsername[s.username].push({ id: s.id, city: s.city, state: s.state, user_id: s.user_id, slot_number: s.slot_number });
    }

    // Find duplicates
    const duplicates = Object.entries(byUsername)
      .filter(([, entries]) => entries.length > 1)
      .map(([username, entries]) => ({ username, count: entries.length, locations: entries }));

    // Also detect "real name" style bots (First Last format - no numbers, no special chars, just two words)
    const realNamePattern = /^[A-Z][a-záéíóúüñç]+ [A-Z][a-záéíóúüñ]+$/;
    const realNameBots = nemesisSlots.filter(s => realNamePattern.test(s.username));

    return Response.json({
      total_nemesis_bots: nemesisSlots.length,
      duplicate_count: duplicates.length,
      duplicates,
      real_name_style_bots: realNameBots.map(s => ({ id: s.id, username: s.username, city: s.city, state: s.state, user_id: s.user_id })),
      all_nemesis_usernames: Object.keys(byUsername).sort()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});