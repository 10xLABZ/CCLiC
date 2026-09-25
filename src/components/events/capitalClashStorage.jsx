/**
 * capitalClashStorage.js — 100% in-memory. NO localStorage.
 *
 * Event SCHEDULES are deterministic. Event STATE (leaderboard, player slot,
 * battle history, bot timers) is in-memory cache.
 */

import { generateCityBots } from '../tradewars/botGenerator';
import { computeFullPlayerStats } from '../../lib/playerStatsHelper';
import { getEventCache, setEventCache } from '@/lib/playerMemory';

const CC_KEY        = 'tw_cc_v1';
const CC_DURATION   = 5 * 24 * 60 * 60 * 1000;
const CC_COOLDOWN   = 2 * 24 * 60 * 60 * 1000;
const CC_CYCLE      = 7 * 24 * 60 * 60 * 1000;
const CC_REFERENCE  = new Date('2026-03-30T04:00:00Z').getTime();

export function getCurrentCCStart() {
  const now = Date.now();
  let start = CC_REFERENCE;
  while (start + CC_CYCLE <= now) start += CC_CYCLE;
  return start;
}

export function isCapitalClashActive(data) {
  if (!data) return false;
  const now = Date.now();
  return !data.cooldownEnd && now >= data.startTime && now < data.endTime;
}

export const CAPITAL_CLASH_REWARDS = {
  1:       [{ id:'shards', label:'2× Avatar Shards', icon:'🧩', key:'AVATAR_SHARD', qty:2 }, { id:'gear', label:'2× Gear Parts', icon:'⚙️', key:'GEAR_SHARD', qty:2 }, { id:'cryd', label:'5 CRYD', icon:'🔷', cryd:5 }, { id:'energy', label:'Energy Refill +100', icon:'🔋', key:'ENERGY_100', qty:1 }, { id:'stamina', label:'Stamina Refill +100', icon:'⚡', key:'STAMINA_100', qty:1 }, { id:'cover', label:'Cover Boost +100', icon:'🛡️', key:'OPCOVER_100', qty:1 }, { id:'cash', label:'+50,000 IGC', icon:'💵', cash:50000 }, { id:'frame', label:'TOP Frame (Profile)', icon:'🖼️', frameId:'cc_top' }],
  2:       [{ id:'shards', label:'1× Avatar Shard', icon:'🧩', key:'AVATAR_SHARD', qty:1 }, { id:'gear', label:'1× Gear Part', icon:'⚙️', key:'GEAR_SHARD', qty:1 }, { id:'cryd', label:'2 CRYD', icon:'🔷', cryd:2 }, { id:'energy', label:'Energy Boost +75', icon:'🔋', key:'ENERGY_75', qty:1 }, { id:'stamina', label:'Stamina Boost +75', icon:'⚡', key:'STAMINA_75', qty:1 }, { id:'cover', label:'Cover Boost +75', icon:'🛡️', key:'OPCOVER_75', qty:1 }, { id:'cash', label:'+25,000 IGC', icon:'💵', cash:25000 }, { id:'frame', label:'CLASH Frame 2nd (Profile)', icon:'🖼️', frameId:'cc_2nd' }],
  3:       [{ id:'shards', label:'1× Avatar Shard', icon:'🧩', key:'AVATAR_SHARD', qty:1 }, { id:'gear', label:'1× Gear Part', icon:'⚙️', key:'GEAR_SHARD', qty:1 }, { id:'cryd', label:'1 CRYD', icon:'🔷', cryd:1 }, { id:'energy', label:'Energy Boost +50', icon:'🔋', key:'ENERGY_50', qty:1 }, { id:'stamina', label:'Stamina Boost +50', icon:'⚡', key:'STAMINA_50', qty:1 }, { id:'cover', label:'Cover Boost +50', icon:'🛡️', key:'OPCOVER_50', qty:1 }, { id:'cash', label:'+12,500 IGC', icon:'💵', cash:12500 }, { id:'frame', label:'CLASH Frame 3rd (Profile)', icon:'🖼️', frameId:'cc_3rd' }],
  '4-20':  [{ id:'shards', label:'1× Avatar Shard', icon:'🧩', key:'AVATAR_SHARD', qty:1 }, { id:'energy', label:'Energy Boost +25', icon:'🔋', key:'ENERGY_25', qty:1 }, { id:'stamina', label:'Stamina Boost +25', icon:'⚡', key:'STAMINA_25', qty:1 }, { id:'cover', label:'Cover Boost +25', icon:'🛡️', key:'OPCOVER_25', qty:1 }, { id:'cash', label:'+5,000 IGC', icon:'💵', cash:5000 }],
  '21-100':[{ id:'energy', label:'Energy Boost +25', icon:'🔋', key:'ENERGY_25', qty:1 }, { id:'stamina', label:'Stamina Boost +25', icon:'⚡', key:'STAMINA_25', qty:1 }, { id:'cover', label:'Cover Boost +25', icon:'🛡️', key:'OPCOVER_25', qty:1 }, { id:'cash', label:'+5,000 IGC', icon:'💵', cash:5000 }],
};

export function getRewardTier(slot) {
  if (slot === 1) return 1;
  if (slot === 2) return 2;
  if (slot === 3) return 3;
  if (slot <= 20) return '4-20';
  return '21-100';
}

// ─── MNB / BNB Persistent Bots ────────────────────────────────────────────────
const MNB_BNB_KEY = 'cc_mnb_bnb_v1';

export const PERMANENT_BOTS = [
  { botId: 'mnb_001', name: 'Sable', level: 48, initAtk: 2376.18, initDef: 1238.49, isMNB: true, isVip: true, slot: 3,
    botProfileImage: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png' },
];

export function getMNBBNBData() {
  const cached = getEventCache(MNB_BNB_KEY);
  if (cached) return cached;
  const data = {
    lastTick: Date.now(),
    lastLevelBump: Date.now(),
    bots: PERMANENT_BOTS.map(b => ({ botId: b.botId, atk: b.initAtk, def: b.initDef, pwr: b.initAtk + b.initDef, level: b.level })),
  };
  setEventCache(MNB_BNB_KEY, data);
  return data;
}

const TWO_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

export function tickMNBBNBGrowth(topHumanPwr = null) {
  const data = getMNBBNBData();
  const now = Date.now();
  const daysSinceTick = (now - data.lastTick) / (24 * 60 * 60 * 1000);
  if (daysSinceTick < 1) return data;
  const updated = { ...data, lastTick: now };

  const shouldBumpLevel = (now - (data.lastLevelBump || 0)) >= TWO_WEEKS_MS;
  if (shouldBumpLevel) updated.lastLevelBump = now;

  updated.bots = data.bots.map((bot, i) => {
    const def = PERMANENT_BOTS[i];
    if (!def) return bot;
    let newLevel = bot.level || def.level;
    if (shouldBumpLevel) newLevel += 1;
    if (def.isMNB) {
      let newAtk = bot.atk * Math.pow(1.0005, daysSinceTick);
      let newDef = bot.def * Math.pow(1.0025, daysSinceTick);
      if (topHumanPwr && topHumanPwr > 0) {
        const overFactor = 1.01 + Math.random() * 0.10;
        const targetPwr = topHumanPwr * overFactor;
        const curPwr = newAtk + newDef;
        if (curPwr < targetPwr) { const r = targetPwr / curPwr; newAtk *= r; newDef *= r; }
      }
      return { ...bot, level: newLevel, atk: Math.round(newAtk*100)/100, def: Math.round(newDef*100)/100, pwr: Math.round((newAtk+newDef)*100)/100 };
    } else if (def.isBNB && def.dailyGrowth) {
      const newAtk = bot.atk * Math.pow(1 + def.dailyGrowth, daysSinceTick);
      const newDef = bot.def * Math.pow(1 + def.dailyGrowth, daysSinceTick);
      return { ...bot, level: newLevel, atk: Math.round(newAtk*100)/100, def: Math.round(newDef*100)/100, pwr: Math.round((newAtk+newDef)*100)/100 };
    }
    return bot;
  });
  setEventCache(MNB_BNB_KEY, updated);
  return updated;
}

export function getPermanentBotSlots() {
  return PERMANENT_BOTS.map((def) => ({
    slot: def.slot, botId: def.botId, name: def.name, level: def.level,
    atk: def.initAtk, def: def.initDef, pwr: def.initAtk + def.initDef, fundPower: 0,
    isPlayer: false, isVip: def.isVip, isMNB: def.isMNB || false, isBNB: def.isBNB || false,
    botProfileImage: def.botProfileImage,
  }));
}

// ─── Inactivity Bump (CC) ──────────────────────────────────────────────────
export function recordPlayerFight() {
  const data = getCapitalClashData();
  data.playerLastFightAt = Date.now();
  saveCapitalClashData(data);
}

export function applyInactivityBump() {
  const data = getCapitalClashData();
  if (data.playerSlot === null || data.playerSlot === undefined) return data;
  const now = Date.now();
  const lastFight = data.playerLastFightAt || data.startTime;
  const hoursInactive = (now - lastFight) / (60 * 60 * 1000);
  if (hoursInactive < 48) return data;
  const daysOver = Math.floor((hoursInactive - 48) / 24) + 1;
  const bumpAmount = daysOver * 25;
  const newSlot = data.playerSlot + bumpAmount;
  if (newSlot > 100) {
    data.slots = data.slots.filter(s => !s.isPlayer);
    data.playerSlot = null;
    saveCapitalClashData(data);
    return data;
  }
  const newSlots = [...data.slots];
  const playerIdx = newSlots.findIndex(s => s.isPlayer);
  if (playerIdx !== -1) {
    const oldSlot = newSlots[playerIdx].slot;
    const targetIdx = newSlots.findIndex(s => s.slot === newSlot && !s.isPlayer);
    if (targetIdx !== -1) newSlots[targetIdx] = { ...newSlots[targetIdx], slot: oldSlot };
    newSlots[playerIdx] = { ...newSlots[playerIdx], slot: newSlot };
    data.playerSlot = newSlot;
    data.slots = newSlots.sort((a,b) => a.slot - b.slot);
  }
  saveCapitalClashData(data);
  return data;
}

export function getPlayerRewards(data) {
  const slot = data.playerSlot;
  if (slot === null || slot === undefined) return null;
  return CAPITAL_CLASH_REWARDS[getRewardTier(slot)];
}

function hashInt(n) {
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  return Math.abs(n);
}

function generateLeaderboardBots(startTime) {
  const slots = [];
  for (let i = 0; i < 50; i++) {
    const level = 60 + (hashInt(startTime + i * 7) % 40);
    const seed  = hashInt(startTime + i * 13 + 1);
    let botName = `Capital_${i + 1}`;
    let botProfileImage = null;
    let atk = 0, def = 0, pwr = 0, fundMembers = 0, fundPower = 0;
    try {
      const bots = generateCityBots(level, 'Capital City', 'Global', 5, seed);
      if (bots?.[0]) {
        const b = bots[0];
        botName        = b.name;
        botProfileImage = b.botProfileImage || null;
        atk        = b.atk        || 0;
        def        = b.def        || 0;
        fundMembers = b.fundMembers || 0;
        fundPower  = b.fundPower  || 0;
        pwr        = Math.round((atk + def) * 100) / 100;
      }
    } catch {}
    const isVip = (hashInt(seed + 99) % 100) < 15;
    slots.push({
      slot: i + 51, name: botName, level,
      atk, def, pwr, fundMembers, fundPower,
      isPlayer: false, botProfileImage, botAvatarId: null,
      botSceneId: 'scene_default_01', isVip, lastChallengeDay: null,
    });
  }
  return slots;
}

function createFreshCC() {
  const startTime = getCurrentCCStart();
  const data = {
    startTime,
    endTime: startTime + CC_DURATION,
    cooldownEnd: 0,
    playerSlot: null,
    claimed: false,
    rewardsSent: false,
    slots: generateLeaderboardBots(startTime),
  };
  setEventCache(CC_KEY, data);
  return data;
}

export function getCapitalClashData() {
  const cached = getEventCache(CC_KEY);
  if (!cached) return createFreshCC();
  const expectedStart = getCurrentCCStart();
  if (cached.startTime !== expectedStart) return createFreshCC();
  return cached;
}

export function saveCapitalClashData(data) {
  setEventCache(CC_KEY, data);
}

export function tickCapitalClash() {
  const data = getCapitalClashData();
  const now = Date.now();
  if (!data.rewardsSent && now >= data.endTime) {
    data.rewardsSent = true;
    data.cooldownEnd = data.endTime + CC_COOLDOWN;
    saveCapitalClashData(data);
    return data;
  }
  if (data.cooldownEnd && now >= data.cooldownEnd) return createFreshCC();
  return data;
}

export function applyPlayerJoin(playerData) {
  const stats = computeFullPlayerStats(playerData);
  const data = getCapitalClashData();
  const newSlots = data.slots.filter(s => !s.isPlayer && s.slot !== 100);
  newSlots.push({
    slot: 100,
    name: playerData.username || 'You',
    level: playerData.level || 1,
    atk: stats.atk,
    def: stats.def,
    pwr: stats.pwr,
    fundMembers: playerData.fundMembersOwned || 0,
    fundPower: stats.fundPower,
    isPlayer: true,
    botProfileImage: playerData.profileImageDataUrl || null,
    botAvatarId: playerData.equippedAvatarId || null,
    botSceneId: playerData.equippedSceneId || 'scene_default_01',
    isVip: (playerData.vipActiveUntil || playerData.vip_active_until || 0) > Date.now(),
    lastChallengeDay: null,
  });
  data.playerSlot = 100;
  data.slots = newSlots.sort((a, b) => a.slot - b.slot);
  saveCapitalClashData(data);
  return data;
}

export function applyPlayerSwap(targetSlotNum, playerData) {
  const stats = computeFullPlayerStats(playerData);
  const data = getCapitalClashData();
  const newSlots = [...data.slots];
  const playerIdx = newSlots.findIndex(s => s.isPlayer);
  const targetIdx = newSlots.findIndex(s => s.slot === targetSlotNum && !s.isPlayer);
  if (playerIdx === -1 || targetIdx === -1) return data;
  const currentPlayerSlot = newSlots[playerIdx].slot;
  const defeatedBot = { ...newSlots[targetIdx], slot: currentPlayerSlot, isPlayer: false };
  const playerEntry = { ...newSlots[playerIdx], slot: targetSlotNum, atk: stats.atk, def: stats.def, pwr: stats.pwr, fundPower: stats.fundPower, isPlayer: true };
  newSlots[playerIdx] = defeatedBot;
  newSlots[targetIdx] = playerEntry;
  data.playerSlot = targetSlotNum;
  data.slots = newSlots.sort((a, b) => a.slot - b.slot);
  saveCapitalClashData(data);
  return data;
}

// ─── Battle History ──────────────────────────────────────────────────────────
const CC_HISTORY_KEY = 'tw_cc_history_v1';
const CC_DEFENSE_KEY = 'tw_cc_defense_v1';
const CC_DEFENSE_ROLL_KEY = 'tw_cc_defense_roll_v1';

export function getCCDefenseHistory() {
  return getEventCache(CC_DEFENSE_KEY) || [];
}

export function saveCCDefenseRecord(record) {
  const history = getCCDefenseHistory();
  history.unshift(record);
  setEventCache(CC_DEFENSE_KEY, history.slice(0, 20));
}

export function rollCCDefenseLogs(mySlotNumber, botSlots) {
  if (!mySlotNumber || mySlotNumber > 95) return;
  const lastRoll = getEventCache(CC_DEFENSE_ROLL_KEY) || 0;
  const now = Date.now();
  if (now - lastRoll < 4 * 60 * 60 * 1000) return;
  setEventCache(CC_DEFENSE_ROLL_KEY, now);

  const count = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < count; i++) {
    const challengers = botSlots.filter(b => (b.slot || b.slot_number) > mySlotNumber);
    if (challengers.length === 0) break;
    const challenger = challengers[Math.floor(Math.random() * Math.min(5, challengers.length))];
    const challengerAtk = challenger.atk || 10;
    const defenderAtk = (challenger.atk || 10) * (0.7 + Math.random() * 0.6);
    const challengerWon = challengerAtk > defenderAtk && Math.random() < 0.35;
    saveCCDefenseRecord({
      outcome: challengerWon ? 'LOST' : 'DEFENDED',
      challengerName: challenger.name || challenger.username || 'Unknown',
      challengerLevel: challenger.level || 1,
      challengerSlot: challenger.slot || challenger.slot_number,
      challengerAtk: Math.round(challengerAtk * 10) / 10,
      mySlot: mySlotNumber,
      timestamp: now - Math.floor(Math.random() * 3 * 60 * 60 * 1000),
    });
  }
}

export function getCCBattleHistory() {
  return getEventCache(CC_HISTORY_KEY) || [];
}

export function saveCCBattleRecord(record) {
  const history = getCCBattleHistory();
  history.unshift(record);
  setEventCache(CC_HISTORY_KEY, history.slice(0, 20));
}

// ─── Per-Bot Challenge Timers (MNB / BNB) ──────────────────────────────────
const CC_BOT_TIMERS_KEY = 'tw_cc_bot_timers_v1';

const CC_BOT_MIN_S = 90 * 60;
const CC_BOT_MAX_S = 1080 * 60;

export function getBotChallengeTimers() {
  return getEventCache(CC_BOT_TIMERS_KEY) || {};
}

export function initBotChallengeTimers() {
  const now = Date.now();
  const stored = getBotChallengeTimers();
  const updated = { ...stored };
  let changed = false;
  PERMANENT_BOTS.forEach(bot => {
    if (!updated[bot.botId] || updated[bot.botId] < now) {
      const delayMs = (CC_BOT_MIN_S + Math.random() * (CC_BOT_MAX_S - CC_BOT_MIN_S)) * 1000;
      updated[bot.botId] = now + delayMs;
      changed = true;
    }
  });
  if (changed) setEventCache(CC_BOT_TIMERS_KEY, updated);
  return updated;
}

export function rollNextBotChallengeTimer(botId) {
  const timers = getBotChallengeTimers();
  const delayMs = (CC_BOT_MIN_S + Math.random() * (CC_BOT_MAX_S - CC_BOT_MIN_S)) * 1000;
  timers[botId] = Date.now() + delayMs;
  setEventCache(CC_BOT_TIMERS_KEY, timers);
}

export function getDueBotChallenges() {
  const timers = getBotChallengeTimers();
  const now = Date.now();
  return PERMANENT_BOTS.filter(bot => timers[bot.botId] && timers[bot.botId] <= now);
}

export function claimCapitalClashRewards(playerData, savePlayerDataFn, grantFrameFn) {
  const data = getCapitalClashData();
  const slot = data.playerSlot;
  if (slot === null || slot === undefined) return playerData;
  const rewards = CAPITAL_CLASH_REWARDS[getRewardTier(slot)] || [];
  const consumables = { ...(playerData.consumables || {}) };
  let cashDelta = 0, cryptoDelta = 0;
  rewards.forEach(r => {
    if (r.key) consumables[r.key] = (consumables[r.key] || 0) + (r.qty || 0);
    if (r.cash) cashDelta += r.cash;
    if (r.cryd) cryptoDelta += r.cryd;
    if (r.frameId && grantFrameFn) {
      const expiresAt = (data.endTime + 14 * 24 * 60 * 60 * 1000);
      grantFrameFn(r.frameId, expiresAt);
    }
  });
  const updated = savePlayerDataFn({ cash: (playerData.cash || 0) + cashDelta, crypto: (playerData.crypto || 0) + cryptoDelta, consumables });
  data.claimed = true;
  saveCapitalClashData(data);
  return updated;
}