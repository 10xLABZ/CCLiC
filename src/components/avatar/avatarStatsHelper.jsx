// Helper to compute stat bonuses from avatar abilities
import { AVATAR_ABILITIES, getAvatarStatBonus } from "./avatarAbilities";

/**
 * Applies avatar ability bonuses to player combat stats
 * @param {object} stats - Base stats { atk, def }
 * @param {string} avatarId - Avatar identifier
 * @param {number} totalShards - Total shards spent on avatar
 * @returns {object} Modified stats with bonuses applied
 */
export function applyAvatarStatBonuses(stats, avatarId, totalShards) {
  if (!avatarId) return stats;
  
  const bonusData = getAvatarStatBonus(avatarId, totalShards);
  if (!bonusData) return stats;
  
  const { ability, bonusPct } = bonusData;
  const mult = 1 + (bonusPct / 100);
  
  let atk = stats.atk;
  let def = stats.def;
  
  // Apply bonuses for Combat type avatars
  if (ability.type === 'Combat') {
    atk = Math.round(stats.atk * mult * 100) / 100;
    def = Math.round(stats.def * mult * 100) / 100;
  }
  
  // Architect, President, Illuminati: universal ATK + DEF bonus
  if (ability.type === 'Architect' || ability.type === 'President' || ability.type === 'Illuminati') {
    atk = Math.round(stats.atk * mult * 100) / 100;
    def = Math.round(stats.def * mult * 100) / 100;
  }
  
  return { atk, def };
}

/**
 * Calculates cash bonus multiplier from avatar abilities
 * @param {string} avatarId - Avatar identifier
 * @param {number} totalShards - Total shards spent on avatar
 * @param {string} source - Source of cash: 'job', 'fight', 'assist', 'trade'
 * @returns {number} Multiplier (1.0 = no bonus, 1.05 = +5% bonus)
 */
export function getCashBonusMultiplier(avatarId, totalShards, source) {
  if (!avatarId) return 1.0;
  
  const bonusData = getAvatarStatBonus(avatarId, totalShards);
  if (!bonusData) return 1.0;
  
  const { ability, bonusPct } = bonusData;
  
  // Economist avatars grant cash bonuses
  if (ability.type === 'Economist') {
    // Male: Jobs + Fights, Female: Assists + Trades
    const validSources = ability.label === 'Economist' && ability.stats[0]?.includes('Jobs')
      ? ['job', 'fight']
      : ['assist', 'trade'];
    
    if (validSources.includes(source)) {
      return 1 + (bonusPct / 100);
    }
  }
  
  // Architect, President, Illuminati grant universal cash bonus
  if (ability.type === 'Architect' || ability.type === 'President' || ability.type === 'Illuminati') {
    return 1 + (bonusPct / 100);
  }
  
  return 1.0;
}

/**
 * Calculates XP bonus multiplier from avatar abilities
 * @param {string} avatarId - Avatar identifier
 * @param {number} totalShards - Total shards spent on avatar
 * @param {string} source - Source of XP: 'job', 'fight', 'trade'
 * @returns {number} Multiplier (1.0 = no bonus, 1.05 = +5% bonus)
 */
export function getXPBonusMultiplier(avatarId, totalShards, source) {
  if (!avatarId) return 1.0;
  
  const bonusData = getAvatarStatBonus(avatarId, totalShards);
  if (!bonusData) return 1.0;
  
  const { ability, bonusPct } = bonusData;
  
  // Efficiency avatars grant XP bonuses
  if (ability.type === 'Efficiency') {
    // Male: Jobs + Trade Success, Female: Fights + Trade Success
    const validSources = ability.label === 'Efficiency' && ability.stats[0]?.includes('Jobs')
      ? ['job']
      : ['fight'];
    
    if (validSources.includes(source) || source === 'trade') {
      return 1 + (bonusPct / 100);
    }
  }
  
  // Architect, President, Illuminati grant universal XP bonus
  if (ability.type === 'Architect' || ability.type === 'President' || ability.type === 'Illuminati') {
    return 1 + (bonusPct / 100);
  }
  
  return 1.0;
}