// Trading Engine Logic
import { getResearchBonuses, applyBonus } from '@/lib/researchHelper';

const ASSET_NAMES = [
  "ALPN", "TERA", "NVIS", "AMRT", "GNTL", "MTRX", "SFTL", "ADVN", "VYNT", "RAZR",
  "BTC", "ETH", "SOL", "DOGE", "XRP", "ES", "NQ", "YM", "CL", "NG",
  "GC", "SI", "EUR/USD", "GBP/USD", "USD/JPY"
];

const TRENDS = ["Trending Up", "Trending Down", "Choppy"];
const RISKS = ["Low", "Medium", "High"];

export const generateTradeOpportunities = (riskTypes) => {
  const allowed = (riskTypes && riskTypes.length > 0) ? riskTypes.filter(r => RISKS.includes(r)) : RISKS;
  const pool = allowed.length > 0 ? allowed : RISKS;
  const count = Math.floor(Math.random() * 8) + 8; // 8-15 trades
  const opportunities = [];
  
  for (let i = 0; i < count; i++) {
    const assetName = ASSET_NAMES[Math.floor(Math.random() * ASSET_NAMES.length)];
    const trend = TRENDS[Math.floor(Math.random() * TRENDS.length)];
    const risk = pool[Math.floor(Math.random() * pool.length)];
    
    // Payout ranges based on risk
    const payoutRanges = {
      Low: { min: 125, max: 375 },
      Medium: { min: 313, max: 750 },
      High: { min: 1300, max: 2500 }
    };
    // Loss ranges — High decoupled from win to keep old loss values ($600-$1440)
    const lossRanges = {
      Low: null,
      Medium: null,
      High: { min: 650, max: 1100 }
    };
    
    const range = payoutRanges[risk];
    const potentialWinCash = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const lossRange = lossRanges[risk];
    const potentialLossCash = lossRange
      ? Math.floor(Math.random() * (lossRange.max - lossRange.min + 1)) + lossRange.min
      : Math.floor(potentialWinCash * 0.6);
    
    const heatImpact = risk === "High" ? 3 : risk === "Medium" ? 2 : 1;
    const tipCost = Math.floor(potentialWinCash * 0.3);
    
    // Pre-calculate outcome at generation time (single unified action)
    const baseProbabilities = { Low: 65, Medium: 55, High: 55 };
    const winProbability = baseProbabilities[risk];
    const isWin = Math.random() * 100 < winProbability;
    
    const xpGain = isWin ? Math.floor(5 + Math.random() * 5) : 2;
    const respectGain = isWin ? Math.floor(5 + Math.random() * 5) : 0;
    const cashDelta = isWin ? potentialWinCash : -potentialLossCash;
    
    opportunities.push({
      id: `trade_${i}_${Date.now()}`,
      assetName,
      trend,
      risk,
      potentialWinCash,
      potentialLossCash,
      heatImpact,
      tipCost,
      tipCurrency: "cash",
      // Pre-determined outcome (baked in)
      isWin,
      xpGain,
      respectGain,
      cashDelta
    });
  }
  
  return opportunities;
};

export const purchaseTip = (trade) => {
  // Generate tip
  const direction = Math.random() < 0.5 ? "BUY" : "SELL";
  const confidenceLevels = {
    Low: 55,
    Medium: 65,
    High: 75
  };
  const confidence = confidenceLevels[trade.risk];
  
  return {
    ...trade,
    tipPurchased: true,
    tipDirection: direction,
    tipConfidence: confidence
  };
};

export const executeTrade = (trade, playerData) => {
  const rb = getResearchBonuses(playerData);

  // Win probability determined purely by risk level
  const baseProbabilities = {
    Low: 65,
    Medium: 55,
    High: 55
  };
  
  let winProbability = baseProbabilities[trade.risk] + (rb.tradeSuccess || 0);
  
  const isWin = Math.random() * 100 < winProbability;
  
  // Base rewards
  let cashDelta = isWin 
    ? applyBonus(trade.potentialWinCash, rb.tradeCash)
    : -trade.potentialLossCash;

  const xpGain = isWin ? Math.floor(10 + Math.random() * 10) : 5;
  const respectGain = isWin ? Math.floor(5 + Math.random() * 5) : 0;
  const heatGain = trade.heatImpact || 1;

  return {
    isWin,
    cashDelta,
    xpGain,
    respectGain,
    heatGain,
    trade
  };
};