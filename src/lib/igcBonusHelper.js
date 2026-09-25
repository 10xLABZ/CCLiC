/**
 * IGC Bonus Helper — calculates IGC (cash) boost from equipped accessories.
 * Accessories (weapon3/weapon4 slots) grant a percentage bonus to all cash earnings.
 * The bonus scales with weapon upgrade level (same multiplier as ATK/DEF).
 */
import { WEAPONS } from '@/components/store/catalogData';
import { getWeaponUpgradeBonus } from '@/components/weapons/weaponUpgradeSystem';
import { getCashBonusMultiplier } from '@/components/avatar/avatarStatsHelper';
import { getPlayerData } from '@/components/utils/playerStorage';

/**
 * Returns the total IGC bonus percentage from equipped accessories only.
 * Does NOT include avatar cash bonus.
 * @param {object} playerData
 * @returns {number} Percentage (e.g. 15.5 for 15.5%)
 */
export function getAccessoryIgcBonus(playerData) {
  const player = playerData || getPlayerData();
  const loadout = player.loadout || {};
  let totalPct = 0;

  ['weapon3', 'weapon4'].forEach(slot => {
    const itemId = loadout[slot];
    if (itemId && typeof itemId === 'string') {
      const item = WEAPONS.find(w => w.id === itemId);
      if (item && item.igcBonus) {
        const spent = (player.weaponUpgrades || {})[itemId] || 0;
        const upgradeBonusPct = getWeaponUpgradeBonus(spent, item.rarity) / 100;
        totalPct += item.igcBonus * (1 + upgradeBonusPct);
      }
    }
  });

  return totalPct;
}

/**
 * Returns the IGC multiplier from accessories (1.0 = no bonus, 1.15 = +15%)
 * @param {object} playerData
 * @returns {number}
 */
export function getAccessoryIgcMultiplier(playerData) {
  return 1 + (getAccessoryIgcBonus(playerData) / 100);
}

/**
 * Returns a breakdown of IGC bonus from accessories + avatar cash bonus.
 * Used for display in Strength Breakdown Modal.
 * @param {object} playerData
 * @returns {{ total: number, accessory: number, avatar: number }}
 */
export function getFullIgcBreakdown(playerData) {
  const player = playerData || getPlayerData();
  const accessory = getAccessoryIgcBonus(player);

  const avatarId = player.equippedAvatarId;
  const avatarShards = (player.avatarUpgrades || {})[avatarId] || 0;
  const avatarCashMult = getCashBonusMultiplier(avatarId, avatarShards, 'job');
  const avatar = avatarCashMult > 1 ? (avatarCashMult - 1) * 100 : 0;

  return { total: accessory + avatar, accessory, avatar };
}