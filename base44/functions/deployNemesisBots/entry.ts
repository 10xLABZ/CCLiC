import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NB_USERNAMES = [
  'x-NOVAking-x','oOdaddyDOo','F_F_Frank','KraZy','KiLleR','Number1striKrrr','SeñorSmack','LilFuego','T0xicPapi','iBreakAnkles',
  'ThaKidd','YoSoyRex','BaddieBytes','xXenoWolf','MamiGotAim','D3monBait','NoLuckJustLag','ElJefeSmirk','iiToldYa','MisterShady',
  'Queen0fStatic','JusSayinBro','RageNacho','PapiReloaded','ShortySnaps','1ShotMikey','DirtNapDan','x_Reapz_x','BruhItsKevin','N0tUrHomie',
  'SlickRickk','MaloMalo','0DarkAngel','AyoRelax','ChulaaaFury','BigMadMaxx','SneakyTacoOos','LunaPeligro','RawrItsLeXx','DaRealToasty',
  'WickedV4to','JrzyBrawler','SirClappem','MizzMayhem','DropDeadDre','ElReyLoco','BlinkyBandit','NenaConFuego','TrynaWinBro','2FastTino',
  'CashMeOutsidee','xKoldHandz','OoopsMyBad','CapnCranky','BabyFaceKilla','FuegoMamixoxo','OneTapTommy','4biddenKing','NoAimNico','SeñoraSavage',
  'BoiAintNoWay','ItsYaBoiDre','XtraCrispyyy','MeanMuggin','KillaCammm','PuroCaos','Aim4DaFac3','LilMissHex','DonTazeMe','2ColdTasha',
  'OopsINukedU','NachoBusiness','Loco4Headshots','DntPushMee','HellaSalty','MiraMami','xLilSav','NoNoNate','MaddDogg','KinggOfNada',
  'AintScareddd','0ChanceBuddy','DrowsyDemon','YeaItsMe','F4talMami','BigPermJr','MisterMischief','J3faRuthl3ss','DrippyBandito','JustaMenace',
  'NoTeVeo','TuffCookieee','ImHimTho','SassyButDeadly','3AMGremlin','CuhWatchOut','KrazyLilVato1','MamiNoMercy','1BackUpTerry','LoquitaMode',
  'Fuhgeddaboudit','iSlideDifferent420','xRuthl3ss','PelonProblems','LadyClutchh69','SkrrtSkrrtSam','1MeanSenor','TinyButPsycho','ElBurritoLoko1975','YungCranker',
  'SleepyAssassin','G0mezGoneWild','TrashTalkTina','BigChileEnergy2001','iBlinkURGone','SlapzMcGee1999','ChicoDoom','IzzyInChaos','MaddHatterr','AyoItsMeee',
  'WtfRickyLoL','HolaMurder1000','ZeroChillVic','DaddysLilMenace0','xDeadpanx','FrijoleFury','NoScopeNaniiiii','PanicAtSpawn','MurderMittenNn','MijoMeansBiz',
  'CrankyCarnage','ThatDudeJavi','0ldSchoolFlexXx','BroRelaxx','KweenKaboom','SoyUnProblema','MansGotHands','WylinWendy696','MissMisfire','2TurntTony',
  'Elbows4Free','ChillTillSudden','NaughtyByAim7','SupaGrimy','TiaOfTerror','GrampaGoesHard','OopsAllViolence','xXtraSpicy','DontPeekPlz','WrecklessRosa',
  '1TapAbuelo'
];

const MALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png"
];
const FEMALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png"
];

const CITIES = [
  { city: 'Montgomery', state: 'Alabama' }, { city: 'Birmingham', state: 'Alabama' }, { city: 'Juneau', state: 'Alaska' }, { city: 'Anchorage', state: 'Alaska' },
  { city: 'Phoenix', state: 'Arizona' }, { city: 'Tucson', state: 'Arizona' }, { city: 'Little Rock', state: 'Arkansas' }, { city: 'Fayetteville', state: 'Arkansas' },
  { city: 'Sacramento', state: 'California' }, { city: 'Los Angeles', state: 'California' }, { city: 'San Diego', state: 'California' }, { city: 'San Francisco', state: 'California' },
  { city: 'Oakland', state: 'California' }, { city: 'Denver', state: 'Colorado' }, { city: 'Colorado Springs', state: 'Colorado' }, { city: 'Hartford', state: 'Connecticut' },
  { city: 'New Haven', state: 'Connecticut' }, { city: 'Dover', state: 'Delaware' }, { city: 'Wilmington', state: 'Delaware' }, { city: 'Tallahassee', state: 'Florida' },
  { city: 'Miami', state: 'Florida' }, { city: 'Orlando', state: 'Florida' }, { city: 'Tampa Bay', state: 'Florida' }, { city: 'Jacksonville', state: 'Florida' },
  { city: 'Atlanta', state: 'Georgia' }, { city: 'Savannah', state: 'Georgia' }, { city: 'Honolulu', state: 'Hawaii' }, { city: 'Hilo', state: 'Hawaii' },
  { city: 'Boise', state: 'Idaho' }, { city: 'Idaho Falls', state: 'Idaho' }, { city: 'Springfield', state: 'Illinois' }, { city: 'Chicago', state: 'Illinois' },
  { city: 'Indianapolis', state: 'Indiana' }, { city: 'Fort Wayne', state: 'Indiana' }, { city: 'Des Moines', state: 'Iowa' }, { city: 'Cedar Rapids', state: 'Iowa' },
  { city: 'Topeka', state: 'Kansas' }, { city: 'Wichita', state: 'Kansas' }, { city: 'Frankfort', state: 'Kentucky' }, { city: 'Louisville', state: 'Kentucky' },
  { city: 'Baton Rouge', state: 'Louisiana' }, { city: 'New Orleans', state: 'Louisiana' }, { city: 'Augusta', state: 'Maine' }, { city: 'Portland', state: 'Maine' },
  { city: 'Annapolis', state: 'Maryland' }, { city: 'Baltimore', state: 'Maryland' }, { city: 'Boston', state: 'Massachusetts' }, { city: 'Worcester', state: 'Massachusetts' },
  { city: 'Lansing', state: 'Michigan' }, { city: 'Detroit', state: 'Michigan' }, { city: 'Saint Paul', state: 'Minnesota' }, { city: 'Minneapolis', state: 'Minnesota' },
  { city: 'Jackson', state: 'Mississippi' }, { city: 'Gulfport', state: 'Mississippi' }, { city: 'Jefferson City', state: 'Missouri' }, { city: 'St. Louis', state: 'Missouri' },
  { city: 'Helena', state: 'Montana' }, { city: 'Billings', state: 'Montana' }, { city: 'Lincoln', state: 'Nebraska' }, { city: 'Omaha', state: 'Nebraska' },
  { city: 'Carson City', state: 'Nevada' }, { city: 'Las Vegas', state: 'Nevada' }, { city: 'Concord', state: 'New Hampshire' }, { city: 'Manchester', state: 'New Hampshire' },
  { city: 'Trenton', state: 'New Jersey' }, { city: 'Newark', state: 'New Jersey' }, { city: 'Santa Fe', state: 'New Mexico' }, { city: 'Albuquerque', state: 'New Mexico' },
  { city: 'Albany', state: 'New York' }, { city: 'New York City', state: 'New York' }, { city: 'Raleigh', state: 'North Carolina' }, { city: 'Charlotte', state: 'North Carolina' },
  { city: 'Bismarck', state: 'North Dakota' }, { city: 'Fargo', state: 'North Dakota' }, { city: 'Columbus', state: 'Ohio' }, { city: 'Cleveland', state: 'Ohio' },
  { city: 'Oklahoma City', state: 'Oklahoma' }, { city: 'Tulsa', state: 'Oklahoma' }, { city: 'Salem', state: 'Oregon' }, { city: 'Portland', state: 'Oregon' },
  { city: 'Harrisburg', state: 'Pennsylvania' }, { city: 'Philadelphia', state: 'Pennsylvania' }, { city: 'Pittsburgh', state: 'Pennsylvania' }, { city: 'Providence', state: 'Rhode Island' },
  { city: 'Newport', state: 'Rhode Island' }, { city: 'Columbia', state: 'South Carolina' }, { city: 'Charleston', state: 'South Carolina' }, { city: 'Pierre', state: 'South Dakota' },
  { city: 'Sioux Falls', state: 'South Dakota' }, { city: 'Nashville', state: 'Tennessee' }, { city: 'Memphis', state: 'Tennessee' }, { city: 'Austin', state: 'Texas' },
  { city: 'Houston', state: 'Texas' }, { city: 'Salt Lake City', state: 'Utah' }, { city: 'Provo', state: 'Utah' }, { city: 'Montpelier', state: 'Vermont' },
  { city: 'Burlington', state: 'Vermont' }, { city: 'Richmond', state: 'Virginia' }, { city: 'Virginia Beach', state: 'Virginia' }, { city: 'Olympia', state: 'Washington' },
  { city: 'Seattle', state: 'Washington' }, { city: 'Charleston', state: 'West Virginia' }, { city: 'Morgantown', state: 'West Virginia' }, { city: 'Madison', state: 'Wisconsin' },
  { city: 'Milwaukee', state: 'Wisconsin' }, { city: 'Cheyenne', state: 'Wyoming' }, { city: 'Casper', state: 'Wyoming' }, { city: 'Toronto', state: 'Canada' },
  { city: 'Mexico City', state: 'Mexico' }, { city: 'São Paulo', state: 'Brazil' }, { city: 'Buenos Aires', state: 'Argentina' }, { city: 'Santiago', state: 'Chile' },
  { city: 'Bogotá', state: 'Colombia' }, { city: 'Lima', state: 'Peru' }, { city: 'London', state: 'United Kingdom' }, { city: 'Paris', state: 'France' },
  { city: 'Berlin', state: 'Germany' }, { city: 'Rome', state: 'Italy' }, { city: 'Madrid', state: 'Spain' }, { city: 'Amsterdam', state: 'Netherlands' },
  { city: 'Zurich', state: 'Switzerland' }, { city: 'Brussels', state: 'Belgium' }, { city: 'Vienna', state: 'Austria' }, { city: 'Lisbon', state: 'Portugal' },
  { city: 'Warsaw', state: 'Poland' }, { city: 'Prague', state: 'Czech Republic' }, { city: 'Budapest', state: 'Hungary' }, { city: 'Athens', state: 'Greece' },
  { city: 'Dubai', state: 'United Arab Emirates' }, { city: 'Riyadh', state: 'Saudi Arabia' }, { city: 'Tel Aviv', state: 'Israel' }, { city: 'Doha', state: 'Qatar' },
  { city: 'Istanbul', state: 'Turkey' }, { city: 'Tokyo', state: 'Japan' }, { city: 'Shanghai', state: 'China' }, { city: 'Seoul', state: 'South Korea' },
  { city: 'Singapore', state: 'Singapore' }, { city: 'Hong Kong', state: 'Hong Kong' }, { city: 'Mumbai', state: 'India' }, { city: 'Bangkok', state: 'Thailand' },
  { city: 'Ho Chi Minh City', state: 'Vietnam' }, { city: 'Manila', state: 'Philippines' }, { city: 'Jakarta', state: 'Indonesia' }, { city: 'Kuala Lumpur', state: 'Malaysia' },
  { city: 'Johannesburg', state: 'South Africa' }, { city: 'Lagos', state: 'Nigeria' }, { city: 'Cairo', state: 'Egypt' }, { city: 'Nairobi', state: 'Kenya' },
  { city: 'Casablanca', state: 'Morocco' }, { city: 'Sydney', state: 'Australia' }, { city: 'Auckland', state: 'New Zealand' }
];

const seededRand = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    // city_start and city_end are 0-indexed, inclusive. Default: 0-3 (first 4 cities)
    const cityStart = body.city_start ?? 0;
    const cityEnd = Math.min(body.city_end ?? cityStart + 3, CITIES.length - 1);

    const results = [];

    for (let ci = cityStart; ci <= cityEnd; ci++) {
      const { city, state } = CITIES[ci];

      // Get all existing slots for this city
      const allSlots = await base44.asServiceRole.entities.TerritorySlot.filter({ building_id: 'mayors_office', city, state });

      // Skip if nemesis already deployed at slot 1 (idempotent)
      const existingNemesis = allSlots.find(s => s.is_nemesis && s.slot_number === 1);
      if (existingNemesis) {
        results.push({ city, state, skipped: true, reason: 'Nemesis already at slot 1' });
        continue;
      }

      // Just replace whoever is at slot 1 — no shifting, avoids rate limits
      const slot1 = allSlots.find(s => s.slot_number === 1);
      if (slot1) await base44.asServiceRole.entities.TerritorySlot.delete(slot1.id);

      const rng = seededRand(ci * 7919 + 42);
      const username = NB_USERNAMES[Math.floor(rng() * NB_USERNAMES.length)];

      // Generate stats
      const level = 45 + Math.floor(rng() * 30);
      const atk = 10 + level * 3.2 + rng() * level * 1.5;
      const def = 8 + level * 2.8 + rng() * level * 1.2;
      const fundMembers = Math.floor(rng() * level * 4);
      const fundPower = fundMembers * (0.25 + level * 0.025);
      const power = Math.round(((atk + def) / 2 + fundPower) * 100) / 100;
      const isFemale = rng() < 0.35;
      const imgs = isFemale ? FEMALE_IMGS : MALE_IMGS;
      const profileImg = imgs[Math.floor(rng() * imgs.length)];
      const wins = Math.floor(rng() * level * 8) + level * 3;
      const losses = Math.floor(rng() * level * 1.5);

      await base44.asServiceRole.entities.TerritorySlot.create({
        building_id: 'mayors_office', city, state,
        slot_number: 1,
        user_id: `nemesis_${ci}`,
        username,
        profile_image_url: profileImg,
        player_level: level,
        player_power: power,
        last_payout_at: Date.now(),
        bot_wins: wins,
        bot_losses: losses,
        is_nemesis: true
      });

      results.push({ city, state, username, level, deployed: true });
    }

    const deployed = results.filter(r => r.deployed).length;
    const skipped = results.filter(r => r.skipped).length;
    return Response.json({ success: true, deployed, skipped, range: `${cityStart}-${cityEnd}`, total_cities: CITIES.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});