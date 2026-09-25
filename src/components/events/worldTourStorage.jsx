/**
 * worldTourStorage.js — 100% in-memory. NO localStorage.
 *
 * Event SCHEDULES are deterministic. Event STATE is in-memory cache.
 */

import { GLOBAL_REGIONS } from '../travel/globalLocationsData';
import STATES_DATA from '../travel/statesData';
import { addMessage } from './eventStorage';
import { savePlayerData, getPlayerData } from '../utils/playerStorage';
import { getEventCache, setEventCache, clearEventCache } from '@/lib/playerMemory';

const WORLD_TOUR_KEY = 'tw_world_tour';
const WORLD_TOUR_CITY_LOG_KEY = 'tw_world_tour_city_log';

const WORLD_TOUR_DURATION = 28 * 24 * 60 * 60 * 1000;
const WT_REFERENCE_START = new Date('2026-03-01T05:00:00Z').getTime();

const GLOBAL_CITIES = GLOBAL_REGIONS.flatMap(r =>
  r.locations.map(loc => ({ city: loc.city, country: loc.country, flag: loc.flag, region: r.region }))
);

const US_CITIES = STATES_DATA.flatMap(state =>
  (state.cities || []).map(city => ({ city, country: state.name, flag: '🇺🇸', region: 'United States' }))
);

export const ALL_GLOBAL_CITIES = [...GLOBAL_CITIES, ...US_CITIES];

export const CITY_TARGET = 3;
export const MAX_CITY_TOTAL = ALL_GLOBAL_CITIES.length * CITY_TARGET;
export const TRADES_TARGET = MAX_CITY_TOTAL;

export const ALL_CITY_REGIONS = [
  ...GLOBAL_REGIONS.map(r => ({
    region: r.region,
    locations: r.locations,
  })),
  {
    region: 'United States',
    locations: STATES_DATA.flatMap(state =>
      (state.cities || []).map(city => ({ city, country: state.name, flag: '🇺🇸' }))
    ),
  },
];

export const WORLD_TOUR_REWARDS = [
  { id: 'gear_shard', label: '10x Gear Parts', icon: '⚙️' },
  { id: 'avatar_shard', label: '5x Avatar Shards', icon: '🧩' },
  { id: 'cover_boost', label: '30x Cover Boost +25', icon: '🛡️' },
  { id: 'stamina_boost', label: '30x Stamina Boost +25', icon: '⚡' },
  { id: 'energy_boost', label: '30x Energy Boost +25', icon: '🔋' },
  { id: 'cash', label: '$250,000 Cash', icon: '💵' },
  { id: 'cryd', label: '50 CRYD', icon: '🔷' },
];

function getNextWorldTourStart() {
  const now = Date.now();
  const d = new Date(now);
  let candidate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 5, 0, 0, 0)).getTime();
  if (now >= candidate && now < candidate + WORLD_TOUR_DURATION) {
    return candidate;
  }
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 5, 0, 0, 0)).getTime();
  return next;
}

function getWorldTourCooldownEnd(startTime) {
  const endTime = startTime + WORLD_TOUR_DURATION;
  const d = new Date(endTime);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 5, 0, 0, 0)).getTime();
}

function createFreshWorldTour() {
  const nextStart = getNextWorldTourStart();
  const data = {
    name: 'WORLD TOUR',
    startTime: nextStart,
    endTime: nextStart + WORLD_TOUR_DURATION,
    cooldownEnd: 0,
    baselineStats: null,
    claimed: false,
    rewardsSent: false,
  };
  setEventCache(WORLD_TOUR_KEY, data);
  clearEventCache(WORLD_TOUR_CITY_LOG_KEY);
  // Clear server-persisted city log for the new cycle
  savePlayerData({ worldTourCityLog: JSON.stringify({}) });
  return data;
}

export function getWorldTourData(playerData) {
  const cached = getEventCache(WORLD_TOUR_KEY);
  if (cached) return cached;

  // Cache is empty — could be a page reload, a genuinely new cycle, or
  // server data not yet loaded (useState initializer runs before
  // initializeFromServer completes). NEVER destructively wipe the city log
  // unless we're CERTAIN it's a new cycle.
  const pd = playerData || getPlayerData();
  const expectedStart = getNextWorldTourStart();
  const serverCycle = pd?.worldTourCycle;

  // Restore baseline from server-persisted data if available
  let baseline = null;
  if (pd?.worldTourBaseline) {
    try {
      baseline = typeof pd.worldTourBaseline === 'string'
        ? JSON.parse(pd.worldTourBaseline)
        : pd.worldTourBaseline;
    } catch { baseline = null; }
  }

  if (serverCycle && serverCycle !== expectedStart) {
    // Genuinely new cycle — server had an old cycle, now we're in a new one.
    // Safe to clear the city log.
    return createFreshWorldTour();
  }

  // Same cycle (serverCycle === expectedStart) OR server data not loaded yet
  // (serverCycle is null/undefined). In BOTH cases, restore event metadata
  // into cache WITHOUT clearing the city log. If server data isn't loaded,
  // tickWorldTour() will handle the proper restore once it has real playerData.
  const restored = {
    name: 'WORLD TOUR',
    startTime: expectedStart,
    endTime: expectedStart + WORLD_TOUR_DURATION,
    cooldownEnd: 0,
    baselineStats: baseline,
    claimed: false,
    rewardsSent: false,
  };
  setEventCache(WORLD_TOUR_KEY, restored);
  return restored;
}

export function saveWorldTourData(data) {
  setEventCache(WORLD_TOUR_KEY, data);
}

export function getCityLog() {
  const cached = getEventCache(WORLD_TOUR_CITY_LOG_KEY);
  if (cached) return cached;
  // Restore from server-persisted city log if in-memory cache was lost (page reload)
  const player = getPlayerData();
  if (player?.worldTourCityLog) {
    try {
      const parsed = typeof player.worldTourCityLog === 'string'
        ? JSON.parse(player.worldTourCityLog)
        : player.worldTourCityLog;
      setEventCache(WORLD_TOUR_CITY_LOG_KEY, parsed);
      return parsed;
    } catch { return {}; }
  }
  return {};
}

function saveCityLog(log) {
  setEventCache(WORLD_TOUR_CITY_LOG_KEY, log);
  // Persist to server so claimEventRewards backend can validate full city completion
  savePlayerData({ worldTourCityLog: JSON.stringify(log) });
}

export function logWorldTourCityAction(cityName, actionType) {
  if (!cityName) return;
  const isValid = ALL_GLOBAL_CITIES.some(c => c.city === cityName);
  if (!isValid) return;

  const event = getWorldTourData();
  const now = Date.now();
  if (now < event.startTime || now >= event.endTime || event.cooldownEnd) return;

  const log = getCityLog();
  if (!log[cityName]) log[cityName] = { jobs: 0, attacks: 0, assists: 0, sabotages: 0 };
  log[cityName][actionType] = (log[cityName][actionType] || 0) + 1;
  saveCityLog(log);
}

export function getCityProgress(cityName) {
  const log = getCityLog();
  const entry = log[cityName] || {};
  return {
    jobs: Math.min(CITY_TARGET, entry.jobs || 0),
    attacks: Math.min(CITY_TARGET, entry.attacks || 0),
    assists: Math.min(CITY_TARGET, entry.assists || 0),
    sabotages: Math.min(CITY_TARGET, entry.sabotages || 0),
  };
}

export function isCityComplete(cityName) {
  const p = getCityProgress(cityName);
  return p.jobs >= CITY_TARGET && p.attacks >= CITY_TARGET && p.assists >= CITY_TARGET && p.sabotages >= CITY_TARGET;
}

export function getTradesProgress(playerData) {
  const event = getWorldTourData();
  if (!event.baselineStats) return 0;
  return Math.min(TRADES_TARGET, Math.max(0, (playerData.totalTradesCompleted || 0) - event.baselineStats.trades));
}

export function getWorldTourTotals() {
  const log = getCityLog();
  const totals = { jobs: 0, attacks: 0, assists: 0, sabotages: 0 };
  ALL_GLOBAL_CITIES.forEach(({ city }) => {
    const entry = log[city] || {};
    totals.jobs += Math.min(CITY_TARGET, entry.jobs || 0);
    totals.attacks += Math.min(CITY_TARGET, entry.attacks || 0);
    totals.assists += Math.min(CITY_TARGET, entry.assists || 0);
    totals.sabotages += Math.min(CITY_TARGET, entry.sabotages || 0);
  });
  return totals;
}

export function isWorldTourComplete(playerData) {
  const totals = getWorldTourTotals();
  const trades = getTradesProgress(playerData);
  return (
    totals.jobs >= MAX_CITY_TOTAL &&
    totals.attacks >= MAX_CITY_TOTAL &&
    totals.assists >= MAX_CITY_TOTAL &&
    totals.sabotages >= MAX_CITY_TOTAL &&
    trades >= TRADES_TARGET
  );
}

export function tickWorldTour(playerData) {
  const event = getWorldTourData();
  const now = Date.now();

  if (now > event.endTime && !event.rewardsSent) {
    event.rewardsSent = true;
    event.cooldownEnd = getWorldTourCooldownEnd(event.startTime);
    if (!event.claimed && isWorldTourComplete(playerData)) {
      addMessage({
        id: `msg_wt_${Date.now()}`,
        title: 'Unclaimed WORLD TOUR Rewards',
        body: 'You completed the World Tour but did not claim before it ended!',
        rewards: WORLD_TOUR_REWARDS,
        rewardType: 'worldtour',
        claimed: false,
        timestamp: now,
      });
    }
    saveWorldTourData(event);
    return event;
  }

  if (event.cooldownEnd && now >= event.cooldownEnd) {
    return createFreshWorldTour();
  }

  if (now >= event.startTime && now < event.endTime && !event.baselineStats) {
    // Restore from server-persisted baseline if in-memory cache was lost (page reload)
    const serverBaseline = playerData?.worldTourBaseline;
    const serverCycle = playerData?.worldTourCycle;
    if (serverBaseline && serverCycle === event.startTime) {
      event.baselineStats = serverBaseline;
      saveWorldTourData(event);
    } else {
      // New cycle — create and persist baseline to server
      event.baselineStats = { trades: playerData.totalTradesCompleted || 0 };
      saveWorldTourData(event);
      savePlayerData({ worldTourBaseline: event.baselineStats, worldTourCycle: event.startTime });
    }
  }

  return event;
}

export function isWorldTourActive(eventData) {
  const now = Date.now();
  return !eventData.cooldownEnd && now >= eventData.startTime && now < eventData.endTime;
}