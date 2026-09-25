/**
 * processPurchase — atomic server-side purchase handler.
 * Deducts currency, grants item to inventory/profile, and writes a SystemMessage audit record.
 *
 * Payload:
 *   category: string  (weapons|vehicles|power|pets|avatars|scenes|themes|consumable|vip)
 *   item_id: string
 *   item_name: string
 *   currency: 'cash' | 'cryd'
 *   amount: number  (cost)
 *   quantity: number (default 1)
 *   is_consumable: boolean
 *   consumable_key: string  (for consumables: the actual inventory key e.g. 'ENERGY_25')
 *   vip_duration_ms: number (only for vip purchases)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    category,
    item_id,
    item_name,
    currency,
    amount,
    quantity = 1,
    is_consumable = false,
    consumable_key,
    consumable_amount,
    consumable_grants,
    vip_duration_ms,
  } = body;

  if (!category || !item_id || !item_name || !currency || amount == null) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // --- Fetch current profile + inventory ---
  const [profiles, inventories] = await Promise.all([
    base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id }),
    base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id }),
  ]);

  if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });

  const profile = profiles[0];

  // Pick the inventory record with the MOST items — same logic the client uses
  // in refreshFromServer. This ensures we update the SAME record the client
  // will read back, preventing "item not showing" after duplicate records exist.
  let inventory = null;
  if (inventories.length > 0) {
    inventory = inventories.reduce((best, current) => {
      if (!best) return current;
      const countItems = (rec) => Object.values(rec)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      return countItems(current) > countItems(best) ? current : best;
    }, null);
  }

  // --- Validate currency ---
  if (currency === 'cash') {
    if ((profile.cash || 0) < amount) {
      return Response.json({ error: 'Insufficient cash', code: 'INSUFFICIENT_CASH' }, { status: 400 });
    }
  } else if (currency === 'cryd') {
    if ((profile.crypto || 0) < amount) {
      return Response.json({ error: 'Insufficient CRYD', code: 'INSUFFICIENT_CRYD' }, { status: 400 });
    }
  }

  const now = Date.now();

  // --- Build profile update ---
  const profileUpdate = {};
  if (currency === 'cash') profileUpdate.cash = (profile.cash || 0) - amount;
  if (currency === 'cryd') profileUpdate.crypto = (profile.crypto || 0) - amount;

  // VIP purchase: extend vip_active_until
  if (category === 'vip' && vip_duration_ms) {
    const currentExpiry = profile.vip_active_until || 0;
    profileUpdate.vip_active_until = Math.max(now, currentExpiry) + vip_duration_ms;
    profileUpdate.last_vip_daily_claim_date = null;
  }

  // --- Build inventory update ---
  let inventoryUpdate = null;
  if (category !== 'vip' && inventory) {
    const invCopy = {
      firearms: { ...(inventory.firearms || {}) },
      weapons: { ...(inventory.weapons || {}) },
      vehicles: { ...(inventory.vehicles || {}) },
      power: { ...(inventory.power || {}) },
      pets: { ...(inventory.pets || {}) },
      avatars: { ...(inventory.avatars || {}) },
      scenes: { ...(inventory.scenes || {}) },
      themes: { ...(inventory.themes || {}) },
      consumables: { ...(inventory.consumables || {}) },
      loadout: inventory.loadout || {},
      weaponUpgrades: inventory.weaponUpgrades || {},
      avatarUpgrades: inventory.avatarUpgrades || {},
    };

    if (is_consumable) {
      // Server-authoritative consumable grant — writes directly to PlayerInventory
      // so the item is guaranteed persisted before we return success.
      const cKey = consumable_key || item_id;
      const grantAmount = consumable_amount || 1;
      invCopy.consumables[cKey] = (invCopy.consumables[cKey] || 0) + grantAmount;
      inventoryUpdate = invCopy;
    } else if (consumable_grants && Array.isArray(consumable_grants) && consumable_grants.length > 0) {
      // Multi-consumable grant (e.g. production bundle with multiple boost types)
      for (const grant of consumable_grants) {
        if (grant.key && grant.amount) {
          invCopy.consumables[grant.key] = (invCopy.consumables[grant.key] || 0) + grant.amount;
        }
      }
      inventoryUpdate = invCopy;
    } else {
      // Non-consumable: add to inventory
      const invCatMap = {
        firearms: 'firearms',
        weapons: 'weapons',
        vehicles: 'vehicles',
        people: 'power',
        power: 'power',
        pets: 'pets',
        avatars: 'avatars',
        scenes: 'scenes',
        themes: 'themes',
      };
      const invKey = invCatMap[category] || category;
      if (invCopy[invKey] !== undefined) {
        invCopy[invKey][item_id] = (invCopy[invKey][item_id] || 0) + quantity;
        inventoryUpdate = invCopy;
      }
    }
  }

  // --- Write to server atomically ---
  await base44.asServiceRole.entities.PlayerProfile.update(profile.id, profileUpdate);

  if (inventoryUpdate && inventory) {
    await base44.asServiceRole.entities.PlayerInventory.update(inventory.id, inventoryUpdate);
  }

  // --- Write SystemMessage audit record ---
  const msgTitle = category === 'vip'
    ? '🌟 VIP Activated'
    : `✅ Purchase: ${item_name}`;
  const msgBody = `${item_name} × ${quantity} — ${amount} ${currency.toUpperCase()} deducted.`;

  await base44.asServiceRole.entities.SystemMessage.create({
    user_id: user.id,
    type: is_consumable ? 'purchase_consumable' : (category === 'vip' ? 'vip_purchase' : 'purchase_nonconsumable'),
    title: msgTitle,
    body: msgBody,
    item_id,
    item_name,
    currency,
    amount_paid: amount,
    quantity,
    category,
    is_consumable,
    restored: false,
    meta: JSON.stringify({ profile_id: profile.id, inventory_id: inventory?.id, timestamp: now }),
    timestamp: now,
  });

  // ── FvF Event Point Tracking for CRYD usage ──────────────────────────────
  // 100 pts per CRYD spent — applies to all event days
  if (currency === 'cryd' && amount > 0) {
    try {
      const fvfNow = new Date();
      const fvfDayOfWeek = fvfNow.getUTCDay();
      const fvfTodayIdx = fvfDayOfWeek === 0 ? -1 : fvfDayOfWeek - 1;
      const dayThemes = ['intel_day', 'firearm_dev_day', 'research_day', 'avatar_accessory_day', 'full_prep_day', 'battle_day'];
      const currentDayTheme = fvfTodayIdx >= 0 && fvfTodayIdx < 6 ? dayThemes[fvfTodayIdx] : 'cooldown';

      if (currentDayTheme !== 'cooldown') {
        const fvfPoints = amount * 100;
        const daysSinceMonday = fvfDayOfWeek === 0 ? 6 : fvfDayOfWeek - 1;
        const monday = new Date(Date.UTC(fvfNow.getUTCFullYear(), fvfNow.getUTCMonth(), fvfNow.getUTCDate() - daysSinceMonday, 5, 0, 0, 0));
        const weekStart = monday.toISOString().split('T')[0];
        const todayISO = fvfNow.toISOString().split('T')[0];

        const memberships = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: user.id });
        if (memberships.length > 0) {
          const membership = memberships[0];
          const alliance = await base44.asServiceRole.entities.Alliance.get(membership.alliance_id);
          const existingScores = await base44.asServiceRole.entities.FvFScore.filter({
            user_id: user.id,
            event_week_start: weekStart,
            event_date: todayISO,
          });
          if (existingScores.length > 0) {
            await base44.asServiceRole.entities.FvFScore.update(existingScores[0].id, {
              points: (existingScores[0].points || 0) + fvfPoints,
            });
          } else {
            await base44.asServiceRole.entities.FvFScore.create({
              user_id: user.id,
              username: user.full_name || membership.username || 'Unknown',
              alliance_id: membership.alliance_id,
              alliance_tag: alliance?.tag || '',
              event_week_start: weekStart,
              event_date: todayISO,
              day_theme: currentDayTheme,
              points: fvfPoints,
              is_bot: false,
            });
          }
        }
      }
    } catch (fvfError) {
      console.error('FvF CRYD tracking error:', fvfError.message);
    }
  }

  // Return updated balances + new expiry so client can update localStorage
  const result = {
    success: true,
    new_cash: profileUpdate.cash ?? profile.cash,
    new_cryd: profileUpdate.crypto ?? profile.crypto,
    new_vip_active_until: profileUpdate.vip_active_until ?? profile.vip_active_until ?? null,
    item_id,
    category,
    quantity,
    is_consumable,
    // Return consumable key so client knows what to add to localStorage
    consumable_key: consumable_key || null,
    consumable_grants: consumable_grants || null,
  };

  return Response.json(result);
});