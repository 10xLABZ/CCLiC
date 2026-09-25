/**
 * playerStorage.js — COMPATIBILITY LAYER.
 *
 * 100% SERVER-BACKED. NO localStorage. NO local persistence.
 *
 * This file re-exports and wraps functions from the new server-authoritative
 * modules (playerMemory.js, playerServerSync.js, playerUtils.js).
 *
 * Existing imports like `import { getPlayerData } from './playerStorage'`
 * continue to work — they now read from the in-memory cache instead of localStorage.
 */

import { getCurrentPlayer, setPlayerData, patchPlayerData, setPendingLevelUp } from '@/lib/playerMemory';
import { flushToServer, applyServerReward, equipCosmetic, saveLoadoutSlot, saveFullLoadout } from '@/lib/playerServerSync';
import {
  DEFAULT_PLAYER, SERVER_AUTHORITATIVE_FIELDS,
  getXPRequiredForLevel, recalcLevelFromTotalXP, processLevelUp, getReputationTitle
} from '@/lib/playerUtils';
import { getResearchBonuses, applyBonus } from '@/lib/researchHelper';

// Re-export pure functions
export { getXPRequiredForLevel, recalcLevelFromTotalXP, processLevelUp, getReputationTitle };

/**
 * Synchronous read from in-memory cache. Replaces old localStorage read.
 */
export const getPlayerData = () => getCurrentPlayer();

/**
 * Update in-memory cache + flush non-resource fields to server.
 * Server-authoritative fields (cash, crypto, energy, etc.) are STRIPPED —
 * they can only be changed via applyServerReward (applyGameReward backend).
 */
export const savePlayerData = (data) => {
  const current = getCurrentPlayer();
  const safeData = { ...data };
  for (const field of SERVER_AUTHORITATIVE_FIELDS) {
    delete safeData[field];
  }
  const updated = { ...current, ...safeData };
  setPlayerData(updated);
  flushToServer(updated);
  return updated;
};

/**
 * DEPRECATED. Do NOT use.
 * All resource changes must go through applyServerReward().
 */
export const consumeRegenResource = (resourceKey, newValue) => {
  console.warn('[consumeRegenResource] DEPRECATED: use applyServerReward() instead.');
};

// Normalize category names to internal inventory keys
const normalizeInvCategory = (category) => {
  if (category === 'people') return 'power';
  return category;
};

export const addToInventory = (category, itemId, quantity = 1) => {
  const player = getPlayerData();
  const cat = normalizeInvCategory(category);

  // consumables are stored at top level, not inside inventory
  if (cat === 'consumables') {
    const consumables = { ...(player.consumables || {}) };
    consumables[itemId] = (consumables[itemId] || 0) + quantity;
    return savePlayerData({ consumables });
  }

  if (!player.inventory[cat]) {
    player.inventory[cat] = {};
  }
  player.inventory[cat][itemId] = (player.inventory[cat][itemId] || 0) + quantity;
  return savePlayerData(player);
};

export const getInventoryQty = (category, itemId) => {
  const player = getPlayerData();
  const cat = normalizeInvCategory(category);

  if (cat === 'consumables') {
    return player.consumables?.[itemId] || 0;
  }

  return player.inventory?.[cat]?.[itemId] || 0;
};

export const getEquippedCount = (category, itemId) => {
  const player = getPlayerData();
  const loadout = player.loadout || {};
  let count = 0;

  if (category === 'firearms') {
    if (loadout.weapon1 === itemId) count++;
    if (loadout.weapon2 === itemId) count++;
  } else if (category === 'weapons') {
    if (loadout.weapon3 === itemId) count++;
    if (loadout.weapon4 === itemId) count++;
  } else if (category === 'vehicles') {
    if (loadout.vehicle === itemId) count++;
  } else if (category === 'power' || category === 'people') {
    if (loadout.power === itemId) count++;
  } else if (category === 'pets') {
    if (loadout.pet === itemId) count++;
  }

  return count;
};

export const canEquipItem = (category, itemId) => {
  const ownedQty = getInventoryQty(category, itemId);
  const equippedCount = getEquippedCount(category, itemId);
  return equippedCount < ownedQty;
};

/**
 * Equips an item into a loadout slot.
 * ALL slots (weapons, vehicle, pet, power) use a direct awaited server write
 * (saveLoadoutSlot) to guarantee persistence. loadout is stripped from the
 * debounced flushToServer payload, so this is the ONLY path that writes loadout.
 */
export const updateLoadout = (slot, itemId) => {
  const player = getPlayerData();
  if (!player.loadout) player.loadout = {};
  player.loadout[slot] = itemId;

  // Patch local cache immediately for responsive UI, then fire-and-forget the
  // direct server save. Callers that need blocking saves (SimpleUpgradeModal,
  // InventoryPage handleEquipGear) await saveLoadoutSlot directly.
  const updated = { ...player };
  setPlayerData(updated);
  saveLoadoutSlot(slot, itemId).catch(err => {
    console.error('[updateLoadout] saveLoadoutSlot failed:', err);
  });
  return updated;
};

export { saveLoadoutSlot, saveFullLoadout };

export const equipAvatar = async (avatarId) => {
  const defaultAvatars = [
    'avatar_male_01', 'avatar_male_02', 'avatar_male_03', 'avatar_male_04',
    'avatar_female_01', 'avatar_female_02', 'avatar_female_03', 'avatar_female_04'
  ];

  if (!defaultAvatars.includes(avatarId)) {
    const ownedQty = getInventoryQty('avatars', avatarId);
    if (ownedQty < 1) {
      return { success: false, message: "You don't own this avatar yet." };
    }
  }

  // Direct server update — no full-profile flush, no race condition
  await equipCosmetic('avatar', avatarId);
  return { success: true };
};

export const equipScene = async (sceneId) => {
  const defaultScenes = ['scene_default_01', 'scene_default_02', 'scene_default_03'];

  if (!defaultScenes.includes(sceneId)) {
    const ownedQty = getInventoryQty('scenes', sceneId);
    if (ownedQty < 1) {
      return { success: false, message: "You don't own this scene yet." };
    }
  }

  await equipCosmetic('scene', sceneId);
  return { success: true };
};

export const equipTheme = async (themeId) => {
  const defaultThemes = ['theme_001_rusty_hotness'];

  if (!defaultThemes.includes(themeId)) {
    const ownedQty = getInventoryQty('themes', themeId);
    if (ownedQty < 1) {
      return { success: false, message: "You don't own this theme yet." };
    }
  }

  await equipCosmetic('theme', themeId);
  return { success: true };
};

export const updateEquipped = (slot, item) => {
  const player = getPlayerData();
  player.equipped[slot] = item;
  return savePlayerData(player);
};

export const addXP = (amount) => {
  const player = getPlayerData();
  const oldLevel = parseInt(player.level) || 1;
  // Apply research XP bonus
  const rb = getResearchBonuses(player);
  const boostedAmount = applyBonus(parseInt(amount), rb.xp);

  // Fire-and-forget server update — server is authoritative for XP/level
  applyServerReward({ xp_delta: boostedAmount, reason: 'xp_gain' }).then(result => {
    if (result?.new_level != null && result.new_level > oldLevel) {
      const levelsGained = [];
      for (let i = oldLevel + 1; i <= result.new_level; i++) levelsGained.push(i);
      if (levelsGained.length > 0) {
        setPendingLevelUp(levelsGained);
      }
    }
  }).catch(() => {});

  return getPlayerData();
};