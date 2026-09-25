export const FUNDBUX_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/f6daa3399_fundbux1.png";

export const FUND_TIERS = [
  { tier: 1, researchBonus: 2.5,  breakthroughBonus: 2.5,  researchCost: 5_000_000,     breakthroughCost: 1000 },
  { tier: 2, researchBonus: 5,    breakthroughBonus: 5,    researchCost: 25_000_000,    breakthroughCost: 2500 },
  { tier: 3, researchBonus: 7.5,  breakthroughBonus: 7.5,  researchCost: 100_000_000,   breakthroughCost: 7500 },
  { tier: 4, researchBonus: 10,   breakthroughBonus: 10,   researchCost: 500_000_000,   breakthroughCost: 20000 },
  { tier: 5, researchBonus: 10,   breakthroughBonus: 10,   researchCost: 2_500_000_000, breakthroughCost: 50000 },
  { tier: 6, researchBonus: 10,   breakthroughBonus: 20,   researchCost: 10_000_000_000, breakthroughCost: 125000 },
];

export const AVATAR_SHARD_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c5ea853fc_avatarshard1.png";
export const GEAR_PART_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c2b4a0d83_gearparts1.png";

export const FUND_SHOP_ITEMS = [
  { id: 'cover_25',     name: '+25 Op Cover',  cost: 100, emoji: '🛡️' },
  { id: 'energy_25',    name: '+25 Energy',    cost: 100, emoji: '🔋' },
  { id: 'stamina_25',   name: '+25 Stamina',   cost: 100, emoji: '⚡' },
  { id: 'shield_12h',   name: '12hr Shield',   cost: 100, emoji: '🌐' },
  { id: 'gear_part',    name: 'Gear Part',     cost: 250, emoji: '⚙️', iconUrl: GEAR_PART_ICON_URL, dailyLimited: true },
  { id: 'avatar_shard', name: 'Avatar Shard',  cost: 250, emoji: '✨', iconUrl: AVATAR_SHARD_ICON_URL, dailyLimited: true },
];

export const MIN_CASH_DONATION = 1000;
export const MIN_CRYD_DONATION = 50;
export const FUNDBUX_PER_UNIT = 10; // 10 FundBux per $1000 or 50 CRYD