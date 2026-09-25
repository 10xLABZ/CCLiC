/**
 * dailyGiftHelper.js — Daily gift tracking with server-authoritative sync.
 *
 * localStorage caches the "claimed today" flag for instant UI rendering,
 * but the server (claimReward backend function) is the source of truth.
 * On mount, components should call syncDailyGiftClaimedState() to verify
 * the local cache against the server — this prevents false "unclaimed"
 * notifications when localStorage is stale or cleared.
 */

const TODAY = () => new Date().toISOString().split('T')[0];

export const isDailyGiftClaimed = (type) => {
  try {
    return localStorage.getItem(`daily_gift_${type}_${TODAY()}`) === 'true';
  } catch {
    return false;
  }
};

export const markDailyGiftClaimed = (type) => {
  try {
    localStorage.setItem(`daily_gift_${type}_${TODAY()}`, 'true');
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('daily_gift_changed'));
  }
};

/**
 * Server-authoritative check: queries the server to see if a daily gift
 * has already been claimed today. Updates localStorage to match.
 *
 * @param {string} type — 'vip' or 'dvs'
 * @returns {Promise<boolean>} true if the server confirms it's been claimed
 */
export const syncDailyGiftClaimedState = async (type) => {
  try {
    const { base44 } = await import('@/api/base44Client');
    const user = await base44.auth.me();
    if (!user) return isDailyGiftClaimed(type);

    const rewardKey = `daily_gift_${type}_${TODAY()}`;
    const claims = await base44.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: rewardKey,
    });

    const serverClaimed = claims.length > 0;
    const localClaimed = isDailyGiftClaimed(type);

    // Sync localStorage to match server truth
    if (serverClaimed && !localClaimed) {
      try {
        localStorage.setItem(`daily_gift_${type}_${TODAY()}`, 'true');
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('daily_gift_changed'));
      }
    }

    return serverClaimed;
  } catch {
    return isDailyGiftClaimed(type);
  }
};

export const VIP_GIFTS = [
  { type: 'igc', amount: 2500, label: '+2,500 IGC', icon: '💵' },
  { type: 'consumable', key: 'OPCOVER_25', amount: 1, label: '+25 Op Cover', icon: '🛡️' },
  { type: 'consumable', key: 'STAMINA_25', amount: 1, label: '+25 Stamina', icon: '⚡' },
  { type: 'consumable', key: 'ENERGY_25', amount: 1, label: '+25 Energy', icon: '🔋' },
];

export const DVS_GIFT = { type: 'igc', amount: 2500, label: '+2,500 IGC', icon: '💵' };

export const CHEST_BG_URL = 'https://media.base44.com/images/public/699169456a354d6cb7082777/8605bc2d6_chest-bg.jpg';

export const CHEST_IMG_URLS = {
  1: 'https://media.base44.com/images/public/699169456a354d6cb7082777/5a4d32323_chest-1.png',
  2: 'https://media.base44.com/images/public/699169456a354d6cb7082777/3f35a0c6e_chest-2.png',
  3: 'https://media.base44.com/images/public/699169456a354d6cb7082777/80a0c1a87_chest-3.png',
  4: 'https://media.base44.com/images/public/699169456a354d6cb7082777/db19182ff_chest-4.png',
  5: 'https://media.base44.com/images/public/699169456a354d6cb7082777/fe5ee6a4a_chest-5.png',
  6: 'https://media.base44.com/images/public/699169456a354d6cb7082777/91157afde_chest-6.png',
};