/**
 * eventStorage.js — 100% in-memory. NO localStorage.
 *
 * Event SCHEDULES (start/end times) are deterministic — computed from
 * fixed reference dates. They don't need persistence.
 *
 * Event STATE (baselineStats, claimed, cooldownEnd) is stored in the
 * in-memory cache (playerMemory.js). This resets on page reload, which
 * means event progress resets to 0 (bad UX but not exploitable —
 * rewards go through applyServerReward which is server-validated).
 */

import { getEventCache, setEventCache } from '@/lib/playerMemory';
import { savePlayerData } from '../utils/playerStorage';

// Event keys (used as in-memory cache keys)
const EVENT_KEY = 'tw_events';
const SHARD_FRENZY_KEY = 'tw_sf_v5';
const GEAR_OVERDRIVE_KEY = 'tw_go_v5';
const MESSAGES_KEY = 'tw_messages';

export const FAST_FIVE_GOAL_ICONS = {
  attacks: 'https://media.base44.com/images/public/699169456a354d6cb7082777/a534afd53_attacksimage1.jpg',
  jobs: 'https://media.base44.com/images/public/699169456a354d6cb7082777/0928f9759_jobsimage1.jpg',
  assists: 'https://media.base44.com/images/public/699169456a354d6cb7082777/b3f8cda3f_assistimage1.jpg',
  sabotages: 'https://media.base44.com/images/public/699169456a354d6cb7082777/f9b0d61ea_sabotageimage2.jpg',
  trades: 'https://media.base44.com/images/public/699169456a354d6cb7082777/fe0fc9a2b_insidertradeimage1.jpg',
};

export const FAST_FIVE_GOALS = [
  { id: 'attacks', label: '5 Attacks', target: 5, icon: '⚔️', statKey: 'totalTradeWarWins' },
  { id: 'jobs', label: '5 Jobs', target: 5, icon: '💼', statKey: 'totalJobsCompleted' },
  { id: 'assists', label: '5 Assists', target: 5, icon: '🤝', statKey: 'totalAssists' },
  { id: 'sabotages', label: '5 Sabotages', target: 5, icon: '📉', statKey: 'totalSabotages' },
  { id: 'trades', label: '5 Insider Trades', target: 5, icon: '📊', statKey: 'totalTradesCompleted' },
];

export const FAST_FIVE_REWARDS = [
  { id: 'shard', label: '1x Avatar Shard', icon: '🧩' },
  { id: 'cash', label: '$5,000 Cash', icon: '💵' },
  { id: 'cover_boost', label: '1x Cover Boost +25', icon: '🛡️' },
  { id: 'stamina_boost', label: '1x Stamina Boost +25', icon: '⚡' },
  { id: 'energy_boost', label: '1x Energy Boost +25', icon: '🔋' },
];

// FAST FIVE: 5 hour event, 7h30m cooldown (12.5h total cycle)
const FAST_FIVE_DURATION = 5 * 60 * 60 * 1000;
const FAST_FIVE_COOLDOWN = 7.5 * 60 * 60 * 1000;
const FAST_FIVE_CYCLE = FAST_FIVE_DURATION + FAST_FIVE_COOLDOWN;
const FF_REFERENCE_START = new Date('2026-03-01T05:00:00Z').getTime();

export const SHARD_FRENZY_GOALS = [
  { id: 'attacks', label: '50 Attacks', target: 50, icon: '⚔️', statKey: 'totalTradeWarWins' },
  { id: 'jobs', label: '50 Jobs', target: 50, icon: '💼', statKey: 'totalJobsCompleted' },
  { id: 'assists', label: '50 Assists', target: 50, icon: '🤝', statKey: 'totalAssists' },
  { id: 'sabotages', label: '50 Sabotages', target: 50, icon: '📉', statKey: 'totalSabotages' },
  { id: 'trades', label: '50 Insider Trades', target: 50, icon: '📊', statKey: 'totalTradesCompleted' },
];

export const SHARD_FRENZY_REWARDS = [
  { id: 'shard', label: '8x Avatar Shards', icon: '🧩' },
  { id: 'cash', label: '$25,000 Cash', icon: '💵' },
  { id: 'cover_boost', label: '8x Cover Boost +25', icon: '🛡️' },
  { id: 'stamina_boost', label: '8x Stamina Boost +25', icon: '⚡' },
  { id: 'energy_boost', label: '8x Energy Boost +25', icon: '🔋' },
];

export const GEAR_OVERDRIVE_GOALS = [
  { id: 'attacks', label: '50 Attacks', target: 50, icon: '⚔️', statKey: 'totalTradeWarWins' },
  { id: 'jobs', label: '50 Jobs', target: 50, icon: '💼', statKey: 'totalJobsCompleted' },
  { id: 'assists', label: '50 Assists', target: 50, icon: '🤝', statKey: 'totalAssists' },
  { id: 'sabotages', label: '50 Sabotages', target: 50, icon: '📉', statKey: 'totalSabotages' },
  { id: 'trades', label: '50 Insider Trades', target: 50, icon: '📊', statKey: 'totalTradesCompleted' },
];

export const GEAR_OVERDRIVE_REWARDS = [
  { id: 'gear_shard', label: '8x Gear Parts', icon: '⚙️' },
  { id: 'cash', label: '$25,000 Cash', icon: '💵' },
  { id: 'cover_boost', label: '8x Cover Boost +25', icon: '🛡️' },
  { id: 'stamina_boost', label: '8x Stamina Boost +25', icon: '⚡' },
  { id: 'energy_boost', label: '8x Energy Boost +25', icon: '🔋' },
];

const SHARD_FRENZY_DURATION = 5 * 24 * 60 * 60 * 1000;
const SHARD_FRENZY_COOLDOWN = 2 * 24 * 60 * 60 * 1000;
const GEAR_OVERDRIVE_DURATION = 5 * 24 * 60 * 60 * 1000;
const GEAR_OVERDRIVE_COOLDOWN = 2 * 24 * 60 * 60 * 1000;

const SF_REFERENCE_START = new Date('2026-03-23T04:00:00Z').getTime();
const GO_REFERENCE_START = new Date('2026-03-30T04:00:00Z').getTime();

function getNextShardFrenzyStart() {
  const now = Date.now();
  const cycle = 14 * 24 * 60 * 60 * 1000;
  let next = SF_REFERENCE_START;
  while (next + SHARD_FRENZY_DURATION <= now) {
    next += cycle;
  }
  return next;
}

function getNextGearOverdriveStart() {
  const now = Date.now();
  const cycle = 14 * 24 * 60 * 60 * 1000;
  let next = GO_REFERENCE_START;
  while (next + GEAR_OVERDRIVE_DURATION <= now) {
    next += cycle;
  }
  return next;
}

// ---- AVATAR SHARD FRENZY ----

export function tickShardFrenzy(playerData) {
  const event = getShardFrenzyData();
  const now = Date.now();

  if (now > event.endTime && !event.rewardsSent) {
    event.rewardsSent = true;
    event.cooldownEnd = event.endTime + SHARD_FRENZY_COOLDOWN;
    if (!event.claimed && isShardFrenzyComplete(playerData)) {
      addMessage({
        id: `msg_sf_${Date.now()}`,
        title: 'Unclaimed AVATAR SHARD FRENZY Rewards',
        body: 'You completed AVATAR SHARD FRENZY but did not claim before it ended!',
        rewards: SHARD_FRENZY_REWARDS,
        rewardType: 'shardfrenzy',
        claimed: false,
        timestamp: now,
      });
    }
    saveShardFrenzyData(event);
    return event;
  }

  if (event.cooldownEnd && now >= event.cooldownEnd) {
    return createFreshShardFrenzy();
  }

  if (now >= event.startTime && now < event.endTime && !event.baselineStats) {
    // Restore from server-persisted baseline if in-memory cache was lost (page reload)
    const serverBaseline = playerData?.shardFrenzyBaseline;
    const serverCycle = playerData?.shardFrenzyCycle;
    if (serverBaseline && serverCycle === event.startTime) {
      event.baselineStats = serverBaseline;
      saveShardFrenzyData(event);
    } else {
      // New cycle — create and persist baseline to server
      event.baselineStats = {
        attacks: playerData.totalTradeWarWins || 0,
        jobs: playerData.totalJobsCompleted || 0,
        assists: playerData.totalAssists || 0,
        sabotages: playerData.totalSabotages || 0,
        trades: playerData.totalTradesCompleted || 0,
      };
      saveShardFrenzyData(event);
      savePlayerData({ shardFrenzyBaseline: event.baselineStats, shardFrenzyCycle: event.startTime });
    }
  }

  return event;
}

export function getShardFrenzyData() {
  const cached = getEventCache(SHARD_FRENZY_KEY);
  if (!cached) return createFreshShardFrenzy();
  const now = Date.now();
  const nextStart = getNextShardFrenzyStart();
  const nextEnd = nextStart + SHARD_FRENZY_DURATION;
  if (cached.cooldownEnd && now < cached.cooldownEnd && now >= nextStart && now < nextEnd) {
    return createFreshShardFrenzy();
  }
  return cached;
}

function createFreshShardFrenzy() {
  const nextStart = getNextShardFrenzyStart();
  const data = {
    name: 'AVATAR SHARD FRENZY',
    startTime: nextStart,
    endTime: nextStart + SHARD_FRENZY_DURATION,
    cooldownEnd: 0,
    baselineStats: null,
    claimed: false,
    rewardsSent: false,
  };
  setEventCache(SHARD_FRENZY_KEY, data);
  return data;
}

export function saveShardFrenzyData(data) {
  setEventCache(SHARD_FRENZY_KEY, data);
}

export function getShardFrenzyProgress(playerData) {
  const event = getShardFrenzyData();
  if (!event.baselineStats) return { attacks: 0, jobs: 0, assists: 0, sabotages: 0, trades: 0 };
  return {
    attacks: Math.min(50, Math.max(0, (playerData.totalTradeWarWins || 0) - event.baselineStats.attacks)),
    jobs: Math.min(50, Math.max(0, (playerData.totalJobsCompleted || 0) - event.baselineStats.jobs)),
    assists: Math.min(50, Math.max(0, (playerData.totalAssists || 0) - event.baselineStats.assists)),
    sabotages: Math.min(50, Math.max(0, (playerData.totalSabotages || 0) - event.baselineStats.sabotages)),
    trades: Math.min(50, Math.max(0, (playerData.totalTradesCompleted || 0) - event.baselineStats.trades)),
  };
}

export function isShardFrenzyComplete(playerData) {
  const progress = getShardFrenzyProgress(playerData);
  return SHARD_FRENZY_GOALS.every(g => (progress[g.id] || 0) >= g.target);
}

// ---- GEAR OVERDRIVE ----

export function tickGearOverdrive(playerData) {
  const event = getGearOverdriveData();
  const now = Date.now();

  if (now > event.endTime && !event.rewardsSent) {
    event.rewardsSent = true;
    event.cooldownEnd = event.endTime + GEAR_OVERDRIVE_COOLDOWN;
    if (!event.claimed && isGearOverdriveComplete(playerData)) {
      addMessage({
        id: `msg_go_${Date.now()}`,
        title: 'Unclaimed GEAR OVERDRIVE Rewards',
        body: 'You completed GEAR OVERDRIVE but did not claim before it ended!',
        rewards: GEAR_OVERDRIVE_REWARDS,
        rewardType: 'gearoverdrive',
        claimed: false,
        timestamp: now,
      });
    }
    saveGearOverdriveData(event);
    return event;
  }

  if (event.cooldownEnd && now >= event.cooldownEnd) {
    return createFreshGearOverdrive();
  }

  if (now >= event.startTime && now < event.endTime && !event.baselineStats) {
    // Restore from server-persisted baseline if in-memory cache was lost (page reload)
    const serverBaseline = playerData?.gearOverdriveBaseline;
    const serverCycle = playerData?.gearOverdriveCycle;
    if (serverBaseline && serverCycle === event.startTime) {
      event.baselineStats = serverBaseline;
      saveGearOverdriveData(event);
    } else {
      // New cycle — create and persist baseline to server
      event.baselineStats = {
        attacks: playerData.totalTradeWarWins || 0,
        jobs: playerData.totalJobsCompleted || 0,
        assists: playerData.totalAssists || 0,
        sabotages: playerData.totalSabotages || 0,
        trades: playerData.totalTradesCompleted || 0,
      };
      saveGearOverdriveData(event);
      savePlayerData({ gearOverdriveBaseline: event.baselineStats, gearOverdriveCycle: event.startTime });
    }
  }

  return event;
}

export function getGearOverdriveData() {
  const cached = getEventCache(GEAR_OVERDRIVE_KEY);
  if (!cached) return createFreshGearOverdrive();
  const now = Date.now();
  const nextStart = getNextGearOverdriveStart();
  const nextEnd = nextStart + GEAR_OVERDRIVE_DURATION;
  if (cached.cooldownEnd && now < cached.cooldownEnd && now >= nextStart && now < nextEnd) {
    return createFreshGearOverdrive();
  }
  return cached;
}

function createFreshGearOverdrive() {
  const nextStart = getNextGearOverdriveStart();
  const data = {
    name: 'GEAR OVERDRIVE',
    startTime: nextStart,
    endTime: nextStart + GEAR_OVERDRIVE_DURATION,
    cooldownEnd: 0,
    baselineStats: null,
    claimed: false,
    rewardsSent: false,
  };
  setEventCache(GEAR_OVERDRIVE_KEY, data);
  return data;
}

export function saveGearOverdriveData(data) {
  setEventCache(GEAR_OVERDRIVE_KEY, data);
}

export function getGearOverdriveProgress(playerData) {
  const event = getGearOverdriveData();
  if (!event.baselineStats) return { attacks: 0, jobs: 0, assists: 0, sabotages: 0, trades: 0 };
  return {
    attacks: Math.min(50, Math.max(0, (playerData.totalTradeWarWins || 0) - event.baselineStats.attacks)),
    jobs: Math.min(50, Math.max(0, (playerData.totalJobsCompleted || 0) - event.baselineStats.jobs)),
    assists: Math.min(50, Math.max(0, (playerData.totalAssists || 0) - event.baselineStats.assists)),
    sabotages: Math.min(50, Math.max(0, (playerData.totalSabotages || 0) - event.baselineStats.sabotages)),
    trades: Math.min(50, Math.max(0, (playerData.totalTradesCompleted || 0) - event.baselineStats.trades)),
  };
}

export function isGearOverdriveComplete(playerData) {
  const progress = getGearOverdriveProgress(playerData);
  return GEAR_OVERDRIVE_GOALS.every(g => (progress[g.id] || 0) >= g.target);
}

// ---- FAST FIVE ----

export function getEventData() {
  const cached = getEventCache(EVENT_KEY);
  if (!cached) return createFreshEvent();
  return cached;
}

function getNextFastFiveStart() {
  const now = Date.now();
  let next = FF_REFERENCE_START;
  while (next + FAST_FIVE_DURATION <= now) {
    next += FAST_FIVE_CYCLE;
  }
  if (next <= now && now < next + FAST_FIVE_DURATION) {
    return next;
  }
  if (next <= now) {
    next += FAST_FIVE_CYCLE;
  }
  return next;
}

function createFreshEvent() {
  const nextStart = getNextFastFiveStart();
  const data = {
    name: 'FAST FIVE',
    startTime: nextStart,
    endTime: nextStart + FAST_FIVE_DURATION,
    cooldownEnd: 0,
    baselineStats: null,
    progress: { attacks: 0, jobs: 0, assists: 0, sabotages: 0, trades: 0 },
    claimed: false,
    rewardsSent: false,
  };
  saveEventData(data);
  return data;
}

export function saveEventData(data) {
  setEventCache(EVENT_KEY, data);
}

export function initEventBaseline(playerData) {
  const event = getEventData();
  const currentCycle = event.startTime;
  const serverBaseline = playerData?.fastFiveBaseline;
  const serverCycle = playerData?.fastFiveCycle;

  // Restore from server-persisted baseline if in-memory cache was lost (page reload)
  if (!event.baselineStats && serverBaseline && serverCycle === currentCycle) {
    event.baselineStats = serverBaseline;
    saveEventData(event);
    return event;
  }

  // New cycle — create and persist baseline to server
  if (!event.baselineStats) {
    event.baselineStats = {
      attacks: playerData.totalTradeWarWins || 0,
      jobs: playerData.totalJobsCompleted || 0,
      assists: playerData.totalAssists || 0,
      sabotages: playerData.totalSabotages || 0,
      trades: playerData.totalTradesCompleted || 0,
    };
    saveEventData(event);
    savePlayerData({ fastFiveBaseline: event.baselineStats, fastFiveCycle: currentCycle });
  }
  return event;
}

export function getEventProgress(playerData) {
  const event = getEventData();
  const baseline = event.baselineStats || playerData?.fastFiveBaseline;
  if (!baseline) return { attacks: 0, jobs: 0, assists: 0, sabotages: 0, trades: 0 };
  return {
    attacks: Math.min(5, Math.max(0, (playerData.totalTradeWarWins || 0) - baseline.attacks)),
    jobs: Math.min(5, Math.max(0, (playerData.totalJobsCompleted || 0) - baseline.jobs)),
    assists: Math.min(5, Math.max(0, (playerData.totalAssists || 0) - baseline.assists)),
    sabotages: Math.min(5, Math.max(0, (playerData.totalSabotages || 0) - baseline.sabotages)),
    trades: Math.min(5, Math.max(0, (playerData.totalTradesCompleted || 0) - baseline.trades)),
  };
}

export function isEventComplete(playerData) {
  const progress = getEventProgress(playerData);
  return Object.values(progress).every(v => v >= 5);
}

export function tickEvent(playerData) {
  const event = getEventData();
  const now = Date.now();

  if (now > event.endTime && !event.rewardsSent) {
    if (!event.claimed && isEventComplete(playerData)) {
      addMessage({
        id: `msg_${Date.now()}`,
        title: 'Unclaimed FAST FIVE event rewards',
        body: 'You completed FAST FIVE but did not claim before time ran out!',
        rewards: FAST_FIVE_REWARDS,
        claimed: false,
        timestamp: now,
      });
    }
    event.rewardsSent = true;
    event.cooldownEnd = event.endTime + FAST_FIVE_COOLDOWN;
    saveEventData(event);
    return event;
  }

  if (event.cooldownEnd && now >= event.cooldownEnd) {
    const nextStart = getNextFastFiveStart();
    const freshBaseline = {
      attacks: playerData.totalTradeWarWins || 0,
      jobs: playerData.totalJobsCompleted || 0,
      assists: playerData.totalAssists || 0,
      sabotages: playerData.totalSabotages || 0,
      trades: playerData.totalTradesCompleted || 0,
    };
    const fresh = {
      name: 'FAST FIVE',
      startTime: nextStart,
      endTime: nextStart + FAST_FIVE_DURATION,
      cooldownEnd: 0,
      baselineStats: freshBaseline,
      progress: { attacks: 0, jobs: 0, assists: 0, sabotages: 0, trades: 0 },
      claimed: false,
      rewardsSent: false,
    };
    saveEventData(fresh);
    savePlayerData({ fastFiveBaseline: freshBaseline, fastFiveCycle: nextStart });
    return fresh;
  }

  if (now >= event.startTime && now < event.endTime && !event.baselineStats) {
    event.baselineStats = {
      attacks: playerData.totalTradeWarWins || 0,
      jobs: playerData.totalJobsCompleted || 0,
      assists: playerData.totalAssists || 0,
      sabotages: playerData.totalSabotages || 0,
      trades: playerData.totalTradesCompleted || 0,
    };
    saveEventData(event);
    savePlayerData({ fastFiveBaseline: event.baselineStats, fastFiveCycle: event.startTime });
  }

  return event;
}

export function isWeeklyEventActive(eventData) {
  const now = Date.now();
  return !eventData.cooldownEnd && now >= eventData.startTime && now < eventData.endTime;
}

const MESSAGE_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// Messages
export function getMessages() {
  const msgs = getEventCache(MESSAGES_KEY) || [];
  const now = Date.now();
  // Filter out expired unclaimed messages, keep claimed ones for history
  const filtered = msgs.filter(m => m.claimed || !m.expiresAt || m.expiresAt > now);
  if (filtered.length !== msgs.length) {
    setEventCache(MESSAGES_KEY, filtered);
  }
  return filtered;
}

export function saveMessages(msgs) {
  setEventCache(MESSAGES_KEY, msgs.slice(0, 50));
}

export function addMessage(msg) {
  const msgs = getEventCache(MESSAGES_KEY) || [];
  msg.expiresAt = msg.expiresAt || (Date.now() + MESSAGE_EXPIRY_MS);
  msgs.unshift(msg);
  setEventCache(MESSAGES_KEY, msgs.slice(0, 50));
}