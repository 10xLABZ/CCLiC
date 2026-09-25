/**
 * claimCapitalClashRewards — Atomic server-side Capital Clash reward delivery.
 *
 * Replaces the split client/server flow where claimReward locked the claim
 * but consumables/frames were delivered client-side via claimCapitalClashRewards().
 *
 * This function atomically:
 *   1. Checks idempotency (SystemMessage reward_claimed lock)
 *   2. Fetches the player's CapitalClashSlot from the server
 *   3. Determines reward tier from slot number
 *   4. Records the claim lock
 *   5. Delivers IGC (cash/crypto) to PlayerProfile
 *   6. Delivers consumables (boosts, shards, gear parts) to PlayerInventory
 *   7. Grants profile frames to PlayerProfile.owned_frames
 *   8. Returns updated authoritative values
 *
 * Payload:
 *   cycle_id: string — The CC cycle start timestamp (string) used as unique claim key
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// ── Reward definitions (must match capitalClashStorage.jsx) ─────────────────

const CAPITAL_CLASH_REWARDS = {
  1:       [{ key:'AVATAR_SHARD', qty:2 }, { key:'GEAR_SHARD', qty:2 }, { cryd:5 }, { key:'ENERGY_100', qty:1 }, { key:'STAMINA_100', qty:1 }, { key:'OPCOVER_100', qty:1 }, { cash:50000 }, { frameId:'cc_top' }],
  2:       [{ key:'AVATAR_SHARD', qty:1 }, { key:'GEAR_SHARD', qty:1 }, { cryd:2 }, { key:'ENERGY_75', qty:1 }, { key:'STAMINA_75', qty:1 }, { key:'OPCOVER_75', qty:1 }, { cash:25000 }, { frameId:'cc_2nd' }],
  3:       [{ key:'AVATAR_SHARD', qty:1 }, { key:'GEAR_SHARD', qty:1 }, { cryd:1 }, { key:'ENERGY_50', qty:1 }, { key:'STAMINA_50', qty:1 }, { key:'OPCOVER_50', qty:1 }, { cash:12500 }, { frameId:'cc_3rd' }],
  '4-20':  [{ key:'AVATAR_SHARD', qty:1 }, { key:'ENERGY_25', qty:1 }, { key:'STAMINA_25', qty:1 }, { key:'OPCOVER_25', qty:1 }, { cash:5000 }],
  '21-100':[{ key:'ENERGY_25', qty:1 }, { key:'STAMINA_25', qty:1 }, { key:'OPCOVER_25', qty:1 }, { cash:5000 }],
};

function getRewardTier(slot: number): number | string {
  if (slot === 1) return 1;
  if (slot === 2) return 2;
  if (slot === 3) return 3;
  if (slot <= 20) return '4-20';
  return '21-100';
}

// ── Frame helpers ──────────────────────────────────────────────────────────

function parseOwnedFrames(raw: any): any[] {
  if (!raw) return [];
  if (typeof raw === 'object' && Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function stringifyOwnedFrames(arr: any[]): string {
  return JSON.stringify(arr);
}

// CC cycle duration (must match capitalClashStorage.jsx)
const CC_DURATION = 5 * 24 * 60 * 60 * 1000; // 5 days
const FRAME_EXPIRY_DAYS = 14; // frames expire 14 days after event ends

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { cycle_id } = body;
    if (!cycle_id) return Response.json({ error: 'Missing cycle_id' }, { status: 400 });

    const rewardKey = `capitalclash_${cycle_id}`;

    // ── 1. Idempotency check ──────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: rewardKey,
    });
    if (existing.length > 0) {
      return Response.json({ success: false, already_claimed: true, error: 'Reward already claimed' });
    }

    // ── 2. Fetch CapitalClashSlot to determine tier ─────────────────
    const cycleStartNum = typeof cycle_id === 'string' ? parseInt(cycle_id, 10) : cycle_id;
    const slots = await base44.asServiceRole.entities.CapitalClashSlot.filter({
      user_id: user.id,
      cycle_start: cycleStartNum,
    });
    if (slots.length === 0) {
      return Response.json({ success: false, error: 'No Capital Clash slot found for this cycle' }, { status: 404 });
    }
    const slot = slots[0];
    const tier = getRewardTier(slot.slot_number);
    const rewards = CAPITAL_CLASH_REWARDS[tier];
    if (!rewards) {
      return Response.json({ success: false, error: `Unknown reward tier for slot ${slot.slot_number}` }, { status: 400 });
    }

    // ── 3. Record the claim (the lock) ────────────────────────────────
    const lockRecord = await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'reward_claimed',
      title: 'capitalclash reward claimed',
      body: `Claimed capitalclash reward (${rewardKey}) — slot #${slot.slot_number}, tier ${tier}`,
      item_id: rewardKey,
      item_name: 'capitalclash',
      category: 'capitalclash',
      is_consumable: false,
      restored: false,
      timestamp: Date.now(),
      meta: JSON.stringify({ cycle_id, slot_number: slot.slot_number, tier, claimed_at: new Date().toISOString() }),
    });

    // Helper: if any delivery step fails, delete the lock so the user can retry
    const rollbackLock = async () => {
      try { await base44.asServiceRole.entities.SystemMessage.delete(lockRecord.id); } catch {}
    };

    // ── 4. Fetch profile + inventory ──────────────────────────────────
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: 'PlayerProfile not found' }, { status: 404 });
    const profile = profiles[0];

    // ── 5. Compute deltas ─────────────────────────────────────────────
    let cashDelta = 0, cryptoDelta = 0;
    const consumableDeltas: Record<string, number> = {};
    let frameToGrant: string | null = null;
    let frameExpiresAt = 0;

    for (const r of rewards) {
      if (r.key) consumableDeltas[r.key] = (consumableDeltas[r.key] || 0) + (r.qty || 0);
      if (r.cash) cashDelta += r.cash;
      if (r.cryd) cryptoDelta += r.cryd;
      if (r.frameId) {
        frameToGrant = r.frameId;
        frameExpiresAt = cycleStartNum + CC_DURATION + FRAME_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      }
    }

    // ── 6. Deliver IGC to PlayerProfile ──────────────────────────────
    const profileUpdate: any = {};
    let newCash = profile.cash || 0;
    let newCrypto = profile.crypto || 0;
    if (cashDelta) { newCash = (profile.cash || 0) + cashDelta; profileUpdate.cash = newCash; }
    if (cryptoDelta) { newCrypto = (profile.crypto || 0) + cryptoDelta; profileUpdate.crypto = newCrypto; }

    // ── 7. Grant frame if applicable ──────────────────────────────────
    if (frameToGrant) {
      const ownedFrames = parseOwnedFrames(profile.owned_frames);
      ownedFrames.push({ id: frameToGrant, expiresAt: frameExpiresAt, grantedAt: Date.now() });
      profileUpdate.owned_frames = stringifyOwnedFrames(ownedFrames);
    }

    if (Object.keys(profileUpdate).length > 0) {
      try {
        await base44.asServiceRole.entities.PlayerProfile.update(profile.id, profileUpdate);
      } catch (err) {
        await rollbackLock();
        return Response.json({ success: false, error: 'Failed to deliver profile rewards. Please try again.' }, { status: 500 });
      }
    }

    // ── 8. Deliver consumables to PlayerInventory ─────────────────────
    let newConsumables = null;
    if (Object.keys(consumableDeltas).length > 0) {
      const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id });
      if (inventories.length > 0) {
        // Pick the inventory record with the most items (dedup)
        const inv = inventories.reduce((best: any, current: any) => {
          if (!best) return current;
          const bestCount = Object.values(best).filter(v => typeof v === 'object' && v !== null).reduce((sum: number, cat: any) => sum + (cat ? Object.keys(cat).length : 0), 0);
          const currCount = Object.values(current).filter(v => typeof v === 'object' && v !== null).reduce((sum: number, cat: any) => sum + (cat ? Object.keys(cat).length : 0), 0);
          return currCount > bestCount ? current : best;
        }, null);

        const updatedConsumables = { ...(inv.consumables || {}) };
        for (const [key, qty] of Object.entries(consumableDeltas)) {
          updatedConsumables[key] = (updatedConsumables[key] || 0) + qty;
        }
        try {
          await base44.asServiceRole.entities.PlayerInventory.update(inv.id, { consumables: updatedConsumables });
        } catch (err) {
          await rollbackLock();
          return Response.json({ success: false, error: 'Failed to deliver consumable rewards. Please try again.' }, { status: 500 });
        }

        // Delete any duplicate inventory records
        const dupes = inventories.filter((i: any) => i.id !== inv.id);
        for (const dup of dupes) {
          base44.asServiceRole.entities.PlayerInventory.delete(dup.id).catch(() => {});
        }
        newConsumables = updatedConsumables;
      }
    }

    return Response.json({
      success: true,
      already_claimed: false,
      slot_number: slot.slot_number,
      tier,
      new_cash: newCash,
      new_crypto: newCrypto,
      new_consumables: newConsumables,
      frame_granted: frameToGrant,
      rewards_delivered: rewards,
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}