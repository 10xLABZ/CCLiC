/**
 * adminReissuePowerPack — Admin-only function that forcefully delivers all Power Pack items
 * to a user's inventory regardless of restore history. Can be called unlimited times.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PACK_ITEMS = [
  { inventoryKey: 'weapons',  itemId: 'W_FEATURED_001', name: 'Sovereign Market Blade' },
  { inventoryKey: 'vehicles', itemId: 'V_FEATURED_001', name: 'Executive Phantom One' },
  { inventoryKey: 'power',    itemId: 'P_FEATURED_001', name: 'Shadow Council Director' },
  { inventoryKey: 'pets',     itemId: 'T_FEATURED_001', name: 'Apex Shadow Dragon' },
  { inventoryKey: 'avatars',  itemId: 'A_the_architect', name: 'The Architect' },
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const body = await req.json();
  const targetUserId = body.target_user_id || user.id;

  const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: targetUserId });
  if (inventories.length === 0) return Response.json({ error: 'Inventory not found for user' }, { status: 404 });

  const inventory = inventories[0];
  const updates = {};
  const delivered = [];

  for (const item of PACK_ITEMS) {
    const section = inventory[item.inventoryKey] || {};
    updates[item.inventoryKey] = { ...section, [item.itemId]: 1 };
    delivered.push(item.name);
  }

  await base44.asServiceRole.entities.PlayerInventory.update(inventory.id, updates);

  // Write audit record
  await base44.asServiceRole.entities.SystemMessage.create({
    user_id: targetUserId,
    type: 'restore_success',
    title: '☢️ Power Pack Reissued by Admin',
    body: `All Power Pack items forcefully re-granted: ${delivered.join(', ')}`,
    item_id: 'vs_featured_power_pack',
    item_name: 'Power Pack',
    currency: 'usd',
    amount_paid: 0,
    quantity: 1,
    category: 'power_pack',
    is_consumable: false,
    restored: false,
    timestamp: Date.now(),
  });

  return Response.json({ success: true, delivered, inventory_id: inventory.id });
});