import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FUND_SHOP_ITEMS = {
  cover_25:    { cost: 100, type: 'op_cover',    amount: 25 },
  energy_25:   { cost: 100, type: 'energy',      amount: 25 },
  stamina_25:  { cost: 100, type: 'stamina',     amount: 25 },
  shield_12h:  { cost: 100, type: 'shield',      hours: 12 },
  gear_part:    { cost: 250, type: 'consumable',  itemId: 'GEAR_SHARD',   dailyLimited: true },
  avatar_shard: { cost: 250, type: 'consumable',  itemId: 'AVATAR_SHARD', dailyLimited: true },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { item_id } = body;

    const item = FUND_SHOP_ITEMS[item_id];
    if (!item) return Response.json({ error: 'Invalid item' }, { status: 400 });

    // Get alliance membership
    const memberships = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: user.id });
    if (memberships.length === 0) return Response.json({ error: 'Not in an alliance' }, { status: 400 });
    const allianceId = memberships[0].alliance_id;

    // Get FundMember record
    const fundMemberRecords = await base44.asServiceRole.entities.FundMember.filter({ alliance_id: allianceId, user_id: user.id });
    if (fundMemberRecords.length === 0) return Response.json({ error: 'No FundBux balance — donate to earn FundBux first!' }, { status: 400 });
    const fundMember = fundMemberRecords[0];

    // Check balance
    if ((fundMember.fundbux_balance || 0) < item.cost) {
      return Response.json({ error: 'Insufficient FundBux' }, { status: 400 });
    }

    // Check daily limits
    const todayStr = new Date().toISOString().split('T')[0];
    if (item.dailyLimited) {
      if (item_id === 'gear_part' && fundMember.last_gear_part_date === todayStr) {
        return Response.json({ error: 'Daily limit reached for Gear Parts (1/day)' }, { status: 400 });
      }
      if (item_id === 'avatar_shard' && fundMember.last_avatar_part_date === todayStr) {
        return Response.json({ error: 'Daily limit reached for Avatar Shards (1/day)' }, { status: 400 });
      }
    }

    // Deduct FundBux
    const memberUpdate = { fundbux_balance: (fundMember.fundbux_balance || 0) - item.cost };
    if (item_id === 'gear_part') memberUpdate.last_gear_part_date = todayStr;
    if (item_id === 'avatar_shard') memberUpdate.last_avatar_part_date = todayStr;
    await base44.asServiceRole.entities.FundMember.update(fundMember.id, memberUpdate);

    // Grant item to player
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const profile = profiles[0];

    const resourceResponse = {};

    if (item.type === 'energy') {
      const newEnergy = Math.max(0, Math.min(100, (profile.energy || 0) + item.amount));
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        energy: newEnergy,
        last_energy_timestamp: Date.now(),
      });
      resourceResponse.new_energy = newEnergy;
    } else if (item.type === 'stamina') {
      const newStamina = Math.max(0, Math.min(100, (profile.stamina || 0) + item.amount));
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        stamina: newStamina,
        last_stamina_timestamp: Date.now(),
      });
      resourceResponse.new_stamina = newStamina;
    } else if (item.type === 'op_cover') {
      const newOpCover = Math.max(0, Math.min(100, (profile.op_cover || 0) + item.amount));
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        op_cover: newOpCover,
        last_op_cover_timestamp: Date.now(),
      });
      resourceResponse.new_op_cover = newOpCover;
    } else if (item.type === 'shield') {
      const now = Date.now();
      const shieldMs = item.hours * 60 * 60 * 1000;
      const currentShield = profile.shield_active_until || 0;
      const baseTime = Math.max(now, currentShield);
      const newShieldUntil = baseTime + shieldMs;
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        shield_active_until: newShieldUntil,
        shield_type: 'fund_shop',
      });
      resourceResponse.new_shield_until = newShieldUntil;
    } else if (item.type === 'consumable') {
      const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id });
      if (inventories.length > 0) {
        const inv = inventories[0];
        const consumables = { ...(inv.consumables || {}) };
        consumables[item.itemId] = (consumables[item.itemId] || 0) + 1;
        await base44.asServiceRole.entities.PlayerInventory.update(inv.id, { consumables });
      }
    }

    return Response.json({
      success: true,
      item_id,
      new_fundbux_balance: memberUpdate.fundbux_balance,
      ...resourceResponse,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});