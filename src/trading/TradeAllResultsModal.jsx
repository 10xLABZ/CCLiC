import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * TradeAllResultsModal — itemized popup for the VIP "Trade All" feature.
 * Shows each trade's outcome plus aggregate totals.
 */
export default function TradeAllResultsModal({ open, results, onClose }) {
  if (!results) return null;

  const { itemized = [], totals = {} } = results;
  const { wins = 0, losses = 0, cashDelta = 0, igcBoost = 0, xpGain = 0, respectGain = 0, coverCost = 0, energyCost = 0, leveledUp = false } = totals;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-yellow-600/50 text-white max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 text-center">
            ⚡ TRADE ALL RESULTS
          </DialogTitle>
        </DialogHeader>

        {/* Win/Loss summary */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold text-lg">{wins}</span>
            <span className="text-xs text-slate-400">Wins</span>
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold text-lg">{losses}</span>
            <span className="text-xs text-slate-400">Losses</span>
          </div>
        </div>

        {/* Itemized list */}
        <div className="bg-slate-900/50 rounded-lg p-2 space-y-1 mb-3">
          {itemized.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-800 last:border-0">
              <div className="flex items-center gap-1.5">
                <span className={item.isWin ? "text-green-400" : "text-red-400"}>
                  {item.isWin ? "▲" : "▼"}
                </span>
                <span className="text-slate-200 font-semibold">{item.assetName}</span>
                <span className="text-slate-500 text-[10px]">{item.risk}</span>
              </div>
              <span className={`font-bold ${item.cashDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {item.cashDelta >= 0 ? "+" : ""}{item.cashDelta.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm mb-3">
          {igcBoost > 0 && (
            <div className="flex justify-between text-cyan-400">
              <span>+IGC Boost:</span>
              <span>+{igcBoost.toLocaleString()}</span>
            </div>
          )}
          <div className={`flex justify-between font-bold ${cashDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
            <span>Total Cash:</span>
            <span>{cashDelta >= 0 ? "+" : ""}{cashDelta.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-blue-400">
            <span>Total XP:</span>
            <span>+{xpGain}</span>
          </div>
          <div className="flex justify-between text-amber-400">
            <span>Total Respect:</span>
            <span>+{respectGain}</span>
          </div>
          <div className="flex justify-between text-orange-400">
            <span>🛡️ Cover Used:</span>
            <span>-{coverCost}</span>
          </div>
          <div className="flex justify-between text-yellow-400">
            <span>🔋 Energy Used:</span>
            <span>-{energyCost}</span>
          </div>
        </div>

        {leveledUp && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded p-2 text-center mb-3">
            <div className="text-emerald-400 font-bold text-sm">🎉 LEVEL UP!</div>
          </div>
        )}

        <Button onClick={onClose} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
          CONTINUE
        </Button>
      </DialogContent>
    </Dialog>
  );
}