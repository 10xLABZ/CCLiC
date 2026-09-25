import { getPlayerData, savePlayerData } from '../utils/playerStorage';
import { applyServerReward } from '@/lib/playerServerSync';
import { generateCityBots, computeCombatStats } from '../tradewars/botGenerator';

export const generateOfflineAttacks = () => {
  const player = getPlayerData();
  const now = Date.now();
  
  // SHIELD PROTECTION: Skip if shield active
  if (now < (player.shieldActiveUntil || 0)) {
    savePlayerData({ lastActiveTimestamp: now });
    return null;
  }
  
  const lastActive = player.lastActiveTimestamp || now;
  const offlineMinutes = Math.floor((now - lastActive) / 60000);

  // Determine fight count based on offline duration
  let fightCount = 0;
  if (offlineMinutes < 10) {
    fightCount = 0;
  } else if (offlineMinutes >= 10 && offlineMinutes < 60) {
    fightCount = Math.random() < 0.5 ? 1 : 0;
  } else if (offlineMinutes >= 60 && offlineMinutes < 240) {
    fightCount = Math.floor(Math.random() * 3) + 1; // 1-3
  } else if (offlineMinutes >= 240 && offlineMinutes < 720) {
    fightCount = Math.floor(Math.random() * 3) + 2; // 2-4
  } else {
    fightCount = Math.floor(Math.random() * 3) + 3; // 3-5
  }

  if (fightCount === 0) return null;

  // Cap at 5 max
  fightCount = Math.min(fightCount, 5);

  // Double attack: 20% chance one fight becomes double (only once per login)
  const doubleAttackChance = 0.20;
  let hasDouble = false;
  if (Math.random() < doubleAttackChance && fightCount < 5) {
    fightCount += 1;
    hasDouble = true;
  }

  // Cap again after double
  fightCount = Math.min(fightCount, 5);
  
  // Bonus powerful attacker if offline > 3 hours (50% chance)
  let addPowerfulBot = false;
  if (offlineMinutes >= 180 && Math.random() < 0.5 && fightCount < 5) {
    addPowerfulBot = true;
    fightCount += 1;
  }

  // Compute player's REAL combat power from their equipped gear + level
  const realPlayerStats = computeCombatStats({
    level: player.level || 1,
    fundMembers: player.fundMembersOwned || 0,
    equippedLoadout: player.loadout || {}
  });
  const realPlayerPower = realPlayerStats.pwr || ((player.level || 1) * 2 + 10);

  const battles = [];
  for (let i = 0; i < fightCount; i++) {
    // If this is the last bot and addPowerfulBot is true, generate a stronger bot
    const isLastAndPowerful = addPowerfulBot && (i === fightCount - 1);
    const adjustedLevel = isLastAndPowerful ? Math.min(100, (Number(player.level) || 1) + 3) : Number(player.level) || 1;
    
    const bots = generateCityBots(
      adjustedLevel,
      player.locationCity || "Boston",
      player.locationState || "Massachusetts",
      1,
      now + i * 1000
    );

    if (bots && bots.length > 0) {
      let attacker = bots[0];
      
      // Boost power for the powerful bot
      if (isLastAndPowerful) {
        attacker.atk = (Number(attacker.atk) || 0) * 1.3;
        attacker.def = (Number(attacker.def) || 0) * 1.3;
        attacker.fundMembers = Math.ceil((Number(attacker.fundMembers) || 0) * 1.2);
      }

      // Ensure valid bot data
      attacker.level = Number(attacker.level) || 1;
      attacker.name = attacker.name || "Unknown";
      attacker.type = attacker.type || "Average";
      attacker.fundMembers = Number(attacker.fundMembers) || attacker.level + Math.floor(Math.random() * 6) + 1;

      if (!attacker.equippedLoadout && attacker.equipped) {
        attacker.equippedLoadout = attacker.equipped;
      }

      attacker.atk = Number(attacker.atk) || 0;
      attacker.def = Number(attacker.def) || 0;
      attacker.fundPower = Number(attacker.fundPower) || Math.round((1 + (attacker.fundMembers * 0.05)) * 100) / 100;

      // Pre-determine battle outcome FIRST, then set bot stats to match.
      // This ensures displayed stats always make logical sense:
      //   Bot wins (player defeated): bot is 102-123% of player power
      //   Bot loses (player defends): bot is 75-95% of player power
      // Stats are locked here — revenge fights use these exact same numbers.
      const playerDefends = Math.random() < 0.45; // 45% player defends, 55% player gets hit
      const powerFactor = playerDefends
        ? 0.75 + Math.random() * 0.20   // 75–95%: bot weaker, player wins
        : 1.02 + Math.random() * 0.21;  // 102–123%: bot stronger, bot wins

      const targetBotPower = realPlayerPower * powerFactor;
      const currentBotPower = (attacker.atk || 0) + (attacker.def || 0);
      if (currentBotPower > 0) {
        const scaleFactor = targetBotPower / currentBotPower;
        attacker.atk = Math.round(attacker.atk * scaleFactor * 100) / 100;
        attacker.def = Math.round(attacker.def * scaleFactor * 100) / 100;
      } else {
        attacker.atk = Math.round(targetBotPower * 0.55 * 100) / 100;
        attacker.def = Math.round(targetBotPower * 0.45 * 100) / 100;
      }

      attacker.pwr = Math.round((attacker.atk + attacker.def + attacker.fundPower) * 100) / 100;
      attacker.totalPower = attacker.pwr;

      // Resolve with pre-determined outcome
      const result = resolveOfflineBattle(player, attacker, realPlayerPower, playerDefends);
      battles.push({ attacker, result });
    }
  }

  // Apply cumulative results
  let totalCashDelta = 0;
  let totalRespectDelta = 0;
  let totalWins = 0;
  let totalLosses = 0;
  const newDefenceLog = player.defenceLog || [];

  battles.forEach(({ attacker, result }, index) => {
    totalCashDelta += result.cashDelta;
    totalRespectDelta += result.respectDelta;
    if (result.outcome === 'WIN') totalWins++;
    else totalLosses++;

    // Add to defence log
    newDefenceLog.push({
      bot: attacker,
      outcome: result.outcome,
      timestamp: now - ((battles.length - index - 1) * 60000),
      revengeAvailable: true,
      isOffline: true,
      revengeAttempts: 0,
      index: newDefenceLog.length
    });
  });

  // Keep only last 15 entries
  const trimmedLog = newDefenceLog.slice(-15);

  // Update in-memory cache for immediate UI display — defenceLog + lastActive
  // only. Cash/respect/W/L are SERVER-AUTHORITATIVE and go through applyServerReward
  // below so they actually persist (savePlayerData strips them).
  const updatedPlayer = {
    ...player,
    defenceLog: trimmedLog,
    lastActiveTimestamp: now,
  };

  savePlayerData(updatedPlayer);

  // Route resource + stat deltas through applyGameReward so they persist
  // server-side. Without this, savePlayerData's SERVER_AUTHORITATIVE_FIELDS
  // stripping causes cash/respect/W/L to be lost on reload.
  applyServerReward({
    cash_delta: totalCashDelta,
    respect_delta: totalRespectDelta,
    stat_fields: {
      total_trade_war_wins: totalWins,
      total_trade_war_losses: totalLosses,
    },
    reason: 'offline_attack',
  }).catch(() => {});

  return {
    battles,
    totalCashDelta,
    totalRespectDelta,
    offlineMinutes
  };
};

const resolveOfflineBattle = (player, attacker, realPlayerPower, forcedWin) => {
  // forcedWin is pre-determined so bot stats always match the outcome shown in the log
  const isWin = forcedWin !== undefined ? forcedWin : Math.random() < 0.45;

  let cashDelta = 0;
  let respectDelta = 0;

  const baseCash = 50 + (attacker.level * 15);
  const baseRespect = attacker.level * 2;

  if (isWin) {
    const cashReward = Math.round(baseCash + (Math.random() * baseCash * 0.3));
    cashDelta = cashReward;
    respectDelta = Math.round(baseRespect);
  } else {
    // Loss: same range as win amounts (full baseCash range, capped at 10% of cash)
    const cashLoss = Math.round(baseCash + (Math.random() * baseCash * 0.3));
    const maxLoss = Math.round(player.cash * 0.10);
    cashDelta = -Math.min(cashLoss, maxLoss);
    respectDelta = -Math.round(baseRespect);
  }

  return {
    outcome: isWin ? 'WIN' : 'LOSS',
    cashDelta,
    respectDelta
  };
};