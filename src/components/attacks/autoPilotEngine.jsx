import { savePlayerData, getPlayerData } from "../utils/playerStorage";
import { computeCombatStats } from "../tradewars/botGenerator";
import { processLevelUp } from "../utils/playerStorage";

const getAutoPilotPenalty = (heat) => {
  if (heat >= 85) return 0.15;
  if (heat >= 70) return 0.12;
  if (heat >= 50) return 0.08;
  return 0.05;
};

export const resolveAutoPilot = (attacker, playerData) => {
  // Ensure player data has safe defaults
  const safePlayerData = {
    level: Number(playerData.level) || 1,
    fundMembersOwned: Number(playerData.fundMembersOwned) || 0,
    loadout: playerData.loadout || {},
    cash: Number(playerData.cash) || 0,
    respect: Number(playerData.respect) || 0,
    currentXP: Number(playerData.currentXP) || 0,
    heat: Number(playerData.heat) || 0,
    stamina: Number(playerData.stamina) || 100,
    totalTradeWarWins: Number(playerData.totalTradeWarWins) || 0,
    totalTradeWarLosses: Number(playerData.totalTradeWarLosses) || 0,
    tradeWarsWonToday: Number(playerData.tradeWarsWonToday) || 0
  };

  // Compute player stats
  const playerStats = computeCombatStats({
    level: safePlayerData.level,
    fundMembers: safePlayerData.fundMembersOwned,
    equipped: safePlayerData.loadout
  });

  // Apply auto-pilot penalty
  const penalty = getAutoPilotPenalty(safePlayerData.heat);
  const playerEffectivePower = playerStats.pwr * (1 - penalty);

  // Bot power (ensure safe number)
  const botPower = Number(attacker.pwr || attacker.totalPower) || 10;
  const botLevel = Number(attacker.level) || 1;

  // Simple win probability based on power ratio
  const playerAdvantage = playerEffectivePower / (playerEffectivePower + botPower);
  const playerWins = Math.random() < playerAdvantage;

  // Base amounts for defense fight (live attack)
  const baseCash = 120;
  const baseRespect = 8;
  const baseXP = 20;

  let result = {
    outcome: playerWins ? 'WIN' : 'LOSS',
    cashDelta: 0,
    respectDelta: 0,
    staminaDelta: 0, // NO STAMINA COST FOR LIVE ATTACK DEFENSE
    xpGain: 0
  };

  if (playerWins) {
    // Win rewards (defense successful)
    result.cashDelta = Math.round(baseCash * (0.85 + Math.random() * 0.3));
    result.respectDelta = Math.round(baseRespect * (0.85 + Math.random() * 0.3));
    result.xpGain = Math.round(baseXP * (0.85 + Math.random() * 0.3));
  } else {
    // Loss penalties (but still get some XP for defending)
    result.cashDelta = -Math.round(baseCash * (0.60 + Math.random() * 0.4));
    result.respectDelta = -Math.round(baseRespect * (0.25 + Math.random() * 0.35));
    result.xpGain = Math.round(baseXP * 0.25); // Small XP for trying
  }

  // Ensure all deltas are valid numbers
  result.cashDelta = Number(result.cashDelta) || 0;
  result.respectDelta = Number(result.respectDelta) || 0;
  result.xpGain = Number(result.xpGain) || 0;
  result.staminaDelta = 0; // Always 0 for live attacks

  // Log to defence log
  const defenceLog = playerData.defenceLog || [];
  defenceLog.push({
    bot: attacker,
    outcome: playerWins ? 'WIN' : 'LOSS',
    timestamp: Date.now()
  });

  // Update player data with safe calculations
  let updatedData = {
    ...playerData,
    cash: Math.max(0, safePlayerData.cash + result.cashDelta),
    respect: Math.max(0, safePlayerData.respect + result.respectDelta),
    stamina: safePlayerData.stamina, // No change for live attack
    currentXP: safePlayerData.currentXP + result.xpGain,
    totalTradeWarWins: safePlayerData.totalTradeWarWins + (playerWins ? 1 : 0),
    totalTradeWarLosses: safePlayerData.totalTradeWarLosses + (playerWins ? 0 : 1),
    tradeWarsWonToday: safePlayerData.tradeWarsWonToday + (playerWins ? 1 : 0),
    defenceLog: defenceLog
  };

  // Process level ups
  updatedData = processLevelUp(updatedData);
  
  // Save to storage
  const updated = savePlayerData(updatedData);

  return {
    ...result,
    updatedPlayer: updated
  };
};