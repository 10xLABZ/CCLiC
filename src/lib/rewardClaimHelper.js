/**
 * rewardClaimHelper.js — Server-authoritative reward claim utilities.
 *
 * Replaces localStorage-based claim status checks with server queries.
 * The `claimReward` backend function is the source of truth for whether
 * a reward has been claimed. This helper:
 *   1. Checks the server on mount to sync UI state (no false "claimable" dots).
 *   2. Wraps the claimReward call and returns a structured result.
 *   3. Handles rejections gracefully so callers can show "already claimed" popups.
 */

import { base44 } from '@/api/base44Client';

/**
 * Checks whether a reward has been claimed on the server by looking
 * for a SystemMessage record with type='reward_claimed' and item_id=rewardKey.
 *
 * @param {string} rewardKey — The unique idempotency key (e.g. "fvf_event_2026-08-04")
 * @returns {Promise<boolean>} true if already claimed on server
 */
export const isRewardClaimedServer = async (rewardKey) => {
  try {
    const user = await base44.auth.me();
    if (!user) return false;
    const claims = await base44.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: rewardKey,
    });
    return claims.length > 0;
  } catch {
    return false;
  }
};

/**
 * Attempts to claim a reward via the claimReward backend function.
 * Returns a structured result so callers can distinguish between
 * success, already-claimed, and error.
 *
 * @param {string} rewardType — e.g. 'fvf_event', 'vip_daily', 'fastfive', 'daily_goals'
 * @param {string} rewardKey — unique idempotency key
 * @param {string} cycleId — cycle identifier (usually same as rewardKey)
 * @returns {Promise<{success: boolean, alreadyClaimed: boolean, error?: string}>}
 */
export const serverClaimReward = async (rewardType, rewardKey, cycleId) => {
  try {
    const res = await base44.functions.invoke('claimReward', {
      reward_type: rewardType,
      reward_key: rewardKey,
      cycle_id: String(cycleId || rewardKey),
    });
    if (res.data?.success) {
      return { success: true, alreadyClaimed: false };
    }
    return {
      success: false,
      alreadyClaimed: res.data?.already_claimed === true,
      error: res.data?.error || 'Reward already claimed',
    };
  } catch (e) {
    return { success: false, alreadyClaimed: false, error: e.message };
  }
};