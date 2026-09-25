// Sabotage system helper
// 20 sabotages max, regenerate 1 per 45 minutes

const SABOTAGE_MAX = 20;
const SABOTAGE_REGEN_MS = 45 * 60 * 1000; // 45 minutes

export const getSabotageData = (playerData) => {
  const now = Date.now();
  let remaining = playerData.sabotagesRemaining ?? SABOTAGE_MAX;
  let lastRegen = playerData.lastSabotageRegenTimestamp ?? now;

  // Calculate how many have regenerated since lastRegen
  const elapsed = now - lastRegen;
  const regenCount = Math.floor(elapsed / SABOTAGE_REGEN_MS);

  if (regenCount > 0 && remaining < SABOTAGE_MAX) {
    remaining = Math.min(SABOTAGE_MAX, remaining + regenCount);
    lastRegen = lastRegen + regenCount * SABOTAGE_REGEN_MS;
  }

  // Time until next regen
  const timeUntilNext = remaining < SABOTAGE_MAX ? SABOTAGE_REGEN_MS - (now - lastRegen) : null;

  return { remaining, lastRegen, timeUntilNext };
};

export const formatSabotageTimer = (ms) => {
  if (!ms || ms <= 0) return '00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// XP by tier — fixed values, no randomness
export const getSabotageXP = (tier) => {
  const xpByTier = { "Street": 2, "Hustle": 3, "Scheme": 6, "High Stakes": 9 };
  return xpByTier[tier] || 3;
};

// Heat gain roll: +1=60%, +2=30%, +3=10% (sabotage ADDS heat to cool down)
export const rollHeatReduction = () => {
  const roll = Math.random();
  if (roll < 0.60) return 1;
  if (roll < 0.90) return 2;
  return 3;
};