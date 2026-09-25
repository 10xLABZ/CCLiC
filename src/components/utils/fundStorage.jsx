/**
 * fundStorage.js — 100% server-backed. NO localStorage.
 *
 * Fund data is stored in the in-memory cache (playerMemory.js) and synced
 * to the PlayerFund entity on the server.
 */

import { getCurrentPlayer } from '@/lib/playerMemory';
import { getCurrentFund, setCurrentFund, patchFundData } from '@/lib/playerMemory';
import { syncFundToServer } from '@/lib/playerServerSync';

const generateBotFunds = () => {
  const funds = [];
  const states = [
    "California", "Texas", "New York", "Florida", "Illinois",
    "Pennsylvania", "Ohio", "Georgia", "North Carolina", "Michigan",
    "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts",
    "Tennessee", "Indiana", "Missouri", "Maryland", "Wisconsin"
  ];

  const fundNames = [
    "Apex Capital", "Titan Ventures", "Sovereign Fund", "Prime Holdings",
    "Global Equity", "Elite Partners", "Quantum Assets", "Shadow Capital",
    "Empire Investments", "Pinnacle Group", "Diamond Fund", "Crown Capital",
    "Fortress Holdings", "Phoenix Ventures", "Oracle Capital", "Legacy Fund",
    "Dynasty Holdings", "Prestige Capital", "Vanguard Group", "Citadel Fund"
  ];

  const ceoNames = [
    "Michael Sterling", "Sarah Chen", "Robert Khan", "Jennifer Brooks",
    "David Park", "Amanda Walsh", "James Liu", "Michelle Rodriguez",
    "Christopher Lee", "Elizabeth Taylor", "Daniel Martinez", "Laura Kim",
    "Thomas Anderson", "Jessica White", "Ryan Thompson", "Nicole Johnson",
    "Kevin Brown", "Stephanie Davis", "Andrew Wilson", "Rachel Green"
  ];

  for (let rank = 1; rank <= 100; rank++) {
    const power = Math.round(250 + (Math.pow(101 - rank, 2) * 0.5));
    const fundMembers = Math.round(power * 0.7);
    const respect = (power - fundMembers) * 1000;

    const nameIndex = (rank - 1) % fundNames.length;
    const ceoIndex = (rank - 1) % ceoNames.length;
    const stateIndex = Math.floor(Math.random() * states.length);

    let fundName = fundNames[nameIndex];
    if (rank > fundNames.length) {
      fundName = `${fundName} ${String.fromCharCode(65 + Math.floor((rank - 1) / fundNames.length))}`;
    }

    const imageId = `fund_${String((rank % 20) + 1).padStart(2, '0')}`;

    funds.push({
      id: `bot_fund_${rank}`,
      fundName,
      ceoName: ceoNames[ceoIndex],
      hqState: states[stateIndex],
      hqCity: "Major City",
      fundMembers,
      respect,
      fundPower: power,
      rank,
      imageId
    });
  }

  return funds.sort((a, b) => b.fundPower - a.fundPower);
};

export const getFundData = () => {
  const fundData = getCurrentFund();
  if (!fundData.botFunds || fundData.botFunds.length === 0) {
    patchFundData({ botFunds: generateBotFunds() });
  }
  return getCurrentFund();
};

export const saveFundData = (data) => {
  setCurrentFund(data);
  syncFundToServer(data).catch(console.error);
  return data;
};

export const initializePlayerFund = (username, currentState, currentCity) => {
  const fundData = getFundData();

  if (!fundData.playerFund) {
    const states = ["California", "New York", "Texas", "Florida", "Illinois"];
    const defaultState = currentState || states[Math.floor(Math.random() * states.length)];
    const defaultCity = currentCity || "Capital City";

    fundData.playerFund = {
      fundName: `${username || "Player"} Capital`,
      hqState: defaultState,
      hqCity: defaultCity,
      ceoName: username || "Player",
      fundMembers: 0,
      fundPower: 0,
      imageId: "fund_01",
      createdAt: Date.now()
    };

    saveFundData(fundData);
  }

  return fundData.playerFund;
};

export const calculateFundPower = (fundMembers, respect) => {
  return fundMembers + Math.floor(respect / 1000);
};

export const calculateFundBonus = (fundMembers) => {
  return fundMembers * 0.001;
};

export const calculateTradingRevenueBonus = (fundMembers) => {
  return fundMembers * 0.0005;
};

export const getMemberCostCash = (currentMembers) => {
  const baseCost = 25000;
  if (currentMembers < 5) return baseCost;
  if (currentMembers < 10) return 50000;
  if (currentMembers < 20) return 100000;
  if (currentMembers < 50) return 250000;
  if (currentMembers < 100) return 500000;
  return 1000000;
};

export const getMemberCostCrypto = () => {
  return 5;
};

export const getFundMilestoneBonusPct = (fundMembers) => {
  return Math.floor((fundMembers || 0) / 50) * 0.25;
};

export const getFundMilestoneInfo = (fundMembers) => {
  const members = fundMembers || 0;
  const currentTier = Math.floor(members / 50);
  const currentBonusPct = currentTier * 0.25;
  const nextMilestone = (currentTier + 1) * 50;
  const progressPct = ((members % 50) / 50) * 100;
  const nextBonusPct = (currentTier + 1) * 0.25;
  return { currentTier, currentBonusPct, nextMilestone, membersNeeded: nextMilestone - members, nextBonusPct, progressPct };
};

export const purchaseFundMember = (currency) => {
  const player = getCurrentPlayer();
  const fundData = getFundData();

  if (!fundData.playerFund) {
    initializePlayerFund(player.username);
  }

  const currentMembers = fundData.playerFund.fundMembers;

  if (currency === 'cash') {
    const cost = getMemberCostCash(currentMembers);
    if (player.cash < cost) {
      return { success: false, error: 'Insufficient cash' };
    }
  } else if (currency === 'crypto') {
    const cost = getMemberCostCrypto();
    if (player.crypto < cost) {
      return { success: false, error: 'Insufficient crypto' };
    }
  }

  fundData.playerFund.fundMembers += 1;
  fundData.playerFund.fundPower = calculateFundPower(
    fundData.playerFund.fundMembers,
    player.respect
  );

  saveFundData(fundData);
  return { success: true, fundData };
};

export const getPlayerRank = (playerPower, botFunds) => {
  if (playerPower < botFunds[botFunds.length - 1].fundPower) {
    return {
      ranked: false,
      rank: null,
      nextTarget: botFunds[botFunds.length - 1]
    };
  }

  let rank = 1;
  for (const bot of botFunds) {
    if (bot.fundPower > playerPower) {
      rank++;
    }
  }

  return {
    ranked: true,
    rank: Math.min(rank, 100),
    nextTarget: rank > 1 ? botFunds[rank - 2] : null
  };
};