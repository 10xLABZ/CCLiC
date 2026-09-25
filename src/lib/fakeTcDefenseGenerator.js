// Fake TC defense log generator — runs client-side on History open
// Rolls 0-3 bot attackers from the 3 slots below user. Each bot attacks 1-4 times.
// Gated by an 8-hour timer per city/state so it doesn't spam every click.

import { savePlayerData, getPlayerData } from '@/components/utils/playerStorage';
import { kvGet, kvSet, kvKeysWithPrefix } from '@/lib/playerMemory';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;
const rollKey = (city, state) => `tc_fake_roll_${city}_${state}`;
const logsKey = (city, state) => `tc_fake_logs_${city}_${state}`;

export function shouldRollDefense(city, state) {
  const last = parseInt(kvGet(rollKey(city, state)) || '0');
  return Date.now() - last > EIGHT_HOURS;
}

export function rollFakeDefense({ city, state, mySlotNumber, slots, myUserId, myUsername }) {
  if (!mySlotNumber || !Array.isArray(slots) || slots.length === 0) return 0;

  // Get up to 3 bot slots directly below user (not nemesis)
  const botSlots = [1, 2, 3]
    .map(offset => slots.find(s => s.slot_number === mySlotNumber + offset))
    .filter(s => s && s.user_id && s.user_id.startsWith('bot_') && !s.user_id.startsWith('nemesis_'));

  // Mark timer regardless so we don't keep re-rolling on empty slots
  kvSet(rollKey(city, state), Date.now().toString());

  if (botSlots.length === 0) return 0;

  // How many bots attacked? 0=30%, 1=35%, 2=25%, 3=10%
  const r = Math.random();
  let numAttackers = 0;
  if (r < 0.30) numAttackers = 0;
  else if (r < 0.65) numAttackers = 1;
  else if (r < 0.90) numAttackers = 2;
  else numAttackers = Math.min(3, botSlots.length);

  if (numAttackers === 0) return 0;

  const attackers = [...botSlots].sort(() => Math.random() - 0.5).slice(0, numAttackers);

  const now = Date.now();
  const newLogs = [];

  for (const bot of attackers) {
    const numAttacks = Math.ceil(Math.random() * 4); // 1-4
    for (let i = 0; i < numAttacks; i++) {
      const timeOffset = Math.floor(Math.random() * EIGHT_HOURS * 0.85);
      newLogs.push({
        id: `fake_${now}_${bot.user_id}_${i}`,
        building_id: 'mayors_office',
        city,
        state,
        challenger_user_id: bot.user_id,
        challenger_username: bot.username,
        challenger_profile_image_url: bot.profile_image_url || '',
        challenger_slot: bot.slot_number,
        defender_user_id: myUserId,
        defender_username: myUsername,
        defender_slot: mySlotNumber,
        outcome: 'LOSS', // challenger lost = user successfully defended
        timestamp: now - timeOffset,
        _fake: true
      });
    }
  }

  // Persist merged logs (keep last 50 per city)
  const existing = getFakeLogs(city, state);
  const merged = [...newLogs, ...existing].slice(0, 50);
  kvSet(logsKey(city, state), JSON.stringify(merged));

  // Credit player stats: each defense = 1 TC defense win
  const player = getPlayerData();
  savePlayerData({
    total_trade_war_wins: (player.total_trade_war_wins || 0) + newLogs.length
  });

  return newLogs.length;
}

export function getFakeLogs(city, state) {
  try {
    return JSON.parse(kvGet(logsKey(city, state)) || '[]');
  } catch { return []; }
}

// Aggregate all fake logs across all cities for the global TC Defense Log
export function getAllFakeLogs() {
  const allLogs = [];
  const keys = kvKeysWithPrefix('tc_fake_logs_');
  for (const key of keys) {
    try {
      const logs = JSON.parse(kvGet(key) || '[]');
      allLogs.push(...logs);
    } catch { /* ignore */ }
  }
  return allLogs.sort((a, b) => b.timestamp - a.timestamp);
}