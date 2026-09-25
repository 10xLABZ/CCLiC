/**
 * playerUtils.js — Pure utility functions and constants.
 * NO localStorage. NO side effects. NO server calls.
 * Safe to import from anywhere with zero circular dependency risk.
 */

export const DEFAULT_PLAYER = {
  username: 'InsiderTrader0000',
  profileImageDataUrl: null,
  equippedAvatarId: 'avatar_male_01',
  equippedSceneId: 'scene_default_01',
  equippedThemeId: 'theme_001_rusty_hotness',
  gender: 'M',
  level: 1,
  xp: 0,
  xpThisLevel: 0,
  xpToNext: 100,
  respect: 0,
  cash: 5000,
  crypto: 200,
  energy: 100,
  stamina: 100,
  opCover: 100,
  lastOpCoverTimestamp: Date.now(),
  fundMembersOwned: 0,
  attackValue: 10,
  defenseValue: 10,
  lastStaminaTimestamp: Date.now(),
  lastEnergyTimestamp: Date.now(),
  locationState: 'Texas',
  locationCity: 'Dallas',
  winstreak: 0,
  losstreak: 0,
  jobsCompletedToday: 0,
  tradesCompletedToday: 0,
  tradeWarsWonToday: 0,
  lastClaimDate: null,
  claimedDailyGoals: [],
  totalTradesCompleted: 0,
  totalTradingProfit: 0,
  totalJobsCompleted: 0,
  totalTradeWarWins: 0,
  totalTradeWarLosses: 0,
  totalAssists: 0,
  totalSabotages: 0,
  sabotagesRemaining: 20,
  lastSabotageRegenTimestamp: Date.now(),
  hasCompletedOnboarding: false,
  shieldActiveUntil: 0,
  shieldType: null,
  vipXp: 0,
  vipLevel: 1,
  loadoutPresets: null,
  allianceTag: null,
  equippedFrameId: null,
  ownedFrames: [],
  defenceLog: [],
  consumables: {
    ENERGY_25: 8,
    STAMINA_25: 8,
    OPCOVER_25: 8,
  },
  inventory: {
    firearms: { 'F000': 1 },
    weapons: {},
    vehicles: {},
    power: {},
    pets: {},
    avatars: {},
    scenes: {},
    themes: {}
  },
  loadout: {
    weapon1: 'F000',
    weapon2: null,
    weapon3: null,
    weapon4: null,
    vehicle: null,
    power: null,
    pet: null
  },
  equipped: {
    weapon1: null,
    weapon2: null,
    weapon3: null,
    weapon4: null,
    vehicle: null,
    personPower: null,
    pet: null,
  }
};

// Fields that ONLY the server can change (via applyGameReward).
// savePlayerData strips these before updating the in-memory cache.
export const SERVER_AUTHORITATIVE_FIELDS = [
  'cash', 'crypto', 'energy', 'stamina', 'opCover', 'respect', 'xp', 'level',
  'xpThisLevel', 'xpToNext',
  'lastEnergyTimestamp', 'lastStaminaTimestamp', 'lastOpCoverTimestamp',
  'lastSabotageRegenTimestamp',
  'winstreak', 'losstreak', 'jobsCompletedToday', 'tradesCompletedToday',
  'tradeWarsWonToday', 'totalTradesCompleted', 'totalTradingProfit',
  'totalJobsCompleted', 'totalTradeWarWins', 'totalTradeWarLosses',
  'totalAssists', 'totalSabotages', 'sabotagesRemaining',
  'shieldActiveUntil', 'shieldType', 'fundMembersOwned',
  'hiddenUntil', 'vipActiveUntil', 'vipXp', 'vipLevel',
];

export const getXPRequiredForLevel = (level) => {
  if (level <= 4) return 100;
  if (level <= 9) return 200;
  if (level <= 14) return 1000;
  if (level <= 20) return level * 100;
  if (level <= 30) return level * 150;
  if (level <= 40) return level * 300;
  if (level <= 50) return level * 500;
  return level * 1000;
};

export const recalcLevelFromTotalXP = (totalXP) => {
  totalXP = parseInt(totalXP) || 0;
  if (totalXP < 0) totalXP = 0;

  let level = 1;
  let xpRemaining = totalXP;

  while (true) {
    const xpNeeded = getXPRequiredForLevel(level);
    if (xpRemaining >= xpNeeded) {
      xpRemaining -= xpNeeded;
      level += 1;
    } else {
      break;
    }
  }

  return {
    level: Math.max(1, level),
    xpThisLevel: xpRemaining,
    xpToNext: getXPRequiredForLevel(level)
  };
};

export const processLevelUp = (playerData, explicitOldLevel = null) => {
  const totalXP = parseInt(playerData.xp) || 0;
  const oldLevel = explicitOldLevel !== null ? parseInt(explicitOldLevel) : parseInt(playerData.level) || 1;

  const { level, xpThisLevel, xpToNext } = recalcLevelFromTotalXP(totalXP);

  const levelsGained = [];
  if (level > oldLevel) {
    for (let i = oldLevel + 1; i <= level; i++) {
      levelsGained.push(i);
    }
  }

  return {
    ...playerData,
    level,
    xp: totalXP,
    xpThisLevel,
    xpToNext,
    levelsGained: levelsGained.length > 0 ? levelsGained : undefined
  };
};

export const getReputationTitle = (respect) => {
  if (respect >= 6000) return "Capital King";
  if (respect >= 3000) return "Fund Manager";
  if (respect >= 1500) return "Elite Trader";
  if (respect >= 700) return "Market Operator";
  if (respect >= 300) return "Dirty Trader";
  if (respect >= 100) return "Street Broker";
  return "Small Time";
};