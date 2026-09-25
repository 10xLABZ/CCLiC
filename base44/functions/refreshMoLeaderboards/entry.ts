import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CITIES = [
  { city: 'Montgomery', state: 'Alabama' }, { city: 'Birmingham', state: 'Alabama' }, { city: 'Juneau', state: 'Alaska' }, { city: 'Anchorage', state: 'Alaska' }, { city: 'Phoenix', state: 'Arizona' }, { city: 'Tucson', state: 'Arizona' }, { city: 'Little Rock', state: 'Arkansas' }, { city: 'Fayetteville', state: 'Arkansas' }, { city: 'Sacramento', state: 'California' }, { city: 'Los Angeles', state: 'California' }, { city: 'San Diego', state: 'California' }, { city: 'San Francisco', state: 'California' }, { city: 'Oakland', state: 'California' }, { city: 'Denver', state: 'Colorado' }, { city: 'Colorado Springs', state: 'Colorado' }, { city: 'Hartford', state: 'Connecticut' }, { city: 'New Haven', state: 'Connecticut' }, { city: 'Dover', state: 'Delaware' }, { city: 'Wilmington', state: 'Delaware' }, { city: 'Tallahassee', state: 'Florida' }, { city: 'Miami', state: 'Florida' }, { city: 'Orlando', state: 'Florida' }, { city: 'Tampa Bay', state: 'Florida' }, { city: 'Jacksonville', state: 'Florida' }, { city: 'Atlanta', state: 'Georgia' }, { city: 'Savannah', state: 'Georgia' }, { city: 'Honolulu', state: 'Hawaii' }, { city: 'Hilo', state: 'Hawaii' }, { city: 'Boise', state: 'Idaho' }, { city: 'Idaho Falls', state: 'Idaho' }, { city: 'Springfield', state: 'Illinois' }, { city: 'Chicago', state: 'Illinois' }, { city: 'Indianapolis', state: 'Indiana' }, { city: 'Fort Wayne', state: 'Indiana' }, { city: 'Des Moines', state: 'Iowa' }, { city: 'Cedar Rapids', state: 'Iowa' }, { city: 'Topeka', state: 'Kansas' }, { city: 'Wichita', state: 'Kansas' }, { city: 'Frankfort', state: 'Kentucky' }, { city: 'Louisville', state: 'Kentucky' }, { city: 'Baton Rouge', state: 'Louisiana' }, { city: 'New Orleans', state: 'Louisiana' }, { city: 'Augusta', state: 'Maine' }, { city: 'Portland', state: 'Maine' }, { city: 'Annapolis', state: 'Maryland' }, { city: 'Baltimore', state: 'Maryland' }, { city: 'Boston', state: 'Massachusetts' }, { city: 'Worcester', state: 'Massachusetts' }, { city: 'Lansing', state: 'Michigan' }, { city: 'Detroit', state: 'Michigan' }, { city: 'Saint Paul', state: 'Minnesota' }, { city: 'Minneapolis', state: 'Minnesota' }, { city: 'Jackson', state: 'Mississippi' }, { city: 'Gulfport', state: 'Mississippi' }, { city: 'Jefferson City', state: 'Missouri' }, { city: 'St. Louis', state: 'Missouri' }, { city: 'Helena', state: 'Montana' }, { city: 'Billings', state: 'Montana' }, { city: 'Lincoln', state: 'Nebraska' }, { city: 'Omaha', state: 'Nebraska' }, { city: 'Carson City', state: 'Nevada' }, { city: 'Las Vegas', state: 'Nevada' }, { city: 'Concord', state: 'New Hampshire' }, { city: 'Manchester', state: 'New Hampshire' }, { city: 'Trenton', state: 'New Jersey' }, { city: 'Newark', state: 'New Jersey' }, { city: 'Santa Fe', state: 'New Mexico' }, { city: 'Albuquerque', state: 'New Mexico' }, { city: 'Albany', state: 'New York' }, { city: 'New York City', state: 'New York' }, { city: 'Raleigh', state: 'North Carolina' }, { city: 'Charlotte', state: 'North Carolina' }, { city: 'Bismarck', state: 'North Dakota' }, { city: 'Fargo', state: 'North Dakota' }, { city: 'Columbus', state: 'Ohio' }, { city: 'Cleveland', state: 'Ohio' }, { city: 'Oklahoma City', state: 'Oklahoma' }, { city: 'Tulsa', state: 'Oklahoma' }, { city: 'Salem', state: 'Oregon' }, { city: 'Portland', state: 'Oregon' }, { city: 'Harrisburg', state: 'Pennsylvania' }, { city: 'Philadelphia', state: 'Pennsylvania' }, { city: 'Pittsburgh', state: 'Pennsylvania' }, { city: 'Providence', state: 'Rhode Island' }, { city: 'Newport', state: 'Rhode Island' }, { city: 'Columbia', state: 'South Carolina' }, { city: 'Charleston', state: 'South Carolina' }, { city: 'Pierre', state: 'South Dakota' }, { city: 'Sioux Falls', state: 'South Dakota' }, { city: 'Nashville', state: 'Tennessee' }, { city: 'Memphis', state: 'Tennessee' }, { city: 'Austin', state: 'Texas' }, { city: 'Houston', state: 'Texas' }, { city: 'Salt Lake City', state: 'Utah' }, { city: 'Provo', state: 'Utah' }, { city: 'Montpelier', state: 'Vermont' }, { city: 'Burlington', state: 'Vermont' }, { city: 'Richmond', state: 'Virginia' }, { city: 'Virginia Beach', state: 'Virginia' }, { city: 'Olympia', state: 'Washington' }, { city: 'Seattle', state: 'Washington' }, { city: 'Charleston', state: 'West Virginia' }, { city: 'Morgantown', state: 'West Virginia' }, { city: 'Madison', state: 'Wisconsin' }, { city: 'Milwaukee', state: 'Wisconsin' }, { city: 'Cheyenne', state: 'Wyoming' }, { city: 'Casper', state: 'Wyoming' }, { city: 'Toronto', state: 'Canada' }, { city: 'Mexico City', state: 'Mexico' }, { city: 'São Paulo', state: 'Brazil' }, { city: 'Buenos Aires', state: 'Argentina' }, { city: 'Santiago', state: 'Chile' }, { city: 'Bogotá', state: 'Colombia' }, { city: 'Lima', state: 'Peru' }, { city: 'London', state: 'United Kingdom' }, { city: 'Paris', state: 'France' }, { city: 'Berlin', state: 'Germany' }, { city: 'Rome', state: 'Italy' }, { city: 'Madrid', state: 'Spain' }, { city: 'Amsterdam', state: 'Netherlands' }, { city: 'Zurich', state: 'Switzerland' }, { city: 'Brussels', state: 'Belgium' }, { city: 'Vienna', state: 'Austria' }, { city: 'Lisbon', state: 'Portugal' }, { city: 'Warsaw', state: 'Poland' }, { city: 'Prague', state: 'Czech Republic' }, { city: 'Budapest', state: 'Hungary' }, { city: 'Athens', state: 'Greece' }, { city: 'Dubai', state: 'United Arab Emirates' }, { city: 'Riyadh', state: 'Saudi Arabia' }, { city: 'Tel Aviv', state: 'Israel' }, { city: 'Doha', state: 'Qatar' }, { city: 'Istanbul', state: 'Turkey' }, { city: 'Tokyo', state: 'Japan' }, { city: 'Shanghai', state: 'China' }, { city: 'Seoul', state: 'South Korea' }, { city: 'Singapore', state: 'Singapore' }, { city: 'Hong Kong', state: 'Hong Kong' }, { city: 'Mumbai', state: 'India' }, { city: 'Bangkok', state: 'Thailand' }, { city: 'Ho Chi Minh City', state: 'Vietnam' }, { city: 'Manila', state: 'Philippines' }, { city: 'Jakarta', state: 'Indonesia' }, { city: 'Kuala Lumpur', state: 'Malaysia' }, { city: 'Johannesburg', state: 'South Africa' }, { city: 'Lagos', state: 'Nigeria' }, { city: 'Cairo', state: 'Egypt' }, { city: 'Nairobi', state: 'Kenya' }, { city: 'Casablanca', state: 'Morocco' }, { city: 'Sydney', state: 'Australia' }, { city: 'Auckland', state: 'New Zealand' }
];

// Seeded RNG — deterministic per city so each city gets a unique bot mix
const seededRand = (seed) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

const seededShuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Pick and sort bots for a city: shuffle by city seed, then sort by TP with slight jitter
// so near-equal-power bots don't always appear in the exact same order (looks natural)
const pickAndSortBots = (botProfiles, city, state, count) => {
  const seed = hashString(`${city}|${state}`);
  const rng = seededRand(seed);
  const shuffled = seededShuffle(botProfiles, rng);
  const picked = shuffled.slice(0, count);

  // Pre-compute jittered power (±8% variance) so sort is stable and deterministic
  const rng2 = seededRand(seed + 9999);
  const jittered = picked.map(bot => ({
    bot,
    jp: bot.player_power * (0.92 + rng2() * 0.16)
  }));
  jittered.sort((a, b) => b.jp - a.jp);
  return jittered.map(x => x.bot);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Support chunked execution: pass city_start + city_end to process a subset
    // e.g. { city_start: 0, city_end: 49 } then { city_start: 50, city_end: 99 } etc.
    const ciStart = body.city_start !== undefined ? Number(body.city_start) : 0;
    const ciEnd   = body.city_end   !== undefined ? Math.min(Number(body.city_end) + 1, CITIES.length) : CITIES.length;
    const targetCities = CITIES.slice(ciStart, ciEnd);

    // "fill_vacant_only" mode: only fill empty slots, don't replace existing bots
    // Default is false = full re-seed (replace all bot slots)
    const fillVacantOnly = body.fill_vacant_only === true;

    // Load all 150 MoBotProfile records
    const botProfiles = await base44.asServiceRole.entities.MoBotProfile.list('-bot_index', 200);
    if (botProfiles.length === 0) {
      return Response.json({ error: 'No MoBotProfile records found. Run seedMoBots first.' }, { status: 400 });
    }

    // Load all mayors_office TerritorySlots for the target cities in one call
    const allSlots = await base44.asServiceRole.entities.TerritorySlot.list('-created_date', 10000);
    const mayorSlots = allSlots.filter(s => s.building_id === 'mayors_office');

    let created = 0;
    let deleted = 0;
    let preserved = 0;

    // --- STEP 1: Gather all bot slot IDs to delete across ALL target cities at once ---
    const targetCityKeys = new Set(targetCities.map(c => `${c.city}||${c.state}`));
    const allBotSlotsToDelete = [];
    const slotsByCity = {}; // city+state key -> array of existing slots

    for (const slot of mayorSlots) {
      const key = `${slot.city}||${slot.state}`;
      if (!targetCityKeys.has(key)) continue;
      if (!slotsByCity[key]) slotsByCity[key] = [];
      slotsByCity[key].push(slot);
      if (!fillVacantOnly && slot.user_id && slot.user_id.startsWith('bot_') && !slot.is_nemesis) {
        allBotSlotsToDelete.push(slot);
      }
    }

    // Delete old bot slots one at a time with 600ms pause to avoid rate limits
    for (const s of allBotSlotsToDelete) {
      await base44.asServiceRole.entities.TerritorySlot.delete(s.id).catch(() => {});
      deleted++;
      await new Promise(r => setTimeout(r, 600));
    }

    // --- STEP 2: Build all new slot records for each city ---
    const allSlotsToCreate = [];

    for (const { city, state } of targetCities) {
      const key = `${city}||${state}`;
      const citySlots = slotsByCity[key] || [];

      const humanSlots  = new Set();
      const nemesisSlots = new Set();
      citySlots.forEach(s => {
        if (s.is_nemesis) nemesisSlots.add(s.slot_number);
        else if (s.user_id && !s.user_id.startsWith('bot_')) humanSlots.add(s.slot_number);
      });

      const botSlotNumbers = [];
      for (let slot = 1; slot <= 50; slot++) {
        if (!humanSlots.has(slot) && !nemesisSlots.has(slot)) botSlotNumbers.push(slot);
      }

      if (fillVacantOnly) {
        const occupiedBotSlots = new Set(citySlots.filter(s => s.user_id && s.user_id.startsWith('bot_')).map(s => s.slot_number));
        const vacantSlots = botSlotNumbers.filter(n => !occupiedBotSlots.has(n));
        preserved += occupiedBotSlots.size;
        if (vacantSlots.length === 0) continue;
        const sorted = pickAndSortBots(botProfiles, city, state, 50);
        vacantSlots.forEach(slotNum => {
          allSlotsToCreate.push(buildSlotRecord(sorted[slotNum - 1] || sorted[sorted.length - 1], city, state, slotNum));
        });
      } else {
        if (botSlotNumbers.length === 0) continue;
        const sorted = pickAndSortBots(botProfiles, city, state, botSlotNumbers.length);
        botSlotNumbers.forEach((slotNum, idx) => {
          allSlotsToCreate.push(buildSlotRecord(sorted[idx] || sorted[sorted.length - 1], city, state, slotNum));
        });
      }
    }

    // --- STEP 3: BulkCreate all new slots in batches of 10 with longer pauses ---
    for (let i = 0; i < allSlotsToCreate.length; i += 10) {
      const batch = allSlotsToCreate.slice(i, i + 10);
      await base44.asServiceRole.entities.TerritorySlot.bulkCreate(batch);
      created += batch.length;
      await new Promise(r => setTimeout(r, 1200));
    }

    return Response.json({
      message: `Done. Created ${created} bot slots, deleted ${deleted} old bot slots across ${targetCities.length} cities.`,
      created, deleted, preserved,
      cities_processed: targetCities.length,
      bot_profiles_available: botProfiles.length,
      chunk_info: `Cities ${ciStart}–${ciEnd - 1} of ${CITIES.length}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildSlotRecord(bot, city, state, slotNum) {
  return {
    building_id: 'mayors_office',
    city,
    state,
    slot_number: slotNum,
    user_id: `bot_${String(bot.bot_index).padStart(3, '0')}`,
    username: bot.username,
    profile_image_url: bot.profile_image_url,
    player_level: bot.player_level,
    player_power: bot.player_power,
    last_payout_at: Date.now(),
    bot_wins: bot.bot_wins,
    bot_losses: bot.bot_losses
  };
}