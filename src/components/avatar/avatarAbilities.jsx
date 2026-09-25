// Avatar ability definitions and star progression

// Staggered ability pattern by unlock tier (same tier = same ability for M/F)
// Tier pattern cycles: Combat, Economist, Efficiency, Controller, Combat, Economist, ...
const ABILITY_TYPES = {
  Combat:     { type: 'Combat',     label: 'Combat',      icon: '⚔️',  stats: ['+ATK%', '+DEF%'] },
  Economist:  { type: 'Economist',  label: 'Economist',   icon: '💰',  stats: ['+Cash% from Jobs', '+Cash% from Fights'] },
  Efficiency: { type: 'Efficiency', label: 'Efficiency',  icon: '⚡',  stats: ['+XP% from Jobs', '+Trade Success%'] },
  Controller: { type: 'Controller', label: 'Controller',  icon: '🧊',  stats: ['-Heat% from Jobs', '+Heat Recovery Rate'] },
  // Special: The Architect — unique 4-stat ability
  Architect:  { type: 'Architect',  label: 'Architect',   icon: '🏛️', stats: ['+ATK%', '+DEF%', '+Cash% from All Sources', '+XP% from All Actions'], baseBonus: 1.0, bonusPerStar: 0.5 },
};

// Female variants differ slightly in stat descriptions but same type
const ABILITY_TYPES_F = {
  Combat:     { type: 'Combat',     label: 'Combat',      icon: '⚔️',  stats: ['+ATK%', '+DEF%'] },
  Economist:  { type: 'Economist',  label: 'Economist',   icon: '💰',  stats: ['+Cash% from Assists', '+Cash% from Trades'] },
  Efficiency: { type: 'Efficiency', label: 'Efficiency',  icon: '⚡',  stats: ['+XP% from Fights', '+Trade Success%'] },
  Controller: { type: 'Controller', label: 'Controller',  icon: '🧊',  stats: ['-Cash Lost% from Fights', '-Heat% from Fights'] },
};

// Tier unlock cycle (index 0 = lv4, 1 = lv6, etc. cycling through 4 types)
// Default avatars (01-04) each get one of the 4 types
// Premium avatars cycle through the 4 types per tier pair
const TIER_CYCLE = ['Combat', 'Economist', 'Efficiency', 'Controller'];

function tierAbility(tierIndex, female = false) {
  const type = TIER_CYCLE[tierIndex % 4];
  return female ? ABILITY_TYPES_F[type] : ABILITY_TYPES[type];
}

export const AVATAR_ABILITIES = {
  // Default male avatars
  avatar_male_01: ABILITY_TYPES.Combat,
  avatar_male_02: ABILITY_TYPES.Economist,
  avatar_male_03: ABILITY_TYPES.Efficiency,
  avatar_male_04: ABILITY_TYPES.Controller,
  // Default female avatars
  avatar_female_01: ABILITY_TYPES_F.Economist,
  avatar_female_02: ABILITY_TYPES_F.Combat,
  avatar_female_03: ABILITY_TYPES_F.Controller,
  avatar_female_04: ABILITY_TYPES_F.Efficiency,

  // Premium avatars — staggered by unlock tier (same index = same ability type for M/F)
  // Tier 0 (lv4)
  A_M_bashin_bobby:      tierAbility(0, false),
  A_F_chun_bao:          tierAbility(0, true),
  // Tier 1 (lv6)
  A_M_beshaun_beats:     tierAbility(1, false),
  A_F_corporate_chloe:   tierAbility(1, true),
  // Tier 2 (lv8)
  A_M_big_jay:           tierAbility(2, false),
  A_F_dezzy:             tierAbility(2, true),
  // Tier 3 (lv10)
  A_M_carlos_mucho_mula: tierAbility(3, false),
  A_F_hacking_hillary:   tierAbility(3, true),
  // Tier 4 (lv12)
  A_M_cool_clay:         tierAbility(0, false),
  A_F_maria_maria:       tierAbility(0, true),
  // Tier 5 (lv14) — goldhorn & samantina get Efficiency (swap with Tier 6)
  A_M_goldhorn:          tierAbility(2, false),
  A_F_samantina:         tierAbility(2, true),
  // Tier 6 (lv16) — swapped with Tier 5 to balance
  A_M_jazzy_jeff:        tierAbility(1, false),
  A_F_mei_lane:          tierAbility(1, true),
  // Tier 7 (lv18)
  A_M_johnny_boy:        tierAbility(3, false),
  A_F_nikki_shades:      tierAbility(3, true),
  // Tier 8 (lv21)
  A_M_tommy_gunz:        tierAbility(0, false),
  A_F_riley_red:         tierAbility(0, true),
  // Tier 8.5 (lv23)
  A_M_jet_rocksit:       tierAbility(1, false),
  // Tier 9 (lv22)
  A_M_machinegun_lou:    tierAbility(1, false),
  A_F_sasha_magasha:     tierAbility(1, true),
  // Tier 10 (lv24)
  A_M_martin_fly:        tierAbility(2, false),
  A_F_selena_sanchez:    tierAbility(2, true),
  // Tier 11 (lv26)
  A_M_mega_mills:        tierAbility(3, false),
  A_F_seriously_sasha:   tierAbility(3, true),
  // Tier 12 (lv28)
  A_M_militant_miguel:   tierAbility(0, false),
  A_F_sharp_cindy:       tierAbility(0, true),
  // Tier 13 (lv30)
  A_M_nick_mcsunny:      tierAbility(1, false),
  A_F_smoken_sherry:     tierAbility(1, true),
  // Tier 14 (lv32)
  A_M_paulie_pistols:    tierAbility(2, false),
  A_F_sophia_sweets:     tierAbility(2, true),
  // Tier 15 (lv34)
  A_M_sal_smokaccino:    tierAbility(3, false),
  A_F_su_sing_lee:       tierAbility(3, true),
  // H1 Set (lv36)
  A_M_dude_stone:        tierAbility(1, false),   // Economist 💰
  A_F_star_sunshine:     tierAbility(1, true),    // Economist 💰
  // R1 Set (lv38 F only)
  A_F_kitty_khords:      tierAbility(0, true),    // Combat ⚔️
  // F1 Set (lv42)
  A_M_frank_price:       tierAbility(2, false),   // Efficiency ⚡
  A_F_agent_cross:       tierAbility(3, true),    // Controller 🧊
  // S1 Set (lv44)
  A_M_ryder_riot:        tierAbility(0, false),   // Combat ⚔️
  A_F_nova_knox:         tierAbility(1, true),    // Economist 💰
  // Military Set (lv46)
  A_M_general_wreckette: tierAbility(0, false),   // Combat ⚔️
  A_F_general_longrange: tierAbility(0, true),    // Combat ⚔️
  // Science/Spy Set (lv48)
  A_M_dr_malik_quantum:  tierAbility(2, false),   // Efficiency ⚡
  A_F_audrey_cipher:     tierAbility(3, true),    // Controller 🧊
  // Gangster Set (lv20)
  A_M_jardon_wolfe:      ABILITY_TYPES.Economist,   // Economist 💰 (custom: +Cash% from Jobs/Trades)
  A_F_chantella:         tierAbility(1, true),    // Economist 💰
  // Money Set (lv25)
  A_M_mo_money:          tierAbility(1, false),   // Economist 💰
  A_F_carmen_cash:       tierAbility(1, true),    // Economist 💰
  // Street Set (lv35)
  A_M_darius_dzul_v2:    tierAbility(0, false),   // Combat ⚔️
  A_F_jamya_jajones:     tierAbility(2, true),    // Efficiency ⚡
  // Elite Solo (lv50)
  A_F_alma_rosera:       tierAbility(3, true),    // Controller 🧊
  A_M_mr_unknown:        tierAbility(3, false),   // Controller 🧊
  // Special avatar
  A_the_architect:       ABILITY_TYPES.Architect,
  // Level 75 avatars
  A_M_indigio:           { type: 'Combat', label: 'Combat', icon: '⚔️', stats: ['+ATK%', '+DEF%'] },
  A_F_indigia:           { type: 'Economist', label: 'Economist', icon: '💰', stats: ['+Cash% from Assists', '+Cash% from Trades'] },
  // Level 100 avatars
  A_M_lucifer:           { type: 'Combat', label: 'Combat', icon: '⚔️', stats: ['+ATK%', '+DEF%'] },
  A_F_lilith:            { type: 'Efficiency', label: 'Efficiency', icon: '⚡', stats: ['+XP% from Fights', '+Trade Success%'] },
  // U.S. Presidents - enhanced abilities (better than Architect)
  A_M_us_president:      { type: 'President', label: 'President', icon: '🇺🇸', stats: ['+ATK%', '+DEF%', '+Cash% from All Sources', '+XP% from All Actions', '+Respect% Gain'], baseBonus: 1.2, bonusPerStar: 0.6 },
  A_F_us_president:      { type: 'President', label: 'President', icon: '🇺🇸', stats: ['+ATK%', '+DEF%', '+Cash% from All Sources', '+XP% from All Actions', '+Respect% Gain'], baseBonus: 1.2, bonusPerStar: 0.6 },
  // Illuminati - ultimate abilities (better than Presidents)
  A_M_illuminati:        { type: 'Illuminati', label: 'Illuminati', icon: '👁️', stats: ['+ATK%', '+DEF%', '+Cash% from All Sources'], baseBonus: 1.5, bonusPerStar: 0.8 },
  A_F_illuminati:        { type: 'Illuminati', label: 'Illuminati', icon: '👁️', stats: ['+ATK%', '+DEF%', '+Cash% from All Sources'], baseBonus: 1.5, bonusPerStar: 0.8 },
  // CEO Pair (lv21) — +DEF% and +Cash% from Trades
  A_M_mr_ceo:            { type: 'Executive', label: 'Executive', icon: '💼', stats: ['+DEF%', '+Cash% from Trades'] },
  A_F_miss_ceo:          { type: 'Executive', label: 'Executive', icon: '💼', stats: ['+DEF%', '+Cash% from Trades'] },
  // Taz & Tasia (lv27) — +ATK% and +XP% from Fights
  A_M_taz:               { type: 'Fighter', label: 'Fighter', icon: '🥊', stats: ['+ATK%', '+XP% from Fights'] },
  A_F_tasia:             { type: 'Fighter', label: 'Fighter', icon: '🥊', stats: ['+ATK%', '+XP% from Fights'] },
};

// Star shard requirements (total shards needed to complete each star)
export const STAR_SHARD_REQUIREMENTS = [25, 50, 125, 250, 500, 600, 700, 800, 900, 1000];
export const SUBS_PER_STAR = 5;

export function getShardPerSub(starIndex) {
  return STAR_SHARD_REQUIREMENTS[starIndex] / SUBS_PER_STAR;
}

// Star level unlock thresholds (staggered):
// Stars 1-4: every 5 levels  → Lv1, Lv5, Lv10, Lv15, Lv20
// Stars 5-6: every 10 levels → Lv30, Lv40
// Stars 7-10: every 15 levels → Lv55, Lv70, Lv85, Lv100
// (index = star number, value = level required to unlock that star)
// STAR_UNLOCK_LEVELS[s] = player level required to unlock star s
// star 1 = lv1, star 2 = lv5, star 3 = lv10, star 4 = lv15, star 5 = lv20,
// star 6 = lv30, star 7 = lv40, star 8 = lv55, star 9 = lv70, star 10 = lv85
const STAR_UNLOCK_LEVELS = [0, 1, 5, 10, 15, 20, 30, 40, 55, 70, 85];
// Index 0 unused, [1..10] = required level for stars 1-10

// Max star unlocked based on player level
export function getMaxStarForLevel(playerLevel) {
  let max = 0;
  for (let s = 1; s <= 10; s++) {
    if (playerLevel >= STAR_UNLOCK_LEVELS[s]) max = s;
  }
  return Math.max(1, max);
}

// Required level to unlock a specific star number
export function getLevelRequiredForStar(star) {
  return STAR_UNLOCK_LEVELS[star] || 100;
}

// Returns current star + sub-tier from total shards spent on an avatar
// Progress bar tracks shards within current STAR (not sub-tier)
export function getAvatarStarProgress(totalShardsSpent) {
  let remaining = totalShardsSpent || 0;
  for (let star = 0; star < 10; star++) {
    const required = STAR_SHARD_REQUIREMENTS[star];
    if (remaining >= required) {
      remaining -= required;
    } else {
      // remaining = shards spent toward current star
      const subShards = getShardPerSub(star);
      const subTier = Math.floor(remaining / subShards);
      const subProgress = remaining - subTier * subShards; // shards into current sub-tier
      const starProgress = remaining;                       // total shards into current star
      return { star, subTier, subProgress, subShardsNeeded: subShards, starProgress, starShardsNeeded: required };
    }
  }
  return { star: 10, subTier: 0, subProgress: 0, subShardsNeeded: 0, starProgress: 0, starShardsNeeded: 0 };
}

// Stat bonus: each completed sub = +0.2%, or baseBonus + star * bonusPerStar for special avatars
export function getAvatarStatBonus(avatarId, totalShardsSpent) {
  const ability = AVATAR_ABILITIES[avatarId];
  if (!ability) return null;
  const { star, subTier } = getAvatarStarProgress(totalShardsSpent);
  const completedSubs = star * SUBS_PER_STAR + subTier;
  
  let bonusPct;
  if (ability.baseBonus !== undefined) {
    // Special avatars (Architect, President, Illuminati): base + per-star scaling
    bonusPct = ability.baseBonus + (star * ability.bonusPerStar);
  } else {
    bonusPct = parseFloat((completedSubs * 0.2).toFixed(1));
  }
  
  return { ability, bonusPct };
}