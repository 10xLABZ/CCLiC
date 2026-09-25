/**
 * researchHelper.js
 * Research system config and bonus calculation.
 *
 * Research is stored as { itemId: level } in playerData.research.
 * Each item has 3 tiers (I, II, III) with 5 levels each (15 max).
 * Lab level gates tier access. All costs are Cash-based (no CRYD/shards/parts).
 *
 * Bonus keys are kept backward-compatible with existing consumers:
 *   playerStatsHelper.js → rb.weaponAtk, rb.weaponDef, rb.combatAtk
 *   CityJobsContent.jsx  → rb.jobCash, rb.heatReduction (now 0)
 *   BattleEngine.jsx     → rb.battleCash
 *   tradingEngine.jsx    → rb.tradeCash
 *   playerStorage.jsx    → rb.xp (now 0)
 */

export const MAX_LAB_LEVEL = 25;
export const MAX_RESEARCH_LEVEL = 15; // 3 tiers × 5 levels

// Tier configuration: which levels belong to each tier and lab gate
export const RESEARCH_TIERS = [
  { tier: 1, name: 'I',   levelRange: [1, 5],   labLevelReq: 0 },
  { tier: 2, name: 'II',  levelRange: [6, 10],  labLevelReq: 8 },
  { tier: 3, name: 'III', levelRange: [11, 15], labLevelReq: 16 },
];

// Cash cost per research level (index = current level → cost for next)
export const RESEARCH_COSTS = [
  5_000, 10_000, 25_000, 50_000, 100_000,                     // Tier I
  500_000, 1_000_000, 5_000_000, 20_000_000, 50_000_000,      // Tier II
  150_000_000, 300_000_000, 600_000_000, 900_000_000, 2_000_000_000, // Tier III
];

// Bonus % gained per level, by research type
export const BONUS_PER_LEVEL = {
  atk:          [0.5, 0.5, 0.5, 0.5, 0.5,  1, 1, 1, 1, 1,  2, 2, 2, 2, 2],
  def:          [0.5, 0.5, 0.5, 0.5, 0.5,  1, 1, 1, 1, 1,  2, 2, 2, 2, 2],
  economy:      [1, 1, 1, 1, 1,  2, 2, 2, 2, 2,  3, 3, 3, 3, 3],
  lossReduction:[2, 2, 2, 2, 2,  3, 3, 3, 3, 3,  5, 5, 5, 5, 5],
};

// Research items: id → { label, bonusKey, type, tab, icon }
export const RESEARCH_ITEMS = {
  // ── ATK ──────────────────────────────────────────────────────
  atk_avatar:      { label: 'Avatar ATK',      bonusKey: 'weaponAtk',      type: 'atk',           tab: 'avatar',  icon: '👤' },
  atk_firearms:    { label: 'Firearms ATK',    bonusKey: 'weaponAtk',      type: 'atk',           tab: 'weapons', icon: '🔫' },
  atk_accessories: { label: 'Accessories ATK', bonusKey: 'weaponAtk',      type: 'atk',           tab: 'weapons', icon: '🗡️' },
  atk_pop:         { label: 'POP ATK',         bonusKey: 'weaponAtk',      type: 'atk',           tab: 'hq',      icon: '💪' },
  atk_pets:        { label: 'Pets ATK',        bonusKey: 'weaponAtk',      type: 'atk',           tab: 'hq',      icon: '🐺' },
  atk_vehicles:    { label: 'Vehicles ATK',    bonusKey: 'weaponAtk',      type: 'atk',           tab: 'hq',      icon: '🚗' },
  // ── DEF ──────────────────────────────────────────────────────
  def_avatar:      { label: 'Avatar DEF',      bonusKey: 'weaponDef',      type: 'def',           tab: 'avatar',  icon: '👤' },
  def_firearms:    { label: 'Firearms DEF',    bonusKey: 'weaponDef',      type: 'def',           tab: 'weapons', icon: '🔫' },
  def_accessories: { label: 'Accessories DEF', bonusKey: 'weaponDef',      type: 'def',           tab: 'weapons', icon: '🗡️' },
  def_pop:         { label: 'POP DEF',         bonusKey: 'weaponDef',      type: 'def',           tab: 'hq',      icon: '💪' },
  def_pets:        { label: 'Pets DEF',        bonusKey: 'weaponDef',      type: 'def',           tab: 'hq',      icon: '🐺' },
  def_vehicles:    { label: 'Vehicles DEF',    bonusKey: 'weaponDef',      type: 'def',           tab: 'hq',      icon: '🚗' },
  // ── Economy ──────────────────────────────────────────────────
  eco_insider:     { label: 'Insider Tips $',  bonusKey: 'tradeCash',      type: 'economy',       tab: 'economy', icon: '💡' },
  eco_jobs:        { label: 'Job Income $',    bonusKey: 'jobCash',        type: 'economy',       tab: 'economy', icon: '📋' },
  eco_assists:     { label: 'Assist Income $', bonusKey: 'assistCash',     type: 'economy',       tab: 'economy', icon: '🤝' },
  eco_battle_gain: { label: 'Battle Gain $',   bonusKey: 'battleCash',     type: 'economy',       tab: 'economy', icon: '⚔️' },
  eco_battle_loss: { label: 'Loss Reduction',  bonusKey: 'lossProtection', type: 'lossReduction', tab: 'economy', icon: '🛡️' },
};

// Tab configuration
export const RESEARCH_TABS = {
  avatar:  { label: 'Avatar',  icon: '👤', color: 'text-yellow-400',  borderColor: 'border-yellow-700/50',  bgColor: 'bg-yellow-900/10' },
  weapons: { label: 'Weapons', icon: '⚔️', color: 'text-orange-400', borderColor: 'border-orange-700/50', bgColor: 'bg-orange-900/10' },
  economy: { label: 'Economy', icon: '💰', color: 'text-emerald-400',borderColor: 'border-emerald-700/50',bgColor: 'bg-emerald-900/10' },
  hq:      { label: 'HQ',      icon: '🏛️', color: 'text-cyan-400',   borderColor: 'border-cyan-700/50',   bgColor: 'bg-cyan-900/10' },
};

// ── Cost / Bonus helpers ──────────────────────────────────────

// Lab upgrade cost per level (index = current level → cost for next)
export const LAB_UPGRADE_COSTS = [
  // Tier 1 (Lv 1–8): affordable flat growth
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 750_000, 1_000_000,
  // Tier 2 (Lv 9–16): moderate growth
  2_500_000, 5_000_000, 10_000_000, 20_000_000, 35_000_000, 50_000_000, 75_000_000, 100_000_000,
  // Tier 3 (Lv 17–25): steep exponential growth
  200_000_000, 350_000_000, 500_000_000, 750_000_000, 1_000_000_000,
  1_500_000_000, 2_000_000_000, 3_000_000_000, 5_000_000_000,
];

export const getLabUpgradeCost = (currentLevel) => {
  if (currentLevel >= MAX_LAB_LEVEL) return 0;
  return LAB_UPGRADE_COSTS[currentLevel] || 0;
};

// Lab level required to access a given research level
export const getLabLevelForResearchLevel = (researchLevel) => {
  for (const tier of RESEARCH_TIERS) {
    if (researchLevel >= tier.levelRange[0] && researchLevel <= tier.levelRange[1]) {
      return tier.labLevelReq;
    }
  }
  return 0;
};

// Cash cost to upgrade a research item from currentLevel → currentLevel + 1
export const getResearchCost = (currentLevel) => {
  if (currentLevel >= MAX_RESEARCH_LEVEL) return 0;
  return RESEARCH_COSTS[currentLevel];
};

// Total cumulative bonus for a research item at a given level
export const getResearchItemBonus = (itemId, level) => {
  const item = RESEARCH_ITEMS[itemId];
  if (!item) return 0;
  const bonusArr = BONUS_PER_LEVEL[item.type] || BONUS_PER_LEVEL.economy;
  let total = 0;
  for (let i = 0; i < level && i < bonusArr.length; i++) {
    total += bonusArr[i];
  }
  return total;
};

// Get tier object for a given research level
export const getResearchTier = (level) => {
  for (const tier of RESEARCH_TIERS) {
    if (level >= tier.levelRange[0] && level <= tier.levelRange[1]) {
      return tier;
    }
  }
  return RESEARCH_TIERS[0];
};

// Elite bonus: passive, based on HQ level (fundMembers)
export const getEliteBonus = (hqLevel) => {
  return Math.min(20, Math.floor((hqLevel || 0) / 5));
};

/**
 * Returns an object with all active research bonus totals (in %).
 * All values are percentages (e.g., weaponAtk: 5 means +5%).
 *
 * Keys are backward-compatible with existing consumers.
 * Removed categories (heatReduction, xp, critChance, combatAtk, tradeSuccess)
 * return 0 so existing code doesn't break.
 */
export const getResearchBonuses = (playerData) => {
  const research = playerData?.research || {};
  const bonuses = {
    weaponAtk: 0,
    weaponDef: 0,
    jobCash: 0,
    tradeCash: 0,
    battleCash: 0,
    lossProtection: 0,
    assistCash: 0,
    // Legacy keys — always 0 (removed from research)
    heatReduction: 0,
    xp: 0,
    critChance: 0,
    combatAtk: 0,
    tradeSuccess: 0,
  };

  for (const [itemId, level] of Object.entries(research)) {
    const item = RESEARCH_ITEMS[itemId];
    if (!item) continue; // skip unknown/old node IDs
    const lvl = typeof level === 'number' ? level : (level ? 1 : 0);
    if (lvl <= 0) continue;
    const bonus = getResearchItemBonus(itemId, lvl);
    if (bonuses[item.bonusKey] !== undefined) {
      bonuses[item.bonusKey] += bonus;
    }
  }

  // Elite Bonus — passive, based on HQ level
  const hqLevel = playerData?.fundMembersOwned || 0;
  const elite = getEliteBonus(hqLevel);
  bonuses.weaponAtk += elite;
  bonuses.weaponDef += elite;

  return bonuses;
};

/**
 * Apply a percentage bonus to a base value.
 * e.g. applyBonus(100, 15) => 115
 */
export const applyBonus = (base, bonusPct) => {
  if (!bonusPct) return base;
  return Math.round(base * (1 + bonusPct / 100));
};

/**
 * Reduce a percentage value (e.g. heat gained) by bonusPct.
 * e.g. applyReduction(10, 20) => 8  (20% less)
 */
export const applyReduction = (base, reductionPct) => {
  if (!reductionPct) return base;
  return Math.max(0, Math.round(base * (1 - reductionPct / 100)));
};