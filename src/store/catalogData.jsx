// === ECONOMY MODEL: 1 USD ≈ 10,000 IGC | 1 CRYD ≈ $0.02 USD ===
// Revenue increased 12% across all sources.
// Items staggered across 200 levels - not aligned between categories.
// Featured premium items (CRYD only, gold border) at top of each shop tab.

// === LEVEL UNLOCK ARRAYS (50 items each, staggered across levels 1-200) ===
const WEAPON_UNLOCK_LEVELS = [
  1, 3, 6, 9, 12, 15, 18, 22, 26, 30,
  34, 38, 43, 48, 53, 58, 63, 68, 74, 80,
  86, 92, 98, 104, 110, 116, 122, 128, 134, 140,
  146, 151, 156, 160, 164, 167, 170, 173, 176, 179,
  181, 183, 185, 187, 189, 191, 193, 195, 197, 200
];

const VEHICLE_UNLOCK_LEVELS = [
  1, 5, 8, 11, 14, 17, 20, 24, 28, 32,
  36, 40, 45, 50, 55, 60, 65, 70, 76, 82,
  88, 94, 100, 106, 112, 118, 124, 130, 136, 142,
  147, 152, 157, 161, 165, 168, 171, 174, 177, 180,
  182, 184, 186, 188, 190, 192, 194, 196, 198, 200
];

const POP_UNLOCK_LEVELS = [
  1, 7, 11, 16, 21, 26, 31, 36, 42, 48,
  54, 60, 66, 72, 78, 84, 90, 96, 102, 108,
  114, 120, 126, 132, 138, 144, 149, 154, 158, 162,
  165, 168, 171, 173, 175, 177, 179, 181, 183, 185,
  186, 187, 188, 189, 190, 191, 192, 194, 196, 200
];

const PET_UNLOCK_LEVELS = [
  1, 4, 8, 13, 19, 25, 30, 35, 40, 45,
  51, 57, 63, 69, 75, 81, 87, 93, 99, 105,
  111, 117, 123, 129, 135, 141, 146, 151, 155, 159,
  163, 166, 169, 172, 175, 177, 179, 181, 183, 185,
  186, 187, 188, 189, 190, 191, 192, 194, 196, 199
];

// === PRICING FUNCTIONS (based on item index 0-49) ===
// Economy: 1 USD = 10,000 IGC | 1 CRYD ≈ $0.02 USD (500 CRYD = $9.99)
// First 3 weapons IGC (starter items). Everything else CRYD, scaling with power.
const getWeaponPrice = (index) => {
  if (index === 0) return { priceCash: 500, priceCrypto: 0 };   // Starter 1
  if (index === 1) return { priceCash: 800, priceCrypto: 0 };   // Starter 2
  if (index === 2) return { priceCash: 1200, priceCrypto: 0 };  // Starter 3
  // All remaining weapons are CRYD only
  if (index < 12) return { priceCash: 0, priceCrypto: Math.round(15 + (index - 3) * 5) };   // Common 4-12: 15-55 CRYD
  if (index < 24) return { priceCash: 0, priceCrypto: Math.round(60 + (index - 12) * 15) }; // Uncommon: 60-225 CRYD
  if (index < 34) return { priceCash: 0, priceCrypto: Math.round(200 + (index - 24) * 30) };// Rare: 200-470 CRYD
  if (index < 43) return { priceCash: 0, priceCrypto: Math.round(500 + (index - 34) * 50) };// Epic: 500-900 CRYD
  return { priceCash: 0, priceCrypto: Math.round(1000 + (index - 43) * 100) };              // Legendary: 1000-1600 CRYD
};

// First 1 vehicle cheap IGC. Rest scale up in CRYD.
const getVehiclePrice = (index) => {
  if (index === 0) return { priceCash: 1000, priceCrypto: 0 };  // Starter vehicle
  if (index < 10) return { priceCash: 0, priceCrypto: Math.round(30 + (index - 1) * 15) };   // 30-165 CRYD
  if (index < 20) return { priceCash: 0, priceCrypto: Math.round(200 + (index - 10) * 30) }; // 200-470 CRYD
  if (index < 35) return { priceCash: 0, priceCrypto: Math.round(500 + (index - 20) * 40) }; // 500-1060 CRYD
  return { priceCash: 0, priceCrypto: Math.round(1100 + (index - 35) * 60) };               // 1100-1940 CRYD
};

// First 1 PoP cheap IGC. Rest scale up in CRYD.
const getPoPPrice = (index) => {
  if (index === 0) return { priceCash: 1500, priceCrypto: 0 };  // Starter PoP
  if (index < 10) return { priceCash: 0, priceCrypto: Math.round(40 + (index - 1) * 20) };   // 40-220 CRYD
  if (index < 20) return { priceCash: 0, priceCrypto: Math.round(250 + (index - 10) * 40) }; // 250-610 CRYD
  if (index < 35) return { priceCash: 0, priceCrypto: Math.round(650 + (index - 20) * 55) }; // 650-1470 CRYD
  return { priceCash: 0, priceCrypto: Math.round(1500 + (index - 35) * 80) };               // 1500-2620 CRYD
};

// First 1 pet cheap IGC. Rest scale up in CRYD.
const getPetPrice = (index) => {
  if (index === 0) return { priceCash: 800, priceCrypto: 0 };   // Starter pet
  if (index < 10) return { priceCash: 0, priceCrypto: Math.round(25 + (index - 1) * 12) };   // 25-133 CRYD
  if (index < 20) return { priceCash: 0, priceCrypto: Math.round(150 + (index - 10) * 25) }; // 150-375 CRYD
  if (index < 35) return { priceCash: 0, priceCrypto: Math.round(400 + (index - 20) * 40) }; // 400-960 CRYD
  return { priceCash: 0, priceCrypto: Math.round(1000 + (index - 35) * 50) };               // 1000-1750 CRYD
};

const getAvatarCrydPrice = (requiredLevel) => {

  if (requiredLevel <= 10) return 100;
  if (requiredLevel <= 20) return 175;
  if (requiredLevel <= 30) return 250;
  if (requiredLevel <= 40) return 350;
  if (requiredLevel <= 50) return 500;
  if (requiredLevel <= 75) return 700;
  if (requiredLevel <= 100) return 1000;
  if (requiredLevel <= 125) return 1200;
  return 1500;
};

// === WEAPON RARITY ===
const WEAPON_RARITY_MAP = (index) => {
  const equipLevel = WEAPON_UNLOCK_LEVELS[index] || 1;
  if (index < 12) return { rarity: 'common', equipLevel, borderColor: 'border-slate-500', rarityColor: 'text-slate-400', rarityLabel: 'Common' };
  if (index < 24) return { rarity: 'uncommon', equipLevel, borderColor: 'border-green-600', rarityColor: 'text-green-400', rarityLabel: 'Uncommon' };
  if (index < 34) return { rarity: 'rare', equipLevel, borderColor: 'border-blue-500', rarityColor: 'text-blue-400', rarityLabel: 'Rare' };
  if (index < 43) return { rarity: 'epic', equipLevel, borderColor: 'border-purple-500', rarityColor: 'text-purple-400', rarityLabel: 'Epic' };
  return { rarity: 'legendary', equipLevel, borderColor: 'border-yellow-400', rarityColor: 'text-yellow-400', rarityLabel: 'Legendary' };
};

const WEAPON_ARCHETYPES = Array.from({ length: 50 }, (_, i) => {
  const cycle = i % 3;
  if (cycle === 0) return 'Assault';
  if (cycle === 1) return 'Defense';
  return 'Tactical';
});

// === FEATURED ITEMS (top of each shop tab, CRYD only, gold border, high stats) ===
// Featured items: all available at Level 10 ($9.99-$19.99 USD via CRYD)

// Featured FIREARM — Dual Glocker (tier 21 mid-range firearm, premium version)
export const FEATURED_FIREARM = {
  id: 'F_FEATURED_001',
  name: 'Dual Glocker Elite',
  atk: 26,
  def: 10,
  requiredLevel: 10,
  equipLevel: 10,
  rarity: 'legendary',
  rarityLabel: 'Legendary',
  rarityColor: 'text-yellow-400',
  borderColor: 'border-yellow-400',
  weaponArchetype: 'Assault',
  priceCash: 0,
  priceCrypto: 900,
  featured: true,
  specialTier: 'gold',
  description: 'Dual-wielded precision. Double the firepower, double the threat.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/9b6073069_21-DualGlocker.png',
  isFirearm: true,
};

export const FEATURED_WEAPON = {
  id: 'W_FEATURED_001',
  name: 'Sovereign Market Blade',
  atk: 8,
  def: 24,
  requiredLevel: 10,
  equipLevel: 10,
  rarity: 'legendary',
  rarityLabel: 'Legendary',
  rarityColor: 'text-yellow-400',
  borderColor: 'border-yellow-400',
  weaponArchetype: 'Assault',
  priceCash: 0,
  priceCrypto: 1000,
  featured: true,
  specialTier: 'gold',
  description: 'An elite-grade market asset. Dominates the floor — now classified as an Accessory.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/657f89bcf_MarketOverlordEngine.png',
  isAccessory: true,
  igcBonus: 20.0,
};

// === CRYO CANNON — Dual-currency firearm (cyan border, level 10) ===
export const CRYO_CANNON = {
  id: 'F_CRYO_CANNON',
  name: 'Cryo Cannon',
  atk: 5,
  def: 5,
  requiredLevel: 10,
  equipLevel: 10,
  rarity: 'rare',
  rarityLabel: '❄️ Rare',
  rarityColor: 'text-cyan-400',
  borderColor: 'border-cyan-400',
  weaponArchetype: 'Tactical',
  priceCash: 250000,
  priceCrypto: 500,
  featured: false,
  description: 'Sub-zero devastation. Freezes opponents on impact with cryo-burst technology.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/64050b6dd_freezegun.jpg',
  isFirearm: true,
};

// === NAPALM-X — Dual-currency firearm (red border, level 10) ===
export const NAPALM_X = {
  id: 'F_NAPALM_X',
  name: 'Napalm-X',
  atk: 5,
  def: 5,
  requiredLevel: 10,
  equipLevel: 10,
  rarity: 'rare',
  rarityLabel: '🔥 Rare',
  rarityColor: 'text-red-400',
  borderColor: 'border-red-500',
  weaponArchetype: 'Assault',
  priceCash: 250000,
  priceCrypto: 500,
  featured: false,
  description: 'Incendiary payload. Burns through defenses with a cascading napalm blast.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/0d29d392a_flamegun.jpg',
  isFirearm: true,
};

// === KAMIKAZE DRONE — Special Featured Weapon (red border, no level restriction) ===
export const KAMIKAZE_DRONE = {
  id: 'F_KAMIKAZE_DRONE',
  name: 'Kamikaze Drone',
  atk: 10,
  def: 1.5,
  requiredLevel: 1,
  equipLevel: 1,
  rarity: 'special',
  rarityLabel: 'Special',
  rarityColor: 'text-red-400',
  borderColor: 'border-red-500',
  weaponArchetype: 'Assault',
  priceCash: 0,
  priceCrypto: 150,
  featured: false,
  specialTier: 'red',
  description: 'Dual-strike suicide drone. Drops twice and explodes on impact — devastating precision.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/2a7e030f0_kamikazedrone1a.jpg',
  isSpecialDrone: true,
  isFirearm: true,
};

export const FEATURED_VEHICLE = {
  id: 'V_FEATURED_001',
  name: 'Executive Phantom One',
  atk: 10,
  def: 56,
  requiredLevel: 10,
  priceCash: 0,
  priceCrypto: 500,
  featured: true,
  specialTier: 'gold',
  description: 'Bulletproof luxury with top-tier defensive specs.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/fae975ac1_executivephantomone.jpg'
};

export const FEATURED_POP = {
  id: 'P_FEATURED_001',
  name: 'Shadow Council Director',
  atk: 7,
  def: 13,
  requiredLevel: 10,
  priceCash: 0,
  priceCrypto: 500,
  featured: true,
  specialTier: 'gold',
  description: 'Pulls strings from the shadows. Unrivaled influence.'
};

export const FEATURED_PET = {
  id: 'T_FEATURED_001',
  name: 'Apex Shadow Dragon',
  atk: 10,
  def: 17,
  requiredLevel: 10,
  priceCash: 0,
  priceCrypto: 500,
  featured: true,
  specialTier: 'gold',
  description: 'A fearsome beast that amplifies your power on the field.',
  imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d8422687f_apexshadowdragon.jpg',
};

export const FEATURED_ITEMS_BY_CATEGORY = {
  weapons: FEATURED_WEAPON,
  firearms: FEATURED_FIREARM,
  vehicles: FEATURED_VEHICLE,
  people: FEATURED_POP,
  pets: FEATURED_PET
};

// === FIREARMS (41 items, tiers 0-40 — low to high quality, new primary weapon slots) ===
const FIREARM_UNLOCK_LEVELS = [
  1, 3, 6, 9, 12, 16, 20, 24, 28, 32,
  36, 41, 46, 52, 58, 64, 70, 76, 83, 90,
  97, 104, 111, 118, 124, 130, 136, 141, 146, 151,
  155, 159, 163, 167, 170, 173, 176, 179, 182, 186, 190
];

const FIREARM_RARITY_MAP = (index) => {
  const equipLevel = FIREARM_UNLOCK_LEVELS[index] || 1;
  if (index < 10) return { rarity: 'common', equipLevel, borderColor: 'border-slate-500', rarityColor: 'text-slate-400', rarityLabel: 'Common' };
  if (index < 20) return { rarity: 'uncommon', equipLevel, borderColor: 'border-green-600', rarityColor: 'text-green-400', rarityLabel: 'Uncommon' };
  if (index < 30) return { rarity: 'rare', equipLevel, borderColor: 'border-blue-500', rarityColor: 'text-blue-400', rarityLabel: 'Rare' };
  if (index < 37) return { rarity: 'epic', equipLevel, borderColor: 'border-purple-500', rarityColor: 'text-purple-400', rarityLabel: 'Epic' };
  return { rarity: 'legendary', equipLevel, borderColor: 'border-yellow-400', rarityColor: 'text-yellow-400', rarityLabel: 'Legendary' };
};

const getFirearmPrice = (index) => {
  if (index === 0) return { priceCash: 500, priceCrypto: 0 };
  if (index === 1) return { priceCash: 800, priceCrypto: 0 };
  if (index === 2) return { priceCash: 1200, priceCrypto: 0 };
  if (index < 10) return { priceCash: 0, priceCrypto: Math.round(15 + (index - 3) * 7) };
  if (index < 20) return { priceCash: 0, priceCrypto: Math.round(65 + (index - 10) * 18) };
  if (index < 30) return { priceCash: 0, priceCrypto: Math.round(250 + (index - 20) * 35) };
  if (index < 37) return { priceCash: 0, priceCrypto: Math.round(600 + (index - 30) * 60) };
  return { priceCash: 0, priceCrypto: Math.round(1050 + (index - 37) * 150) };
};

export const FIREARMS = FIREARM_UNLOCK_LEVELS.map((requiredLevel, i) => {
  const { priceCash, priceCrypto } = getFirearmPrice(i);
  const atk = Math.round((2.0 + i * 0.65) * 10) / 10;
  const def = Math.round((0.5 + i * 0.18) * 10) / 10;
  const rarityInfo = FIREARM_RARITY_MAP(i);
  return {
    id: `F${String(i).padStart(3, '0')}`,
    name: `Firearm ${i}`,
    atk,
    def,
    requiredLevel,
    equipLevel: requiredLevel,
    rarity: rarityInfo.rarity,
    rarityLabel: rarityInfo.rarityLabel,
    rarityColor: rarityInfo.rarityColor,
    borderColor: rarityInfo.borderColor,
    weaponArchetype: i % 3 === 0 ? 'Assault' : i % 3 === 1 ? 'Defense' : 'Tactical',
    priceCash,
    priceCrypto,
    isFirearm: true,
  };
});

const firearmNames = [
  "Iron Fist", "Rusty Knife", "Broken Bottle", "Brass Knuckles", "Shank",
  "Crowbar", "Street Pistol", "Heavy Wrench", "Pocket Knife", "Spiked Plank",
  "Revolver", "Aluminum Bat", "Billy Club", "LD-9 Pistol", "Crossbow",
  "Flashbang", "Swift Shotty", "911 Taser", "Timed Explosive", "HD Shotgun",
  "M54 Carbine", "Dual Glocker", "LR Rifle-44", "SBD-9 Suppressed", "911 Shotty",
  "LMG-22", "ARK-15", "S009 SMG", "Elite Sniper Rifle", "Poison Gas Grenade",
  "Golden Eagle", "Modified SA-164", "US Laser-88", "Beamer Prototype", "Killer Ray Gun",
  "UN Flanker", "Unknown Prototype", "Killer Drone", "EMP Device", "Beam of Death",
  "Nuke"
];
const firearmImages = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/640d2cc6f_0-fist.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c86fd18f7_1-rustyknife.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/19f9a39a0_2-brokenglassbottle.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b368f4c44_3-brassknuckles.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/280725440_4-shank.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a384886ed_5-crowbar.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/3bb4149f8_6-smallpistol.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/78ac01687_7-HeavyPlumbingwrench.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0426af18d_8-pocketknife.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dcc3d4687_9-spikedplank.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/36e355c59_10-revolver.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/3a378e352_11-aluminombat.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dc4a2cb5c_12-911BillyClub.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c73403ddf_13-LD9.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5fcf4b882_13a-Crossbow.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/618bbec53_14-flashbang.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b5b6aa5cc_15-SwiftShotty.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1937378fb_16-911Taser.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7438a4fea_17-TimedExplosive.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/3f6f716a0_18-HD-Shotgun.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f24e49413_20-M54.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9b6073069_21-DualGlocker.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e606d9975_22-LR-Rifle44.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a1ed59669_23-SBD-9.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/443757647_24-911Shotty.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/82285a2de_25-LMG-22.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f7116dd20_26-ARK-15.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/db25bc246_27-S009.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7ed23ffc5_28-EliteSniperRifle.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/902376950_29-PoisionGasGranade.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5454abb6c_30-GoldenEagle.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/bdf281ab9_31-ModifiedSA-164.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/082071ac4_32-US-LASER88.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/eb3eae9c5_33-US-BeamerPrototype.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e607ab0e7_34-KillerRayGun.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/3813b1eb0_35-UN-Flanker.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d21ff9023_36-WeaponUnknown.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/15d4ab17b_37-KillerDrone.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/170d4f6ae_38-EMP.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dd40a341d_39-BOD-BeamOfDeath.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/115189199_40-Nuke.png",
];
FIREARMS.forEach((f, i) => {
  if (firearmNames[i]) f.name = firearmNames[i];
  if (firearmImages[i]) f.imageUrl = firearmImages[i];
  // Nuke special stats
  if (i === 40) {
    f.atk = 50;
    f.def = 1.0;
    f.requiredLevel = 1; // TEMP: unlocked for testing
    f.equipLevel = 1;    // TEMP: unlocked for testing
  }
  // Beam of Death (index 39)
  if (i === 39) {
    f.atk = 35;
    f.def = 15;
  }
  // EMP Device (index 38)
  if (i === 38) {
    f.atk = 25;
    f.def = 20;
  }
});

// Add featured firearm to catalog
FIREARMS.push({ ...FEATURED_FIREARM });

// Rarity-based IGC (cash) bonus for accessories — lower rarity = lower bonus
const RARITY_IGC_BONUS = {
  common: 2.0,      // 2%
  uncommon: 3.0,    // 3%
  rare: 5.0,        // 5%
  epic: 10.0,       // 10%
  legendary: 20.0,  // 20%
  special: 5.0,     // 5%
};

// === ACCESSORIES / legacy WEAPONS (50 items, staggered via WEAPON_UNLOCK_LEVELS) ===
// ATK: 10-25% of total, DEF: 75-90% of total. Variety pattern cycles so all tiers have options.
// Pattern (by i % 3): 0 = very defensive (10% atk), 1 = moderate-defensive (18% atk), 2 = less-defensive (25% atk)
export const WEAPONS = WEAPON_UNLOCK_LEVELS.map((requiredLevel, i) => {
  const { priceCash, priceCrypto } = getWeaponPrice(i);
  const total = Math.round((1.75 + i * 0.65) * 10) / 10;
  const atkPct = i % 3 === 0 ? 0.10 : i % 3 === 1 ? 0.18 : 0.25;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  const rarityInfo = WEAPON_RARITY_MAP(i);
  return {
    id: `W${String(i + 1).padStart(3, '0')}`,
    name: `Weapon ${i + 1}`,
    atk,
    def,
    requiredLevel,
    equipLevel: requiredLevel,
    rarity: rarityInfo.rarity,
    rarityLabel: rarityInfo.rarityLabel,
    rarityColor: rarityInfo.rarityColor,
    borderColor: rarityInfo.borderColor,
    weaponArchetype: WEAPON_ARCHETYPES[i],
    priceCash,
    priceCrypto,
    igcBonus: RARITY_IGC_BONUS[rarityInfo.rarity] || 0
  };
});

const weaponNames = ["Stapler","Coffee Mug Smash","Rumor Packet","Basic Trade Bot","Clipboard Whack","Tape Dispenser","Market Scanner Lite","Margin Script v1","Hype Megaphone","Wick Sniper Tool","Order Flow Probe","Momentum Injector","Dark Pool Ping","Leverage Knuckles","Algo Trigger Alpha","Pump Engine v1","Volatility Blade","Liquidity Sniper","Gamma Spike Tool","Insider Hotline","Flash Order Blade","Risk Override Chip","Pump Engine v2","Tape-to-Tape Cannon","Liquidity Drain Core","Derivative Driver","Momentum Overdrive","Hedge Breaker","Flash Crash Lever","Alpha Hunter v1","Quantum Trade Bot","High-Frequency Blade","Gamma Pressure Tool","Dark Exchange Key","Leverage Apex Module","Black Swan Trigger","Institutional Override","Titan Algo Core","Prime Alpha Matrix","Apex Liquidity Cannon","Sovereign Trade Engine","Market Collapse Switch","Global Shortwave","Quantum War Node","Titan Volatility Reactor","Apex Institutional Blade","Dark Dominion Engine","Sovereign Market Breaker","Prime Execution Cannon","Market Overlord Engine"];
WEAPONS.forEach((w, i) => { if (weaponNames[i]) w.name = weaponNames[i]; });

const weaponImages = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/67256d9cd_Stapler.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c11b8c035_CoffeeMugSmash.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/26255514b_RumorPacket.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/abe4d6336_BasicTradeBot.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9b52aef0d_ClipboardWhack.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/36b0b271a_TapeDispenser.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dcf703431_MarketScannerLite.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/427e5558f_MarginScriptv1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/6dd1f2639_HypeMegaphone.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4c0fa035f_WickSniperTool.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b124d754e_OrderFlowProbe.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f717b36d5_MomentumInjector.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7b7d48b9f_DarkPoolPing.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d91f3306d_LeverageKnuckles.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b6c258c86_AlgoTriggerAlpha.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/be59f8c24_PumpEnginev1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/56d942959_VolatilityBlade.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/681b865be_LiquiditySniper.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a090a78b6_GammaSpikeTool.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d9f5795ce_InsiderHotline.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d885f022d_FlashOrderBlade.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0f854bf1f_RiskOverrideChip.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/548c79d74_PumpEnginev2.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/98c7970a9_Tape-To-TapeCannon.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/327fed6bb_LiquidityDrainCore.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b82a565be_DerivativeDriver.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ef25a5446_MomentumOverdrive.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e61f98746_HedgeBreaker.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f5aa5542f_FlashCrashLever.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/425f8e2ad_AlphaHunterv1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0c37eec4d_QuantumTradeBot.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/67153116e_High-FrequencyBlade.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0e3862eb1_GammaPressureTool.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a8663a1f2_DarkExchangeKey.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/6d2e0819c_LeverageApexModule.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/db74252fa_BlackSwanTrigger.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b1f1659d6_InstitutionalOverride.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/8507d7849_TitanAlgoCore.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2ae449f60_PrimeAlphaMatrix.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c14a5d406_ApexLiquidityCannon.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a6783eeb1_SovereignTradeEngine.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/272181a68_MarketCollapseSwitch.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/6650f3d94_GlobalShortwave.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ad62d0236_QuantumWarNode.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/3d1fd3b09_TitanVolatilityReactor.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/6e780d4ba_ApexInstitutionalBlade.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b3748b425_DarkDominionEngine.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ecb71547d_SovereignMarketBreaker.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/02bafde72_PrimeExecutionCannon.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/657f89bcf_MarketOverlordEngine.png",
];
WEAPONS.forEach((w, i) => { if (weaponImages[i]) w.imageUrl = weaponImages[i]; });

// === VEHICLES (50 items, staggered via VEHICLE_UNLOCK_LEVELS) ===
export const VEHICLES = VEHICLE_UNLOCK_LEVELS.map((requiredLevel, i) => {
  const { priceCash, priceCrypto } = getVehiclePrice(i);
  const atk = Math.round((0.5 + i * 0.4) * 10) / 10;
  const def = Math.round((2.0 + i * 1.0) * 10) / 10;
  return {
    id: `V${String(i + 1).padStart(3, '0')}`,
    name: `Vehicle ${i + 1}`,
    atk,
    def,
    requiredLevel,
    priceCash,
    priceCrypto
  };
});

const vehicleNames = ["Rusty Sedan","Scooter","Delivery Van","Street Bike","Compact Hatch","Used Coupe","Night Runner","Box Truck","City SUV","Tuned Import","Muscle Car","Armored Compact","Executive Sedan","Rally Runner","Street Beast","Blackout SUV","Courier Turbo","Reinforced Van","Drift King","Armored SUV","Luxury Coupe","Street Limo","Pursuit Interceptor","Bulletproof Sedan","Night Patrol","Twin-Turbo Super","Armored Courier","Warehouse Hauler","Offroad Titan","Executive Armor","Hypercar v1","Street Tank","Shadow Cruiser","War Wagon","Apex Interceptor","Bulletproof Hyper","Phantom Limo","Sovereign SUV","Titan Hauler","Apex Hypercar","Quantum Cruiser","Dark Fleet Sedan","Global Dominator","Prime Armored Jet","Titan Hyper Tank","Apex Sovereign","Shadow Empire Limo","Quantum War Rig","Prime City Fortress","Market King Convoy"];
const vehicleImages = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/92243c97f_rustysedan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a16cbc59b_scooter.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2fa22ab5d_deliveryvan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/501147b9a_streetbike.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4b979b6ea_compacthatch.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4fca4273d_usedcoup.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7aa590c56_nightrunner.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5546a1a16_boxtruck.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dcb68cf35_citysuv.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/17196e859_tunedimport.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5cb96017a_musclecar.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/102773ce7_armoredcompact.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/61a0105be_executivesedan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1ea1dde9d_rallyrunner.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/99c31ee26_streetbeast.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9f3a050f5_blackoutsuv.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9fd66dd46_courierturbo.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/37da13059_reinforcedvan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4f928a2db_driftking.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/55826034c_armoredsuv.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/27eeeec0c_luxurycoupe.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/652310b30_streetlimo.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a9fa61379_policeinterceptor.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/894bef0ea_bulletproofsedan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/295c48c1a_NightPatrol.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/32d3a02af_Twin-TurboSuper.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/de218a241_ArmoredCourier.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/87bdd1fbc_WarehouseHauler.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/bb222650a_OffroadTitan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4f373835e_ExecutiveArmor.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2a22d3844_HypercarV1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0114fe68e_StreetTank.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/8ca39cb0c_ShadowCruiser.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1515d29e6_WarWagon.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/08a8b784b_ApexInterceptor.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/6183b6720_BulletproofHyper.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c0e658ae2_PhantomLimo.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d2d817c74_SovereignSUV.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/27f6f0f8e_TitanHauler.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/880ac861e_ApexHypercar.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1fb33d3eb_QuantumCruiser.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/db5447a39_DarkFleetSedan.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9b128d1bd_GlobalDominator.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/454c39c8d_PrimeArmoredJet.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/30d66a107_TitanHyperTank.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a00572f4b_ApexSovereign.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9607164b5_ShadowEmpireLimo.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f679541ba_QuantumWarRig.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4b5c86f57_PrimeCityFortress.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4dffb68d7_MarketKingConvoy.png",
];
VEHICLES.forEach((v, i) => {
  if (vehicleNames[i]) v.name = vehicleNames[i];
  if (vehicleImages[i]) v.imageUrl = vehicleImages[i];
});

// === PEOPLE OF POWER (50 items, staggered via POP_UNLOCK_LEVELS) ===
// ATK: 25-50% of total, DEF: 50-75% of total. Variety pattern cycles so all tiers have options.
// Pattern (by i % 4): 0 = 25% atk, 1 = 35% atk, 2 = 45% atk, 3 = 50% atk
export const PEOPLE = POP_UNLOCK_LEVELS.map((requiredLevel, i) => {
  const { priceCash, priceCrypto } = getPoPPrice(i);
  const total = Math.round((0.8 + i * 0.8) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  // Special high-level PoP
  let finalRequiredLevel = requiredLevel;
  if (i === 47) finalRequiredLevel = 50;
  if (i === 48) finalRequiredLevel = 100;
  if (i === 49) finalRequiredLevel = 150;
  return {
    id: `P${String(i + 1).padStart(3, '0')}`,
    name: `Person ${i + 1}`,
    atk,
    def,
    requiredLevel: finalRequiredLevel,
    priceCash,
    priceCrypto
  };
});

const peopleNames = ["Corner Hustler","Neighborhood Lookout","Street Informant","Debt Collector","Backroom Dealer","Pawn Shop Owner","Dirty Mechanic","Street Muscle","Club Bouncer","Bail Bondsman","Union Rep","Street Lawyer","Court Clerk","Building Inspector","Bookie Contact","Private Investigator","Collection Agency Boss","Fixer","Precinct Sergeant","Local News Reporter","Anonymous Cell","Money Launderer","Corrupt Detective","Political Aide","SWAT Commander","District Fixer","Assistant District Attorney","Media Handler","Dirty Judge","City Councilman","Veteran Attorney","Union Boss","Police Commissioner","Anonymous Operator","State Senator","Shady CEO","Lobbyist","State Prosecutor","Corporate Raider","Governor's Fixer","Anonymous Commander","Federal Agency Director","Banking Cartel Executive","Defense Contractor","Intelligence Handler","Supreme Court Insider","Shadow Counsel","Shadow Council Chair","U.S. Congress","Illuminati Council"];
const peopleImages = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/858971a46_1-cornerhustler.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f5f8b69f5_2-neighborhoodlookout.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/aec4ac94d_3-streetinformant.jpg",
];
PEOPLE.forEach((p, i) => {
  if (peopleNames[i]) p.name = peopleNames[i];
  if (peopleImages[i]) p.imageUrl = peopleImages[i];
});

// === PETS (50 items, staggered via PET_UNLOCK_LEVELS) ===
// ATK: 25-50% of total, DEF: 50-75% of total. Variety pattern cycles so all tiers have options.
// Pattern (by i % 4): 0 = 25% atk, 1 = 35% atk, 2 = 45% atk, 3 = 50% atk
export const PETS = PET_UNLOCK_LEVELS.map((requiredLevel, i) => {
  const { priceCash, priceCrypto } = getPetPrice(i);
  const total = Math.round((0.7 + i * 0.95) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return {
    id: `T${String(i + 1).padStart(3, '0')}`,
    name: `Pet ${i + 1}`,
    atk,
    def,
    requiredLevel,
    priceCash,
    priceCrypto
  };
});

const petNames = [
  "Alley Cat","German Shepherd","Bubblegum Bunny","Raccoon","Princess Corgi",
  "Pitbull","Pink Axolotl","Doberman","Diamond Kitty","Baby Panda",
  "Rottweiler","Crystal Fox","Cane Corso","Kawaii Bat","Black Panther",
  "Mini Unicorn","Bengal Tiger","Cotton Candy Dragonling","White Tiger","Arctic Fox",
  "King Cobra","Silverback Gorilla","African Lion","White Lion","Komodo Dragon",
  "Grizzly Bear","Black Stallion","Royal Eagle","Golden Falcon","Diamond Peacock",
  "Millionaire Monkey","Chrome Panther","Golden Lion","Emerald Wolf","Sentinel Unit",
  "Enforcer-X9","Spectre Operative","Titan MK-I","Warbot Omega","AEGIS Prime",
  "Bigfoot","Minotaur","Cerberus","Kraken","Griffin",
  "Phoenix","Manticore","Hydra","Golden Celestial Dragon","Infernal Void Dragon"
];
const petImages = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/cc5a2d2d3_1-alleycat.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/364084c98_2-germanshepherd.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/43edd44e4_2-bubblegumbunny.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/aff476971_4-raccoon.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/827100bed_5-princesscorgi.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/000807f08_6-pitbull.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4b2da3ffc_7a-pinkaxolotl.JPG",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/804cea056_8-doberman.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/deb1e15fb_9-diamondkitty.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f08b87b53_10-babypanda.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9e93373ee_11-rottweiler.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c96f881f8_12-crystalfox.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/741d70c84_13-canecorso.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2d18a77a2_14-kawaiibat.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/439e7a803_15-blackpanther.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1b5959b39_16-miniunicorn.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/961d744c4_17-bengaltiger.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/8dcd866d9_18-cottoncandydragonling.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ed7e63cfe_19-whitetiger.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0ffc38a41_20-arcticfox.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/cc731c188_21-kingcobra.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5d2d3c601_22-silverbackgorilla.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/35c84826e_23-africanlion.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/cd7ef85e8_24-whitelion.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9183d6289_25-komododragon.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dc1be376e_26-grizzlybear.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/85c79060a_27-blackstallion.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4e49d9cd7_29-royaleagle.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/34a046952_29-goldenfalcon.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0f3090ce4_30-diamondpeacock.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e80c69011_31-millionairemonkey.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2365b6a58_32-chromepanther.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5cd267b31_33-goldenlion.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dc964791f_34emeraldwolf.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/0ab00f84b_35-sentinelunit.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/a095392be_36-enforcer-x9.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/102ad7124_37-spectreoperative.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d2403edd3_38-titanmk1.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7583a1725_39-warbotomega.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/39e77fd45_40-aegisprime.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/81193e373_41-bigfoot.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b70a332b7_42-minotaur.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ac7231c84_43-cerberus.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/83dd5ab4f_44-kraken.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/ee826cc8e_45-griffin-x.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/5f9aa3815_46-phoenix.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/bc97b75d1_47-manticore.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e13a8dd1b_48-hydra.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/93c167f74_49-goldencelestialdragon.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c1ff093a7_50-infernalvoiddragon.jpg",
];
PETS.forEach((t, i) => {
  if (petNames[i]) t.name = petNames[i];
  if (petImages[i]) t.imageUrl = petImages[i];
});

// Add featured items to catalogs so bots can equip them (filtered out of shop display via getCategoryData)
WEAPONS.push({ ...FEATURED_WEAPON });
FIREARMS.push({ ...KAMIKAZE_DRONE });
FIREARMS.push({ ...CRYO_CANNON });
FIREARMS.push({ ...NAPALM_X });
VEHICLES.push({ ...FEATURED_VEHICLE });
PEOPLE.push({ ...FEATURED_POP });
PETS.push({ ...FEATURED_PET });

// === AVATARS ===
// All avatars are CRYD only.
// 6 avatars (3M + 3F) are ALSO purchasable for IGC at a steep premium:
//   Pair 1 (~Lv 10): Carlos Mucho Mula + Hacking Hillary — 50,000 IGC each
//   Pair 2 (~Lv 30): Nick McSunny + Smoken Sherry — 250,000 IGC each
//   Pair 3 (~Lv 50): Mr. Unknown + Alma Rosera — 750,000 IGC each
// The Architect moved to Level 5 ($9.99 = 500 CRYD, featured avatar).

export const AVATARS = [
  // Level 4 pair
  { id: 'A_M_bashin_bobby', name: 'Bashin Bobby', gender: 'male', requiredLevel: 4, priceCash: 0, priceCrypto: getAvatarCrydPrice(4), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f3749b260_avatar-male-Bashin_Bobby.png' },
  { id: 'A_F_chun_bao', name: 'Chun Bao', gender: 'female', requiredLevel: 4, priceCash: 0, priceCrypto: getAvatarCrydPrice(4), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/282ffccdd_avatar-female-Chun_Bao.png' },
  // Level 6 pair
  { id: 'A_M_beshaun_beats', name: 'BeShaun Beats', gender: 'male', requiredLevel: 6, priceCash: 0, priceCrypto: getAvatarCrydPrice(6), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c1e297867_avatar-male-BeShaun_Beats.png' },
  { id: 'A_F_corporate_chloe', name: 'Corporate Chloe', gender: 'female', requiredLevel: 6, priceCash: 0, priceCrypto: getAvatarCrydPrice(6), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/68e0d361c_avatar-female-Corporate_Chloe.png' },
  // Level 8 pair
  { id: 'A_M_big_jay', name: 'Big Jay', gender: 'male', requiredLevel: 8, priceCash: 0, priceCrypto: getAvatarCrydPrice(8), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/45def805b_avatar-male-Big_Jay.png' },
  { id: 'A_F_dezzy', name: 'Dezzy', gender: 'female', requiredLevel: 8, priceCash: 0, priceCrypto: getAvatarCrydPrice(8), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/61af7ff08_avatar-female-Dezzy.png' },
  // Level 10 pair — DUAL CURRENCY (IGC + CRYD) pair 1 of 3
  { id: 'A_M_carlos_mucho_mula', name: 'Carlos Mucho Mula', gender: 'male', requiredLevel: 10, priceCash: 50000, priceCrypto: getAvatarCrydPrice(10), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2cb5246b7_avatar-male-Carlos_Mucho_Mula.png' },
  { id: 'A_F_hacking_hillary', name: 'Hacking Hillary', gender: 'female', requiredLevel: 10, priceCash: 50000, priceCrypto: getAvatarCrydPrice(10), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/898d839ac_avatar-female-HackingHillary.png' },
  // Level 12 pair
  { id: 'A_M_cool_clay', name: 'Cool Clay', gender: 'male', requiredLevel: 12, priceCash: 0, priceCrypto: getAvatarCrydPrice(12), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/1dbdb7840_avatar-male-Cool_Clay.png' },
  { id: 'A_F_maria_maria', name: 'Maria Maria', gender: 'female', requiredLevel: 12, priceCash: 0, priceCrypto: getAvatarCrydPrice(12), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/3f6e46437_avatar-female-Maria_Maria.png' },
  // Level 14 pair
  { id: 'A_M_goldhorn', name: 'GoldHorn', gender: 'male', requiredLevel: 14, priceCash: 0, priceCrypto: getAvatarCrydPrice(14), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ac198d9e2_avatar-man-GoldHorn.png' },
  { id: 'A_F_samantina', name: 'Samantina', gender: 'female', requiredLevel: 14, priceCash: 0, priceCrypto: getAvatarCrydPrice(14), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/60566fb84_avatar-female_Samantina.png' },
  // Level 16 pair
  { id: 'A_M_jazzy_jeff', name: 'Jazzy Jeff', gender: 'male', requiredLevel: 16, priceCash: 0, priceCrypto: getAvatarCrydPrice(16), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e53571f8a_avatar-male-Jazzy_Jeff.png' },
  { id: 'A_F_mei_lane', name: 'Mei Lane', gender: 'female', requiredLevel: 16, priceCash: 0, priceCrypto: getAvatarCrydPrice(16), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/aaa664949_avatar-female-Mei_Lane.png' },
  // Level 18 pair
  { id: 'A_M_johnny_boy', name: 'Johnny Boy', gender: 'male', requiredLevel: 18, priceCash: 0, priceCrypto: getAvatarCrydPrice(18), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/bd6007821_avatar-male-Johnny_Boy.png' },
  { id: 'A_F_nikki_shades', name: 'Nikki Shades', gender: 'female', requiredLevel: 18, priceCash: 0, priceCrypto: getAvatarCrydPrice(18), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/55a402f6d_avatar-female-NikkiShades.png' },
  // Level 5 — FEATURED: The Architect ($9.99 = 500 CRYD) — shown at top of avatar tab
  { id: 'A_the_architect', name: 'The Architect', gender: 'universal', requiredLevel: 5, priceCash: 0, priceCrypto: 500, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/668a44b53_avatar-man-The_Architect.png', special: true, specialTier: 'gold' },
  // Level 21 pair
  { id: 'A_M_tommy_gunz', name: 'Tommy Gunz', gender: 'male', requiredLevel: 21, priceCash: 0, priceCrypto: getAvatarCrydPrice(21), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d6be9abc5_avatar-male-Tommy_Gunz.png' },
  { id: 'A_F_riley_red', name: 'Riley Red', gender: 'female', requiredLevel: 21, priceCash: 0, priceCrypto: getAvatarCrydPrice(21), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2ec2a182d_avatar-female-Riley_Red.png' },
  // Level 38 male
  { id: 'A_M_jet_rocksit', name: 'Jet Rocksit', gender: 'male', requiredLevel: 38, priceCash: 0, priceCrypto: getAvatarCrydPrice(38), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a9f8ad7a8_avatar-man-r1-Jet_Rocksit.png' },
  // Level 22 pair
  { id: 'A_M_machinegun_lou', name: 'MachineGun Lou', gender: 'male', requiredLevel: 22, priceCash: 0, priceCrypto: getAvatarCrydPrice(22), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/bb9f28edd_avatar-male-MachineGun_Lou.png' },
  { id: 'A_F_sasha_magasha', name: 'Sasha MaGasha', gender: 'female', requiredLevel: 22, priceCash: 0, priceCrypto: getAvatarCrydPrice(22), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ad8d4ad00_avatar-female-Sasha_MaGasha.png' },
  // Level 24 pair
  { id: 'A_M_martin_fly', name: 'Martin Fly', gender: 'male', requiredLevel: 24, priceCash: 0, priceCrypto: getAvatarCrydPrice(24), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a09577bb0_avatar-male-Martin_Fly.png' },
  { id: 'A_F_selena_sanchez', name: 'Selena Sanchez', gender: 'female', requiredLevel: 24, priceCash: 0, priceCrypto: getAvatarCrydPrice(24), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a6d7ad465_avatar-female-Selena_Sanchez.png' },
  // Level 26 pair
  { id: 'A_M_mega_mills', name: 'Mega Mills', gender: 'male', requiredLevel: 26, priceCash: 0, priceCrypto: getAvatarCrydPrice(26), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/14968c64e_avatar-male-Mega_Mills.png' },
  { id: 'A_F_seriously_sasha', name: 'Seriously Sasha', gender: 'female', requiredLevel: 26, priceCash: 0, priceCrypto: getAvatarCrydPrice(26), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f133b7268_avatar-female-SeriouslySasha.png' },
  // Level 28 pair
  { id: 'A_M_militant_miguel', name: 'Militant Miguel', gender: 'male', requiredLevel: 28, priceCash: 0, priceCrypto: getAvatarCrydPrice(28), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/b6eba7782_avatar-male-Militant_Miguel.png' },
  { id: 'A_F_sharp_cindy', name: 'Sharp Cindy', gender: 'female', requiredLevel: 28, priceCash: 0, priceCrypto: getAvatarCrydPrice(28), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7751d8db3_avatar-female-SharpCindy.png' },
  // Level 30 pair — DUAL CURRENCY (IGC + CRYD) pair 2 of 3
  { id: 'A_M_nick_mcsunny', name: 'Nick McSunny', gender: 'male', requiredLevel: 30, priceCash: 250000, priceCrypto: getAvatarCrydPrice(30), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/429476d07_avatar-male-Nick_McSunny.png' },
  { id: 'A_F_smoken_sherry', name: 'Smoken Sherry', gender: 'female', requiredLevel: 30, priceCash: 250000, priceCrypto: getAvatarCrydPrice(30), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/157cd5181_avatar-female-SmokenSherry.png' },
  // Level 32 pair
  { id: 'A_M_paulie_pistols', name: 'Paulie Pistols', gender: 'male', requiredLevel: 32, priceCash: 0, priceCrypto: getAvatarCrydPrice(32), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7c69a8ae0_avatar-male-Paulie_Pistols.png' },
  { id: 'A_F_sophia_sweets', name: 'Sophia Sweets', gender: 'female', requiredLevel: 32, priceCash: 0, priceCrypto: getAvatarCrydPrice(32), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/60727e0c7_avatar-female-Sophia_Sweets.png' },
  // Level 34 pair
  { id: 'A_M_sal_smokaccino', name: 'Sal Smokaccino', gender: 'male', requiredLevel: 34, priceCash: 0, priceCrypto: getAvatarCrydPrice(34), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/600cb31c7_avatar-male-Sal_Smokaccino.png' },
  { id: 'A_F_su_sing_lee', name: 'Su Sing Lee', gender: 'female', requiredLevel: 34, priceCash: 0, priceCrypto: getAvatarCrydPrice(34), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d0ec395b2_avatar-female-Su_Sing_Lee.png' },
  // Level 36 hippie pair
  { id: 'A_M_dude_stone', name: 'Dude Stone', gender: 'male', requiredLevel: 36, priceCash: 0, priceCrypto: getAvatarCrydPrice(36), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/088c88872_avatar-male-h1-Dude_Stone.png' },
  { id: 'A_F_star_sunshine', name: 'Star Sunshine', gender: 'female', requiredLevel: 36, priceCash: 0, priceCrypto: getAvatarCrydPrice(36), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ef339b4af_avatar-female-h1-Star_Sunshine.png' },
  // Level 38 female rock
  { id: 'A_F_kitty_khords', name: 'Kitty Khords', gender: 'female', requiredLevel: 38, priceCash: 0, priceCrypto: getAvatarCrydPrice(38), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f66e3df21_avatar-female-r1-Sussie_Shasher.png' },
  // Level 42 FBI pair
  { id: 'A_M_frank_price', name: 'Frank Price', gender: 'male', requiredLevel: 42, priceCash: 0, priceCrypto: getAvatarCrydPrice(42), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f054ef7d9_avatar-male-f1-Frank_Price.png' },
  { id: 'A_F_agent_cross', name: 'Agent Cross', gender: 'female', requiredLevel: 42, priceCash: 0, priceCrypto: getAvatarCrydPrice(42), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/33a373fe0_avatar-female-f1-Agent_Cross.png' },
  // Level 44 skater pair
  { id: 'A_M_ryder_riot', name: 'Ryder Riot', gender: 'male', requiredLevel: 44, priceCash: 0, priceCrypto: getAvatarCrydPrice(44), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/be43d6793_avatar-male-s1-Ryder_Riot.png' },
  { id: 'A_F_nova_knox', name: 'Nova Knox', gender: 'female', requiredLevel: 44, priceCash: 0, priceCrypto: getAvatarCrydPrice(44), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d9d5bf13d_avatar-female-s1-Nova_Knox.png' },
  // Level 46 military pair
  { id: 'A_M_general_wreckette', name: 'General Wreckette', gender: 'male', requiredLevel: 46, priceCash: 0, priceCrypto: getAvatarCrydPrice(46), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/72bb682f2_avatar-male-General_Wreckette.png' },
  { id: 'A_F_general_longrange', name: 'General Longrange', gender: 'female', requiredLevel: 46, priceCash: 0, priceCrypto: getAvatarCrydPrice(46), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/daeba83cf_avatar-female-General_Longrange.png' },
  // Level 48 pair
  { id: 'A_M_dr_malik_quantum', name: 'Dr. Malik Quantum', gender: 'male', requiredLevel: 48, priceCash: 0, priceCrypto: getAvatarCrydPrice(48), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/b9982f342_avatar-man-Dr_Malik_Quantum.png' },
  { id: 'A_F_audrey_cipher', name: 'Audrey Cipher', gender: 'female', requiredLevel: 48, priceCash: 0, priceCrypto: getAvatarCrydPrice(48), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d92f98248_avatar-female-n1-Audrey_Cipher.png' },
  // Level 20 pair
  { id: 'A_M_jardon_wolfe', name: 'Jardon Wolfe', gender: 'male', requiredLevel: 20, priceCash: 0, priceCrypto: getAvatarCrydPrice(20), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a5f7c1fdd_avatar-male-Jardon_Wolfe.png' },
  { id: 'A_F_chantella', name: 'Chantella', gender: 'female', requiredLevel: 20, priceCash: 0, priceCrypto: getAvatarCrydPrice(20), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/b183d765f_avatar-female-Chantella.png' },
  // Level 25 pair
  { id: 'A_M_mo_money', name: 'Mo Money', gender: 'male', requiredLevel: 25, priceCash: 0, priceCrypto: getAvatarCrydPrice(25), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/b860baf76_avatar-man-MoMoney.png' },
  { id: 'A_F_carmen_cash', name: 'Carmen Cash', gender: 'female', requiredLevel: 25, priceCash: 0, priceCrypto: getAvatarCrydPrice(25), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/cf60d9b52_avatar-female-Carmen_Cash.png' },
  // Level 35 pair
  { id: 'A_M_darius_dzul_v2', name: 'Darius Dzul', gender: 'male', requiredLevel: 35, priceCash: 0, priceCrypto: getAvatarCrydPrice(35), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/665722984_avatar-male-Darius_Dzul.png' },
  { id: 'A_F_jamya_jajones', name: 'Jamya JaJones', gender: 'female', requiredLevel: 35, priceCash: 0, priceCrypto: getAvatarCrydPrice(35), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/734df07a0_avatar-female_Jamya_JaJones.png' },
  // Level 50 pair — DUAL CURRENCY (IGC + CRYD) pair 3 of 3
  { id: 'A_F_alma_rosera', name: 'Alma Rosera', gender: 'female', requiredLevel: 50, priceCash: 750000, priceCrypto: getAvatarCrydPrice(50), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/bddf32bf9_avatar-female-Alma_Rosera.png' },
  { id: 'A_M_mr_unknown', name: 'Mr. Unknown', gender: 'male', requiredLevel: 50, priceCash: 750000, priceCrypto: getAvatarCrydPrice(50), imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/80488349d_avatar-man-MrUnknown.png' },
  // Level 21 CEO pair
  { id: 'A_M_mr_ceo', name: 'Mr. CEO', gender: 'male', requiredLevel: 21, priceCash: 0, priceCrypto: getAvatarCrydPrice(21), imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/eb4ab7cf6_avatar-male_Mr_CEO.png' },
  { id: 'A_F_miss_ceo', name: 'Miss CEO', gender: 'female', requiredLevel: 21, priceCash: 0, priceCrypto: getAvatarCrydPrice(21), imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/b521d9364_avatar-female_Miss_CEO.png' },
  // Level 27 pair
  { id: 'A_M_taz', name: 'Taz', gender: 'male', requiredLevel: 27, priceCash: 0, priceCrypto: getAvatarCrydPrice(27), imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d72e4f271_avatar-male-Taz.png' },
  { id: 'A_F_tasia', name: 'Tasia', gender: 'female', requiredLevel: 27, priceCash: 0, priceCrypto: getAvatarCrydPrice(27), imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/ac3bed9e2_avatar-female-Tasia.png' },
  // Elite tier
  { id: 'A_M_indigio', name: 'Indigio', gender: 'male', requiredLevel: 75, priceCash: 0, priceCrypto: 700, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7811e1a05_avatar-man-Indigio.png' },
  { id: 'A_F_indigia', name: 'Indigia', gender: 'female', requiredLevel: 75, priceCash: 0, priceCrypto: 700, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2cbb0a0f8_avatar-female-Indigia.png' },
  { id: 'A_M_lucifer', name: 'Lucifer', gender: 'male', requiredLevel: 100, priceCash: 0, priceCrypto: 1000, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4dc55f126_avatar-male-Lucifer.png' },
  { id: 'A_F_lilith', name: 'Lilith', gender: 'female', requiredLevel: 100, priceCash: 0, priceCrypto: 1000, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8b7cf0df_avatar-female-Lilith.png' },
  { id: 'A_M_us_president', name: 'Mr. U.S. President', gender: 'male', requiredLevel: 125, priceCash: 0, priceCrypto: 1200, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8dbf03e63_avatar-male-US_President.png', specialTier: 'gold' },
  { id: 'A_F_us_president', name: 'Mrs. U.S. President', gender: 'female', requiredLevel: 125, priceCash: 0, priceCrypto: 1200, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/35e38717b_avatar-female-US_President.png', specialTier: 'gold' },
  { id: 'A_M_illuminati', name: 'Illuminati Master', gender: 'male', requiredLevel: 150, priceCash: 0, priceCrypto: 5000, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a404b32e2_avatar-male-ILU1-Illuminati.png', specialTier: 'gold' },
  { id: 'A_F_illuminati', name: 'IllumiNatia', gender: 'female', requiredLevel: 150, priceCash: 0, priceCrypto: 5000, imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/cabd4c6de_avatar-female-ILU1-IllumiNatia.png', specialTier: 'gold' },
];

export const getCategoryData = (category) => {
  switch (category) {
    case "firearms": return FIREARMS;
    case "weapons": return WEAPONS;  // accessories (legacy weapons)
    case "vehicles": return VEHICLES;
    case "people": return PEOPLE;
    case "pets": return PETS;
    case "avatars": return AVATARS;
    default: return [];
  }
};

// Use this in ShopPage to exclude featured items from the regular list (they appear in the banner)
export const getCategoryDataShopOnly = (category) => {
  switch (category) {
    // Exclude Iron Fist (F000) from shop — it's the free starter given to all players
    case "firearms": {
      const filtered = FIREARMS.filter(f => !f.featured && f.id !== 'F000' && f.id !== 'F_KAMIKAZE_DRONE' && f.id !== 'F_CRYO_CANNON' && f.id !== 'F_NAPALM_X');
      // Insert Cryo Cannon + Napalm-X after Brass Knuckles (F003), before Shank (F004)
      const bkIdx = filtered.findIndex(f => f.id === 'F003');
      const insertAt = bkIdx >= 0 ? bkIdx + 1 : filtered.length;
      return [KAMIKAZE_DRONE, ...filtered.slice(0, insertAt), CRYO_CANNON, NAPALM_X, ...filtered.slice(insertAt)];
    }
    case "weapons": return WEAPONS.filter(w => !w.featured);  // accessories
    case "vehicles": return VEHICLES.filter(v => !v.featured);
    case "people": return PEOPLE.filter(p => !p.featured);
    case "pets": return PETS.filter(p => !p.featured);
    case "avatars": return AVATARS;
    default: return [];
  }
};