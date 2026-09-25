// XP and leveling system helper
// NOTE: This file is a legacy stub. All XP logic now lives in playerStorage.js (getXPRequiredForLevel, recalcLevelFromTotalXP, addXP).
// These exports are kept to avoid import errors in any files that still reference this module.

export { getXPRequiredForLevel, recalcLevelFromTotalXP as processXPGainAndLevelUp } from './playerStorage';

// Legacy compat shim — not used in new code
export const processXPGainAndLevelUpLegacy = (currentXP, currentLevel, xpGain) => {
  return { newLevel: currentLevel, newXP: currentXP + xpGain, xpToNextLevel: 1000, leveledUp: false, levelsGained: 0 };
};