/**
 * playerMemory.js — Pure in-memory cache.
 *
 * This is the SINGLE source of truth for the client. NO localStorage.
 * NO server imports. Other modules (usePlayerStore, playerServerSync,
 * playerStorage) read and write through this module.
 *
 * The data here is populated by playerServerSync.initializeFromServer()
 * on app start, and updated by applyServerReward / flushToServer / refreshFromServer.
 */

import { DEFAULT_PLAYER } from '@/lib/playerUtils';

// ─── Player data ────────────────────────────────────────────────────────────
const subscribers = new Set();
let _currentData = null;

export const getCurrentPlayer = () => {
  if (!_currentData) {
    _currentData = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
    // Ensure default Iron Fist starter firearm
    _currentData.inventory.firearms = { F000: 1 };
    _currentData.loadout.weapon1 = 'F000';
  }
  return _currentData;
};

export const setPlayerData = (data) => {
  _currentData = data;
  notifyAll();
};

export const patchPlayerData = (patch) => {
  _currentData = { ...getCurrentPlayer(), ...patch };
  notifyAll();
};

const notifyAll = () => {
  const snapshot = { ...getCurrentPlayer() };
  subscribers.forEach(fn => fn(snapshot));
  // Dispatch window event so legacy components using getPlayerData() + local state
  // (e.g. ProfilePage) know to re-read after server data loads or updates.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('player_synced'));
  }
};

export const subscribe = (fn) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

// ─── Fund data ──────────────────────────────────────────────────────────────
let _fundData = null;

export const getCurrentFund = () => {
  if (!_fundData) {
    _fundData = { playerFund: null, botFunds: null };
  }
  return _fundData;
};

export const setCurrentFund = (data) => {
  _fundData = data;
};

export const patchFundData = (patch) => {
  _fundData = { ...getCurrentFund(), ...patch };
};

// ─── Pending level-up (replaces localStorage 'pending_levelup') ──────────────
let _pendingLevelUp = null;

export const getPendingLevelUp = () => _pendingLevelUp;

export const setPendingLevelUp = (levels) => {
  const existing = (_pendingLevelUp && _pendingLevelUp.levels) ? _pendingLevelUp.levels : [];
  const newLevels = levels.filter(l => !existing.includes(l));
  if (newLevels.length > 0) {
    _pendingLevelUp = {
      levels: [...existing, ...newLevels],
      timestamp: Date.now()
    };
    window.dispatchEvent(new Event('levelup_pending'));
  }
};

export const clearPendingLevelUp = () => {
  _pendingLevelUp = null;
};

// ─── Event data cache (replaces localStorage event keys) ────────────────────
// In-memory only — populated on first access, cleared on reload.
// Event SCHEDULES are deterministic (computed from reference dates).
// Event STATE (baselineStats, claimed) is stored on the server via
// PlayerProfile.event_data JSON field.
const _eventCache = {};

export const getEventCache = (key) => _eventCache[key];
export const setEventCache = (key, data) => { _eventCache[key] = data; };
export const clearEventCache = (key) => { delete _eventCache[key]; };

// ─── Generic in-memory KV store (replaces misc localStorage/sessionStorage) ─
// For caches that only need to survive within a session (frozen bots, challenge
// rolls, insider trader, trade desk state, etc.). Cleared on reload & on reset.
const _kvStore = {};

export const kvGet = (key) => (key in _kvStore) ? _kvStore[key] : null;
export const kvSet = (key, value) => { _kvStore[key] = value; };
export const kvRemove = (key) => { delete _kvStore[key]; };
export const kvKeysWithPrefix = (prefix) => Object.keys(_kvStore).filter(k => k.startsWith(prefix));

// ─── Session flags (replaces sessionStorage) ─────────────────────────────────
let _hasVisitedThisSession = false;
let _lastOfflineAttackCheck = 0;

export const hasVisitedThisSession = () => _hasVisitedThisSession;
export const markSessionVisited = () => { _hasVisitedThisSession = true; };

export const getLastOfflineAttackCheck = () => _lastOfflineAttackCheck;
export const setLastOfflineAttackCheck = (ts) => { _lastOfflineAttackCheck = ts; };

/**
 * Reset ALL in-memory state — used by account reset / dev reset.
 * After calling this, the app will reinitialize from the server on next load.
 */
export const resetInMemoryCache = () => {
  _currentData = null;
  _fundData = null;
  _pendingLevelUp = null;
  Object.keys(_eventCache).forEach(k => delete _eventCache[k]);
  _hasVisitedThisSession = false;
  _lastOfflineAttackCheck = 0;
  Object.keys(_kvStore).forEach(k => delete _kvStore[k]);
  // Notify subscribers so UI updates immediately
  notifyAll();
};