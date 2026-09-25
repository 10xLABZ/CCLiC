import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // Fetch a page of slots, fix half with trailing numbers
    const pageSize = 50;
    const page = body.page || 0;

    const slots = await base44.asServiceRole.entities.TerritorySlot.list('-created_date', pageSize, page * pageSize);

    // Filter to bot slots with 2+ trailing digits
    const toFix = slots.filter(s =>
      (s.user_id || '').startsWith('bot_') && /\d{2,}$/.test(s.username || '')
    );

    let fixed = 0;
    for (const slot of toFix) {
      const cleanName = (slot.username || '').replace(/\d+$/, '');
      await base44.asServiceRole.entities.TerritorySlot.update(slot.id, { username: cleanName });
      await sleep(500);
      fixed++;
    }

    return Response.json({
      success: true,
      page,
      slotsInPage: slots.length,
      fixedThisPage: fixed,
      hasMore: slots.length === pageSize
    });
  } catch(e) {
    console.error('Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});