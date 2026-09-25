/**
 * storeStorage.js — 100% server-backed. NO localStorage.
 *
 * Owned items are tracked in the player's inventory (in-memory cache),
 * which is backed by the PlayerInventory entity on the server.
 *
 * This module provides a backward-compatible array-based interface
 * (weapons: [], vehicles: [], etc.) on top of the map-based inventory
 * (weapons: { itemId: qty }).
 */

import { getCurrentPlayer } from '@/lib/playerMemory';

const getOwnedFromInventory = () => {
  const player = getCurrentPlayer();
  const inv = player.inventory || {};
  return {
    weapons: Object.keys(inv.weapons || {}).filter(id => (inv.weapons[id] || 0) > 0),
    vehicles: Object.keys(inv.vehicles || {}).filter(id => (inv.vehicles[id] || 0) > 0),
    people: Object.keys(inv.power || {}).filter(id => (inv.power[id] || 0) > 0),
    pets: Object.keys(inv.pets || {}).filter(id => (inv.pets[id] || 0) > 0)
  };
};

export const getOwnedItems = () => getOwnedFromInventory();

// Saving is a no-op — inventory is managed via playerStorage.addToInventory
// and synced to the server automatically.
export const saveOwnedItems = (owned) => {
  console.warn('[storeStorage] saveOwnedItems is deprecated — use playerStorage.addToInventory instead');
  return owned;
};

export const addOwnedItem = (category, itemId) => {
  // Delegate to playerStorage which handles server sync
  // We import lazily to avoid circular dependency at module load time
  import('./playerStorage').then(({ addToInventory }) => {
    addToInventory(category, itemId, 1);
  });
  return getOwnedFromInventory();
};

export const isItemOwned = (category, itemId) => {
  const owned = getOwnedFromInventory();
  const cat = category === 'people' ? 'people' : category;
  return owned[cat]?.includes(itemId) || false;
};