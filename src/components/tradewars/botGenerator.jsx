import { WEAPONS, VEHICLES, PEOPLE, PETS, AVATARS, FEATURED_FIREARM, FEATURED_WEAPON, FEATURED_VEHICLE, FEATURED_POP, FEATURED_PET } from "../store/catalogData";
import { kvGet } from '@/lib/playerMemory';
import { getRiskBotWeights } from "../utils/stateRiskData";
import { getReputationTitle } from "../utils/reputationHelper";
import { ALL_THEMES, getEligibleThemes } from "../store/themesData";
import { WEAPON_STAR_UNLOCK_LEVELS, WEAPON_STAR_COSTS, getWeaponStarProgress } from "../weapons/weaponUpgradeSystem";
import { STAR_SHARD_REQUIREMENTS, SUBS_PER_STAR as AVATAR_SUBS_PER_STAR } from "../avatar/avatarAbilities";
import { FIREARMS } from "../store/catalogData";
import { UPGRADE_UNLOCK_LEVELS, MAX_UPGRADE_LEVEL, getUpgradeBonusPct } from "../upgrades/simpleUpgradeSystem";

// ========== FEATURED GEAR ROLL SYSTEM ==========
// Returns how many featured items a Whale/Strong bot gets (0-3+)
const rollFeaturedItemCount = (botType, rng) => {
  const roll = rng.next();
  if (botType === 'Whale') {
    // 30% none, 40% one, 20% two, 10% three
    if (roll < 0.30) return 0;
    if (roll < 0.70) return 1;
    if (roll < 0.90) return 2;
    return 3;
  } else if (botType === 'Strong') {
    // 70% none, 20% one, 10% two
    if (roll < 0.70) return 0;
    if (roll < 0.90) return 1;
    return 2;
  }
  return 0;
};

// Inject featured items into random eligible slots of the loadout
const injectFeaturedItems = (loadout, botLevel, botType, rng) => {
  // All featured items require level 10
  if (botLevel < 10) return loadout;

  const count = rollFeaturedItemCount(botType, rng);
  if (count === 0) return loadout;

  // Map slots to their featured item (only slots that are unlocked and not locked)
  const featuredOptions = [
    { slot: 'weapon1', item: FEATURED_FIREARM },   // firearm slot
    { slot: 'weapon3', item: FEATURED_WEAPON },    // accessory slot
    { slot: 'vehicle', item: FEATURED_VEHICLE },
    { slot: 'power',   item: FEATURED_POP },
    { slot: 'pet',     item: FEATURED_PET },
  ].filter(opt => {
    const current = loadout[opt.slot];
    return current && typeof current === 'string'; // slot is unlocked (not locked object)
  });

  // Shuffle options and pick `count` unique slots to upgrade to featured
  const shuffled = [...featuredOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  const result = { ...loadout };
  selected.forEach(({ slot, item }) => {
    result[slot] = item.id;
  });

  return result;
};

// ========== XP CALCULATION UTILITIES ==========
const calculateXPRequired = (level) => {
  if (level <= 4) return 100;
  if (level === 5) return 1000;
  return 1000 + ((level - 5) * 100);
};

const calculateTotalXPToReachLevel = (targetLevel, progressFraction = 0) => {
  let total = 0;
  for (let L = 1; L < targetLevel; L++) {
    total += calculateXPRequired(L + 1);
  }
  const progressXP = Math.floor(progressFraction * calculateXPRequired(targetLevel + 1));
  return total + progressXP;
};

// Generate player-anchored stats for elite bots (30% of Whale/Strong)
const generateEliteBotStats = (botLevel, botType, rng, playerStats) => {
  // Whale: 68-94%, Strong: 57-82%
  const winRate = botType === 'Whale'
    ? 0.68 + rng.next() * 0.26
    : 0.57 + rng.next() * 0.25;
  
  // Use player stats as anchor with variance
  // Overperformers: +4% to +12%, Underperformers: -12% to -4%
  const isOverperformer = rng.next() < 0.6; // 60% are overperformers among elite
  const variance = isOverperformer
    ? 0.04 + rng.next() * 0.08   // +4% to +12%
    : -0.12 + rng.next() * 0.08; // -12% to -4%

  const anchor = (base) => Math.max(1, Math.round(base * (1 + variance)));

  let wins = anchor(playerStats.wins);
  let jobs = anchor(playerStats.jobs);
  let trades = anchor(playerStats.trades);

  // Career floor: ensure elite bots have believable stats relative to their level
  // Prevents "Lv44 Whale with 1 job" when player has near-zero career stats
  jobs = Math.max(jobs, Math.floor(botLevel * 10));
  trades = Math.max(trades, Math.floor(botLevel * 10));
  wins = Math.max(wins, Math.floor(botLevel * 6));

  const totalFights = Math.round(wins / winRate);
  const losses = Math.max(0, totalFights - wins);

  return { jobs, trades, wins, losses };
};

// Generate realistic lifetime performance stats for a bot
const generateBotLifetimeStats = (botLevel, botType, rng, playerStats) => {
  // Step 1: Calculate total XP needed with random progress (0-99% through current level)
  const progressFraction = rng.next();
  const totalXPNeeded = calculateTotalXPToReachLevel(botLevel, progressFraction);
  const rawXP = totalXPNeeded / 0.80; // 20% lost XP efficiency
  
  // Step 2: Activity mix by bot type (keys match capitalized botType values)
  const activityMix = {
    Noob:    { jobs: 0.55, trades: 0.25, wins: 0.20 },
    Weak:    { jobs: 0.45, trades: 0.30, wins: 0.25 },
    Average: { jobs: 0.40, trades: 0.30, wins: 0.30 },
    Strong:  { jobs: 0.30, trades: 0.25, wins: 0.45 },
    Whale:   { jobs: 0.20, trades: 0.20, wins: 0.60 }
  };
  
  const mix = activityMix[botType] || activityMix.Average;
  
  // Step 3: Convert XP to counts using average XP values
  const avgJobXP = 15;
  const avgTradeXP = 14;
  const avgWinXP = 20;
  
  let jobs = Math.round((rawXP * mix.jobs) / avgJobXP);
  let trades = Math.round((rawXP * mix.trades) / avgTradeXP);
  let wins = Math.round((rawXP * mix.wins) / avgWinXP);
  
  // Step 4: Generate losses based on winRate (keys match capitalized botType values)
  const winRateRanges = {
    Noob:    { min: 0.35, max: 0.53 },
    Weak:    { min: 0.45, max: 0.60 },
    Average: { min: 0.48, max: 0.65 },
    Strong:  { min: 0.57, max: 0.82 },
    Whale:   { min: 0.68, max: 0.94 }
  };
  
  const winRateRange = winRateRanges[botType] || winRateRanges.Average;
  const winRate = winRateRange.min + rng.next() * (winRateRange.max - winRateRange.min);
  
  const totalFights = Math.round(wins / winRate);
  let losses = Math.max(0, totalFights - wins);
  
  // Step 5: Clamp for realism at low levels (prevent "Lv1 with 0/1" problem)
  if (botLevel <= 4) {
    jobs = Math.max(jobs, rng.nextInt(12, 45));
    trades = Math.max(trades, rng.nextInt(8, 35));
    wins = Math.max(wins, rng.nextInt(3, 12));
    
    // Recompute losses using the ALREADY COMPUTED winRate
    const recalcTotalFights = Math.round(wins / winRate);
    losses = Math.max(0, recalcTotalFights - wins);
  }
  
  // Ensure minimum wins — but ALWAYS recompute losses to preserve the winRate
  if (botLevel >= 2) {
    wins = Math.max(1, wins);
  }
  // CRITICAL: always derive losses from wins + winRate so the w% is never distorted
  const finalTotalFights = Math.round(wins / winRate);
  losses = Math.max(0, finalTotalFights - wins);
  
  return { jobs, trades, wins, losses };
};

// ========== SEEDED RANDOM ==========
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// ========== BOT PROFILE IMAGE POOLS ==========
// Universal images usable by bots of any gender
export const BOT_UNIVERSAL_PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/afe80e37f_profilepicture-bots-048.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/067c165ff_profilepicture-bots-037.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a888307a0_profilepicture-bots-044.jpg"
];

export const BOT_MALE_PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ba9b16930_profilepicture-bots-022.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e788cd81d_profilepicture-bots-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/9701ed03d_profilepicture-bots-027.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png",
  ...BOT_UNIVERSAL_PROFILE_IMAGES
];

export const BOT_FEMALE_PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4da43053e_profilepicture-bots-female-020.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/815d131dd_profilepicture-bots-female-021.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5e71076b9_profilepicture-bots-female-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d5fc792fd_profilepicture-bots-female-025.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/821b1b4dd_profilepicture-bots-female-004.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f266a58a0_profilepicture-bots-female-007.jpg",
  ...BOT_UNIVERSAL_PROFILE_IMAGES
];

export const BOT_ALL_PROFILE_IMAGES = [...BOT_MALE_PROFILE_IMAGES, ...BOT_FEMALE_PROFILE_IMAGES];

// ========== BOT NAME POOLS ==========
const MALE_PREFIX_POOL = [
  "Sharp", "Dark", "Silent", "Wicked", "Iron", "Neon", "Ghost", "Rogue", "Rapid",
  "Cold", "Hot", "Wild", "Brutal", "Heavy", "Golden", "Crimson",
  "Midnight", "Storm", "Turbo", "Quick", "Big", "Alpha", "Omega",
  "Phantom", "Toxic", "Frost", "Steel", "Chrome", "Solar", "Cosmic",
  "Prime", "Ultra", "Hyper", "Dirty", "Smooth",
  "Shadow", "Diamond", "Thunder", "Lightning", "Phoenix", "Eagle", "Hawk", "Falcon",
  "Python", "Leopard", "Jaguar",
  "Chen", "Zhang", "Wang", "Liu", "Yang", "Wu", "Zhao",
  "Cyber", "Digital", "Nexus", "Vector", "Binary", "Code",
  "Street", "Urban", "Metro", "Block", "Zone", "District",
  "Royal", "Noble", "Imperial", "Prince", "Duke",
  "Magenta", "Indigo", "Teal", "Cyan", "Emerald", "Obsidian", "Onyx",
  "Granite", "Slate", "Copper", "Bronze", "Brass", "Titanium", "Platinum", "Jade", "Opal", "Topaz",
  "Amethyst", "Garnet", "Turquoise", "Quartz", "Flint", "Brick", "Stone", "Granite", "Volcanic", "Molten",
  "Arctic", "Boreal", "Tropical", "Desert", "Mountain", "Valley", "Prairie", "Tundra", "Swamp", "Jungle",
  "Coastal", "Island", "Highland", "Lowland", "Ridge", "Peak", "Summit", "Cliff", "Canyon", "Gorge",
  "Lava", "Magma", "Plasma", "Vapor", "Steam", "Smoke", "Ash", "Dust", "Sand", "Clay",
  "Mud", "Rock", "Pebble", "Boulder", "Gravel", "Shale", "Limestone", "Sandstone", "Basalt", "Obsidian",
  "Gale", "Typhoon", "Hurricane", "Cyclone", "Tornado", "Twister", "Tempest", "Squall", "Monsoon", "Blizzard",
  "Avalanche", "Glacier", "Iceberg", "Snowdrift", "Hailstorm", "Rainstorm", "Thunderstorm", "Sandstorm", "Firestorm", "Windstorm",
  "Eclipse", "Nebula", "Galaxy", "Comet", "Asteroid", "Meteor", "Pulsar", "Quasar", "Supernova", "Blackhole",
  "Starlight", "Moonbeam", "Sunray", "Aurora", "Twilight", "Dawn", "Dusk", "Nightfall", "Daybreak", "Sunrise",
  "Sunset", "Noon", "Zenith", "Horizon", "Equinox", "Solstice", "Lunar", "Solar", "Stellar", "Celestial",
  "Astral", "Ethereal", "Spectral", "Mystic", "Arcane", "Runic", "Ancient", "Primal", "Feral", "Savage",
  "Merciless", "Ruthless", "Fierce", "Deadly", "Fatal", "Grim",
  "Sinister", "Malevolent", "Evil", "Corrupt"
];

const F_NAME_POOL = [
  "Mia", "Sofia", "Isabella", "Ava", "Olivia", "Emma", "Amelia", "Luna", "Aria", "Layla",
  "Zoe", "Chloe", "Ella", "Scarlett", "Victoria", "Madison", "Grace", "Hannah", "Addison", "Aubrey",
  "Natalie", "Brooklyn", "Savannah", "Skylar", "Bella", "Hailey", "Nora", "Riley", "Leah", "Audrey",
  "Stella", "Maya", "Lucy", "Anna", "Sarah", "Ariana", "Allison", "Elena", "Gabriella", "Naomi",
  "Valentina", "Clara", "Paisley", "Everly", "Kennedy", "Kinsley", "Willow", "Samantha", "Caroline", "Genesis",
  "Nevaeh", "Serenity", "Autumn", "Aaliyah", "Ruby", "Alice", "Piper", "Quinn", "Sadie", "Delilah",
  "Josephine", "Ivy", "Adeline", "Emery", "Jade", "Maria", "Eva", "Isla", "Cora", "Brielle",
  "Ashley", "Kayla", "Jasmine", "Alexa", "Brianna", "Kiara", "Nina", "Laila", "Camila", "Daniela",
  "Valeria", "Alina", "Angela", "Bianca", "Carmen", "Diana", "Elisa", "Fernanda", "Giselle", "Helena",
  "Iris", "Juliana", "Karina", "Liliana", "Mariana", "Natalia", "Paola", "Renata", "Sabrina", "Tatiana",
  "Vanessa", "Yasmin", "Zara", "Alondra", "Brenda", "Cecilia", "Dulce", "Estrella", "Fabiola", "Guadalupe",
  "Ines", "Jimena", "Karla", "Lorena", "Milagros", "Noemi", "Ofelia", "Perla", "Rosa", "Selena",
  "Tania", "Veronica", "Yesenia", "Zoila", "Ari", "Lexi", "Nikki", "Maddie", "Kylie", "Jada",
  "Kaylee", "Bri", "Jess", "Tori", "Ali", "Becca", "Mya", "Rae", "Gia", "Lia",
  "Elle", "Nia", "Zia", "Rina", "Tina", "Lana", "Mona", "Naya", "Zuri", "Amara",
  "Imani", "Sanaa", "Amina", "Fatima", "Laylaa", "Samira", "Yara", "Nadia", "Huda", "Rania",
  "Aleena", "Noor", "Safiya", "Ayesha", "Zainab", "Mari", "Kira", "Yuki", "Sakura", "Hana",
  "Mei", "Aiko", "Rin", "Sora", "Emi", "Nari", "Yuna", "Minji", "Jisoo", "Soojin",
  "Chaeyoung", "Hyejin", "Seoyeon", "Yejin", "Jiwon", "Arielle", "Colette", "Elodie", "Genevieve", "Juliette"
];

// F_TITLE_POOL: female title/prefix names (deduplicated from F_NAME_POOL)
const F_TITLE_POOL = [
  "Queen", "Queenie", "Princess", "Lady", "Empress", "Duchess", "Countess", "Baroness", "Goddess", "Madam",
  "Miss", "Missy", "Maam", "Shorty", "Shawty", "Baddie", "Diva", "Barbie", "Doll", "Baby",
  "Babe", "Bae", "Mami", "Mama", "Momma", "LilMama", "LilMami", "LilLady", "LilQueen", "LilPrincess",
  "Boss", "Bossy", "BossLady", "BossBabe", "BossQueen", "RichGirl", "RichBabe", "RichQueen", "RichLady", "Heiress",
  "Socialite", "ItGirl", "MainGirl", "TopGirl", "HotGirl", "PrettyGirl", "FineGirl", "FlyGirl", "RealOne", "DayOne",
  "RideOrDie", "Wifey", "Housewife", "SugarMama", "SugarBabe", "GoldGirl", "CityGirl", "BadGirl", "GoodGirl", "WildGirl",
  "Pretty", "Fine", "Cute", "Sexy", "Glam", "GlamGirl", "Dollface", "Angel", "Sweetheart", "Honey",
  "BabyGirl", "LittleLady", "YoungQueen", "YoungLady", "YoungPrincess", "PrettyLady", "PrettyQueen", "PrettyPrincess", "FineLady", "FineQueen",
  "Reina", "Princesa", "Dama", "Senorita", "Chica", "Mujer", "Flawless", "Bonita", "Linda", "Hermosa",
  "Mamacita", "Senora", "Chiquita", "Guapa", "Morena", "Rubia", "Chula", "Nena", "Muneca", "Reinita",
  "QueenBee", "DramaQueen", "TrapQueen", "StreetQueen", "HoodQueen", "BlockQueen", "CityQueen", "GhettoQueen", "PrettyQueen", "BadQueen",
  "BossQueen", "RealQueen", "TrueQueen", "IceQueen", "HotQueen", "QueenB", "QueenXO", "QueenVibes", "QueenMode", "QueenStatus",
  "PrincessVibes", "PrincessMode", "PrincessXO", "PrincessB", "PrincessBaby", "PrincessMami", "PrincessBae", "PrincessDoll", "PrincessPretty", "PrincessFine",
  "LadyVibes", "LadyMode", "LadyXO", "LadyB", "LadyBaby", "LadyMami", "LadyBae", "LadyDoll", "LadyPretty", "LadyFine",
  "MissVibes", "MissMode", "MissXO", "MissB", "MissBaby", "MissMami", "MissBae", "MissDoll", "MissPretty", "MissFine",
  "BossBaddie", "BossPretty", "BossFine", "BossMama", "BossMami", "BossDoll", "BossAngel", "BossBaby", "BossXO", "BossVibes",
  "BaddieXO", "BaddieVibes", "BaddieMode", "BaddieMama", "BaddieMami", "BaddieDoll", "BaddieAngel", "BaddiePretty", "BaddieFine", "BaddieBaby",
  "PrettyXO", "PrettyVibes", "PrettyMode", "PrettyMama", "PrettyMami", "PrettyDoll", "PrettyAngel", "PrettyBaddie", "PrettyFine", "PrettyBaby",
  "FineXO", "FineVibes", "FineMode", "FineMama", "FineMami", "FineDoll", "FineAngel", "FineBaddie", "FinePretty", "FineBaby",
  "RealXO", "RealVibes", "RealMode", "RealMama", "RealMami", "RealDoll", "RealAngel", "RealBaddie", "RealPretty", "RealFine"
];

const GENERIC_PREFIX_POOL = [
  "Sharp", "Dark", "Silent", "Wicked", "Lucky", "Iron", "Neon", "Ghost", "Rogue", "Rapid",
  "Cold", "Hot", "Wild", "Sneaky", "Vicious", "Savage", "Calm", "Heavy", "Golden", "Crimson",
  "Midnight", "Storm", "Turbo", "Quick", "Fat", "Thin", "Big", "Small", "Alpha", "Omega",
  "Phantom", "Toxic", "Frost", "Ember", "Steel", "Chrome", "Solar", "Lunar", "Nova", "Cosmic",
  "Prime", "Ultra", "Hyper", "Nano", "Macro", "Dirty", "Clean", "Brutal", "Smooth", "Risky",
  "Shadow", "Crystal", "Diamond", "Pearl", "Ruby", "Sapphire", "Violet", "Scarlet", "Azure",
  "Blaze", "Thunder", "Lightning", "Phoenix", "Eagle", "Hawk", "Falcon",
  "Python", "Leopard", "Jaguar", "Cheetah",
  "Cyber", "Digital", "Nexus", "Vector", "Pixel", "Binary", "Hex", "Code",
  "Street", "Urban", "Metro", "Town", "Block", "Hood", "Zone", "District", "Sector",
  "Royal", "Noble", "Regal", "Imperial"
];

// CHINESE_NAME_POOL: 100 gender-neutral Chinese-inspired names
const CHINESE_NAME_POOL = [
  "Xiao", "Ming", "Wei", "Jun", "Kai", "Lei", "Fei", "Zhi", "Hao", "Cheng",
  "Long", "Feng", "Jing", "Ping", "Qing", "Ying", "Xing", "Hong", "Rong", "Sheng",
  "Jian", "Liang", "Guang", "Zhong", "Yong", "Quan", "Gang", "Tao", "Bin", "Wen",
  "XiaoLong", "MingZhi", "WeiHao", "JunKai", "LeiZhi", "FengHao", "JingWei", "PingAn", "QingYun", "YingXiong",
  "XingChen", "HongYun", "RongHui", "ShengLi", "JianHao", "LiangChen", "GuangMing", "ZhongCheng", "YongGang", "QuanLi",
  "TaoBin", "WenJun", "ZiHao", "AnXin", "BaoZhi", "ChenLong", "DaWei", "FuQiang", "GaoYuan", "HuaSheng",
  "JiMing", "KaiXin", "LiHong", "MaoZhen", "NanBei", "OuYang", "PeiLun", "QiuYue", "RuiXue", "SiYuan",
  "TianLong", "WuXing", "XuanYuan", "YiHao", "ZeYuan", "ZhiHao", "AiLong", "BaiJun", "ChaoYang", "DengFeng",
  "FangYuan", "GeBin", "HaiLong", "JiuYuan", "KuangYe", "LuZhi", "MeiYuan", "NiuLong", "QiLong", "RiZhi",
  "ShuiYun", "TieHan", "WanYuan", "XieZhi", "YuLong", "ZhuHao", "AnLong", "ChengDu", "GuangZhou", "HuiZhou"
];

const CORE_POOL = [
  "Vic", "Options", "Candle", "Wick", "Tape", "Order", "Flow",
  "Beta", "Gamma", "Theta", "Vega", "Ripper", "Hustle", "Cash",
  "Coin", "Ledger", "Vault", "Margin", "Leverage", "Shorts", "Longs", "Bid", "Ask",
  "Spread", "Pump", "Dump", "Trend", "Pivot", "Breakout", "Reversal", "Signal", "Scanner",
  "Warrior", "Samurai", "Ninja", "Ronin", "Shogun", "Emperor", "Empress", "Princess",
  "Fortune", "Destiny", "Legacy", "Dynasty", "Reign", "Realm",
  "Pearl", "Emerald", "Gold", "Silver", "Platinum",
  "Inferno", "Ice", "Snow", "Wind",
  "Spirit", "Spectre", "Wraith", "Soul", "Essence", "Aura", "Force",
  "Tech",
  "Boss",
  "Apex", "Zenith", "Summit", "Pinnacle", "Vertex", "Crest", "Ridge", "Edge", "Brink", "Cusp",
  "Nexus", "Hub", "Core", "Heart", "Soul", "Mind", "Spirit", "Essence", "Being", "Entity",
  "Void", "Abyss", "Chasm", "Rift", "Gap", "Breach", "Fracture", "Split", "Divide", "Schism",
  "Pulse", "Beat", "Rhythm", "Tempo", "Cadence", "Flow", "Wave", "Tide", "Current", "Stream",
  "Flux", "Shift", "Change", "Transform", "Morph", "Evolve", "Adapt", "Adjust", "Modify", "Alter",
  "Surge", "Spike", "Rise", "Climb", "Ascend", "Soar", "Fly", "Glide", "Float", "Hover",
  "Crash", "Fall", "Drop", "Plunge", "Dive", "Sink", "Descend", "Plummet", "Tumble", "Collapse",
  "Strike", "Hit", "Smash", "Bash", "Crush", "Break", "Shatter", "Fracture", "Crack", "Split",
  "Slash", "Cut", "Slice", "Dice", "Chop", "Hack", "Cleave", "Sever", "Rend", "Tear",
  "Burn", "Scorch", "Sear", "Char", "Ignite", "Kindle", "Spark", "Flame", "Fire", "Blaze",
  "Freeze", "Chill", "Cool", "Cold", "Frost", "Ice", "Snow", "Hail", "Sleet", "Blizzard",
  "Shock", "Jolt", "Zap", "Bolt", "Charge", "Spark", "Arc", "Flash", "Flare", "Burst",
  "Venom", "Poison", "Toxin", "Bane", "Plague", "Disease", "Curse", "Hex", "Jinx", "Spell",
  "Blade", "Sword", "Knife", "Dagger", "Axe", "Mace", "Hammer", "Spear", "Lance", "Pike",
  "Shield", "Guard", "Armor", "Wall", "Barrier", "Block", "Defense", "Protection", "Shelter", "Haven",
  "Fang", "Claw", "Talon", "Horn", "Spike", "Thorn", "Barb", "Needle", "Point", "Tip",
  "Wing", "Feather", "Plume", "Tail", "Fin", "Scale", "Hide", "Fur", "Pelt", "Coat",
  "Eye", "Sight", "Vision", "Gaze", "Stare", "Glare", "Glance", "Look", "Peek", "Watch",
  "Voice", "Sound", "Tone", "Note", "Pitch", "Chord", "Harmony", "Melody", "Tune", "Song"
];

const SUFFIX_POOL = [
  "Killer", "Lord", "Sniper", "Wizard", "Raider", "Hunter",
  "Baron", "Enforcer", "Warden", "Dealer", "Fixer", "Banker",
  "Trader", "Insider", "Operator", "Machine", "Engine", "Reactor", "Cannon",
  "Admiral", "Marshal", "Sergeant", "Elite", "Ace",
  "Titan", "Legend", "Myth", "Icon", "Star", "Hero", "Champion", "Victor", "Conqueror", "Dominator",
  "Duchess", "Count", "Countess", "Marquis", "Earl",
  "Sage", "Prophet", "Oracle", "Seer", "Shaman", "Druid", "Priest", "Monk", "Cleric",
  "Fighter", "Gladiator", "Paladin", "Crusader", "Templar",
  "Slayer", "Destroyer", "Annihilator", "Obliterator", "Eradicator", "Exterminator", "Terminator", "Eliminator", "Vanquisher", "Subjugator",
  "Overlord", "Warlord", "Chieftain", "Sovereign", "Monarch", "Regent", "Viceroy", "Potentate", "Autocrat", "Despot",
  "Tyrant", "Dictator", "Oppressor", "Suppressor", "Repressor", "Intimidator", "Terrorizer", "Menace", "Scourge", "Plague",
  "Reaper", "Harvester", "Collector", "Gatherer", "Hoarder", "Accumulator", "Stockpiler", "Keeper", "Guardian", "Protector",
  "Defender", "Sentinel", "Watcher", "Observer", "Scout", "Spy", "Agent", "Operative", "Infiltrator", "Saboteur",
  "Striker", "Assailant", "Attacker", "Aggressor", "Invader", "Raider", "Marauder", "Plunderer", "Pillager", "Ravager",
  "Berserker", "Barbarian", "Savage", "Brute", "Beast", "Monster", "Demon", "Fiend", "Devil", "Hellion",
  "Specter", "Phantom", "Apparition", "Shade", "Spirit", "Wraith", "Revenant", "Ghoul", "Zombie", "Undead",
  "Vampire", "Werewolf", "Lycanthrope", "Shapeshifter", "Changeling", "Mimic", "Doppelganger", "Clone", "Replica", "Copy",
  "Architect", "Builder", "Creator", "Maker", "Forger", "Crafter", "Artisan", "Craftsman", "Smith", "Wright",
  "Engineer", "Inventor", "Designer", "Planner", "Strategist", "Tactician", "Schemer", "Plotter", "Conspirator", "Intriguer",
  "Merchant", "Vendor", "Seller", "Peddler", "Hawker", "Dealer", "Supplier", "Provider", "Distributor", "Wholesaler",
  "Tycoon", "Magnate", "Baron", "Mogul", "Kingpin", "Czar", "Sultan", "Rajah", "Khan", "Emir",
  "Sage", "Wise", "Learned", "Scholarly", "Educated", "Enlightened", "Illuminated", "Knowledgeable", "Informed", "Aware",
  "Mystic", "Mystical", "Magical", "Enchanted", "Bewitched", "Charmed", "Spellbound", "Hexed", "Cursed", "Blessed",
  "Divine", "Godly", "Holy", "Sacred", "Sanctified", "Consecrated", "Hallowed", "Revered", "Venerated", "Worshipped",
  "Immortal", "Eternal", "Everlasting", "Timeless", "Ageless", "Undying", "Deathless", "Imperishable", "Indestructible", "Invincible",
  "Supreme", "Ultimate", "Final", "Last", "Terminal", "Conclusive", "Definitive", "Decisive", "Absolute", "Total",
  "Perfect", "Flawless", "Faultless", "Impeccable", "Immaculate", "Pristine", "Pure", "Clean", "Untainted", "Unblemished",
  "Prime", "First", "Original", "Initial", "Primary", "Principal", "Chief", "Head", "Lead", "Top"
];

// ========== TAUNTING NAME POOL (gender-neutral, ~150 entries) ==========
const TAUNTING_NAME_POOL = [
  "UknOwIMbetterrr", "UjustMad", "UrMOM", "NOTaSpenderLOL", "TheGr8",
  "EZPZ", "GitGud", "CantTouchThis", "SaltyTears", "NoobFilter",
  "CryMore", "MadAboutMoney", "NeverEnough", "StayMad", "GetRekted",
  "ImJustBetter", "UWish", "BroWhatLOL", "NotEvenClose", "TryHarderNub",
  "UMadBro", "LoserAlert", "WatchAndLearn", "SkillIssue", "OutclassedU",
  "BetterThanU", "NiceTrieLOL", "PoorThing", "PressF4U", "GoodLuckLOL",
  "CloseButNoCigar", "KeepDreaming", "WokeUpWinning", "Born2Flex", "CashRulesU",
  "URentFree", "LiveInMyDust", "TryAgainHun", "HoldMyBag", "YouMadOrNah",
  "NoRefundsLOL", "SeeYaLater", "GottaGoFast", "StayInUrLane", "IMRunThisCity",
  "NobodyAskedU", "OopsDidItAgain", "JustWalk", "YikesForU", "AlwaysWinning",
  "FlexingOnU", "U2Slow", "EasyMode", "NothingPersonal", "JustBusiness",
  "PayToWin", "GrindOrDie", "MoneyTalks", "ChasingDust", "BehindAlways",
  "CantCompete", "OutMatchedBro", "NotEvenTrying", "SorryNotSorry", "FarAheadOfU",
  "HigherTierNow", "LevelUpNub", "TooEasyLOL", "AlreadyWon", "CheckUrStats",
  "NobodyBeatsMe", "TopIsLonely", "UnstoppableMode", "CantSlowMeDown", "InfiniteGrind",
  "WhileUSlept", "OnAnotherLevel", "TheGapIsReal", "WideOpenMarket", "DominatingNow",
  "StillWinning", "NoContest", "FreeKills", "UreNotReady", "TooFarGone",
  "CantCatchUp", "LeftUrDustAgo", "BeyondUrLeague", "RunningCirclesNow", "GetSomeSkills",
  "PeakPerformance", "MaxxedOut", "CrystalClear", "NotCloseLOL", "TakeNotes",
  "FirstAlways", "LastIsU", "FasterThanEver", "SharpAsEver", "ReadTheRoom",
  "OverqualifiedNow", "WrongLeague", "MovedOnUp", "NoLookingBack", "StayLosing",
  "IEatNubs", "ZeroChance", "MathDontLie", "CalcIsWrong4U", "GapYear4U",
  "BackInLine", "WaitUrTurn", "QuietlyWinning", "NoNeedToTalk", "FactsOnly",
  "NumbersDontLie", "StatsMatter", "BigLeagueNow", "U2Broke", "CantAffordThis",
  "TaggedAndBagged", "CalledItAgain", "PredictableU", "ScriptedLoss", "InboxMe4Tips",
  "PoorDecision", "BasicStrategy", "FloorDifference", "CeilingTooLow4U", "GapTooWide",
  "HardToWatch", "NeedsWork", "BackToSchool", "TrainingWheelsOn", "BootcampFirst",
  "WasteOfTime", "GiftedNotGrinded", "TalentGap", "NaturallyBetter", "BornDifferent",
  "TierAboveU", "DifferentClass", "NotInMyLeague", "TooRich4U", "CountUrLosses",
  "EvenTryingLOL", "MissedAgain", "SameMistakesTwice", "HopelessCause", "DontQuitUrDayJob"
];

// ========== BOT TYPES ==========
const BOT_TYPE_CONFIGS = {
  Noob: {
    weight: 10,
    levelOffset: [-8, -3],
    gearPercentile: [0, 40],
    fundMult: 0.7,
    fundPowerMult: 0.90
  },
  Weak: {
    weight: 20,
    levelOffset: [-8, -1],
    gearPercentile: [30, 60],
    fundMult: 0.9,
    fundPowerMult: 0.97
  },
  Average: {
    weight: 40,
    levelOffset: [-2, 3],
    gearPercentile: [50, 75],
    fundMult: 1.1,
    fundPowerMult: 1.00
  },
  Strong: {
    weight: 20,
    levelOffset: [1, 10],
    gearPercentile: [70, 90],
    fundMult: 2.5,
    fundPowerMult: 1.12
  },
  Whale: {
    weight: 10,
    levelOffset: [5, 15],
    gearPercentile: [85, 100],
    fundMult: 4.0,
    fundPowerMult: 1.28
  }
};

// ========== BOT UPGRADE STAR GENERATORS ==========

// Given a bot level + type, return how many weapon stars to simulate spending
const getBotWeaponStars = (botLevel, botType, rng) => {
  // Max star the bot could have based on level (mirrors WEAPON_STAR_UNLOCK_LEVELS)
  let maxStar = 0;
  for (let i = 0; i < WEAPON_STAR_UNLOCK_LEVELS.length; i++) {
    if (botLevel >= WEAPON_STAR_UNLOCK_LEVELS[i]) maxStar = i + 1;
  }
  if (maxStar === 0) return 0;

  // Type -> fraction of max star they realistically achieve
  const fractions = { Noob: 0.0, Weak: 0.15, Average: 0.35, Strong: 0.60, Whale: 0.90 };
  const frac = fractions[botType] ?? 0.3;
  // Add some randomness ±20% of max
  const jitter = (rng.next() - 0.5) * 0.4;
  const star = Math.round(Math.max(0, Math.min(maxStar, maxStar * (frac + jitter))));
  return star;
};

// Compute total parts spent to reach exactly `targetStar` stars on a weapon
const getPartsForStars = (targetStar) => {
  let total = 0;
  for (let s = 1; s <= targetStar && s <= WEAPON_STAR_COSTS.length; s++) {
    total += WEAPON_STAR_COSTS[s - 1];
  }
  return total;
};

// Build weaponUpgrades map for a bot's equipped weapons
const buildBotWeaponUpgrades = (equipped, botLevel, botType, rng) => {
  const upgrades = {};
  const slots = ['weapon1', 'weapon2', 'weapon3', 'weapon4'];
  for (const slot of slots) {
    const wId = equipped[slot];
    if (typeof wId === 'string') {
      const stars = getBotWeaponStars(botLevel, botType, rng);
      upgrades[wId] = getPartsForStars(stars);
    }
  }
  return upgrades;
};

// Given bot level + type, compute avatar shards to simulate
const getBotAvatarShards = (botLevel, botType, rng) => {
  // Avatar star unlock levels: [1,5,10,15,20,30,40,55,70,85,100]
  const AVATAR_STAR_UNLOCK = [1, 5, 10, 15, 20, 30, 40, 55, 70, 85, 100];
  let maxStar = 0;
  for (let i = 1; i <= 10; i++) {
    if (botLevel >= AVATAR_STAR_UNLOCK[i]) maxStar = i;
  }
  const fractions = { Noob: 0.0, Weak: 0.10, Average: 0.30, Strong: 0.55, Whale: 0.85 };
  const frac = fractions[botType] ?? 0.25;
  const jitter = (rng.next() - 0.5) * 0.3;
  const star = Math.round(Math.max(0, Math.min(maxStar, maxStar * (frac + jitter))));
  // Total shards = sum of star costs up to `star`
  let total = 0;
  for (let s = 0; s < star && s < STAR_SHARD_REQUIREMENTS.length; s++) {
    total += STAR_SHARD_REQUIREMENTS[s];
  }
  return total;
};

// ========== SLOT UNLOCK RULES ==========
const SLOT_UNLOCKS = {
  weapon1: 1,
  vehicle: 1,
  weapon2: 2,
  weapon3: 5,
  weapon4: 5,
  pet: 5,
  pop: 10
};

const isSlotUnlocked = (slot, level) => {
  return level >= (SLOT_UNLOCKS[slot] || 999);
};

// ========== BOT SIMPLE UPGRADE GENERATOR ==========
// Given a bot level + type, return a simulated simple upgrade level (0-10)
// for vehicles, pets, and people of power.
const getBotSimpleUpgradeLevel = (botLevel, botType, rng) => {
  // Determine max upgrade level the bot could have based on player level
  let maxLevel = 0;
  for (let i = 0; i < UPGRADE_UNLOCK_LEVELS.length; i++) {
    if (botLevel >= UPGRADE_UNLOCK_LEVELS[i]) maxLevel = i;
  }
  if (maxLevel === 0) return 0;

  // Type → fraction of max upgrade level they realistically achieve
  const fractions = { Noob: 0.0, Weak: 0.15, Average: 0.35, Strong: 0.60, Whale: 0.90 };
  const frac = fractions[botType] ?? 0.3;
  const jitter = (rng.next() - 0.5) * 0.3;
  return Math.round(Math.max(0, Math.min(maxLevel, maxLevel * (frac + jitter))));
};

// Build simpleUpgrades map for a bot's equipped vehicle, pet, and power
const buildBotSimpleUpgrades = (equipped, botLevel, botType, rng) => {
  const upgrades = {};
  const slots = ['vehicle', 'pet', 'power'];
  for (const slot of slots) {
    const itemId = equipped[slot];
    if (typeof itemId === 'string') {
      upgrades[itemId] = getBotSimpleUpgradeLevel(botLevel, botType, rng);
    }
  }
  return upgrades;
};

// ========== SHARED COMBAT STATS COMPUTATION ==========
export const computeCombatStats = (entity) => {
  const level = entity.level || 1;
  const fundSize = entity.fundMembers || entity.fundSize || 0;
  const equipped = entity.equipped || entity.equippedLoadout || {};
  
  // Base stats
  let baseAtk = 1 + (level * 0.15);
  let baseDef = 1 + (level * 0.10);
  
  // Sum gear bonuses
  let itemsAtk = 0;
  let itemsDef = 0;
  
  const getItemById = (category, itemId) => {
    if (!itemId) return null;
    const catalogMap = { weapons: WEAPONS, firearms: FIREARMS, vehicles: VEHICLES, people: PEOPLE, pets: PETS };
    const catalog = catalogMap[category];
    return catalog?.find(item => item.id === itemId) || null;
  };

  // Helper: find item by ID across firearms AND weapons (for legacy/unknown slot data)
  const findWeaponAnyCategory = (itemId) => {
    if (!itemId || typeof itemId !== 'string') return null;
    if (itemId.startsWith('F')) return getItemById('firearms', itemId);
    return getItemById('weapons', itemId);
  };
  
  [
    findWeaponAnyCategory(equipped.weapon1),
    findWeaponAnyCategory(equipped.weapon2),
    findWeaponAnyCategory(equipped.weapon3),
    findWeaponAnyCategory(equipped.weapon4),
    getItemById('vehicles', equipped.vehicle),
    getItemById('people', equipped.power),
    getItemById('pets', equipped.pet)
  ].forEach(item => {
    if (item && !item.locked) {
      itemsAtk += item.atk || 0;
      itemsDef += item.def || 0;
    }
  });
  
  const atk = Math.round((baseAtk + itemsAtk) * 100) / 100;
  const def = Math.round((baseDef + itemsDef) * 100) / 100;
  
  // Fund power (display/ranking only)
  const memberPowerBase = 0.20 + (level * 0.02);
  let fundPower = fundSize * memberPowerBase;
  
  // Apply type multiplier if present
  const typeFundMult = entity.fundPowerMult || 1.0;
  fundPower = Math.round(fundPower * typeFundMult * 100) / 100;
  
  // Fund power converts directly into ATK/DEF bonuses for combat
  const fundAtk = Math.round(fundPower * 0.15 * 100) / 100;
  const fundDef = Math.round(fundPower * 0.10 * 100) / 100;
  const totalAtk = Math.round((atk + fundAtk) * 100) / 100;
  const totalDef = Math.round((def + fundDef) * 100) / 100;
  
  // Total power is now purely ATK + DEF (fund is baked in)
  const pwr = Math.round((totalAtk + totalDef) * 100) / 100;
  
  return { atk: totalAtk, def: totalDef, fundPower, pwr };
};

// ========== BOT LOADOUT BUILDER ==========
const buildBotLoadout = (botLevel, botType, rng) => {
  const config = BOT_TYPE_CONFIGS[botType];
  const loadout = {};
  
  const buildEligibleList = (catalog, category) => {
    // Filter items that bot can actually equip (level requirement met)
    // Note: catalog items use 'requiredLevel' not 'level'
    let eligible = catalog.filter(item => !item.locked && (item.requiredLevel || item.level || 1) <= botLevel);
    if (eligible.length === 0) {
      // If no items available at bot's level, use the lowest level item
      const sortedByLevel = [...catalog].filter(item => !item.locked).sort((a, b) => (a.requiredLevel || a.level || 1) - (b.requiredLevel || b.level || 1));
      eligible = sortedByLevel.length > 0 ? [sortedByLevel[0]] : [catalog[0]];
    }
    
    // Sort by power (requiredLevel + atk + def)
    eligible.sort((a, b) => {
      const aPower = (a.requiredLevel || a.level || 1) + (a.atk || 0) + (a.def || 0);
      const bPower = (b.requiredLevel || b.level || 1) + (b.atk || 0) + (b.def || 0);
      return aPower - bPower;
    });
    
    return eligible;
  };
  
  const pickFromPercentile = (list, rng) => {
    const [lowPct, highPct] = config.gearPercentile;
    const lowIdx = Math.floor((list.length - 1) * (lowPct / 100));
    const highIdx = Math.floor((list.length - 1) * (highPct / 100));
    const idx = rng.nextInt(lowIdx, Math.max(lowIdx, highIdx));
    return list[idx];
  };
  
  // Weapon slots 1 & 2: FIREARMS only (new weapons category)
  const eligibleFirearms = buildEligibleList(FIREARMS.filter(f => !f.featured), 'firearms');
  const usedFirearms = new Set();

  if (isSlotUnlocked('weapon1', botLevel)) {
    const w1 = pickFromPercentile(eligibleFirearms, rng);
    loadout.weapon1 = w1.id;
    usedFirearms.add(w1.id);
  } else {
    loadout.weapon1 = { locked: true };
  }

  if (isSlotUnlocked('weapon2', botLevel)) {
    const availableF2 = eligibleFirearms.filter(f => !usedFirearms.has(f.id));
    if (availableF2.length > 0) {
      const w2 = pickFromPercentile(availableF2, rng);
      loadout.weapon2 = w2.id;
      usedFirearms.add(w2.id);
    } else {
      loadout.weapon2 = eligibleFirearms[0].id;
    }
  } else {
    loadout.weapon2 = { locked: true };
  }

  // Weapon slots 3 & 4: ACCESSORIES (old WEAPONS category)
  const eligibleAccessories = buildEligibleList(WEAPONS.filter(w => !w.featured), 'weapons');
  const usedAccessories = new Set();

  if (isSlotUnlocked('weapon3', botLevel)) {
    const w3 = pickFromPercentile(eligibleAccessories, rng);
    loadout.weapon3 = w3.id;
    usedAccessories.add(w3.id);
  } else {
    loadout.weapon3 = { locked: true };
  }

  if (isSlotUnlocked('weapon4', botLevel)) {
    const availableAcc2 = eligibleAccessories.filter(w => !usedAccessories.has(w.id));
    if (availableAcc2.length > 0) {
      const w4 = pickFromPercentile(availableAcc2, rng);
      loadout.weapon4 = w4.id;
    } else {
      loadout.weapon4 = eligibleAccessories[0]?.id || null;
    }
  } else {
    loadout.weapon4 = { locked: true };
  }
  
  // Vehicle
  if (isSlotUnlocked('vehicle', botLevel)) {
    const eligibleVehicles = buildEligibleList(VEHICLES, 'vehicles');
    loadout.vehicle = pickFromPercentile(eligibleVehicles, rng).id;
  } else {
    loadout.vehicle = { locked: true };
  }
  
  // POP
  if (isSlotUnlocked('pop', botLevel)) {
    const eligiblePop = buildEligibleList(PEOPLE, 'people');
    loadout.power = pickFromPercentile(eligiblePop, rng).id;
  } else {
    loadout.power = { locked: true };
  }
  
  // Pet
  if (isSlotUnlocked('pet', botLevel)) {
    const eligiblePets = buildEligibleList(PETS, 'pets');
    loadout.pet = pickFromPercentile(eligiblePets, rng).id;
  } else {
    loadout.pet = { locked: true };
  }
  
  return loadout;
};

// ========== BOT GENERATION (DETERMINISTIC PER LOCATION+DATE) ==========
// Tiered 12-bot pool scaled by player level:
// Lv 1-10:  Easy — mostly Noob/Weak, a couple Average
// Lv 11-20: Medium — balanced mix
// Lv 21+:   Hard — Whale/Strong heavy
const getTieredBotSlots = (playerLevel) => {
  if (playerLevel <= 10) {
    // Easy: 1 Average, 3 Weak, 5 Noob, 2 Strong, 1 Whale  → skewed easy
    return ['Noob','Noob','Noob','Noob','Noob','Weak','Weak','Weak','Average','Average','Strong','Whale'];
  } else if (playerLevel <= 20) {
    // Medium: balanced
    return ['Noob','Noob','Weak','Weak','Weak','Average','Average','Average','Average','Strong','Strong','Whale'];
  } else {
    // Hard: Whale/Strong heavy
    return ['Whale','Strong','Strong','Average','Average','Average','Average','Weak','Weak','Weak','Noob','Noob'];
  }
};

export const generateCityBots = (playerLevel, playerCity, playerState, riskTier = 1, refreshSeed = null) => {
  // Create location+date key
  const today = new Date().toISOString().split('T')[0];
  const locationKey = `${playerState}-${playerCity}`;
  
  const playerId = kvGet('insiderTraderId') || 'default';
  const seedStr = refreshSeed 
    ? `${playerId}|${locationKey}|${today}|${refreshSeed}`
    : `${playerId}|${locationKey}|${today}`;
  const baseSeed = hashString(seedStr);
  const mainRng = new SeededRandom(baseSeed);
  
  const BOT_COUNT = 12;
  const bots = [];
  const usedNames = new Set();
  
  // Get player data
  const playerData = getPlayerData();
  const playerFundSize = playerData.fundMembersOwned || 0;
  const playerEquipped = playerData.loadout || {};

  // Shuffle the tiered slot order so the power distribution isn't predictable by position
  const shuffledSlots = [...getTieredBotSlots(playerLevel)];
  for (let i = shuffledSlots.length - 1; i > 0; i--) {
    const j = mainRng.nextInt(0, i);
    [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j], shuffledSlots[i]];
  }
  
  for (let i = 0; i < BOT_COUNT; i++) {
    const botRng = new SeededRandom(baseSeed + i * 1000);
    
    const botTypeName = shuffledSlots[i];
    const typeConfig = BOT_TYPE_CONFIGS[botTypeName];

    let botLevel, fundSize;

    // Bot level anchored to player level via typeConfig offsets
    const [minOff, maxOff] = typeConfig.levelOffset;
    const levelOffset = botRng.nextInt(minOff, maxOff);
    botLevel = Math.max(1, playerLevel + levelOffset);

    // Fund size: scale with player's actual HQ size (fundMult anchors to player HQ, not bot level)
    // This means a Whale bot will have a significantly larger HQ than the player
    const baseFundSize = Math.max(1, playerFundSize > 0 ? playerFundSize : Math.round(botLevel * 0.8));
    fundSize = Math.max(1, Math.round(baseFundSize * typeConfig.fundMult));
    
    // Build loadout procedurally based on bot level and type
    // Then inject featured items for Whale/Strong bots via weighted roll
    const baseEquipped = buildBotLoadout(botLevel, botTypeName, botRng);
    const equipped = (botTypeName === 'Whale' || botTypeName === 'Strong')
      ? injectFeaturedItems(baseEquipped, botLevel, botTypeName, botRng)
      : baseEquipped;
    
    // Generate bot gender (55% male, 40% female, 5% non-binary)
    const genderRoll = botRng.next();
    let botGenderEmoji;
    let presentationGender = null;
    let botAvatar;
    
    if (genderRoll < 0.55) {
      botGenderEmoji = 'M';
    } else if (genderRoll < 0.95) {
      botGenderEmoji = 'F';
    } else {
      botGenderEmoji = 'NB';
      presentationGender = botRng.next() < 0.5 ? 'M' : 'F';
    }
    
    // Select name pool, profile image, and avatar based on gender
    let prefixPool, profileImagePool;
    
    // Build gender-appropriate avatar pools from catalog + defaults
    const DEFAULT_MALE_AVATARS = [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8688cf42a_avatar-man-DEFAULT-01b.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a4f286089_avatar-man-DEFAULT-02.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7d438f21a_avatar-man-DEFAULT-03.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/30c442480_avatar-man-DEFAULT-04.png"
    ];
    const DEFAULT_FEMALE_AVATARS = [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fbf8a974f_avatar-female-DEFAULT-01.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/37fa65815_avatar-female-DEFAULT-02.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0a91424b9_avatar-female-DEFAULT-03.png",
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/84e49abef_avatar-female-DEFAULT-04.png"
    ];
    
    // Pull catalog avatars eligible at this bot's level (gender-restricted)
    const eligibleMaleCatalog = AVATARS.filter(a => a.gender === 'male' && a.requiredLevel <= botLevel).map(a => a.imageUrl);
    const eligibleFemaleCatalog = AVATARS.filter(a => a.gender === 'female' && a.requiredLevel <= botLevel).map(a => a.imageUrl);
    
    const MALE_AVATARS = [...DEFAULT_MALE_AVATARS, ...eligibleMaleCatalog];
    const FEMALE_AVATARS = [...DEFAULT_FEMALE_AVATARS, ...eligibleFemaleCatalog];
    
    let avatarPool;
    if (botGenderEmoji === 'M') {
      prefixPool = MALE_PREFIX_POOL;
      profileImagePool = BOT_MALE_PROFILE_IMAGES;
      avatarPool = MALE_AVATARS;
    } else if (botGenderEmoji === 'F') {
      prefixPool = F_NAME_POOL;
      profileImagePool = BOT_FEMALE_PROFILE_IMAGES;
      avatarPool = FEMALE_AVATARS;
    } else {
      prefixPool = GENERIC_PREFIX_POOL;
      if (presentationGender === 'M') {
        profileImagePool = BOT_MALE_PROFILE_IMAGES;
        avatarPool = MALE_AVATARS;
      } else {
        profileImagePool = BOT_FEMALE_PROFILE_IMAGES;
        avatarPool = FEMALE_AVATARS;
      }
    }
    
    // Select avatar for bot
    botAvatar = botRng.pick(avatarPool);
    
    // Select random scene for bot based on gender and level
    // Scene level requirements
    const SCENE_LEVELS = {
      'scene_default_01': 1, 'scene_default_02': 1, 'scene_default_03': 1,
      'scene_neon_cyan_zone': 1, 'scene_neon_pink_zone': 1,
      'scene_trade_desk': 10, 'scene_tool_shop': 12, 'scene_cute_n_pink': 14,
      'scene_trade_floor': 15, 'scene_dance_studio': 17, 'scene_gaming_room': 18,
      'scene_pretty_game_station': 19, 'scene_wall_street': 20, 'scene_girl_power': 21,
      'scene_sportscar_garage': 22, 'scene_mounds_of_money': 25, 'scene_high_rise': 30,
      'scene_futuristic_battle_pad': 32, 'scene_evil_lair': 35, 'scene_mansion': 50,
      'scene_white_house': 100, 'scene_illuminati_house': 150
    };
    
    // Build eligible scenes based on bot level and gender
    const BASE_UNIVERSAL_SCENES = [
      'scene_default_01', 'scene_default_02', 'scene_default_03',
      'scene_neon_cyan_zone', 'scene_neon_pink_zone',
      'scene_trade_desk', 'scene_trade_floor', 'scene_wall_street',
      'scene_mounds_of_money', 'scene_high_rise', 'scene_evil_lair',
      'scene_futuristic_battle_pad', 'scene_mansion', 'scene_white_house',
      'scene_illuminati_house'
    ];
    
    const MALE_ONLY_SCENES = ['scene_sportscar_garage', 'scene_gaming_room', 'scene_tool_shop'];
    const FEMALE_ONLY_SCENES = ['scene_cute_n_pink', 'scene_dance_studio', 'scene_girl_power', 'scene_pretty_game_station'];
    
    // Filter scenes by level requirement
    const eligibleUniversal = BASE_UNIVERSAL_SCENES.filter(s => SCENE_LEVELS[s] <= botLevel);
    const eligibleMale = MALE_ONLY_SCENES.filter(s => SCENE_LEVELS[s] <= botLevel);
    const eligibleFemale = FEMALE_ONLY_SCENES.filter(s => SCENE_LEVELS[s] <= botLevel);
    
    let scenePool = [];
    if (botGenderEmoji === 'M' || presentationGender === 'M') {
      scenePool = [...eligibleUniversal, ...eligibleMale];
    } else if (botGenderEmoji === 'F' || presentationGender === 'F') {
      scenePool = [...eligibleUniversal, ...eligibleFemale];
    } else {
      scenePool = [...eligibleUniversal, ...eligibleMale, ...eligibleFemale];
    }
    
    // Fallback to default if no scenes available
    const botSceneId = scenePool.length > 0 ? botRng.pick(scenePool) : 'scene_default_01';
    
    // Generate name
    const LEET_MAP = { 'a': '4', 'e': '3', 'i': '1', 'l': '1', 'b': '8', 'o': '0', 's': '5' };
    let botName = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      let candidate = "";
      const pathRoll = botRng.next();

      if (pathRoll < 0.15) {
        // 15%: Chinese name (all genders)
        candidate = botRng.pick(CHINESE_NAME_POOL);
      } else if (pathRoll < 0.30) {
        // 15%: Taunting name (gender-neutral)
        candidate = botRng.pick(TAUNTING_NAME_POOL);
      } else if (botGenderEmoji === 'F' && pathRoll < 0.48) {
        // ~18% for female bots: title pool
        candidate = botRng.pick(F_TITLE_POOL);
      } else {
        // Standard combinatorial
        const prefix = botRng.pick(prefixPool);
        const core = botRng.pick(CORE_POOL);
        const useSuffix = botRng.next() < 0.3;
        const useInternalUnderscore = botRng.next() < 0.10;
        if (useSuffix) {
          const suffix = botRng.pick(SUFFIX_POOL);
          const sep1 = useInternalUnderscore ? "_" : "";
          const sep2 = botRng.next() < 0.10 ? "_" : "";
          candidate = `${prefix}${sep1}${core}${sep2}${suffix}`;
        } else {
          const sep = useInternalUnderscore ? "_" : "";
          candidate = `${prefix}${sep}${core}`;
        }
      }

      // 15% leet speak transformation
      if (botRng.next() < 0.15) {
        candidate = candidate.split('').map(c => LEET_MAP[c.toLowerCase()] || c).join('');
      }

      // Independent 25% numeric suffix
      if (botRng.next() < 0.25) {
        candidate += botRng.nextInt(1, 9999);
      }

      // 10% wrapping underscores
      if (botRng.next() < 0.10) {
        candidate = `_${candidate}_`;
      }

      if (candidate.length > 20) candidate = candidate.slice(0, 20);
      if (!usedNames.has(candidate)) {
        botName = candidate;
        break;
      }
    }
    if (!botName || usedNames.has(botName)) {
      botName = `${botRng.pick(CORE_POOL)}${botRng.nextInt(100, 999)}`;
    }
    usedNames.add(botName);
    
    // Select bot profile image
    const botProfileImage = botRng.pick(profileImagePool);
    
    // Select bot theme based on gender and level (same logic as scenes)
    const effectiveGender = botGenderEmoji === 'NB' ? (presentationGender === 'F' ? 'F' : 'M') : botGenderEmoji;
    const eligibleBotThemes = getEligibleThemes(ALL_THEMES, effectiveGender).filter(t => (t.level || 1) <= botLevel);
    const botThemeId = eligibleBotThemes.length > 0 ? botRng.pick(eligibleBotThemes).id : 'theme_001_rusty_hotness';
    
    // Build upgrade data
    const weaponUpgrades = buildBotWeaponUpgrades(equipped, botLevel, botTypeName, botRng);
    const avatarShards = getBotAvatarShards(botLevel, botTypeName, botRng);
    const simpleUpgrades = buildBotSimpleUpgrades(equipped, botLevel, botTypeName, botRng);

    // Create bot object
    const bot = {
      id: `bot_${locationKey}_${i}`,
      name: botName,
      level: botLevel,
      type: botTypeName,
      fundMembers: fundSize,
      fundPowerMult: typeConfig.fundPowerMult,
      city: playerCity || "Unknown",
      state: playerState || "Unknown",
      equipped,
      weaponUpgrades,
      avatarShards,
      simpleUpgrades,
      botGenderEmoji,
      botProfileImage,
      botAvatar,
      botSceneId,
      botThemeId
    };
    
    // Compute stats (include weapon upgrade bonuses in ATK/DEF)
    const stats = computeCombatStats(bot);
    // Add weapon upgrade ATK/DEF bonus on top
    let wUpgradeAtk = 0, wUpgradeDef = 0;
    ['weapon1','weapon2','weapon3','weapon4'].forEach(slot => {
      const wId = equipped[slot];
      if (typeof wId === 'string') {
        // Look up in FIREARMS first (weapon1/weapon2), then WEAPONS (weapon3/accessories)
        const wData = (wId.startsWith('F') ? FIREARMS : WEAPONS).find(w => w.id === wId) || [...FIREARMS, ...WEAPONS].find(w => w.id === wId);
        const spent = weaponUpgrades[wId] || 0;
        const { star, subTier } = getWeaponStarProgress(spent);
        const completedSubs = star * 5 + subTier;
        const bonusPct = (completedSubs * 0.4) / 100;
        if (wData) {
          wUpgradeAtk += (wData.atk || 0) * bonusPct;
          wUpgradeDef += (wData.def || 0) * bonusPct;
        }
      }
    });
    // Simple upgrade bonuses for vehicle, pet, and power
    let sUpgradeAtk = 0, sUpgradeDef = 0;
    const simpleSlots = { vehicle: VEHICLES, pet: PETS, power: PEOPLE };
    for (const [slot, catalog] of Object.entries(simpleSlots)) {
      const itemId = equipped[slot];
      if (typeof itemId === 'string') {
        const itemData = catalog.find(it => it.id === itemId);
        const upgradeLvl = simpleUpgrades[itemId] || 0;
        if (itemData && upgradeLvl > 0) {
          const bonusPct = getUpgradeBonusPct(upgradeLvl) / 100;
          sUpgradeAtk += (itemData.atk || 0) * bonusPct;
          sUpgradeDef += (itemData.def || 0) * bonusPct;
        }
      }
    }

    // Simulated research/development bonus for Strong and Whale bots
    const researchMult = botTypeName === 'Whale'
      ? 1.18 + botRng.next() * 0.10  // 1.18 - 1.28x
      : botTypeName === 'Strong'
      ? 1.08 + botRng.next() * 0.08  // 1.08 - 1.16x
      : 1.0;
    bot.atk = Math.round((stats.atk + wUpgradeAtk + sUpgradeAtk) * researchMult * 100) / 100;
    bot.def = Math.round((stats.def + wUpgradeDef + sUpgradeDef) * researchMult * 100) / 100;
    bot.pwr = Math.round((bot.atk + bot.def) * 100) / 100;
    bot.fundPower = stats.fundPower;
    
    // 15% chance of VIP frame (deterministic per bot)
    bot.hasVipFrame = botRng.next() < 0.15;

    // Reputation
    const botRespect = Math.round((bot.level * 10) + (bot.fundMembers * 2) + (bot.pwr * 5));
    bot.respect = botRespect;
    bot.reputationTitle = getReputationTitle(botRespect);
    
    // Generate realistic lifetime performance stats based on bot level and type
    // Elite Whale/Strong bots (30%) use player-anchored stats
    const playerPerfStats = {
      wins:   playerData.totalTradeWarWins   || 0,
      losses: playerData.totalTradeWarLosses || 0,
      jobs:   playerData.totalJobsCompleted  || 0,
      trades: playerData.totalTradesCompleted|| 0,
    };
    const isElite = (botTypeName === 'Whale' || botTypeName === 'Strong') && botRng.next() < 0.30;
    // Only use player-anchored stats if player has meaningful career data
    const hasPlayerStats = playerPerfStats.jobs > 10 || playerPerfStats.trades > 10 || playerPerfStats.wins > 5;
    const lifeStats = isElite && hasPlayerStats
      ? generateEliteBotStats(botLevel, botTypeName, botRng, playerPerfStats)
      : generateBotLifetimeStats(botLevel, botTypeName, botRng, playerPerfStats);
    bot.lifetimeJobs = lifeStats.jobs;
    bot.lifetimeAssists = Math.floor(lifeStats.jobs * (0.4 + botRng.next() * 0.8));
    bot.lifetimeSabotages = Math.floor(lifeStats.jobs * (0.05 + botRng.next() * 0.25));
    bot.lifetimeTrades = lifeStats.trades;
    bot.tradeWarsWins = lifeStats.wins;
    bot.tradeWarsLosses = lifeStats.losses;
    
    bots.push(bot);
  }
  
  // Randomize bot order instead of sorting by power
  for (let i = bots.length - 1; i > 0; i--) {
    const j = mainRng.nextInt(0, i);
    [bots[i], bots[j]] = [bots[j], bots[i]];
  }

  return bots;
};

const computePlayerPower = (playerLevel) => {
  try {
    const stored = kvGet('insiderTraderPlayer');
    if (!stored) return playerLevel * 2;
    const player = JSON.parse(stored);
    const stats = computeCombatStats({
      level: player.level,
      fundMembers: player.fundMembersOwned || 0,
      equippedLoadout: player.loadout || {}
    });
    return stats.pwr;
  } catch {
    return playerLevel * 2;
  }
};

const getPlayerData = () => {
  try {
    const stored = kvGet('insiderTraderPlayer');
    return stored ? JSON.parse(stored) : { level: 1, fundMembersOwned: 0, loadout: {} };
  } catch {
    return { level: 1, fundMembersOwned: 0, loadout: {} };
  }
};