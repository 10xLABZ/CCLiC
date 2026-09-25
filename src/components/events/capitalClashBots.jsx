// Deterministic bot leaderboard for Capital Clash — same for ALL users per cycle week
// Uses only startTime as seed — no per-user data — so every player sees identical bots
//
// CP DESIGN RATIONALE:
//   Slot 1:       ~850–1050 CP  (Lv 95–100 ultra-whale)
//   Slots 2–5:    ~600–850 CP   (Lv 85–95 whale)
//   Slots 6–15:   ~350–600 CP   (Lv 70–85 strong)
//   Slots 16–30:  ~180–380 CP   (Lv 55–72 solid)
//   Slots 31–55:  ~80–200 CP    (Lv 35–58 mid)
//   Slots 56–80:  ~35–100 CP    (Lv 18–38 low-mid)
//   Slots 81–100: ~10–45 CP     (Lv 5–20 beginner)
//
// STAGGER: Each bot's CP is its tier baseline ± up to 18% jitter, then the list is
// SOFT-SORTED: bots are allowed to be out of order by up to ±5 positions, making
// the leaderboard look lived-in rather than mechanically perfect.

function hashInt(n) {
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  return Math.abs(n >>> 0);
}

class SeededRandom {
  constructor(seed) { this.seed = (seed ^ 0xdeadbeef) >>> 0; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  nextInt(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  nextFloat(min, max) { return min + this.next() * (max - min); }
}

// ── Tier definitions ──────────────────────────────────────────────────────────
// Each tier: [slotStart, slotEnd, cpMin, cpMax, levelMin, levelMax]
const TIERS = [
  [1,   1,   850, 1100, 95, 100],
  [2,   5,   600,  870, 82,  95],
  [6,  15,   330,  630, 65,  83],
  [16, 30,   160,  370, 48,  66],
  [31, 55,    75,  195, 28,  50],
  [56, 80,    30,   90, 14,  30],
  [81, 100,    8,   38,  3,  15],
];

function getTierForSlot(slot) {
  for (const t of TIERS) {
    if (slot >= t[0] && slot <= t[1]) return t;
  }
  return TIERS[TIERS.length - 1];
}

// ATK/DEF split: ATK ~55-65% of total CP, DEF ~35-45%
function splitCP(totalCP, rng) {
  const atkShare = rng.nextFloat(0.54, 0.66);
  const atk = Math.round(totalCP * atkShare * 100) / 100;
  const def = Math.round((totalCP - atk) * 100) / 100;
  return { atk, def };
}

const NAME_PREFIXES = [
  'Shadow','Iron','Neon','Frost','Phantom','Storm','Dark','Golden','Steel','Crimson',
  'Ghost','Rogue','Toxic','Omega','Ultra','Prime','Apex','Viper','Blaze','Titan',
  'Silent','Blood','Black','White','Fallen','Broken','Savage','Raven','Void','Eternal',
];
const NAME_CORES = [
  'Wolf','Hawk','Bear','Fox','Snake','Eagle','Tiger','Shark','Lion','Dragon',
  'Crusher','Dealer','Baron','Hunter','Raider','Striker','Enforcer','Warden','Tycoon',
  'Reaper','King','Blade','Fury','Fist','Venom','Rage','Ruin','Doom','Throne',
];

function generateGlobalBotName(rng) {
  const prefix = NAME_PREFIXES[rng.nextInt(0, NAME_PREFIXES.length - 1)];
  const core = NAME_CORES[rng.nextInt(0, NAME_CORES.length - 1)];
  const useNum = rng.next() < 0.35;
  const num = useNum ? rng.nextInt(1, 999) : '';
  return `${prefix}${core}${num}`;
}

const BOT_PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
];

// ── Main export ───────────────────────────────────────────────────────────────
// Returns 100 bot entries, deterministic on startTime, with realistic CP tiers
// and natural stagger (not perfectly sorted by slot).
export function generateLeaderboardBots(startTime) {
  const usedNames = new Set();

  // Step 1: Generate raw bots with per-slot CP targets
  const rawBots = [];
  for (let i = 0; i < 100; i++) {
    const slotNum = i + 1;
    const rng = new SeededRandom(hashInt(startTime ^ (i * 0x9e3779b9)));

    const [, , cpMin, cpMax, levelMin, levelMax] = getTierForSlot(slotNum);

    // CP with controlled jitter — stays within tier but not mechanically uniform
    // Jitter is ±15% of midpoint, biased toward lower end to feel earned
    const cpBase = rng.nextFloat(cpMin, cpMax);
    // Small extra per-slot nudge so adjacent slots differ meaningfully
    const nudge = rng.nextFloat(-cpBase * 0.12, cpBase * 0.12);
    const totalCP = Math.round(Math.max(cpMin * 0.85, Math.min(cpMax * 1.08, cpBase + nudge)) * 100) / 100;

    const level = rng.nextInt(levelMin, levelMax);
    const { atk, def } = splitCP(totalCP, rng);

    // fund_power is a portion of total CP (not an independent stat here — kept for display compat)
    const fundPower = Math.round(totalCP * rng.nextFloat(0.10, 0.22) * 100) / 100;

    let name = generateGlobalBotName(rng);
    // Avoid duplicate names
    let attempts = 0;
    while (usedNames.has(name) && attempts < 8) {
      name = generateGlobalBotName(rng);
      attempts++;
    }
    usedNames.add(name);

    const botProfileImage = BOT_PROFILE_IMAGES[rng.nextInt(0, BOT_PROFILE_IMAGES.length - 1)];
    const isVip = slotNum <= 20 ? rng.next() < 0.35 : rng.next() < 0.08;

    rawBots.push({ slot: slotNum, name, level, atk, def, totalCP, fund_power: fundPower, fundPower, isVip, botProfileImage });
  }

  // Step 2: Apply soft-sort — shuffle within ±4 positions to create natural disorder
  // while preserving the overall descending CP order across tiers.
  // We do a small window shuffle seeded by startTime.
  const shuffleRng = new SeededRandom(hashInt(startTime * 7 + 0xc0ffee));
  const finalBots = [...rawBots];
  for (let i = 0; i < finalBots.length; i++) {
    // Each bot can swap with a neighbor up to 4 positions away
    const swapRange = i < 20 ? 2 : 4; // top 20 are more stable
    const j = Math.min(finalBots.length - 1, Math.max(0, i + shuffleRng.nextInt(-swapRange, swapRange)));
    if (i !== j) {
      // Only swap if it doesn't violate cross-tier order (keep top tier on top)
      const tierI = getTierForSlot(i + 1);
      const tierJ = getTierForSlot(j + 1);
      if (tierI === tierJ) {
        [finalBots[i], finalBots[j]] = [finalBots[j], finalBots[i]];
      }
    }
  }

  // Step 3: Re-assign slot numbers to the shuffled order, return final array
  return finalBots.map((bot, i) => ({
    slot: i + 1,
    name: bot.name,
    level: bot.level,
    atk: bot.atk,
    def: bot.def,
    fund_power: bot.fund_power,
    fundPower: bot.fundPower,
    isHuman: false,
    isMe: false,
    isVip: bot.isVip,
    is_vip: bot.isVip,
    botProfileImage: bot.botProfileImage,
    botAvatarId: null,
  }));
}