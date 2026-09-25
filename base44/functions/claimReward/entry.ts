import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const body = await req.json();
    const { reward_type, cycle_id } = body;
    let { reward_key } = body;
    // reward_type: 'vip_daily' | 'fastfive' | 'shardfrenzy' | 'gearoverdrive' | 'worldtour' | 'message' | 'fvf_event' | 'daily_goals' | 'capitalclash' | 'daily_gift_vip' | 'daily_gift_dvs'
    // reward_key: unique string to prevent double-claim (e.g. "vip_daily_2026-05-22", "fastfive_1748000000000")
    // cycle_id: used as the unique claim key

    // For vip_daily, derive the ET date server-side to prevent device clock manipulation
    if (reward_type === 'vip_daily') {
      reward_key = `vip_daily_${getETDateString()}`;
    }

    if (!reward_type || !reward_key) {
      return Response.json({ error: 'Missing reward_type or reward_key' }, { status: 400 });
    }

    // Check if already claimed on server
    const existing = await base44.asServiceRole.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: reward_key,
    });

    if (existing.length > 0) {
      return Response.json({ success: false, already_claimed: true, error: 'Reward already claimed' });
    }

    // Record the claim server-side — this is the lock
    await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'reward_claimed',
      title: `${reward_type} reward claimed`,
      body: `Claimed ${reward_type} reward (${reward_key})`,
      item_id: reward_key,        // used as the idempotency key
      item_name: reward_type,
      category: reward_type,
      is_consumable: false,
      restored: false,
      timestamp: Date.now(),
      meta: JSON.stringify({ cycle_id, claimed_at: new Date().toISOString() }),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});