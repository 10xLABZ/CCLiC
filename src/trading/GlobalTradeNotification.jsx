import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * GlobalTradeNotification — mounted in Layout, persists across page navigation.
 * Listens for `trade_started` and `trade_completed` window events dispatched by
 * TradingContent.handleTrade. The result modal shows on ANY page until the user
 * dismisses it. Rewards are applied server-side via applyServerReward regardless
 * of whether the user sees the modal or not.
 */
export default function GlobalTradeNotification() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const handleTradeStarted = (e) => {
      setResult({ ...e.detail, isProcessing: true });
    };
    const handleTradeCompleted = (e) => {
      setResult(prev => prev
        ? { ...prev, ...e.detail, isProcessing: false }
        : { ...e.detail, isProcessing: false }
      );
    };
    window.addEventListener('trade_started', handleTradeStarted);
    window.addEventListener('trade_completed', handleTradeCompleted);
    return () => {
      window.removeEventListener('trade_started', handleTradeStarted);
      window.removeEventListener('trade_completed', handleTradeCompleted);
    };
  }, []);

  const handleClose = () => {
    if (result?.isProcessing) return;
    setResult(null);
  };

  if (!result) return null;

  return (
    <Dialog open={!!result} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0f1a] border-slate-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className={result.isProcessing ? "text-white" : (result.isWin ? "text-green-400" : "text-red-400")}>
            {result.isProcessing ? "⏳ TRANSACTING..." : (result.isWin ? "TRADE WIN!" : "TRADE LOSS")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {result.isProcessing && (
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-pulse" style={{ width: '100%' }}></div>
            </div>
          )}

          <div className="bg-slate-900/50 rounded-lg p-3 text-xs space-y-1">
            <div className="text-slate-400">Asset: <span className="text-white">{result.trade?.assetName}</span></div>
            <div className="text-slate-400">Risk: <span className="text-white">{result.trade?.risk}</span></div>
            <div className="text-slate-400">Trend: <span className="text-white">{result.trade?.trend}</span></div>
          </div>

          <div className="space-y-2 text-sm">
            {result.igcBoost > 0 && (
              <div className="flex justify-between text-cyan-400">
                <span>+IGC Boost:</span>
                <span>+{result.igcBoost}</span>
              </div>
            )}
            <div className={`flex justify-between ${(result.totalCash !== undefined ? result.totalCash : result.cashDelta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>Total Cash:</span>
              <span>{(result.totalCash !== undefined ? result.totalCash : result.cashDelta) >= 0 ? '+' : ''}{result.totalCash !== undefined ? result.totalCash : result.cashDelta}</span>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>XP:</span>
              <span>+{result.xpGain}</span>
            </div>
            <div className={`flex justify-between ${result.respectGain >= 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              <span>Respect:</span>
              <span>{result.respectGain >= 0 ? '+' : ''}{result.respectGain}</span>
            </div>
            <div className="flex justify-between text-orange-400">
              <span>🛡️ Op Cover:</span>
              <span>-{result.coverCost}</span>
            </div>
          </div>

          {result.leveledUp && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded p-2 text-center">
              <div className="text-emerald-400 font-bold text-sm">🎉 LEVEL UP!</div>
            </div>
          )}

          <Button
            onClick={handleClose}
            disabled={result.isProcessing}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
          >
            {result.isProcessing ? "TRANSACTING..." : "CONTINUE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}