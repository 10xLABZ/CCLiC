import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Crown, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TradeOpportunityCard from "./TradeOpportunityCard";
import TradeAllResultsModal from "./TradeAllResultsModal";
import VipModal from "@/components/vip/VipModal";
import { generateTradeOpportunities } from "./tradingEngine";
import { getPlayerData } from "../utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import { getEventCache, setEventCache } from "@/lib/playerMemory";
import { isVipActive } from "@/lib/vipHelper";
import { getAccessoryIgcMultiplier } from "@/lib/igcBonusHelper";

// Trade tips list persists in-memory for the session (survives page navigation).
// No daily limit on trade tips — players can trade as many as they want.
// VIP gating still applies to TRADE ALL and FILTER features.
const SESSION_TRADES_KEY = 'tradeTips_session';

const loadSavedTrades = () => getEventCache(SESSION_TRADES_KEY) || null;

const saveTrades = (trades) => {
  if (!trades || trades.length === 0) {
    setEventCache(SESSION_TRADES_KEY, null);
  } else {
    setEventCache(SESSION_TRADES_KEY, trades);
  }
};

export default function TradingContent({ playerData, onPlayerUpdate }) {
  const [trades, setTrades] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [tradeAllResults, setTradeAllResults] = useState(null);
  const [riskFilter, setRiskFilter] = useState(['Low', 'Medium', 'High']);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFilterInfo, setShowFilterInfo] = useState(false);
  const navigate = useNavigate();

  const filteredTrades = trades.filter(t => riskFilter.includes(t.risk));

  const handleFilterClick = (risk) => {
    if (!isVipActive(playerData)) {
      setShowVipModal(true);
      return;
    }
    // Clicking the sole active filter resets to all; otherwise sets single-filter
    const newFilter = (riskFilter.length === 1 && riskFilter[0] === risk)
      ? ['Low', 'Medium', 'High']
      : [risk];
    setRiskFilter(newFilter);
    setEventCache('tipRiskFilter', newFilter);
    // Clear current list and generate a fresh batch of the selected type(s)
    saveTrades(null);
    setTrades([]);
    generateNewBatch(newFilter);
  };

  // On mount: load saved filter preference (VIP only) or reset to ALL, then load trades
  useEffect(() => {
    const vipActive = isVipActive(playerData);
    let initialFilter = ['Low', 'Medium', 'High'];
    if (vipActive) {
      const savedFilter = getEventCache('tipRiskFilter');
      if (savedFilter && Array.isArray(savedFilter) && savedFilter.length > 0) {
        initialFilter = savedFilter;
        setRiskFilter(savedFilter);
      }
    } else {
      // VIP expired — reset preference to ALL
      setEventCache('tipRiskFilter', null);
    }
    const saved = loadSavedTrades();
    if (saved && saved.length > 0) {
      setTrades(saved);
    } else {
      generateNewBatch(initialFilter);
    }
  }, []);

  const generateNewBatch = (riskTypes) => {
    const types = riskTypes || riskFilter;
    const fresh = generateTradeOpportunities(types);
    setTrades(fresh);
    saveTrades(fresh);
  };

  const handleTrade = async (trade) => {
    const player = getPlayerData();

    if (player.energy < 2) return;
    if (player.cash < trade.tipCost) return;

    const coverCost = trade.heatImpact || 1;

    setIsProcessing(true);

    const igcMult = getAccessoryIgcMultiplier(player);
    const baseNetCash = trade.cashDelta - trade.tipCost;
    const igcBoostAmount = baseNetCash > 0 ? Math.round(baseNetCash * (igcMult - 1)) : 0;
    const totalCashDelta = baseNetCash + igcBoostAmount;

    const leveledUpBefore = player.level || 1;
    window.dispatchEvent(new CustomEvent('trade_started', {
      detail: {
        isWin: trade.isWin,
        cashDelta: baseNetCash,
        igcBoost: igcBoostAmount,
        totalCash: totalCashDelta,
        xpGain: trade.xpGain,
        respectGain: trade.respectGain,
        coverCost,
        leveledUp: false,
        trade,
      }
    }));
    setTrades(prev => {
      const next = prev.filter(t => t.id !== trade.id);
      saveTrades(next);
      return next;
    });

    try {
      await applyServerReward({
        cash_delta: totalCashDelta,
        energy_delta: -2,
        op_cover_delta: -coverCost,
        respect_delta: trade.respectGain,
        xp_delta: trade.xpGain,
        reason: 'insider_trade',
        stat_fields: {
          trades_completed_today: 1,
          total_trades_completed: 1,
          total_trading_profit: totalCashDelta,
        }
      });

      const fresh = getPlayerData();
      const leveledUp = (fresh.level || 1) > leveledUpBefore;

      window.dispatchEvent(new CustomEvent('trade_completed', {
        detail: { leveledUp, isProcessing: false }
      }));
    } catch (err) {
      console.error('Trade error:', err);
      window.dispatchEvent(new CustomEvent('trade_completed', {
        detail: { isProcessing: false }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTradeAll = async () => {
    const vip = isVipActive(playerData);
    if (!vip) {
      // Non-VIP: send to MapsPage where VIP modal lives
      navigate('/');
      return;
    }

    const player = getPlayerData();

    // Filter to only actionable trades from the currently filtered (visible) list
    const actionable = filteredTrades.filter(t =>
      player.cash >= t.tipCost && player.energy >= 2 && (player.opCover ?? 100) >= t.heatImpact
    );

    if (actionable.length === 0) return;

    setIsProcessingAll(true);
    setIsProcessing(true);

    // Calculate aggregate deltas for a single server call
    const igcMult = getAccessoryIgcMultiplier(player);
    let totalCashDelta = 0;
    let totalXpGain = 0;
    let totalRespectGain = 0;
    let totalCoverCost = 0;
    let totalEnergyCost = 0;
    let totalIgcBoost = 0;
    let wins = 0;
    let losses = 0;

    const itemized = actionable.map(trade => {
      const baseNetCash = trade.cashDelta - trade.tipCost;
      const igcBoost = baseNetCash > 0 ? Math.round(baseNetCash * (igcMult - 1)) : 0;
      const netCash = baseNetCash + igcBoost;
      totalCashDelta += netCash;
      totalIgcBoost += igcBoost;
      totalXpGain += trade.xpGain;
      totalRespectGain += trade.respectGain;
      totalCoverCost += trade.heatImpact || 1;
      totalEnergyCost += 2;
      if (trade.isWin) wins++; else losses++;

      return {
        assetName: trade.assetName,
        risk: trade.risk,
        isWin: trade.isWin,
        cashDelta: netCash,
        igcBoost,
        xpGain: trade.xpGain,
        respectGain: trade.respectGain,
        coverCost: trade.heatImpact || 1,
      };
    });

    const leveledUpBefore = player.level || 1;

    // Remove all actionable trades from list immediately
    setTrades(prev => {
      const next = prev.filter(t => !actionable.find(a => a.id === t.id));
      saveTrades(next);
      return next;
    });

    try {
      await applyServerReward({
        cash_delta: totalCashDelta,
        energy_delta: -totalEnergyCost,
        op_cover_delta: -totalCoverCost,
        respect_delta: totalRespectGain,
        xp_delta: totalXpGain,
        reason: 'insider_trade_all',
        stat_fields: {
          trades_completed_today: actionable.length,
          total_trades_completed: actionable.length,
          total_trading_profit: totalCashDelta,
        }
      });

      const fresh = getPlayerData();
      const leveledUp = (fresh.level || 1) > leveledUpBefore;

      setTradeAllResults({
        itemized,
        totals: {
          cashDelta: totalCashDelta,
          igcBoost: totalIgcBoost,
          xpGain: totalXpGain,
          respectGain: totalRespectGain,
          coverCost: totalCoverCost,
          energyCost: totalEnergyCost,
          wins,
          losses,
          leveledUp,
        }
      });
    } catch (err) {
      console.error('Trade all error:', err);
    } finally {
      setIsProcessingAll(false);
      setIsProcessing(false);
    }
  };

  const handleCloseResults = () => {
    setTradeAllResults(null);
    // Refresh tips if list is empty
    if (trades.length === 0) {
      generateNewBatch();
    }
  };

  const vip = isVipActive(playerData);
  const canTradeAll = vip && filteredTrades.length > 0 && !isProcessingAll;

  return (
    <>
      {/* Tips Filter + Trade All button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
            INSIDER TRADE TIPS
          </h2>
          <button onClick={() => setShowInfo(true)} className="text-slate-500 hover:text-slate-300 transition-colors" title="How it works">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        <Button
          onClick={handleTradeAll}
          disabled={isProcessingAll || filteredTrades.length === 0}
          className={`font-bold border h-7 text-[11px] px-2.5 flex items-center gap-1 disabled:opacity-40 ${
            vip
              ? 'bg-yellow-600 hover:bg-yellow-500 text-black border-yellow-700'
              : 'bg-purple-700 hover:bg-purple-600 text-white border-purple-800'
          }`}
        >
          {vip ? <Zap className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
          {isProcessingAll ? (
            <span className="text-white">TRANSACTING...</span>
          ) : vip ? (
            <span>TRADE ALL</span>
          ) : (
            <span>TRADE ALL (VIP)</span>
          )}
        </Button>
      </div>

      {/* Risk Level Filter */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-slate-500 font-bold uppercase">Tips Filter:</span>
        {['Low', 'Medium', 'High'].map(risk => {
          const active = riskFilter.includes(risk);
          return (
            <div key={risk} className="flex items-center gap-0.5">
              <button
                onClick={() => handleFilterClick(risk)}
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? risk === 'Low' ? 'bg-green-600 text-white border-green-700'
                      : risk === 'Medium' ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-red-600 text-white border-red-700'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {risk}
              </button>
              {risk === 'High' && (
                <button onClick={() => setShowFilterInfo(true)} className="text-slate-500 hover:text-slate-300 transition-colors" title="Filter info">
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trade Opportunities or empty message */}
      {filteredTrades.length === 0 ? (
        <div className="text-center py-4 text-slate-500 text-xs">
          No tips match your filter. Adjust filters to see more.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredTrades.map(trade => (
            <TradeOpportunityCard
              key={trade.id}
              trade={trade}
              onTrade={handleTrade}
              playerCash={playerData.cash}
              playerEnergy={playerData.energy}
              playerCover={playerData.opCover ?? 100}
              disabledByParent={isProcessing}
            />
          ))}
        </div>
      )}

      {/* Trade All Results Modal */}
      <TradeAllResultsModal
        open={!!tradeAllResults}
        results={tradeAllResults}
        onClose={handleCloseResults}
      />

      {/* VIP Modal — opened when non-VIP clicks filter or info link */}
      <VipModal
        open={showVipModal}
        onClose={() => setShowVipModal(false)}
        playerData={playerData}
        onPlayerUpdate={onPlayerUpdate}
      />

      {/* Insider Trade Tips Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="bg-[#0a0f1a] border-emerald-700/50 text-white max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 text-base">📊 Insider Trade Tips</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-300">
            <p>Insider Trade Tips are financial opportunities. Pay cash for a tip and the trade executes instantly — win or lose.</p>
            <div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mb-1">Per Trade — What's Deducted:</div>
              <div className="flex justify-between"><span>💵 Cash</span><span className="text-red-400">Tip cost (varies by risk)</span></div>
              <div className="flex justify-between"><span>🔋 Energy</span><span className="text-red-400">-2</span></div>
              <div className="flex justify-between"><span>🛡️ Op Cover</span><span className="text-red-400">-1 (Low) / -2 (Med) / -3 (High)</span></div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mb-1">If You Win — What You Get:</div>
              <div className="flex justify-between"><span>💵 Cash</span><span className="text-green-400">+payout ($125-$2,500 by risk)</span></div>
              <div className="flex justify-between"><span>⭐ XP</span><span className="text-blue-400">+5-10</span></div>
              <div className="flex justify-between"><span>🏆 Respect</span><span className="text-amber-400">+5-10</span></div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mb-1">If You Lose — What You Lose:</div>
              <div className="flex justify-between"><span>💵 Cash</span><span className="text-red-400">-60% of payout</span></div>
              <div className="flex justify-between"><span>⭐ XP</span><span className="text-blue-400">+2</span></div>
              <div className="flex justify-between"><span>🏆 Respect</span><span className="text-slate-500">+0</span></div>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5">
              <div className="text-[10px] text-amber-500 uppercase font-bold tracking-wide mb-1">📝 Example:</div>
              <p>A <span className="text-red-400 font-bold">High</span> risk tip costs <span className="text-red-400">$450</span> cash. Win → <span className="text-green-400">+$1,500 cash</span>, <span className="text-blue-400">+8 XP</span>, <span className="text-amber-400">+7 Respect</span>. Lose → <span className="text-red-400">-$900 cash</span>, <span className="text-blue-400">+2 XP</span>. Either way: <span className="text-red-400">-2 Energy</span>, <span className="text-red-400">-3 Op Cover</span>.</p>
            </div>
            <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-2.5 space-y-2">
              <div className="text-[10px] text-purple-400 uppercase font-bold tracking-wide">🔒 VIP Features:</div>
              <p><span className="text-yellow-400 font-bold">Tips Filter</span> — Tap Low, Medium, or High to instantly refresh the list to only that risk level. Tap the same one again to reset and show all types. Only tips of your selected type will generate until you change the filter.</p>
              <p><span className="text-yellow-400 font-bold">Trade All</span> — Execute every visible (filtered) tip in one tap. Only trades tips you can afford — skips any where you lack cash, energy, or op cover.</p>
              <p className="text-slate-400 text-[10px]">Both features are exclusive to VIP members.</p>
              <button onClick={() => { setShowInfo(false); setShowVipModal(true); }} className="text-yellow-400 underline font-bold text-xs hover:text-yellow-300">
                → Get VIP Membership
              </button>
            </div>
          </div>
          <Button onClick={() => setShowInfo(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 mt-2">Got it</Button>
        </DialogContent>
      </Dialog>

      {/* Filter Info Dialog (next to HIGH) */}
      <Dialog open={showFilterInfo} onOpenChange={setShowFilterInfo}>
        <DialogContent className="bg-[#0a0f1a] border-red-700/50 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-sm">🔍 Tips Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs text-slate-300">
            <p>Tap a risk level to instantly refresh the list showing only tips of that type:</p>
            <ul className="space-y-1 ml-3">
              <li><span className="text-green-400 font-bold">Low</span> — 65% win chance, $125-$375 payouts</li>
              <li><span className="text-amber-400 font-bold">Medium</span> — 55% win chance, $313-$750 payouts</li>
              <li><span className="text-red-400 font-bold">High</span> — 55% win chance, $1,300-$2,500 payouts</li>
            </ul>
            <p>Tap the same level again to reset and show all risk types.</p>
            <p className="text-slate-400">Only tips of your selected type will generate going forward until you change the filter.</p>
            <p className="text-purple-400 text-[10px]">🔒 VIP only — non-VIP will be directed to the VIP page.</p>
          </div>
          <Button onClick={() => setShowFilterInfo(false)} className="w-full bg-slate-700 hover:bg-slate-600 mt-2 text-xs">Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}