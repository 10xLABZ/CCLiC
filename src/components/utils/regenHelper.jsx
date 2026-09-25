/**
 * regenHelper — FULLY NEUTERED. NO localStorage.
 *
 * All client-side regen math has been ERADICATED.
 * The server is the single source of truth for energy, stamina, and op_cover.
 *
 * These functions remain as no-op shims so existing callers don't break,
 * but they do ZERO client-side resource manipulation.
 */

import { getCurrentPlayer } from '@/lib/playerMemory';

export const STAMINA_REGEN_MS = 180000;
export const ENERGY_REGEN_MS  = 180000;
export const OP_COVER_REGEN_MS = 180000;

/**
 * Returns current resource values from the in-memory cache.
 * NO local regen math. NO timestamp manipulation. Pure read.
 */
export const calcCurrentResources = (player) => {
  const p = player || getCurrentPlayer();
  return {
    stamina: p?.stamina ?? 100,
    energy:  p?.energy  ?? 100,
    opCover: p?.opCover ?? 100,
  };
};

/**
 * Returns player data as-is from the in-memory cache.
 * NO regen math, NO writes, NO timestamp advances.
 * The server is the ONLY entity that changes resource values.
 */
export const updateRegenStats = () => {
  return getCurrentPlayer();
};

/**
 * Returns null — no local time-to-full calculation.
 * The server provides values; the HUD displays them.
 */
export const getTimeUntilFull = () => {
  return null;
};