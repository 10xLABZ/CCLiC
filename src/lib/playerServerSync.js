/**
 * playerServerSync.js
 *
 * 100% SERVER-AUTHORITATIVE. NO localStorage. NO local persistence.
 *
 * The server is the single source of truth for ALL player data.
 * This module fetches from the server and populates the in-memory cache
 * (playerMemory.js). All mutations go through the server.
 */

import { base44 } from "@/api/base44Client";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import {
  getCurrentPlayer, setPlayerData, patchPlayerData,
  getCurrentFund, setCurrentFund, patchFundData,
} from "@/lib/playerMemory";
import { recalcLevelFromTotalXP } from "@/lib/playerUtils";

const DEFAULT_TEMPLATE_USERNAME = 'InsiderTrader0000';

// Cached server record IDs (in-memory only)
let _profileRecord = null;
let _inventoryRecord = null;
let _fundRecord = null;

// Block writes until init completes
let _initialized = false;
let _pendingPlayerData = null;
let _flushInProgress = false;
// When true, any in-flight or pending flushToServer will SKIP writing inventory
// because a server-side operation (e.g. processPurchase) just wrote authoritative
// data that we've already pulled via refreshFromServer. A stale local flush
// would overwrite it.
let _skipInventoryFlush = false;

// ─── Payload converters ───────────────────────────────────────────────────────

// Stat fields that are SERVER-AUTHORITATIVE — managed exclusively by
// applyGameReward (applyServerReward). flushToServer must NEVER send these
// because the local cache may be stale and would overwrite real server values.
const SERVER_ONLY_STAT_FIELDS = [
  'vip_xp',
  'vip_level',
  'total_trades_completed',
  'total_trading_profit',
  'total_jobs_completed',
  'total_trade_war_wins',
  'total_trade_war_losses',
  'total_assists',
  'total_sabotages',
  'sabotages_remaining',
  'last_sabotage_regen_timestamp',
  'fund_members_owned',
  // Daily counters — managed by applyGameReward (delta-incremented).
  // If flushToServer sends these as absolute values, it races with
  // applyGameReward's delta increment and doubles the count.
  'jobs_completed_today',
  'trades_completed_today',
  'trade_wars_won_today',
  // Streaks — also managed by applyGameReward to avoid race conditions
  'winstreak',
  'losstreak',
];

const toProfilePayload = (player, userId) => {
  let p = player;
  if (p.username === DEFAULT_TEMPLATE_USERNAME) {
    p = { ...p, username: undefined };
  }
  let trueAtk = p.attackValue || 10;
  let trueDef = p.defenseValue || 10;
  try {
    const stats = computeFullPlayerStats(p);
    trueAtk = stats.atk;
    trueDef = stats.def;
  } catch (e) {}
  const payload = {
    user_id: userId,
    // username and profile_image_url are EXCLUDED from flushToServer — they are
    // managed exclusively by saveProfileCore which does direct, awaited server
    // updates. Including them here would let a stale local cache or a debounced
    // flush overwrite real server values.
    gender: p.gender,
    attack_value: trueAtk,
    defense_value: trueDef,
    // Cosmetic fields (equipped_avatar_id, equipped_scene_id, equipped_theme_id)
    // are EXCLUDED from flushToServer — they are managed exclusively by
    // equipCosmetic / equipCosmetics which do direct, awaited server updates.
    // Including them here would let a stale local cache overwrite real server values.
    equipped_frame_id: p.equippedFrameId || null,
    owned_frames: p.ownedFrames ? JSON.stringify(p.ownedFrames) : null,
    location_state: p.locationState,
    location_city: p.locationCity,
    winstreak: p.winstreak,
    losstreak: p.losstreak,
    jobs_completed_today: p.jobsCompletedToday,
    trades_completed_today: p.tradesCompletedToday,
    trade_wars_won_today: p.tradeWarsWonToday,
    last_claim_date: p.lastClaimDate,
    claimed_daily_goals: p.claimedDailyGoals ? JSON.stringify(p.claimedDailyGoals) : null,
    last_vip_daily_claim_date: p.lastVipDailyClaimDate || null,
    has_completed_onboarding: p.hasCompletedOnboarding,
    fund_members_owned: p.fundMembersOwned,
    hidden_until: p.hiddenUntil || null,
    loadout_presets: p.loadoutPresets || null,
    alliance_tag: p.allianceTag || null,
    fast_five_baseline: p.fastFiveBaseline ? JSON.stringify(p.fastFiveBaseline) : null,
    fast_five_cycle: p.fastFiveCycle || null,
    shard_frenzy_baseline: p.shardFrenzyBaseline ? JSON.stringify(p.shardFrenzyBaseline) : null,
    shard_frenzy_cycle: p.shardFrenzyCycle || null,
    gear_overdrive_baseline: p.gearOverdriveBaseline ? JSON.stringify(p.gearOverdriveBaseline) : null,
    gear_overdrive_cycle: p.gearOverdriveCycle || null,
    world_tour_baseline: p.worldTourBaseline ? JSON.stringify(p.worldTourBaseline) : null,
    world_tour_cycle: p.worldTourCycle || null,
    world_tour_city_log: p.worldTourCityLog || null,
    defence_log: p.defenceLog ? JSON.stringify(p.defenceLog) : null,
  };
  // Strip server-only stat fields — they must NEVER be overwritten by stale local cache
  for (const field of SERVER_ONLY_STAT_FIELDS) {
    delete payload[field];
  }
  return payload;
};

// Fields managed EXCLUSIVELY by direct atomic server writes (saveSimpleUpgrade,
// saveWeaponUpgrade, saveLoadoutSlot). flushToServer must NEVER include these in
// the inventory payload — a concurrent flush could overwrite a direct write with
// stale local-cache data, causing upgrades to silently revert.
const DIRECT_WRITE_INVENTORY_FIELDS = ['simpleUpgrades', 'weaponUpgrades', 'loadout'];

const toInventoryPayload = (player, userId) => {
  const payload = {
    user_id: userId,
    firearms: player.inventory?.firearms || {},
    weapons: player.inventory?.weapons || {},
    vehicles: player.inventory?.vehicles || {},
    power: player.inventory?.power || {},
    pets: player.inventory?.pets || {},
    avatars: player.inventory?.avatars || {},
    scenes: player.inventory?.scenes || {},
    themes: player.inventory?.themes || {},
    loadout: player.loadout || {},
    weaponUpgrades: player.weaponUpgrades || {},
    avatarUpgrades: player.avatarUpgrades || {},
    simpleUpgrades: player.simpleUpgrades || {},
    research: player.research || {},
    researchLabLevel: player.researchLabLevel || 0,
    activeResearch: player.activeResearch || null,
    activeLabUpgrade: player.activeLabUpgrade || null,
    consumables: player.consumables || {},
  };
  // Strip direct-write fields — they are managed by saveSimpleUpgrade / saveWeaponUpgrade
  // and must never be overwritten by a debounced flushToServer.
  for (const field of DIRECT_WRITE_INVENTORY_FIELDS) {
    delete payload[field];
  }
  return payload;
};

const toFundPayload = (playerFund, userId) => ({
  user_id: userId,
  fund_name: playerFund.fundName,
  fund_members: playerFund.fundMembers,
  hq_state: playerFund.hqState,
  hq_city: playerFund.hqCity,
  image_id: playerFund.imageId,
});

// ─── Apply server records — SERVER ALWAYS WINS ───────────────────────────────

const applyProfileRecord = (record, player) => ({
  ...player,
  username: (record.username && record.username !== DEFAULT_TEMPLATE_USERNAME)
    ? record.username
    : (player.username && player.username !== DEFAULT_TEMPLATE_USERNAME ? player.username : record.username),
  gender: record.gender ?? player.gender,
  level: record.level ?? player.level ?? 1,
  xp: record.xp ?? player.xp ?? 0,
  ...computeXPInfo(record.xp ?? player.xp ?? 0),
  respect: record.respect ?? player.respect ?? 0,
  cash: record.cash ?? player.cash ?? 0,
  crypto: record.crypto ?? player.crypto ?? 0,
  energy: record.energy ?? 100,
  stamina: record.stamina ?? 100,
  opCover: record.op_cover ?? 100,
  attackValue: player.attackValue,
  defenseValue: player.defenseValue,
  lastStaminaTimestamp: record.last_stamina_timestamp || Date.now(),
  lastEnergyTimestamp: record.last_energy_timestamp || Date.now(),
  lastOpCoverTimestamp: record.last_op_cover_timestamp || Date.now(),
  equippedAvatarId: record.equipped_avatar_id ?? player.equippedAvatarId,
  equippedSceneId: record.equipped_scene_id ?? player.equippedSceneId,
  equippedThemeId: record.equipped_theme_id ?? player.equippedThemeId,
  equippedFrameId: record.equipped_frame_id ?? player.equippedFrameId ?? null,
  ownedFrames: (() => {
    try { return JSON.parse(record.owned_frames || '[]'); } catch { return player.ownedFrames || []; }
  })(),
  vipActiveUntil: record.vip_active_until ?? player.vipActiveUntil ?? null,
  vipXp: record.vip_xp ?? player.vipXp ?? 0,
  vipLevel: record.vip_level ?? player.vipLevel ?? 1,
  shieldActiveUntil: record.shield_active_until ?? player.shieldActiveUntil ?? null,
  shieldType: record.shield_type ?? player.shieldType,
  lastVipDailyClaimDate: record.last_vip_daily_claim_date ?? player.lastVipDailyClaimDate ?? null,
  hiddenUntil: record.hidden_until ?? player.hiddenUntil ?? null,
  profileImageDataUrl: record.profile_image_url ?? player.profileImageDataUrl,
  locationState: record.location_state ?? player.locationState,
  locationCity: record.location_city ?? player.locationCity,
  winstreak: record.winstreak ?? player.winstreak,
  losstreak: record.losstreak ?? player.losstreak,
  jobsCompletedToday: record.jobs_completed_today ?? player.jobsCompletedToday,
  tradesCompletedToday: record.trades_completed_today ?? player.tradesCompletedToday,
  tradeWarsWonToday: record.trade_wars_won_today ?? player.tradeWarsWonToday,
  lastClaimDate: record.last_claim_date ?? player.lastClaimDate,
  claimedDailyGoals: record.claimed_daily_goals ? (typeof record.claimed_daily_goals === 'string' ? JSON.parse(record.claimed_daily_goals) : record.claimed_daily_goals) : (player.claimedDailyGoals || []),
  lastVipDailyClaimDate: record.last_vip_daily_claim_date ?? player.lastVipDailyClaimDate ?? null,
  totalTradesCompleted: record.total_trades_completed ?? player.totalTradesCompleted ?? 0,
  totalTradingProfit: record.total_trading_profit ?? player.totalTradingProfit ?? 0,
  totalJobsCompleted: record.total_jobs_completed ?? player.totalJobsCompleted ?? 0,
  totalTradeWarWins: record.total_trade_war_wins ?? player.totalTradeWarWins ?? 0,
  totalTradeWarLosses: record.total_trade_war_losses ?? player.totalTradeWarLosses ?? 0,
  totalAssists: record.total_assists ?? player.totalAssists ?? 0,
  totalSabotages: record.total_sabotages ?? player.totalSabotages ?? 0,
  sabotagesRemaining: record.sabotages_remaining ?? player.sabotagesRemaining ?? 0,
  lastSabotageRegenTimestamp: record.last_sabotage_regen_timestamp ?? player.lastSabotageRegenTimestamp ?? Date.now(),
  hasCompletedOnboarding: record.has_completed_onboarding ?? player.hasCompletedOnboarding,
  shieldActiveUntil: record.shield_active_until ?? player.shieldActiveUntil ?? null,
  shieldType: record.shield_type ?? player.shieldType,
  fundMembersOwned: record.fund_members_owned ?? player.fundMembersOwned ?? 0,
  hiddenUntil: record.hidden_until ?? player.hiddenUntil ?? null,
  vipActiveUntil: record.vip_active_until ?? player.vipActiveUntil ?? null,
  loadoutPresets: record.loadout_presets ?? player.loadoutPresets ?? null,
  allianceTag: record.alliance_tag ?? player.allianceTag ?? null,
  fastFiveBaseline: (() => {
    try { return JSON.parse(record.fast_five_baseline || 'null'); } catch { return player.fastFiveBaseline || null; }
  })(),
  fastFiveCycle: record.fast_five_cycle ?? player.fastFiveCycle ?? null,
  shardFrenzyBaseline: (() => {
    try { return JSON.parse(record.shard_frenzy_baseline || 'null'); } catch { return player.shardFrenzyBaseline || null; }
  })(),
  shardFrenzyCycle: record.shard_frenzy_cycle ?? player.shardFrenzyCycle ?? null,
  gearOverdriveBaseline: (() => {
    try { return JSON.parse(record.gear_overdrive_baseline || 'null'); } catch { return player.gearOverdriveBaseline || null; }
  })(),
  gearOverdriveCycle: record.gear_overdrive_cycle ?? player.gearOverdriveCycle ?? null,
  worldTourBaseline: (() => {
    try { return JSON.parse(record.world_tour_baseline || 'null'); } catch { return player.worldTourBaseline || null; }
  })(),
  worldTourCycle: record.world_tour_cycle ?? player.worldTourCycle ?? null,
  worldTourCityLog: record.world_tour_city_log ?? player.worldTourCityLog ?? null,
  defenceLog: (() => {
    try { return JSON.parse(record.defence_log || '[]'); } catch { return player.defenceLog || []; }
  })(),
});

// Helper: compute xpThisLevel / xpToNext from total XP
const computeXPInfo = (totalXP) => {
  const info = recalcLevelFromTotalXP(parseInt(totalXP) || 0);
  return { xpThisLevel: info.xpThisLevel, xpToNext: info.xpToNext };
};

const sanitizeLoadout = (loadout) => {
  const l = { ...loadout };
  if (l.weapon1 && typeof l.weapon1 === 'string' && !l.weapon1.startsWith('F')) l.weapon1 = null;
  if (l.weapon2 && typeof l.weapon2 === 'string' && !l.weapon2.startsWith('F')) l.weapon2 = null;
  if (l.weapon3 && typeof l.weapon3 === 'string' && l.weapon3.startsWith('F')) l.weapon3 = null;
  if (l.weapon4 && typeof l.weapon4 === 'string' && l.weapon4.startsWith('F')) l.weapon4 = null;
  return l;
};

const applyInventoryRecord = (record, player) => ({
  ...player,
  inventory: {
    firearms: record.firearms || {},
    weapons:  record.weapons || {},
    vehicles: record.vehicles || {},
    power:    record.power || {},
    pets:     record.pets || {},
    avatars:  record.avatars || {},
    scenes:   record.scenes || {},
    themes:   record.themes || {},
  },
  consumables: record.consumables || {},
  loadout: sanitizeLoadout(record.loadout || {}),
  weaponUpgrades: record.weaponUpgrades || {},
  avatarUpgrades: record.avatarUpgrades || {},
  simpleUpgrades: record.simpleUpgrades || {},
  research: { ...(player.research || {}), ...(record.research || {}) },
  researchLabLevel: record.researchLabLevel ?? player.researchLabLevel ?? 0,
  activeResearch: record.activeResearch ?? player.activeResearch ?? null,
  activeLabUpgrade: record.activeLabUpgrade ?? player.activeLabUpgrade ?? null,
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once on app start.
 * Fetches all player entities from server and populates the in-memory cache.
 * If no server record exists (new user), uploads current data to server.
 */
export const initializeFromServer = async () => {
  const user = await base44.auth.me();
  if (!user) return { success: false, reason: 'not_authenticated' };

  let localPlayer = { ...getCurrentPlayer() };

  const [profiles, inventories] = await Promise.all([
    base44.entities.PlayerProfile.filter({ user_id: user.id }),
    base44.entities.PlayerInventory.filter({ user_id: user.id }),
  ]);

  const isNewUser = profiles.length === 0;

  if (!isNewUser) {
    _profileRecord = profiles[0];
    localPlayer = applyProfileRecord(_profileRecord, localPlayer);

    if (inventories.length > 0) {
      // Pick the inventory record with the MOST items — duplicates can exist
      // and the newest one may be empty/default. The one with real data wins.
      _inventoryRecord = inventories.reduce((best, current) => {
        if (!best) return current;
        const bestCount = Object.values(best)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        const currCount = Object.values(current)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        return currCount > bestCount ? current : best;
      }, null);

      // Delete any duplicate inventory records (keep only the chosen one)
      const dupes = inventories.filter(inv => inv.id !== _inventoryRecord.id);
      for (const dup of dupes) {
        base44.entities.PlayerInventory.delete(dup.id).catch(() => {});
      }

      localPlayer = applyInventoryRecord(_inventoryRecord, localPlayer);
    }

    // Check for pending attack notification
    if (_profileRecord.last_attacked_by) {
      try {
        const attackInfo = JSON.parse(_profileRecord.last_attacked_by);
        const defenceLog = localPlayer.defenceLog || [];
        defenceLog.push({
          bot: { name: attackInfo.attackerUsername, isHuman: true, level: attackInfo.attackerLevel || 1, botProfileImage: attackInfo.attackerAvatar },
          outcome: 'LOSS',
          timestamp: attackInfo.timestamp,
          revengeAvailable: false,
          revengeAttempts: 0,
          index: defenceLog.length
        });
        localPlayer.defenceLog = defenceLog.slice(-10);
        window.dispatchEvent(new CustomEvent('human_attack_received', { detail: attackInfo }));
        base44.entities.PlayerProfile.update(_profileRecord.id, { last_attacked_by: null });
      } catch (e) {}
    }

    localPlayer.user_id = user.id;
  } else {
    // New user — push data up to server
    localPlayer.user_id = user.id;
    const [newProfile, newInventory] = await Promise.all([
      base44.entities.PlayerProfile.create({
        ...toProfilePayload(localPlayer, user.id),
        // Initial resource values — toProfilePayload excludes server-authoritative
        // fields (energy, stamina, etc.) to prevent stale local cache from
        // overwriting real server values during flushToServer. But on CREATION
        // we must send initial values, otherwise the server defaults number
        // fields to 0 and applyProfileRecord's `record.energy ?? 100` returns
        // 0 (because 0 ?? 100 = 0, not 100).
        cash: localPlayer.cash ?? 5000,
        crypto: localPlayer.crypto ?? 100,
        energy: 200,
        stamina: 200,
        op_cover: 200,
        respect: 0,
        xp: 0,
        level: 1,
        vip_xp: 0,
        vip_level: 1,
        sabotages_remaining: 20,
        last_sabotage_regen_timestamp: Date.now(),
        last_energy_timestamp: Date.now(),
        last_stamina_timestamp: Date.now(),
        last_op_cover_timestamp: Date.now(),
      }),
      base44.entities.PlayerInventory.create(toInventoryPayload(localPlayer, user.id)),
    ]);
    _profileRecord = newProfile;
    _inventoryRecord = newInventory;
  }

  // Update in-memory cache — NO localStorage
  setPlayerData(localPlayer);

  // Mark initialized — unblock writes
  _initialized = true;

  // DISCARD any data queued during init — it was captured BEFORE server data
  // was loaded, so it's stale/default and would overwrite real server data.
  _pendingPlayerData = null;

  // Sync fund
  const funds = await base44.entities.PlayerFund.filter({ user_id: user.id });
  if (funds.length > 0) {
    _fundRecord = funds[0];
    const fundData = getCurrentFund();
    // Use the MAX of PlayerFund.fund_members and PlayerProfile.fund_members_owned.
    // fund_members_owned is the server-authoritative value (incremented atomically
    // by applyGameReward). PlayerFund.fund_members can go stale if syncFundToServer
    // failed or was fire-and-forget. Never let a stale 0 overwrite the real value.
    const serverFundMembers = _fundRecord.fund_members || 0;
    const profileFundMembers = _profileRecord?.fund_members_owned || 0;
    const authoritativeMembers = Math.max(serverFundMembers, profileFundMembers);
    fundData.playerFund = {
      ...(fundData.playerFund || {}),
      fundName: _fundRecord.fund_name,
      fundMembers: authoritativeMembers,
      hqState: _fundRecord.hq_state,
      hqCity: _fundRecord.hq_city,
      imageId: _fundRecord.image_id,
    };
    setCurrentFund(fundData);

    // Cross-sync fund_members_owned into player data
    patchPlayerData({ fundMembersOwned: authoritativeMembers });

    // If PlayerFund was stale, sync it with the authoritative value
    if (serverFundMembers < authoritativeMembers) {
      base44.entities.PlayerFund.update(_fundRecord.id, { fund_members: authoritativeMembers }).catch(() => {});
    }
  }

  // Sync alliance tag if missing
  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer.allianceTag) {
    try {
      const memberships = await base44.entities.AllianceMember.filter({ user_id: user.id });
      if (memberships.length > 0) {
        const alliances = await base44.entities.Alliance.filter({ id: memberships[0].alliance_id });
        if (alliances.length > 0 && alliances[0].tag) {
          const tag = alliances[0].tag;
          patchPlayerData({ allianceTag: tag });
          if (_profileRecord) {
            base44.entities.PlayerProfile.update(_profileRecord.id, { alliance_tag: tag }).catch(() => {});
          }
        }
      }
    } catch {}
  }

  return { success: true, isNewUser };
};

/**
 * Immediate write — bypasses debounce. Use for critical actions.
 */
export const flushToServer = async (playerData) => {
  // BLOCK writes until initializeFromServer has completed loading server data.
  // Without this, default/empty in-memory state can overwrite real server data.
  if (!_initialized) {
    if (playerData) _pendingPlayerData = playerData;
    return;
  }
  if (_flushInProgress) {
    if (playerData) _pendingPlayerData = playerData;
    setTimeout(() => { if (_pendingPlayerData) flushToServer(_pendingPlayerData); }, 100);
    return;
  }
  _flushInProgress = true;
  const data = playerData || _pendingPlayerData;
  if (!data) { _flushInProgress = false; return; }

  // SAFETY: Never overwrite server inventory with an all-empty payload.
  // This prevents wiping real server data if local state is stale/default.
  const inv = data.inventory || {};
  const isInventoryEmpty = Object.values(inv).every(
    (cat) => !cat || Object.keys(cat).length === 0
  );
  const hasNoConsumables = !data.consumables || Object.keys(data.consumables).length === 0;
  if (isInventoryEmpty && hasNoConsumables) {
    // Skip inventory write entirely — keep server's authoritative inventory
    console.warn('[Sync] Skipping inventory flush — local inventory is empty, refusing to overwrite server data');
  }

  try {
    const user = await base44.auth.me();
    if (!user) { _flushInProgress = false; return; }

    const profilePayload = toProfilePayload(data, user.id);
    const inventoryPayload = toInventoryPayload(data, user.id);

    if (_profileRecord) {
      await base44.entities.PlayerProfile.update(_profileRecord.id, profilePayload);
    } else {
      const records = await base44.entities.PlayerProfile.filter({ user_id: user.id });
      if (records.length > 0) {
        _profileRecord = records[0];
        await base44.entities.PlayerProfile.update(_profileRecord.id, profilePayload);
      } else {
        _profileRecord = await base44.entities.PlayerProfile.create(profilePayload);
      }
    }

    // Only write inventory if local state has real items (not empty/default)
    // AND a server-side operation (processPurchase) hasn't just written authoritative
    // data that we pulled via refreshFromServer — in that case _skipInventoryFlush
    // is true and we must NOT overwrite the server with stale local data.
    if (!(isInventoryEmpty && hasNoConsumables) && !_skipInventoryFlush) {
      if (_inventoryRecord) {
        await base44.entities.PlayerInventory.update(_inventoryRecord.id, inventoryPayload);
        // Keep cached record in sync with what we just wrote so direct-write
        // functions (saveSimpleUpgrade, saveWeaponUpgrade) read current data.
        _inventoryRecord = { ..._inventoryRecord, ...inventoryPayload };
      } else {
        const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
        if (records.length > 0) {
          _inventoryRecord = records[0];
          await base44.entities.PlayerInventory.update(_inventoryRecord.id, inventoryPayload);
          _inventoryRecord = { ..._inventoryRecord, ...inventoryPayload };
        } else {
          _inventoryRecord = await base44.entities.PlayerInventory.create(inventoryPayload);
        }
      }
    }
    // Reset the skip flag after this flush cycle — subsequent normal flushes are fine
    _skipInventoryFlush = false;

    // Sync TP into AllianceMember
    try {
      const members = await base44.entities.AllianceMember.filter({ user_id: user.id });
      if (members.length > 0) {
        const hqMembers = data.fundMembersOwned || 0;
        const playerLevel = profilePayload.level || 1;
        const fundPower = hqMembers * (0.20 + playerLevel * 0.02);
        const realTP = (profilePayload.attack_value || 0) + (profilePayload.defense_value || 0) + fundPower;
        if (Math.abs(realTP - (members[0].fund_power || 0)) > 0.01) {
          base44.entities.AllianceMember.update(members[0].id, { fund_power: realTP }).catch(() => {});
        }
      }
    } catch {}

    if (_pendingPlayerData === data || playerData === data) {
      _pendingPlayerData = null;
    }
  } catch (err) {
    console.warn('[Sync] flushToServer failed, will retry on next save:', err?.message || err);
  } finally {
    _flushInProgress = false;
  }
};

// Auto-flush when user leaves or hides the tab
if (typeof window !== 'undefined') {
  const doFlush = () => { if (_pendingPlayerData) flushToServer(_pendingPlayerData); };
  window.addEventListener('beforeunload', doFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') doFlush();
  });
}

/**
 * Public API to clear stale pending flush data — called after server-side
 * operations like processPurchase to prevent a stale local flush from
 * overwriting authoritative server inventory.
 */
export const clearPendingFlush = () => {
  _pendingPlayerData = null;
  _skipInventoryFlush = true;
};

/**
 * Debounced — called from savePlayerData on every game action.
 * Pushes NON-RESOURCE fields to server (resources are stripped by playerStorage.js).
 */
export const syncProfileToServer = (playerData) => {
  _pendingPlayerData = playerData;
  if (!_initialized) return;
  flushToServer(playerData);
};

/**
 * refreshFromServer — pulls the latest authoritative values from the server
 * and updates the in-memory cache. NO localStorage.
 */
export const refreshFromServer = async () => {
  try {
    const user = await base44.auth.me();
    if (!user) return null;

    const [records, inventories] = await Promise.all([
      base44.entities.PlayerProfile.filter({ user_id: user.id }),
      base44.entities.PlayerInventory.filter({ user_id: user.id }),
    ]);
    if (records.length === 0) return null;

    const record = records[0];
    _profileRecord = record;

    // SERVER WINS — update in-memory cache from server data
    const patch = {
      cash: record.cash ?? 0,
      crypto: record.crypto ?? 0,
      energy: record.energy ?? 100,
      stamina: record.stamina ?? 100,
      opCover: record.op_cover ?? 100,
      respect: record.respect ?? 0,
      xp: record.xp ?? 0,
      level: record.level ?? 1,
      ...computeXPInfo(record.xp ?? 0),
      fundMembersOwned: record.fund_members_owned ?? 0,
      // Performance stats — reload from server so they're never stale
      totalJobsCompleted: record.total_jobs_completed ?? 0,
      totalTradesCompleted: record.total_trades_completed ?? 0,
      totalTradingProfit: record.total_trading_profit ?? 0,
      totalTradeWarWins: record.total_trade_war_wins ?? 0,
      totalTradeWarLosses: record.total_trade_war_losses ?? 0,
      totalAssists: record.total_assists ?? 0,
      totalSabotages: record.total_sabotages ?? 0,
      sabotagesRemaining: record.sabotages_remaining ?? 0,
      jobsCompletedToday: record.jobs_completed_today ?? 0,
      tradesCompletedToday: record.trades_completed_today ?? 0,
      tradeWarsWonToday: record.trade_wars_won_today ?? 0,
      winstreak: record.winstreak ?? 0,
      losstreak: record.losstreak ?? 0,
      // Equipped cosmetics
      equippedAvatarId: record.equipped_avatar_id ?? undefined,
      equippedSceneId: record.equipped_scene_id ?? undefined,
      equippedThemeId: record.equipped_theme_id ?? undefined,
      equippedFrameId: record.equipped_frame_id ?? undefined,
      ownedFrames: (() => { try { return JSON.parse(record.owned_frames || '[]'); } catch { return undefined; } })(),
      username: record.username ?? undefined,
      profileImageDataUrl: record.profile_image_url ?? undefined,
      gender: record.gender ?? undefined,
      allianceTag: record.alliance_tag ?? undefined,
      vipActiveUntil: record.vip_active_until ?? undefined,
      vipXp: record.vip_xp ?? undefined,
      vipLevel: record.vip_level ?? undefined,
      shieldActiveUntil: record.shield_active_until ?? undefined,
      shieldType: record.shield_type ?? undefined,
      lastVipDailyClaimDate: record.last_vip_daily_claim_date ?? undefined,
      hiddenUntil: record.hidden_until ?? undefined,
      defenceLog: (() => { try { return JSON.parse(record.defence_log || '[]'); } catch { return undefined; } })(),
    };
    if (record.last_energy_timestamp) patch.lastEnergyTimestamp = record.last_energy_timestamp;
    if (record.last_stamina_timestamp) patch.lastStaminaTimestamp = record.last_stamina_timestamp;
    if (record.last_op_cover_timestamp) patch.lastOpCoverTimestamp = record.last_op_cover_timestamp;

    // Also reload inventory from server so it's never stale
    if (inventories.length > 0) {
      // Pick the record with the MOST items (same dedup logic as initializeFromServer)
      _inventoryRecord = inventories.reduce((best, current) => {
        if (!best) return current;
        const bestCount = Object.values(best)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        const currCount = Object.values(current)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        return currCount > bestCount ? current : best;
      }, null);
      const inv = _inventoryRecord;
      patch.inventory = {
        firearms: inv.firearms || {},
        weapons:  inv.weapons || {},
        vehicles: inv.vehicles || {},
        power:    inv.power || {},
        pets:     inv.pets || {},
        avatars:  inv.avatars || {},
        scenes:   inv.scenes || {},
        themes:   inv.themes || {},
      };
      patch.consumables = inv.consumables || {};
      patch.loadout = sanitizeLoadout(inv.loadout || {});
      patch.weaponUpgrades = inv.weaponUpgrades || {};
      patch.avatarUpgrades = inv.avatarUpgrades || {};
      patch.simpleUpgrades = inv.simpleUpgrades || {};
      patch.research = inv.research || {};
      patch.researchLabLevel = inv.researchLabLevel ?? 0;
    }

    patchPlayerData(patch);

    // CRITICAL: Cancel any stale pending flush and mark that the next in-flight
    // flush should skip inventory — it would have captured pre-refresh data and
    // overwrite the authoritative server inventory we just loaded (e.g. after a
    // processPurchase that granted a new item).
    _pendingPlayerData = null;
    _skipInventoryFlush = true;

    return getCurrentPlayer();
  } catch (err) {
    console.warn('[Sync] refreshFromServer failed:', err?.message);
    return null;
  }
};

// snake_case stat_fields keys → camelCase
const STAT_FIELD_MAP = {
  total_jobs_completed:    'totalJobsCompleted',
  jobs_completed_today:    'jobsCompletedToday',
  total_trades_completed:  'totalTradesCompleted',
  trades_completed_today:  'tradesCompletedToday',
  total_trading_profit:    'totalTradingProfit',
  total_trade_war_wins:    'totalTradeWarWins',
  total_trade_war_losses:  'totalTradeWarLosses',
  trade_wars_won_today:    'tradeWarsWonToday',
  total_assists:           'totalAssists',
  total_sabotages:         'totalSabotages',
  sabotages_remaining:     'sabotagesRemaining',
  winstreak:               'winstreak',
  losstreak:               'losstreak',
  last_claim_date:         'lastClaimDate',
  claimed_daily_goals:     'claimedDailyGoals',
  last_vip_daily_claim_date: 'lastVipDailyClaimDate',
  fund_members_owned:      'fundMembersOwned',
  vip_active_until:        'vipActiveUntil',
  vip_xp:                  'vipXp',
  vip_level:               'vipLevel',
};

/**
 * applyServerReward — calls applyGameReward backend function with deltas,
 * then patches the in-memory cache from the server response. NO optimistic updates. NO localStorage.
 */
export const applyServerReward = async (deltas) => {
  // NO optimistic local update — server is the ONLY authority
  const result = await base44.functions.invoke('applyGameReward', deltas);
  const data = result?.data;
  if (!data?.success) return null;

  // Patch in-memory cache from the authoritative server response ONLY
  const patch = {};
  if (data.new_cash != null) patch.cash = data.new_cash;
  if (data.new_cryd != null) patch.crypto = data.new_cryd;
  if (data.new_energy != null) patch.energy = data.new_energy;
  if (data.new_stamina != null) patch.stamina = data.new_stamina;
  if (data.new_op_cover != null) patch.opCover = data.new_op_cover;
  if (data.new_respect != null) patch.respect = data.new_respect;
  if (data.new_xp != null) patch.xp = data.new_xp;
  if (data.new_level != null) patch.level = data.new_level;
  if (data.new_vip_xp != null) patch.vipXp = data.new_vip_xp;
  if (data.new_vip_level != null) patch.vipLevel = data.new_vip_level;
  if (data.new_xp != null) {
    const xpInfo = computeXPInfo(data.new_xp);
    patch.xpThisLevel = xpInfo.xpThisLevel;
    patch.xpToNext = xpInfo.xpToNext;
  }
  if (data.last_energy_timestamp) patch.lastEnergyTimestamp = data.last_energy_timestamp;
  if (data.last_stamina_timestamp) patch.lastStaminaTimestamp = data.last_stamina_timestamp;
  if (data.last_op_cover_timestamp) patch.lastOpCoverTimestamp = data.last_op_cover_timestamp;

  // Patch stat_fields from the AUTHORITATIVE server response (not the request).
  // The server increments cumulative stats from its own current value, so the
  // response has the real totals — never trust the client-sent delta values.
  if (data.stat_updates) {
    for (const [snakeKey, val] of Object.entries(data.stat_updates)) {
      const camelKey = STAT_FIELD_MAP[snakeKey];
      if (camelKey) patch[camelKey] = val;
    }
  }

  patchPlayerData(patch);
  return data;
};

/**
 * Direct, fully-awaited server update for cosmetics (avatar/scene/theme).
 * Bypasses the flush queue entirely — waits for server confirmation before returning.
 * Use this for all cosmetic equip operations so the UI can show a real save→confirm flow.
 */
export const equipCosmetic = async (type, itemId) => {
  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  if (!_profileRecord) {
    const records = await base44.entities.PlayerProfile.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No profile record found');
    _profileRecord = records[0];
  }

  const FIELD_MAP = {
    avatar: 'equipped_avatar_id',
    scene: 'equipped_scene_id',
    theme: 'equipped_theme_id',
  };
  const LOCAL_KEY_MAP = {
    avatar: 'equippedAvatarId',
    scene: 'equippedSceneId',
    theme: 'equippedThemeId',
  };

  const serverField = FIELD_MAP[type];
  const localKey = LOCAL_KEY_MAP[type];
  if (!serverField) throw new Error('Unknown cosmetic type: ' + type);

  // Direct server update — fully awaited, no queue, no debounce
  await base44.entities.PlayerProfile.update(_profileRecord.id, { [serverField]: itemId });

  // Patch local cache ONLY from the confirmed server value
  patchPlayerData({ [localKey]: itemId });
};

/**
 * Batch cosmetic save — accepts an object with optional avatar, scene, theme
 * and writes ALL of them to the server in a single atomic update.
 * Use this for the "draft → SAVE" customization flow so avatar/scene/theme
 * changes never race each other.
 */
export const equipCosmetics = async ({ avatar, scene, theme }) => {
  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  if (!_profileRecord) {
    const records = await base44.entities.PlayerProfile.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No profile record found');
    _profileRecord = records[0];
  }

  const update = {};
  const localPatch = {};
  if (avatar != null) { update.equipped_avatar_id = avatar; localPatch.equippedAvatarId = avatar; }
  if (scene != null)  { update.equipped_scene_id  = scene;  localPatch.equippedSceneId  = scene;  }
  if (theme != null)  { update.equipped_theme_id   = theme;  localPatch.equippedThemeId   = theme;  }

  if (Object.keys(update).length === 0) return;

  // Single atomic server update for all cosmetic fields
  await base44.entities.PlayerProfile.update(_profileRecord.id, update);
  patchPlayerData(localPatch);
};

/**
 * Direct, fully-awaited server save for core profile fields (username, profile
 * image, equipped frame, owned frames). Also syncs username + profile_image_url
 * to AllianceMember records and Alliance.leader_username if applicable.
 *
 * Use this for the "draft → SAVE" flow on the home page so core profile fields
 * are persisted to the server before navigation — preventing refresh/reload
 * from wiping them out.
 *
 * Accepts a partial object — only provided fields are written to the server.
 */
export const saveProfileCore = async (updates) => {
  if (!updates || typeof updates !== 'object') return;

  // Wait for initialization to complete — prevents race condition where
  // saveProfileCore runs before initializeFromServer has created the profile
  // record (e.g. user saves username before init finishes). Without this,
  // _profileRecord is null and the save silently fails, causing the username
  // to be lost on refresh.
  let waitCount = 0;
  while (!_initialized && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  if (!_profileRecord) {
    const records = await base44.entities.PlayerProfile.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No profile record found');
    _profileRecord = records[0];
  }

  // Build server payload — only include provided fields
  const serverUpdate = {};
  const localPatch = {};

  if (updates.username != null) {
    serverUpdate.username = updates.username;
    localPatch.username = updates.username;
    // Mark onboarding as complete when a real username is saved — prevents
    // the app from re-prompting username creation after refresh.
    serverUpdate.has_completed_onboarding = true;
    localPatch.hasCompletedOnboarding = true;
  }
  if (updates.profileImageDataUrl != null) {
    serverUpdate.profile_image_url = updates.profileImageDataUrl;
    localPatch.profileImageDataUrl = updates.profileImageDataUrl;
  }
  if (updates.equippedFrameId !== undefined) {
    serverUpdate.equipped_frame_id = updates.equippedFrameId;
    localPatch.equippedFrameId = updates.equippedFrameId;
  }
  if (updates.ownedFrames != null) {
    serverUpdate.owned_frames = JSON.stringify(updates.ownedFrames);
    localPatch.ownedFrames = updates.ownedFrames;
  }

  if (Object.keys(serverUpdate).length === 0) return;

  // Single atomic server update for all core profile fields
  await base44.entities.PlayerProfile.update(_profileRecord.id, serverUpdate);

  // Patch local cache from confirmed server values
  patchPlayerData(localPatch);

  // Sync username + profile_image_url to AllianceMember records
  if (serverUpdate.username != null || serverUpdate.profile_image_url != null) {
    try {
      const members = await base44.entities.AllianceMember.filter({ user_id: user.id });
      if (members.length > 0) {
        const memberUpdate = {};
        if (serverUpdate.username != null) memberUpdate.username = serverUpdate.username;
        if (serverUpdate.profile_image_url != null) memberUpdate.profile_image_url = serverUpdate.profile_image_url;
        for (const m of members) {
          base44.entities.AllianceMember.update(m.id, memberUpdate).catch(() => {});
        }

        // If this user is an alliance leader, update Alliance.leader_username
        if (serverUpdate.username != null) {
          for (const m of members) {
            if (m.role === 'leader') {
              const alliances = await base44.entities.Alliance.filter({ id: m.alliance_id });
              if (alliances.length > 0) {
                base44.entities.Alliance.update(alliances[0].id, { leader_username: serverUpdate.username }).catch(() => {});
              }
            }
          }
        }
      }
    } catch {}
  }
};

/**
 * Direct, fully-awaited server write for weapon upgrades (parts spent on a weapon).
 * Bypasses the flush queue entirely — waits for server confirmation before returning.
 * This prevents race conditions where refreshFromServer could overwrite local
 * weaponUpgrades with stale server data before the debounced flush completes.
 */
export const saveWeaponUpgrade = async (weaponId, newPartsSpent, newGearShardCount) => {
  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  // Cancel any stale pending flush — it would have captured pre-upgrade
  // weaponUpgrades and overwrite our direct write.
  clearPendingFlush();

  // Wait for any in-flight flush to complete before writing.
  let waitCount = 0;
  while (_flushInProgress && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  if (!_inventoryRecord) {
    const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No inventory record found');
    // Pick the record with the most items (same dedup logic)
    _inventoryRecord = records.reduce((best, current) => {
      if (!best) return current;
      const bestCount = Object.values(best)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      const currCount = Object.values(current)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      return currCount > bestCount ? current : best;
    }, null);
  }

  // Read current server data so we don't clobber other fields
  const current = _inventoryRecord;
  const serverWeaponUpgrades = current.weaponUpgrades || {};
  const serverConsumables = current.consumables || {};

  // NEVER downgrade parts spent — use max of requested and current server value
  const currentServerParts = serverWeaponUpgrades[weaponId] || 0;
  const finalPartsSpent = Math.max(currentServerParts, newPartsSpent);
  const currentServerShards = serverConsumables.GEAR_SHARD || 0;
  const finalShardCount = Math.max(currentServerShards, newGearShardCount);

  // Build the updated objects
  const updatedWeaponUpgrades = { ...serverWeaponUpgrades, [weaponId]: finalPartsSpent };
  const updatedConsumables = { ...serverConsumables, GEAR_SHARD: finalShardCount };

  // Single atomic server update — fully awaited
  await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
    weaponUpgrades: updatedWeaponUpgrades,
    consumables: updatedConsumables,
  });

  // Update the cached record so future reads are accurate
  _inventoryRecord = { ..._inventoryRecord, weaponUpgrades: updatedWeaponUpgrades, consumables: updatedConsumables };

  // Cancel any pending flush queued while we were writing
  clearPendingFlush();

  // Patch local cache ONLY from the confirmed server values
  patchPlayerData({
    weaponUpgrades: updatedWeaponUpgrades,
    consumables: updatedConsumables,
  });

  return { success: true };
};

/**
 * Direct, fully-awaited server write for GRANTING consumables (event rewards, etc.).
 * Atomically increments consumable quantities on the server, bypassing the
 * debounced flush queue. Prevents the empty-inventory safety check in
 * flushToServer from silently dropping granted consumables.
 *
 * @param {Record<string, number>} grants — map of consumableKey → quantity to add
 * @returns {Promise<{success: true, consumables: object}>}
 */
export const grantConsumables = async (grants) => {
  if (!grants || Object.keys(grants).length === 0) return { success: true, consumables: null };

  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  clearPendingFlush();

  let waitCount = 0;
  while (_flushInProgress && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  if (!_inventoryRecord) {
    const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No inventory record found');
    _inventoryRecord = records.reduce((best, current) => {
      if (!best) return current;
      const bestCount = Object.values(best)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      const currCount = Object.values(current)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      return currCount > bestCount ? current : best;
    }, null);
  }

  const serverConsumables = _inventoryRecord.consumables || {};
  const updatedConsumables = { ...serverConsumables };
  for (const [key, qty] of Object.entries(grants)) {
    updatedConsumables[key] = (updatedConsumables[key] || 0) + qty;
  }

  await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
    consumables: updatedConsumables,
  });

  _inventoryRecord = { ..._inventoryRecord, consumables: updatedConsumables };
  clearPendingFlush();
  patchPlayerData({ consumables: updatedConsumables });

  return { success: true, consumables: updatedConsumables };
};

/**
 * Direct, fully-awaited server write for consumable consumption.
 * Atomically decrements a consumable from the server inventory, bypassing
 * the debounced flush queue. Use this for "Use" actions on consumable items
 * (cash packs, CRYD packs, boosters) so the decrement persists immediately
 * and isn't lost to _skipInventoryFlush or a stale cache race.
 *
 * Returns { success: true } on completion, or throws on error.
 */
export const consumeConsumable = async (consumableKey) => {
  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  // Cancel any stale pending flush — it would have captured pre-use consumables
  // and overwrite our direct write.
  clearPendingFlush();

  // Wait for any in-flight flush to complete before writing.
  let waitCount = 0;
  while (_flushInProgress && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  if (!_inventoryRecord) {
    const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No inventory record found');
    _inventoryRecord = records.reduce((best, current) => {
      if (!best) return current;
      const bestCount = Object.values(best)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      const currCount = Object.values(current)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      return currCount > bestCount ? current : best;
    }, null);
  }

  const current = _inventoryRecord;
  const serverConsumables = current.consumables || {};
  const currentQty = serverConsumables[consumableKey] || 0;
  if (currentQty <= 0) throw new Error('Not enough consumables');

  const updatedConsumables = { ...serverConsumables };
  updatedConsumables[consumableKey] = currentQty - 1;
  if (updatedConsumables[consumableKey] <= 0) delete updatedConsumables[consumableKey];

  // Single atomic server update — fully awaited
  await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
    consumables: updatedConsumables,
  });

  // Update the cached record so future reads are accurate
  _inventoryRecord = { ..._inventoryRecord, consumables: updatedConsumables };

  // Cancel any pending flush queued while we were writing
  clearPendingFlush();

  // Patch local cache ONLY from the confirmed server values
  patchPlayerData({ consumables: updatedConsumables });

  return { success: true };
};

/**
 * Direct, fully-awaited server write for simple upgrades (vehicles/pets/power).
 * Bypasses the flush queue entirely — waits for server confirmation before returning.
 * Same pattern as saveWeaponUpgrade to prevent stale cache overwrites.
 */
export const saveSimpleUpgrade = async (itemId, newLevel) => {
  const user = await base44.auth.me();
  if (!user) throw new Error('Not authenticated');

  // Cancel any stale pending flush — it would have captured pre-upgrade
  // simpleUpgrades and overwrite our direct write.
  clearPendingFlush();

  // Wait for any in-flight flush to complete — a concurrent flushToServer could
  // be mid-write and overwrite our direct write. (simpleUpgrades is now stripped
  // from toInventoryPayload, but waiting ensures _inventoryRecord is current.)
  let waitCount = 0;
  while (_flushInProgress && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  if (!_inventoryRecord) {
    const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
    if (records.length === 0) throw new Error('No inventory record found');
    _inventoryRecord = records.reduce((best, current) => {
      if (!best) return current;
      const bestCount = Object.values(best)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      const currCount = Object.values(current)
        .filter(v => typeof v === 'object' && v !== null)
        .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
      return currCount > bestCount ? current : best;
    }, null);
  }

  const current = _inventoryRecord;
  const serverSimpleUpgrades = current.simpleUpgrades || {};
  const currentServerLevel = serverSimpleUpgrades[itemId] || 0;

  // NEVER downgrade — use the max of the requested level and what's already on
  // the server. This prevents stale local state from reverting a higher upgrade.
  const finalLevel = Math.max(currentServerLevel, newLevel);
  const updatedSimpleUpgrades = { ...serverSimpleUpgrades, [itemId]: finalLevel };

  await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
    simpleUpgrades: updatedSimpleUpgrades,
  });

  _inventoryRecord = { ..._inventoryRecord, simpleUpgrades: updatedSimpleUpgrades };

  // Cancel any pending flush that was queued while we were writing
  clearPendingFlush();

  patchPlayerData({
    simpleUpgrades: updatedSimpleUpgrades,
  });

  return { success: true, appliedLevel: finalLevel };
};

/**
 * Direct, fully-awaited server write for loadout slot changes (vehicle/pet/power).
 * Bypasses the debounced flush queue so equip changes persist immediately —
 * prevents navigation/refresh from reverting to the old loadout.
 */
let _loadoutSaveChain = Promise.resolve();

/**
 * Direct, fully-awaited server write for the ENTIRE loadout at once.
 * Used by preset load operations. Same chain as saveLoadoutSlot to prevent races.
 */
export const saveFullLoadout = async (loadout) => {
  const run = _loadoutSaveChain.then(async () => {
    const user = await base44.auth.me();
    if (!user) throw new Error('Not authenticated');

    let waitCount = 0;
    while (_flushInProgress && waitCount < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      waitCount++;
    }

    if (!_inventoryRecord) {
      const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
      if (records.length === 0) throw new Error('No inventory record found');
      _inventoryRecord = records.reduce((best, current) => {
        if (!best) return current;
        const bestCount = Object.values(best)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        const currCount = Object.values(current)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        return currCount > bestCount ? current : best;
      }, null);
    }

    const updatedLoadout = sanitizeLoadout(loadout || {});

    await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
      loadout: updatedLoadout,
    });

    _inventoryRecord = { ..._inventoryRecord, loadout: updatedLoadout };
    clearPendingFlush();
    patchPlayerData({ loadout: updatedLoadout });
    return { success: true };
  }).catch(err => { throw err; });

  _loadoutSaveChain = run.catch(() => {});
  return run;
};

export const saveLoadoutSlot = async (slot, itemId) => {
  // Chain loadout saves sequentially so rapid equip changes don't race
  // (two concurrent saves could both read the same _inventoryRecord.loadout
  // and the second write would clobber the first).
  const run = _loadoutSaveChain.then(async () => {
    const user = await base44.auth.me();
    if (!user) throw new Error('Not authenticated');

    // Wait for any in-flight flush to complete before reading/writing.
    let waitCount = 0;
    while (_flushInProgress && waitCount < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      waitCount++;
    }

    if (!_inventoryRecord) {
      const records = await base44.entities.PlayerInventory.filter({ user_id: user.id });
      if (records.length === 0) throw new Error('No inventory record found');
      _inventoryRecord = records.reduce((best, current) => {
        if (!best) return current;
        const bestCount = Object.values(best)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        const currCount = Object.values(current)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        return currCount > bestCount ? current : best;
      }, null);
    }

    const currentLoadout = sanitizeLoadout(_inventoryRecord.loadout || {});
    const updatedLoadout = { ...currentLoadout, [slot]: itemId };

    await base44.entities.PlayerInventory.update(_inventoryRecord.id, {
      loadout: updatedLoadout,
    });

    _inventoryRecord = { ..._inventoryRecord, loadout: updatedLoadout };

    // Cancel any pending flush that was queued while we were writing
    clearPendingFlush();

    patchPlayerData({
      loadout: updatedLoadout,
    });

    return { success: true };
  }).catch(err => { throw err; });

  // Keep the chain going even if this call fails
  _loadoutSaveChain = run.catch(() => {});

  return run;
};

/**
 * Immediate — called whenever fund data changes.
 */
export const syncFundToServer = async (fundData) => {
  const pf = fundData.playerFund;
  if (!pf) return;

  try {
    const user = await base44.auth.me();
    if (!user) return;

    const payload = toFundPayload(pf, user.id);

    if (_fundRecord) {
      await base44.entities.PlayerFund.update(_fundRecord.id, payload);
    } else {
      const records = await base44.entities.PlayerFund.filter({ user_id: user.id });
      if (records.length > 0) {
        _fundRecord = records[0];
        await base44.entities.PlayerFund.update(_fundRecord.id, payload);
      } else {
        _fundRecord = await base44.entities.PlayerFund.create(payload);
      }
    }

    // Cross-sync fund_members_owned into player in-memory cache
    // Use Math.max to never downgrade the authoritative value
    if (pf.fundMembers != null) {
      const current = getCurrentPlayer();
      patchPlayerData({ fundMembersOwned: Math.max(pf.fundMembers, current.fundMembersOwned || 0) });
    }
  } catch (err) {
    console.warn('[Sync] syncFundToServer failed:', err?.message || err);
  }
};