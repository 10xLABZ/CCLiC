/**
 * fvfRewardHelper.js — Client-side FvF event reward tracking.
 * Server-side idempotency is handled by the claimReward backend function.
 * localStorage persists the "claimed this week" flag across page reloads.
 */

const FVF_REWARD_KEY = (weekStartDate) => `fvf_reward_${weekStartDate}`;

export const isFvfRewardClaimed = (weekStartDate) => {
  if (!weekStartDate) return false;
  try {
    return localStorage.getItem(FVF_REWARD_KEY(weekStartDate)) === 'true';
  } catch {
    return false;
  }
};

export const markFvfRewardClaimed = (weekStartDate) => {
  if (!weekStartDate) return;
  try {
    localStorage.setItem(FVF_REWARD_KEY(weekStartDate), 'true');
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('fvf_reward_changed'));
  }
};

// Rewards granted via server — used by FvFRewardChest
export const FVF_WINNING_REWARDS = [
  { type: 'consumable', key: 'OPCOVER_25', amount: 6, label: '6× Cover Boost +25', icon: '🛡️' },
  { type: 'consumable', key: 'STAMINA_25', amount: 6, label: '6× Stamina Boost +25', icon: '⚡' },
  { type: 'consumable', key: 'ENERGY_25', amount: 6, label: '6× Energy Boost +25', icon: '🔋' },
  { type: 'consumable', key: 'AVATAR_SHARD', amount: 2, label: '2× Avatar Shards', icon: '🧩' },
  { type: 'consumable', key: 'GEAR_SHARD', amount: 3, label: '3× Gear Part Shards', icon: '⚙️' },
  { type: 'igc', amount: 50000, label: '+$50,000 Cash', icon: '💵' },
];

export const FVF_LOSING_REWARDS = [
  { type: 'consumable', key: 'OPCOVER_25', amount: 2, label: '2× Cover Boost +25', icon: '🛡️' },
  { type: 'consumable', key: 'STAMINA_25', amount: 2, label: '2× Stamina Boost +25', icon: '⚡' },
  { type: 'consumable', key: 'ENERGY_25', amount: 2, label: '2× Energy Boost +25', icon: '🔋' },
  { type: 'igc', amount: 5000, label: '+$5,000 Cash', icon: '💵' },
];