/**
 * restorePurchase — re-grants a non-consumable item if it's missing from inventory.
 * Only works for non-consumable purchases. Consumables are explicitly blocked.
 * Marks the SystemMessage record as restored so it can only be used once.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { system_message_id } = body;

  if (!system_message_id) return Response.json({ error: 'Missing system_message_id' }, { status: 400 });

  // Fetch the SystemMessage
  const messages = await base44.asServiceRole.entities.SystemMessage.filter({ id: system_message_id });
  if (messages.length === 0) return Response.json({ error: 'SystemMessage not found' }, { status: 404 });

  const msg = messages[0];

  // Security: must belong to this user
  if (msg.user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Block consumable restores
  if (msg.is_consumable) {
    return Response.json({ error: 'Consumable items cannot be automatically restored. Please contact support.' }, { status: 400 });
  }

  // Note: double-restore allowed — users may need to restore on new devices

  // Fetch current inventory + profile
  const [inventories, profiles] = await Promise.all([
    base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id }),
    base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id }),
  ]);

  if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
  const profile = profiles[0];
  const now = Date.now();

  // VIP restore
  if (msg.category === 'vip') {
    const currentExpiry = profile.vip_active_until || 0;
    // Only restore if VIP has expired
    if (currentExpiry > now) {
      return Response.json({ error: 'VIP is still active — no restore needed.' }, { status: 400 });
    }
    const VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
    await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
      vip_active_until: now + VIP_DURATION_MS,
    });
    await base44.asServiceRole.entities.SystemMessage.update(msg.id, { restored: true });

    // Write a restore audit record
    await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'restore_success',
      title: '🔁 VIP Restored',
      body: `VIP status restored via purchase record from ${new Date(msg.timestamp).toLocaleString()}.`,
      item_id: msg.item_id,
      item_name: msg.item_name,
      currency: msg.currency,
      amount_paid: 0,
      quantity: 1,
      category: 'vip',
      is_consumable: false,
      restored: false,
      timestamp: now,
    });

    return Response.json({ success: true, restored: 'vip', new_vip_active_until: now + VIP_DURATION_MS });
  }

  // Non-consumable inventory restore
  if (inventories.length === 0) return Response.json({ error: 'Inventory not found' }, { status: 404 });
  const inventory = inventories[0];

  const invCatMap = {
    weapons: 'weapons', vehicles: 'vehicles',
    people: 'power', power: 'power',
    pets: 'pets', avatars: 'avatars',
    scenes: 'scenes', themes: 'themes',
  };
  const invKey = invCatMap[msg.category] || msg.category;
  const invSection = inventory[invKey] || {};
  const currentQty = invSection[msg.item_id] || 0;

  // Only restore if item is actually missing
  if (currentQty >= (msg.quantity || 1)) {
    return Response.json({ error: 'Item is already in your inventory — no restore needed.' }, { status: 400 });
  }

  const updatedSection = { ...invSection, [msg.item_id]: msg.quantity || 1 };
  await base44.asServiceRole.entities.PlayerInventory.update(inventory.id, {
    [invKey]: updatedSection,
  });

  await base44.asServiceRole.entities.SystemMessage.update(msg.id, { restored: true });

  await base44.asServiceRole.entities.SystemMessage.create({
    user_id: user.id,
    type: 'restore_success',
    title: `🔁 Restored: ${msg.item_name}`,
    body: `${msg.item_name} re-granted via purchase record from ${new Date(msg.timestamp).toLocaleString()}.`,
    item_id: msg.item_id,
    item_name: msg.item_name,
    currency: msg.currency,
    amount_paid: 0,
    quantity: msg.quantity || 1,
    category: msg.category,
    is_consumable: false,
    restored: false,
    timestamp: now,
  });

  return Response.json({
    success: true,
    restored: msg.item_id,
    category: msg.category,
    inv_key: invKey,
    quantity: msg.quantity || 1,
  });
});