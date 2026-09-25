import { getPlayerData, savePlayerData } from '../components/utils/playerStorage';
import { applyServerReward, grantConsumables } from '@/lib/playerServerSync';
import { patchPlayerData } from '@/lib/playerMemory';
import { base44 } from '@/api/base44Client';

// VIP duration — 30 days
export const VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// VIP cost in CRYD
export const VIP_COST_CRYD = 1000;

// XP granted per daily claim
export const VIP_DAILY_CLAIM_XP = 200;

// Base VIP buff (levels 1-9): 5% boost to ATK, DEF, and cash earnings
export const VIP_BUFF_PCT = 5;

export const VIP_BADGE_ACTIVE = 'https://media.base44.com/images/public/699169456a354d6cb7082777/bfc19cf47_button-vip-active1.png';
export const VIP_BADGE_INACTIVE = 'https://media.base44.com/images/public/699169456a354d6cb7082777/619df1a2c_button-vip-inactive-off.png';
export const VIP_FRAME_URL = 'https://media.base44.com/images/public/699169456a354d6cb7082777/bbb7b1e48_profile_frame_vip3.png';
export const VIP_LEGEND_FRAME_URL = 'https://media.base44.com/images/public/699169456a354d6cb7082777/0020582d7_profile_frame_viplegend1b.png';

// ─── VIP Level System (20 levels) ─────────────────────────────────────────────

// Cumulative XP required to reach each level (index 0 = Level 1)
export const VIP_XP_THRESHOLDS = [
  0,        // L1
  2000,     // L2
  5000,     // L3
  8000,     // L4
  12000,    // L5
  18000,    // L6
  25000,    // L7
  33000,    // L8
  42000,    // L9
  55000,    // L10
  70000,    // L11
  85000,    // L12
  100000,   // L13
  115000,   // L14
  130000,   // L15
  150000,   // L16
  175000,   // L17
  200000,   // L18
  240000,   // L19
  300000,   // L20
];

// Stat bonus % per VIP level (ATK/DEF/Cash). Only active when VIP subscription is active.
export const VIP_STAT_BONUS = {
  1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5,
  10: 10, 11: 10, 12: 11, 13: 11, 14: 12, 15: 12, 16: 13, 17: 13,
  18: 15, 19: 19, 20: 25,
};

// Daily cash reward per level
export const VIP_DAILY_CASH = {
  1: 5000, 2: 5000, 3: 5000, 4: 10000, 5: 10000, 6: 15000, 7: 15000,
  8: 20000, 9: 20000, 10: 25000, 11: 25000, 12: 30000, 13: 30000,
  14: 35000, 15: 35000, 16: 40000, 17: 40000, 18: 45000, 19: 45000, 20: 75000,
};

// Daily boost quantities (cover/stamina/energy) per level
export const VIP_DAILY_BOOSTS = {
  1: 2, 2: 3, 3: 3, 4: 3, 5: 4, 6: 4, 7: 4, 8: 5, 9: 5,
  10: 5, 11: 6, 12: 6, 13: 6, 14: 7, 15: 7, 16: 7, 17: 8, 18: 8, 19: 8, 20: 10,
};

// Daily avatar shards per level
export const VIP_DAILY_AVATAR_SHARDS = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1,
  10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 3, 16: 3, 17: 3, 18: 3, 19: 4, 20: 5,
};

// Daily weapon parts (gear shards) per level
export const VIP_DAILY_WEAPON_PARTS = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1,
  10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 3, 16: 3, 17: 3, 18: 3, 19: 4, 20: 5,
};

export const isVipActive = (playerData) => {
  const data = playerData || getPlayerData();
  return (data.vipActiveUntil || 0) > Date.now();
};

export const getVipTimeRemaining = (playerData) => {
  const data = playerData || getPlayerData();
  return Math.max(0, (data.vipActiveUntil || 0) - Date.now());
};

// Returns VIP level (1-20) based on cumulative vipXp
export const getVipLevel = (playerData) => {
  const data = playerData || getPlayerData();
  const xp = data.vipXp || 0;
  let level = 1;
  for (let i = VIP_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= VIP_XP_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
};

// Returns XP progress info for the VIP XP bar
export const getVipXpProgress = (playerData) => {
  const data = playerData || getPlayerData();
  const xp = data.vipXp || 0;
  const level = getVipLevel(data);

  if (level >= 20) {
    return { level, current: xp, needed: VIP_XP_THRESHOLDS[19], xpIntoLevel: xp - VIP_XP_THRESHOLDS[19], xpForNext: 0, isMax: true };
  }

  const currentThreshold = VIP_XP_THRESHOLDS[level - 1];
  const nextThreshold = VIP_XP_THRESHOLDS[level];
  const xpIntoLevel = xp - currentThreshold;
  const xpForNext = nextThreshold - currentThreshold;

  return { level, current: xp, needed: nextThreshold, xpIntoLevel, xpForNext, isMax: false };
};

// Returns stat bonus % based on VIP level (0 if VIP not active)
export const getVipStatBonusPct = (playerData) => {
  if (!isVipActive(playerData)) return 0;
  const level = getVipLevel(playerData);
  return VIP_STAT_BONUS[level] || 5;
};

// Returns the level-based daily rewards object
export const getVipDailyRewards = (playerData) => {
  const level = getVipLevel(playerData);
  return {
    level,
    cash: VIP_DAILY_CASH[level] || 5000,
    boosts: VIP_DAILY_BOOSTS[level] || 2,
    avatarShards: VIP_DAILY_AVATAR_SHARDS[level] || 1,
    weaponParts: VIP_DAILY_WEAPON_PARTS[level] || 1,
  };
};

// Returns the VIP buff multiplier (e.g., 1.05 at level 1, 1.25 at level 20)
export const getVipBuffMultiplier = (playerData) => {
  const pct = getVipStatBonusPct(playerData);
  return 1 + pct / 100;
};

export const buyVip = async (playerData) => {
  const current = playerData || getPlayerData();
  if ((current.crypto || 0) < VIP_COST_CRYD) return { success: false, message: `Not enough CRYD (need ${VIP_COST_CRYD})` };

  const vipActiveUntil = Date.now() + VIP_DURATION_MS;

  // Server-authoritative: deduct CRYD and set vip_active_until atomically
  const result = await applyServerReward({
    crypto_delta: -VIP_COST_CRYD,
    stat_fields: { vip_active_until: vipActiveUntil, last_vip_daily_claim_date: null },
    reason: 'vip_purchase',
  });

  if (!result) return { success: false, message: 'Purchase failed. Please try again.' };

  // Patch local cache with VIP activation
  patchPlayerData({ vipActiveUntil, lastVipDailyClaimDate: null });

  return { success: true, updated: getPlayerData() };
};

// Buy VIP XP with CRYD (1 CRYD = 1 VIP XP). XP is permanent — never decreases.
export const buyVipXp = async (crydAmount, playerData) => {
  const current = playerData || getPlayerData();
  const amount = Math.max(1, Math.floor(crydAmount));
  if ((current.crypto || 0) < amount) {
    return { success: false, message: `Not enough CRYD (need ${amount})` };
  }

  // Server-authoritative: deduct CRYD and add VIP XP atomically
  const result = await applyServerReward({
    crypto_delta: -amount,
    vip_xp_delta: amount,
    reason: 'vip_xp_purchase',
  });

  if (!result) return { success: false, message: 'Purchase failed. Please try again.' };

  return { success: true, updated: getPlayerData() };
};

// Get today's date string in America/New_York (ET) timezone — server-authoritative reset boundary
const getETDateString = () => {
  const d = new Date();
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [, month, day, year] = etStr.match(/(\d+)\/(\d+)\/(\d+)/);
  return `${year}-${month}-${day}`;
};

export const canClaimDailyVip = (playerData) => {
  const data = playerData || getPlayerData();
  if (!isVipActive(data)) return false;
  const lastClaim = data.lastVipDailyClaimDate;
  if (!lastClaim) return true;
  // Use ET date — same server-authoritative boundary as FvF and territory income
  const today = getETDateString();
  return lastClaim !== today;
};

export const claimDailyVip = async (playerData) => {
  const current = playerData || getPlayerData();
  if (!isVipActive(current)) return { success: false, message: 'VIP not active' };
  if (!canClaimDailyVip(current)) return { success: false, message: 'Already claimed today' };

  // Server derives the ET date key server-side — this is just a hint for the client check
  const todayET = getETDateString();
  const rewardKey = `vip_daily_${todayET}`;
  const res = await base44.functions.invoke('claimReward', {
    reward_type: 'vip_daily',
    reward_key: rewardKey,
    cycle_id: rewardKey,
  });
  if (!res.data?.success) {
    // Already claimed on another device — sync local state
    savePlayerData({ lastVipDailyClaimDate: todayET });
    return { success: false, message: 'Already claimed on another device today' };
  }

  // Get level-based rewards
  const rewards = getVipDailyRewards(current);

  // Server-authoritative: cash reward + 200 VIP XP + set claim date atomically
  await applyServerReward({
    cash_delta: rewards.cash,
    vip_xp_delta: VIP_DAILY_CLAIM_XP,
    stat_fields: { last_vip_daily_claim_date: todayET },
    reason: 'vip_daily_reward',
  });

  // Server-authoritative: grant consumable items (avatar shards, weapon parts,
  // boosts) atomically on the server. This bypasses the debounced flush queue
  // so the items persist immediately — no risk of a stale cache or failed
  // sync dropping rewards after the claim lock is set.
  await grantConsumables({
    AVATAR_SHARD: rewards.avatarShards,
    GEAR_SHARD: rewards.weaponParts,
    OPCOVER_25: rewards.boosts,
    STAMINA_25: rewards.boosts,
    ENERGY_25: rewards.boosts,
  });

  return { success: true, updated: getPlayerData() };
};

export const formatVipTime = (ms) => {
  if (ms <= 0) return '0s';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};