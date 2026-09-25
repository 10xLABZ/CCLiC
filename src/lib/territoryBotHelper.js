/**
 * Generates deterministic, varied ATK / DEF / Fund stats for MO bot slots.
 * Uses a simple string hash of the user_id so each bot always gets the same
 * stats (no random drift on re-render), but different bots look distinct.
 */

const hashString = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  // Normalise to [0, 1]
  return (Math.abs(h) % 10000) / 10000;
};

/**
 * @param {object} slot  – TerritorySlot record (bot)
 * @returns {{ atk: number, def: number, fundPower: number, pwr: number }}
 */
export const computeTerritoryBotStats = (slot) => {
  const basePower = slot.player_power || 10;
  const seed = hashString(slot.user_id || `bot_${slot.slot_number}`);

  // ATK must be 80–107% higher than DEF (i.e. ATK = DEF * 1.80–2.07).
  // atkBias = ratio/(1+ratio): at 1.80 => 0.643, at 2.07 => 0.674
  const atkBias = 0.643 + seed * 0.031;
  const atk = Math.round(basePower * atkBias * 100) / 100;
  const def = Math.round((basePower - atk) * 100) / 100;
  const pwr = Math.round((atk + def) * 100) / 100;

  return { atk, def, pwr };
};