import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, TrendingDown, Swords } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function OfflineAttackSummary({ open, data, onClose }) {
  const navigate = useNavigate();
  if (!data) return null;

  const { battles, totalCashDelta, totalRespectDelta, offlineMinutes } = data;

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-2 border-red-500/50 text-white max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-400 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            While You Were Away
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-400 text-center">
            You were offline for <span className="text-white font-semibold">{formatDuration(offlineMinutes)}</span>
          </div>

          {/* Battle Results */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Battle Results:</h3>
            {battles.map((battle, idx) => {
              const { attacker, result } = battle;
              const isWin = result.outcome === 'WIN';
              
              return (
                <div 
                  key={idx}
                  className={`bg-slate-900/50 rounded-lg p-3 border-l-4 ${
                    isWin ? 'border-l-green-500' : 'border-l-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sm">
                        {attacker.botProfileImage ? (
                          <img src={attacker.botProfileImage} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          '🧑‍💼'
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{attacker.name}</div>
                        <div className="text-[9px] text-slate-500">
                          Lv{attacker.level} • {attacker.type}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                      {isWin ? '✓ DEFENDED' : '✗ DEFEATED'}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 text-[10px] mt-2">
                    <div className={result.cashDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Cash: {result.cashDelta >= 0 ? '+' : ''}{result.cashDelta}
                    </div>
                    {result.respectDelta > 0 && (
                      <div className="text-amber-400">
                        Respect: +{result.respectDelta}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Summary */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Total Impact:</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  {totalCashDelta >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  Cash:
                </span>
                <span className={`text-lg font-bold ${totalCashDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalCashDelta >= 0 ? '+' : ''}{totalCashDelta}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Respect:</span>
                <span className="text-lg font-bold text-amber-400">
                  +{totalRespectDelta}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                onClose();
                navigate(createPageUrl("DefenceLogPage"));
              }}
              variant="outline"
              className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white font-bold"
            >
              <Swords className="w-4 h-4 mr-2" />
              REVENGE
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-red-600 hover:bg-red-500 font-bold"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}