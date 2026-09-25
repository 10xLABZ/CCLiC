/**
 * Simple Upgrade System — HQ-style leveling for Vehicles, Pets, and People of Power.
 *
 * Design:
 *   - Each item has a simple integer level (0-10)
 *   - Upgrading costs CRYD only (no parts/shards)
 *   - Each level grants +5% to the item's base ATK & DEF
 *   - Max level is 10
 *   - Player level gates which upgrade levels are unlocked
 *
 * Stored in PlayerInventory.simpleUpgrades as:
 *   { "V001": 3, "P005": 1, "T010": 5 }
 */

export const MAX_UPGRADE_LEVEL = 10;

// Player level required to unlock each upgrade level (0-indexed: index = upgrade level)
// Level 0 = no upgrade, Level 1 = first upgrade, etc.
export const UPGRADE_UNLOCK_LEVELS = [
  1,   // Upgrade Level 0 (base) — always available
  5,   // Upgrade Level 1
  10,  // Upgrade Level 2
  15,  // Upgrade Level 3
  20,  // Upgrade Level 4
  30,  // Upgrade Level 5
  40,  // Upgrade Level 6
  55,  // Upgrade Level 7
  70,  // Upgrade Level 8
  85,  // Upgrade Level 9
  100, // Upgrade Level 10 (max)
];

// CRYD cost per upgrade level (index = current upgrade level → cost to reach next)
export const UPGRADE_CRYD_COSTS = [
  25,   // Lv 0 → 1
  50,   // Lv 1 → 2
  100,  // Lv 2 → 3
  175,  // Lv 3 → 4
  300,  // Lv 4 → 5
  500,  // Lv 5 → 6
  800,  // Lv 6 → 7
  1200, // Lv 7 → 8
  1800, // Lv 8 → 9
  2500, // Lv 9 → 10
];

// Each upgrade level adds +5% to base ATK & DEF
export const BONUS_PER_LEVEL = 5;

/**
 * Get the current upgrade level for an item.
 * @param {object} playerData - Player data containing simpleUpgrades map
 * @param {string} itemId - Item ID
 * @returns {number} Upgrade level (0-10)
 */
export const getUpgradeLevel = (playerData, itemId) => {
  if (!playerData || !itemId) return 0;
  const upgrades = playerData.simpleUpgrades || {};
  return upgrades[itemId] || 0;
};

/**
 * Get the max upgrade level a player can reach based on their player level.
 * @param {number} playerLevel
 * @returns {number} Max upgrade level (0-10)
 */
export const getMaxUpgradeByPlayerLevel = (playerLevel) => {
  let maxLevel = 0;
  for (let i = 0; i < UPGRADE_UNLOCK_LEVELS.length; i++) {
    if (playerLevel >= UPGRADE_UNLOCK_LEVELS[i]) maxLevel = i;
  }
  return maxLevel;
};

/**
 * Get the CRYD cost to upgrade from the current level to the next.
 * @param {number} currentLevel
 * @returns {number} CRYD cost
 */
export const getUpgradeCost = (currentLevel) => {
  if (currentLevel < 0 || currentLevel >= MAX_UPGRADE_LEVEL) return 0;
  return UPGRADE_CRYD_COSTS[currentLevel] || 0;
};

/**
 * Get the bonus percentage for a given upgrade level.
 * @param {number} upgradeLevel
 * @returns {number} Bonus percentage (e.g. 25 = +25%)
 */
export const getUpgradeBonusPct = (upgradeLevel) => {
  return (upgradeLevel || 0) * BONUS_PER_LEVEL;
};

/**
 * Get the player level required to unlock the next upgrade level.
 * @param {number} currentLevel
 * @returns {number|null} Player level required, or null if already maxed
 */
export const getNextUnlockLevel = (currentLevel) => {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return null;
  return UPGRADE_UNLOCK_LEVELS[currentLevel + 1] || null;
};

/**
 * Validate and prepare an upgrade transaction.
 * @param {object} playerData
 * @param {string} itemId
 * @returns {{ canUpgrade: boolean, reason?: string, cost?: number, newLevel?: number }}
 */
export const validateUpgrade = (playerData, itemId) => {
  const currentLevel = getUpgradeLevel(playerData, itemId);
  const playerLevel = playerData?.level || 1;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return { canUpgrade: false, reason: 'Max level reached.' };
  }

  const maxAllowed = getMaxUpgradeByPlayerLevel(playerLevel);
  if (currentLevel >= maxAllowed) {
    const nextUnlock = getNextUnlockLevel(currentLevel);
    return {
      canUpgrade: false,
      reason: nextUnlock ? `Locked: Reach Lv. ${nextUnlock} to upgrade further.` : 'Max level reached.',
    };
  }

  const cost = getUpgradeCost(currentLevel);
  const playerCrypto = playerData?.crypto || 0;

  if (playerCrypto < cost) {
    return { canUpgrade: false, reason: `Need ${cost} CRYD.`, cost, newLevel: currentLevel + 1 };
  }

  return { canUpgrade: true, cost, newLevel: currentLevel + 1 };
};

/**
 * Category → loadout slot mapping for simple upgrade categories.
 */
export const SIMPLE_UPGRADE_SLOTS = {
  vehicles: 'vehicle',
  power: 'power',
  pets: 'pet',
};

/**
 * Categories that support simple upgrades.
 */
export const SIMPLE_UPGRADE_CATEGORIES = ['vehicles', 'power', 'pets'];