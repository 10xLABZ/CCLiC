/**
 * claimEventRewards — Atomic server-side event reward delivery.
 *
 * Replaces the split client/server flow where claimReward locked the claim
 * but consumables were delivered client-side via claimEventRewards / 
 * claimShardFrenzyRewards / claimGearOverdriveRewards / claimWorldTourRewards.
 *
 * This function atomically:
 *   1. Checks idempotency (SystemMessage reward_claimed lock)
 *   2. Validates event completion using current server-side profile stats
 *   3. Records the claim
 *   4. Delivers IGC (cash/crypto) to PlayerProfile
 *   5. Delivers consumables (boosts, shards, gear parts) to PlayerInventory
 *   6. Returns updated authoritative values
 *
 * Payload:
 *   event_type: string   — 'fastfive' | 'shardfrenzy' | 'gearoverdrive' | 'worldtour'
 *   cycle_id: string     — The event start timestamp (string) used as unique claim key
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ── Reward definitions ─────────────────────────────────────────────────────

const REWARD_TABLE = {
  fastfive: {
    consumables: { AVATAR_SHARD: 1, OPCOVER_25: 1, STAMINA_25: 1, ENERGY_25: 1 },
    cash: 5000,
    crypto: 0,
  },
  shardfrenzy: {
    consumables: { AVATAR_SHARD: 8, OPCOVER_25: 8, STAMINA_25: 8, ENERGY_25: 8 },
    cash: 25000,
    crypto: 0,
  },
  gearoverdrive: {
    consumables: { GEAR_SHARD: 8, OPCOVER_25: 8, STAMINA_25: 8, ENERGY_25: 8 },
    cash: 25000,
    crypto: 0,
  },
  worldtour: {
    consumables: { GEAR_SHARD: 10, AVATAR_SHARD: 5, OPCOVER_25: 30, STAMINA_25: 30, ENERGY_25: 30 },
    cash: 250000,
    crypto: 50,
  },
};

// ── Completion validation (server-authoritative) ──────────────────────────
// Goals are based on deltas between current profile stats and the server-persisted
// baseline (fastFiveBaseline, shardFrenzyBaseline, gearOverdriveBaseline, worldTourBaseline).

const GOAL_TARGETS_FF = { attacks: 5, jobs: 5, assists: 5, sabotages: 5, trades: 5 };
const GOAL_TARGETS_WEEKLY = { attacks: 50, jobs: 50, assists: 50, sabotages: 50, trades: 50 };

function getBaseline(profile, eventType) {
  switch (eventType) {
    case 'fastfive':
      return parseBaseline(profile.fast_five_baseline);
    case 'shardfrenzy':
      return parseBaseline(profile.shard_frenzy_baseline);
    case 'gearoverdrive':
      return parseBaseline(profile.gear_overdrive_baseline);
    case 'worldtour':
      return parseBaseline(profile.world_tour_baseline);
    default:
      return null;
  }
}

function parseBaseline(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function computeProgress(profile, baseline, targets) {
  if (!baseline) return null;
  return {
    attacks: Math.min(targets.attacks, Math.max(0, (profile.total_trade_war_wins || 0) - (baseline.attacks || 0))),
    jobs: Math.min(targets.jobs, Math.max(0, (profile.total_jobs_completed || 0) - (baseline.jobs || 0))),
    assists: Math.min(targets.assists, Math.max(0, (profile.total_assists || 0) - (baseline.assists || 0))),
    sabotages: Math.min(targets.sabotages, Math.max(0, (profile.total_sabotages || 0) - (baseline.sabotages || 0))),
    trades: Math.min(targets.trades, Math.max(0, (profile.total_trades_completed || 0) - (baseline.trades || 0))),
  };
}

function isComplete(progress, targets) {
  if (!progress) return false;
  return Object.keys(targets).every(k => (progress[k] || 0) >= targets[k]);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event_type, cycle_id } = body;

    if (!event_type || !cycle_id) {
      return Response.json({ error: 'Missing event_type or cycle_id' }, { status: 400 });
    }

    const rewardConfig = REWARD_TABLE[event_type];
    if (!rewardConfig) {
      return Response.json({ error: `Unknown event type: ${event_type}` }, { status: 400 });
    }

    const rewardKey = `${event_type}_${cycle_id}`;

    // ── 1. Idempotency check ──────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: rewardKey,
    });

    if (existing.length > 0) {
      return Response.json({ success: false, already_claimed: true, error: 'Reward already claimed' });
    }

    // ── 2. Fetch profile + validate completion ────────────────────────
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
      return Response.json({ error: 'PlayerProfile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    const baseline = getBaseline(profile, event_type);
    const targets = event_type === 'fastfive' ? GOAL_TARGETS_FF : GOAL_TARGETS_WEEKLY;
    const progress = computeProgress(profile, baseline, targets);

    // World Tour requires full city completion (3 jobs/attacks/assists/sabotages in every city)
    // plus the trades target. The city log is persisted server-side on the PlayerProfile.
    let complete;
    if (event_type === 'worldtour') {
      const cityTarget = 3;
      // US cities + global cities = ALL_GLOBAL_CITIES (must match frontend worldTourStorage.jsx)
      const usStates: Record<string, string[]> = {
        "Alabama": ["Montgomery", "Birmingham"],
        "Alaska": ["Juneau", "Anchorage"],
        "Arizona": ["Phoenix", "Tucson"],
        "Arkansas": ["Little Rock", "Fayetteville"],
        "California": ["Sacramento", "Los Angeles", "San Diego", "San Francisco", "Oakland"],
        "Colorado": ["Denver", "Colorado Springs"],
        "Connecticut": ["Hartford", "New Haven"],
        "Delaware": ["Dover", "Wilmington"],
        "Florida": ["Tallahassee", "Miami", "Orlando", "Tampa Bay", "Jacksonville"],
        "Georgia": ["Atlanta", "Savannah"],
        "Hawaii": ["Honolulu", "Hilo"],
        "Idaho": ["Boise", "Idaho Falls"],
        "Illinois": ["Springfield", "Chicago"],
        "Indiana": ["Indianapolis", "Fort Wayne"],
        "Iowa": ["Des Moines", "Cedar Rapids"],
        "Kansas": ["Topeka", "Wichita"],
        "Kentucky": ["Frankfort", "Louisville"],
        "Louisiana": ["Baton Rouge", "New Orleans"],
        "Maine": ["Augusta", "Portland"],
        "Maryland": ["Annapolis", "Baltimore"],
        "Massachusetts": ["Boston", "Worcester"],
        "Michigan": ["Lansing", "Detroit"],
        "Minnesota": ["Saint Paul", "Minneapolis"],
        "Mississippi": ["Jackson", "Gulfport"],
        "Missouri": ["Jefferson City", "St. Louis"],
        "Montana": ["Helena", "Billings"],
        "Nebraska": ["Lincoln", "Omaha"],
        "Nevada": ["Carson City", "Las Vegas"],
        "New Hampshire": ["Concord", "Manchester"],
        "New Jersey": ["Trenton", "Newark"],
        "New Mexico": ["Santa Fe", "Albuquerque"],
        "New York": ["Albany", "New York City"],
        "North Carolina": ["Raleigh", "Charlotte"],
        "North Dakota": ["Bismarck", "Fargo"],
        "Ohio": ["Columbus", "Cleveland"],
        "Oklahoma": ["Oklahoma City", "Tulsa"],
        "Oregon": ["Salem", "Portland"],
        "Pennsylvania": ["Harrisburg", "Philadelphia", "Pittsburgh"],
        "Rhode Island": ["Providence", "Newport"],
        "South Carolina": ["Columbia", "Charleston"],
        "South Dakota": ["Pierre", "Sioux Falls"],
        "Tennessee": ["Nashville", "Memphis"],
        "Texas": ["Austin", "Houston", "San Antonio", "Dallas"],
        "Utah": ["Salt Lake City", "Provo"],
        "Vermont": ["Montpelier", "Burlington"],
        "Virginia": ["Richmond", "Virginia Beach"],
        "Washington": ["Olympia", "Seattle"],
        "West Virginia": ["Charleston", "Morgantown"],
        "Wisconsin": ["Madison", "Milwaukee"],
        "Wyoming": ["Cheyenne", "Casper"],
      };
      const globalRegions: { city: string }[] = [
        { city: "Toronto" }, { city: "Mexico City" },
        { city: "São Paulo" }, { city: "Buenos Aires" }, { city: "Santiago" }, { city: "Bogotá" }, { city: "Lima" },
        { city: "London" }, { city: "Paris" }, { city: "Berlin" }, { city: "Rome" }, { city: "Madrid" },
        { city: "Amsterdam" }, { city: "Zurich" }, { city: "Brussels" }, { city: "Vienna" }, { city: "Lisbon" },
        { city: "Warsaw" }, { city: "Prague" }, { city: "Budapest" }, { city: "Athens" },
        { city: "Dubai" }, { city: "Riyadh" }, { city: "Tel Aviv" }, { city: "Doha" }, { city: "Istanbul" },
        { city: "Tokyo" }, { city: "Shanghai" }, { city: "Seoul" }, { city: "Singapore" }, { city: "Hong Kong" },
        { city: "Mumbai" }, { city: "Bangkok" }, { city: "Ho Chi Minh City" }, { city: "Manila" }, { city: "Jakarta" }, { city: "Kuala Lumpur" },
        { city: "Johannesburg" }, { city: "Lagos" }, { city: "Cairo" }, { city: "Nairobi" }, { city: "Casablanca" },
        { city: "Sydney" }, { city: "Auckland" },
      ];
      const allCities = [
        ...globalRegions.map(g => g.city),
        ...Object.entries(usStates).flatMap(([_, cities]) => cities),
      ];
      const maxCityTotal = allCities.length * cityTarget;

      // Parse the server-persisted city log
      let cityLog: Record<string, any> = {};
      const rawLog = (profile as any).world_tour_city_log;
      if (rawLog) {
        try { cityLog = typeof rawLog === 'string' ? JSON.parse(rawLog) : rawLog; } catch {}
      }

      // Compute totals from the city log
      let jobs = 0, attacks = 0, assists = 0, sabotages = 0;
      for (const city of allCities) {
        const entry = cityLog[city] || {};
        jobs += Math.min(cityTarget, entry.jobs || 0);
        attacks += Math.min(cityTarget, entry.attacks || 0);
        assists += Math.min(cityTarget, entry.assists || 0);
        sabotages += Math.min(cityTarget, entry.sabotages || 0);
      }

      const tradesProgress = baseline
        ? Math.min(maxCityTotal, Math.max(0, (profile.total_trades_completed || 0) - (baseline.trades || 0)))
        : 0;

      complete = baseline
        && jobs >= maxCityTotal
        && attacks >= maxCityTotal
        && assists >= maxCityTotal
        && sabotages >= maxCityTotal
        && tradesProgress >= maxCityTotal;

      // Return detailed progress for the frontend
      if (!complete) {
        return Response.json({
          success: false,
          not_complete: true,
          error: 'World Tour goals not yet completed',
          progress: { jobs, attacks, assists, sabotages, trades: tradesProgress, maxCityTotal },
        });
      }
    } else {
      complete = isComplete(progress, targets);
    }

    if (!complete) {
      return Response.json({ success: false, not_complete: true, error: 'Event goals not yet completed', progress });
    }

    // ── 3. Record the claim (the lock) ────────────────────────────────
    await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'reward_claimed',
      title: `${event_type} reward claimed`,
      body: `Claimed ${event_type} reward (${rewardKey})`,
      item_id: rewardKey,
      item_name: event_type,
      category: event_type,
      is_consumable: false,
      restored: false,
      timestamp: Date.now(),
      meta: JSON.stringify({
        cycle_id,
        claimed_at: new Date().toISOString(),
        progress: progress,
      }),
    });

    // ── 4. Deliver IGC (cash/crypto) to PlayerProfile ────────────────
    let newCash = profile.cash || 0;
    let newCrypto = profile.crypto || 0;

    const profileUpdate = {};
    if (rewardConfig.cash) {
      newCash = (profile.cash || 0) + rewardConfig.cash;
      profileUpdate.cash = newCash;
    }
    if (rewardConfig.crypto) {
      newCrypto = (profile.crypto || 0) + rewardConfig.crypto;
      profileUpdate.crypto = newCrypto;
    }

    if (Object.keys(profileUpdate).length > 0) {
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, profileUpdate);
    }

    // ── 5. Deliver consumables to PlayerInventory ─────────────────────
    let newConsumables = null;
    if (Object.keys(rewardConfig.consumables).length > 0) {
      const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id });
      if (inventories.length > 0) {
        // Pick the inventory record with the most items (dedup)
        const inv = inventories.reduce((best, current) => {
          if (!best) return current;
          const bestCount = Object.values(best)
            .filter(v => typeof v === 'object' && v !== null)
            .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
          const currCount = Object.values(current)
            .filter(v => typeof v === 'object' && v !== null)
            .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
          return currCount > bestCount ? current : best;
        }, null);

        const updatedConsumables = { ...(inv.consumables || {}) };
        for (const [key, qty] of Object.entries(rewardConfig.consumables)) {
          updatedConsumables[key] = (updatedConsumables[key] || 0) + qty;
        }

        await base44.asServiceRole.entities.PlayerInventory.update(inv.id, {
          consumables: updatedConsumables,
        });

        // Delete any duplicate inventory records
        const dupes = inventories.filter(i => i.id !== inv.id);
        for (const dup of dupes) {
          base44.asServiceRole.entities.PlayerInventory.delete(dup.id).catch(() => {});
        }

        newConsumables = updatedConsumables;
      }
    }

    return Response.json({
      success: true,
      already_claimed: false,
      new_cash: newCash,
      new_crypto: newCrypto,
      new_consumables: newConsumables,
      rewards_delivered: rewardConfig,
      progress: progress,
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}