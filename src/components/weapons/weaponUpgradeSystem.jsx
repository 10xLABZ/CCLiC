// Weapon Upgrade System — mirrors Avatar Upgrade System

export const WEAPON_STAR_COSTS = [25, 50, 125, 250, 500, 600, 700, 800, 900, 1000];
export const SUBS_PER_STAR = 5;

// Rarity base multipliers
export const RARITY_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.1,
  rare: 1.25,
  epic: 1.45,
  legendary: 1.7,
};

// Rarity-based upgrade bonus per completed sub-tier (50 subs total = 10 stars × 5 subs)
// Common: 2% per sub (100% max)
// Uncommon: 3% per sub (150% max)
// Rare: 5% per sub (250% max)
// Special: 5% per sub (250% max)
// Epic: 10% per sub (500% max)
// Legendary: 20% per sub (1000% max)
export const RARITY_UPGRADE_BONUS_PER_SUB = {
  common: 2.0,
  uncommon: 3.0,
  rare: 5.0,
  special: 5.0,
  epic: 10.0,
  legendary: 20.0,
};

export const getRarityUpgradeMaxPct = (rarity) => {
  const perSub = RARITY_UPGRADE_BONUS_PER_SUB[rarity] || RARITY_UPGRADE_BONUS_PER_SUB.common;
  return perSub * 50; // 50 total sub-tiers
};

// Archetype config
export const ARCHETYPE_CONFIG = {
  Assault: {
    label: 'Assault',
    icon: '⚔️',
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-800/40',
    description: '+ATK scaling, minor DEF',
  },
  Defense: {
    label: 'Defense',
    icon: '🛡️',
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-800/40',
    description: '+DEF scaling, minor ATK',
  },
  Tactical: {
    label: 'Tactical',
    icon: '🎯',
    color: 'text-purple-400',
    bg: 'bg-purple-900/20',
    border: 'border-purple-800/40',
    description: '+Job/Sabotage Success, minor ATK',
  },
};

// Collection bonus milestones
export const COLLECTION_MILESTONES = [
  { count: 5,  bonus: '+1% ATK' },
  { count: 10, bonus: '+1% DEF' },
  { count: 15, bonus: '+1% Job Success' },
  { count: 20, bonus: '+1% Trade Success' },
  { count: 25, bonus: '+2% ATK' },
  { count: 30, bonus: '+2% DEF' },
  { count: 35, bonus: '+1% Sabotage Success' },
  { count: 40, bonus: '+2% ATK' },
  { count: 45, bonus: '+2% DEF' },
  { count: 50, bonus: '+3% ATK' },
];

export const getNextCollectionMilestone = (owned) => {
  return COLLECTION_MILESTONES.find(m => m.count > owned) || null;
};

export const getUnlockedCollectionBonuses = (owned) => {
  return COLLECTION_MILESTONES.filter(m => m.count <= owned);
};

// Level required to unlock each star (1-indexed: starLevels[0] = star 1)
export const WEAPON_STAR_UNLOCK_LEVELS = [5, 10, 15, 20, 30, 40, 55, 70, 85, 100];

export const getWeaponMaxStarByPlayerLevel = (playerLevel) => {
  let maxStar = 0;
  for (let i = 0; i < WEAPON_STAR_UNLOCK_LEVELS.length; i++) {
    if (playerLevel >= WEAPON_STAR_UNLOCK_LEVELS[i]) maxStar = i + 1;
  }
  return maxStar;
};

// Returns cost per sub-upgrade for a given star (1-indexed)
export const getSubCost = (star) => {
  if (star < 1 || star > 10) return 0;
  return WEAPON_STAR_COSTS[star - 1] / SUBS_PER_STAR;
};

// Given total parts spent on a weapon, compute star/subTier/progress
export const getWeaponStarProgress = (totalPartsSpent) => {
  let remaining = totalPartsSpent || 0;
  let star = 0;
  for (let s = 1; s <= 10; s++) {
    const cost = WEAPON_STAR_COSTS[s - 1];
    if (remaining >= cost) {
      remaining -= cost;
      star = s;
    } else {
      // Within this star
      const subCost = cost / SUBS_PER_STAR;
      const subTier = Math.floor(remaining / subCost);
      const starProgress = remaining;
      const starPartsNeeded = cost;
      return { star, subTier, starProgress, starPartsNeeded };
    }
  }
  // Max star
  return { star: 10, subTier: 0, starProgress: 0, starPartsNeeded: 0 };
};

// Upgrade bonus: rarity-scaled per completed sub-tier
export const getWeaponUpgradeBonus = (totalPartsSpent, rarity) => {
  const { star, subTier } = getWeaponStarProgress(totalPartsSpent);
  const completedSubs = star * SUBS_PER_STAR + subTier;
  const perSub = RARITY_UPGRADE_BONUS_PER_SUB[rarity] || RARITY_UPGRADE_BONUS_PER_SUB.common;
  return parseFloat((completedSubs * perSub).toFixed(1));
};

// Get total parts spent for a specific weapon from playerData
export const getWeaponPartsSpent = (playerData, weaponId) => {
  return (playerData.weaponUpgrades || {})[weaponId] || 0;
};

// Get parts owned from consumables
export const getPartsOwned = (playerData) => {
  return (playerData.consumables || {})['GEAR_SHARD'] || 0;
};

// Perform an upgrade: spend parts on a weapon. Returns { success, message, updatedPlayer }
export const spendPartsOnWeapon = (playerData, weaponId, partsToSpend) => {
  const owned = getPartsOwned(playerData);
  if (partsToSpend > owned) {
    return { success: false, message: "Not enough parts." };
  }

  const currentSpent = getWeaponPartsSpent(playerData, weaponId);
  const { star } = getWeaponStarProgress(currentSpent);
  const playerMaxStar = getWeaponMaxStarByPlayerLevel(playerData.level || 1);

  if (star >= playerMaxStar) {
    // WEAPON_STAR_UNLOCK_LEVELS is 0-indexed: index i = level required for star (i+1)
    // so to unlock star (playerMaxStar + 1), we need index playerMaxStar
    const nextLevel = WEAPON_STAR_UNLOCK_LEVELS[playerMaxStar] || null;
    return {
      success: false,
      message: nextLevel
        ? `Locked: Reach Lv. ${nextLevel} to unlock next star.`
        : "Max star reached."
    };
  }

  const newSpent = currentSpent + partsToSpend;
  const newConsumables = {
    ...(playerData.consumables || {}),
    GEAR_SHARD: owned - partsToSpend
  };
  const newWeaponUpgrades = {
    ...(playerData.weaponUpgrades || {}),
    [weaponId]: newSpent
  };

  return {
    success: true,
    message: "Upgraded!",
    updatedPlayer: {
      ...playerData,
      consumables: newConsumables,
      weaponUpgrades: newWeaponUpgrades
    }
  };
};