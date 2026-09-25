import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ========== SEEDED RNG ==========
const seededRand = (seed) => {
  let s = seed;
  return {
    next: () => { s = (s * 9301 + 49297) % 233280; return s / 233280; },
    nextInt: (min, max) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * (max - min + 1)) + min; },
    pick: (arr) => { s = (s * 9301 + 49297) % 233280; return arr[Math.floor((s / 233280) * arr.length)]; }
  };
};

// ========== NAME POOLS ==========
const MALE_PREFIX = ["Sharp","Dark","Silent","Iron","Neon","Ghost","Rogue","Cold","Wild","Brutal","Heavy","Golden","Storm","Turbo","Quick","Alpha","Omega","Phantom","Frost","Steel","Chrome","Prime","Ultra","Hyper","Dirty","Smooth","Shadow","Thunder","Phoenix","Eagle","Hawk","Cyber","Street","Urban","Royal","Noble","Crimson","Arctic","Toxic","Solar","Midnight","Blaze","Savage","Ruthless","Fierce","Deadly","Grim","Inferno","Obsidian","Titanium"];
const FEMALE_NAMES = ["Mia","Sofia","Isabella","Ava","Olivia","Emma","Luna","Aria","Layla","Zoe","Chloe","Ella","Scarlett","Victoria","Grace","Hannah","Natalie","Brooklyn","Savannah","Bella","Hailey","Nora","Riley","Leah","Stella","Maya","Lucy","Anna","Sarah","Ariana","Elena","Gabriella","Naomi","Valentina","Clara","Everly","Kennedy","Willow","Samantha","Caroline","Ruby","Alice","Piper","Quinn","Sadie","Delilah","Ivy","Jade","Eva","Cora","Ashley","Jasmine","Alexa","Brianna","Kiara","Nina","Laila","Camila","Daniela","Valeria","Alina","Angela","Bianca","Carmen","Diana","Elisa","Fernanda","Giselle","Helena","Iris","Karina","Liliana","Mariana","Natalia","Paola","Renata","Sabrina","Tatiana","Vanessa","Yasmin","Zara"];
const F_TITLES = ["Queen","Princess","Lady","Goddess","Baddie","Diva","Barbie","BossLady","RichGirl","ItGirl","HotGirl","PrettyGirl","FlyGirl","TrapQueen","StreetQueen","IceQueen","BadQueen","Reina","Princesa","Chica","Bonita","Mamacita","Chula","Shorty","Shawty"];
const TAUNTING = ["UknOwIMbetterrr","UjustMad","EZPZ","GitGud","CantTouchThis","SaltyTears","NoobFilter","CryMore","MadAboutMoney","StayMad","GetRekted","ImJustBetter","UWish","BetterThanU","SkillIssue","OutclassedU","GoodLuckLOL","NiceTrieLOL","PoorThing","KeepDreaming","WokeUpWinning","CashRulesU","TryAgainHun","HoldMyBag","YouMadOrNah","NoRefundsLOL","IMRunThisCity","FlexingOnU","EasyMode","PayToWin","MoneyTalks","CantCompete","SorryNotSorry","TooEasyLOL","AlreadyWon","NobodyBeatsMe","TopIsLonely","UnstoppableMode","StillWinning","FreeKills","GetSomeSkills","PeakPerformance","TakeNotes","NoContest","ZeroChance","FactsOnly","BigLeagueNow","U2Broke","TaggedAndBagged","PredictableU"];
const CHINESE = ["Xiao","Ming","Wei","Jun","Kai","Lei","Fei","Zhi","Hao","Cheng","Long","Feng","Jing","Ping","Qing","Ying","Xing","Hong","Sheng","XiaoLong","MingZhi","WeiHao","JunKai","LeiZhi","FengHao","JingWei","YingXiong","GuangMing","ZhongCheng","TianLong"];
const CORE = ["Vic","Options","Candle","Wick","Tape","Order","Flow","Beta","Gamma","Theta","Vega","Ripper","Hustle","Cash","Coin","Ledger","Vault","Margin","Leverage","Shorts","Longs","Bid","Ask","Spread","Pump","Dump","Trend","Pivot","Breakout","Reversal","Signal","Warrior","Samurai","Ninja","Ronin","Shogun","Fortune","Dynasty","Legacy","Pearl","Gold","Silver","Boss","Tech","Apex","Zenith","Summit","Pulse","Beat","Wave","Surge","Strike","Blade","Shield","Fang","Venom","Voice","Soul","Force","Spectre","Wraith","Titan","Empire","Domain"];
const SUFFIX = ["Killer","Lord","Sniper","Wizard","Raider","Hunter","Baron","Enforcer","Dealer","Fixer","Banker","Trader","Insider","Operator","Machine","Cannon","Admiral","Marshal","Elite","Ace","Titan","Legend","Icon","Star","Hero","Champion","Victor","Dominator","Overlord","Warlord","Slayer","Destroyer","Tyrant","Reaper","Sentinel","Guardian","Striker","Berserker","Savage","Beast","Specter","Phantom","Architect","Tycoon","Magnate","Kingpin","Sage","Oracle","Conqueror","Annihilator"];
const LEET_MAP = { a:'4', e:'3', i:'1', l:'1', b:'8', o:'0', s:'5' };

const MALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ba9b16930_profilepicture-bots-022.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e788cd81d_profilepicture-bots-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/9701ed03d_profilepicture-bots-027.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png"
];
const FEMALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4da43053e_profilepicture-bots-female-020.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/815d131dd_profilepicture-bots-female-021.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5e71076b9_profilepicture-bots-female-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d5fc792fd_profilepicture-bots-female-025.png"
];
const UNIVERSAL_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/afe80e37f_profilepicture-bots-048.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/067c165ff_profilepicture-bots-037.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a888307a0_profilepicture-bots-044.jpg"
];

const generateName = (rng, gender) => {
  const usedNames = new Set();
  for (let attempt = 0; attempt < 10; attempt++) {
    let candidate = '';
    const pathRoll = rng.next();

    if (pathRoll < 0.15) {
      candidate = rng.pick(CHINESE);
    } else if (pathRoll < 0.30) {
      candidate = rng.pick(TAUNTING);
    } else if (gender === 'F' && pathRoll < 0.48) {
      candidate = rng.pick(F_TITLES);
    } else if (gender === 'F' && pathRoll < 0.65) {
      candidate = rng.pick(FEMALE_NAMES);
    } else {
      const prefix = gender === 'F' ? rng.pick(FEMALE_NAMES) : rng.pick(MALE_PREFIX);
      const core = rng.pick(CORE);
      const useSuffix = rng.next() < 0.3;
      const useUnderscore = rng.next() < 0.10;
      if (useSuffix) {
        const suf = rng.pick(SUFFIX);
        const sep1 = useUnderscore ? '_' : '';
        const sep2 = rng.next() < 0.10 ? '_' : '';
        candidate = `${prefix}${sep1}${core}${sep2}${suf}`;
      } else {
        const sep = useUnderscore ? '_' : '';
        candidate = `${prefix}${sep}${core}`;
      }
    }

    // 15% leet speak
    if (rng.next() < 0.15) {
      candidate = candidate.split('').map(c => LEET_MAP[c.toLowerCase()] || c).join('');
    }
    // 25% numeric suffix 1-9999
    if (rng.next() < 0.25) {
      candidate += rng.nextInt(1, 9999);
    }
    // 10% wrapping underscores
    if (rng.next() < 0.10) {
      candidate = `_${candidate}_`;
    }

    if (candidate.length > 20) candidate = candidate.slice(0, 20);
    if (!usedNames.has(candidate)) return candidate;
  }
  return `${rng.pick(CORE)}${rng.nextInt(100, 9999)}`;
};

const build150Bots = () => {
  const bots = [];
  for (let i = 0; i < 150; i++) {
    const rng = seededRand((i + 1) * 7919);
    const level = Math.round(10 + (i / 149) * 55);
    const atk = 10 + level * 2.5 + rng.next() * level * 1.2;
    const def = 8 + level * 2.0 + rng.next() * level * 0.8;
    const fundMembers = Math.floor(rng.next() * level * 3);
    const fundPower = fundMembers * (0.20 + level * 0.02);
    const power = Math.round(((atk + def) / 2 + fundPower) * 100) / 100;
    const wins = Math.floor(rng.next() * level * 6) + level * 2;
    const losses = Math.floor(rng.next() * level * 2);

    const genderRoll = rng.next();
    const gender = genderRoll < 0.55 ? 'M' : genderRoll < 0.95 ? 'F' : 'NB';
    const imgPool = gender === 'M' ? [...MALE_IMGS, ...UNIVERSAL_IMGS] : [...FEMALE_IMGS, ...UNIVERSAL_IMGS];
    const profileImg = rng.pick(imgPool);
    const username = generateName(rng, gender === 'NB' ? (rng.next() < 0.5 ? 'M' : 'F') : gender);

    bots.push({ bot_index: i, username, profile_image_url: profileImg, gender, player_level: level, player_power: power, bot_wins: wins, bot_losses: losses });
  }
  return bots;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const forceReseed = body.force === true;

    // Check if already seeded
    const existing = await base44.asServiceRole.entities.MoBotProfile.list('-created_date', 5);
    if (existing.length >= 150 && !forceReseed) {
      return Response.json({ message: 'MoBotProfile already has 150 bots. Pass force:true to re-seed.', count: existing.length });
    }

    // Clear existing profiles if force re-seeding
    if (forceReseed && existing.length > 0) {
      const allExisting = await base44.asServiceRole.entities.MoBotProfile.list('-created_date', 200);
      for (let i = 0; i < allExisting.length; i += 5) {
        const batch = allExisting.slice(i, i + 5);
        await Promise.allSettled(batch.map(b => base44.asServiceRole.entities.MoBotProfile.delete(b.id)));
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const bots = build150Bots();
    let created = 0;

    // Bulk create in batches of 25
    for (let i = 0; i < bots.length; i += 25) {
      const batch = bots.slice(i, i + 25);
      await base44.asServiceRole.entities.MoBotProfile.bulkCreate(batch);
      created += batch.length;
      await new Promise(r => setTimeout(r, 400));
    }

    return Response.json({ message: `Successfully seeded ${created} MoBotProfile records.`, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});