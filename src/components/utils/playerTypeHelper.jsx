// Classifies the player into a bot-equivalent type based on their stats

export const PLAYER_TYPE_COLORS = {
  Whale:   "text-purple-400",
  Strong:  "text-red-400",
  Average: "text-slate-400",
  Weak:    "text-green-400",
  Noob:    "text-blue-400",
};

/**
 * Determine player type mirroring bot type logic.
 * Uses level, total power, win rate, and fund size as signals.
 */
export function getPlayerType(playerData) {
  if (!playerData) return "Average";

  const level = playerData.level || 1;
  const totalWins = playerData.totalTradeWarWins || 0;
  const totalLosses = playerData.totalTradeWarLosses || 0;
  const totalFights = totalWins + totalLosses;
  const winRate = totalFights > 10 ? totalWins / totalFights : 0.5;
  const fundSize = playerData.fundMembersOwned || 0;

  // Easier whale status: reduced thresholds
  let score = 0;
  score += Math.min(level / 8, 10);          // up to 10 pts from level (lv80 = max)
  score += winRate * 8;                      // up to 8 pts from win rate (more weight)
  score += Math.min(fundSize / 15, 6);       // up to 6 pts from fund (90 members = max)

  if (score >= 14) return "Whale";  // Reduced from 16
  if (score >= 10) return "Strong"; // Reduced from 11
  if (score >= 6)  return "Average";
  if (score >= 3)  return "Weak";
  return "Noob";
}