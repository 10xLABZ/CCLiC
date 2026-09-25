import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Swords, Loader2, Trophy, Skull } from 'lucide-react';
import { computeTerritoryBotStats } from '@/lib/territoryBotHelper';
import { base44 } from '@/api/base44Client';
import { savePlayerData, getPlayerData } from '../utils/playerStorage';
import { computeFullPlayerStats } from '@/lib/playerStatsHelper';

const getSlotPayout = (slot) => {
  if (slot === 1) return 10;
  if (slot === 2) return 8;
  if (slot === 3) return 6;
  if (slot <= 9) return 5;
  if (slot <= 19) return 4;
  if (slot <= 29) return 3;
  if (slot <= 39) return 2;
  return 1;
};

const getSlotDailyPayout = (slot) => getSlotPayout(slot) * 24;

// Phase: 'preview' | 'fighting' | 'result'
export default function TerritoryBattleModal({
  open,
  onClose,
  playerData,
  targetSlot,      // { username, player_level, player_power, profile_image_url, slot_number }
  mySlotNumber,    // current player slot in building (null if not in building)
  buildingId,
  city,
  state,
  buildingName,
  onBattleComplete // called with result after battle resolves
}) {
  const [phase, setPhase] = useState('preview');
  const [result, setResult] = useState(null);

  const handleFight = async () => {
    setPhase('fighting');
    try {
      const res = await base44.functions.invoke('challengeTerritory', {
        building_id: buildingId,
        city,
        state,
        target_slot_number: targetSlot?.slot_number
      });
      const data = res.data;
      // Update local stats to match server
      const current = getPlayerData();
      if (data.outcome === 'WIN') {
        savePlayerData({
          totalTradeWarWins: (current.totalTradeWarWins || 0) + 1,
          tradeWarsWonToday: (current.tradeWarsWonToday || 0) + 1,
          winstreak: (current.winstreak || 0) + 1,
          losstreak: 0
        });
      } else if (data.outcome === 'LOSS') {
        savePlayerData({
          totalTradeWarLosses: (current.totalTradeWarLosses || 0) + 1,
          losstreak: (current.losstreak || 0) + 1,
          winstreak: 0
        });
      }
      setResult(data);
      setPhase('result');
      onBattleComplete?.(data);
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Battle failed';
      setResult({ outcome: 'ERROR', message: errorMsg });
      setPhase('result');
    }
  };

  const handleClose = () => {
    setPhase('preview');
    setResult(null);
    onClose();
  };

  const targetSlotNum = targetSlot?.slot_number;
  const challengeLabel = mySlotNumber === null
    ? `Challenge for Entry (Slot #${targetSlotNum ?? 50})`
    : `Challenge Slot #${targetSlotNum} — Above You`;

  // MY stats — use the canonical helper (includes research/dev/avatar/weapon-upgrade bonuses)
  const myFullStats = playerData ? computeFullPlayerStats(playerData) : {};
  const myAtk = myFullStats.atk ?? 0;
  const myDef = myFullStats.def ?? 0;
  const myTP = myFullStats.pwr ?? 0;

  // Opponent stats — for bots use the deterministic helper for varied ATK/DEF.
  // For humans use enriched data passed in via targetSlot.
  const isOppBot = targetSlot?.user_id?.startsWith('bot_') || (!targetSlot?.atk && !targetSlot?.def);
  const botOppStats = isOppBot && targetSlot ? computeTerritoryBotStats(targetSlot) : null;
  const oppAtk = botOppStats?.atk ?? targetSlot?.atk ?? 0;
  const oppDef = botOppStats?.def ?? targetSlot?.def ?? 0;
  const oppTP = botOppStats?.pwr ?? targetSlot?.pwr ?? targetSlot?.player_power ?? (oppAtk + oppDef);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#060a12] border border-red-900/40 text-white max-w-sm">

        {/* PHASE: PREVIEW */}
        {phase === 'preview' && (
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Territory Battle</div>
              <div className="text-lg font-bold text-red-400">{buildingName}</div>
            </div>

            {/* VS layout */}
            <div className="flex items-center justify-between gap-3">
              {/* YOU */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-emerald-500/60 bg-slate-900 overflow-hidden mx-auto mb-2">
                  {playerData.profileImageDataUrl ? (
                    <img src={playerData.profileImageDataUrl} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <div className="text-xs font-bold text-emerald-400 truncate">{playerData.username || 'You'}</div>
                <div className="text-[10px] text-slate-500">Lv {playerData.level}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {mySlotNumber ? `Slot #${mySlotNumber}` : 'Not in building'}
                </div>
                <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-1.5 mt-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5 text-center">
                  <span className="text-[9px] text-red-400">⚔️ {myAtk.toFixed(1)}</span>
                  <span className="text-[9px] text-blue-400">🛡️ {myDef.toFixed(1)}</span>
                  <span className="text-[9px] text-emerald-400">💥 {myTP.toFixed(1)}</span>
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Swords className="w-6 h-6 text-red-500" />
                <div className="text-xs font-bold text-red-500">VS</div>
              </div>

              {/* OPPONENT */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-red-500/60 bg-slate-900 overflow-hidden mx-auto mb-2">
                  {targetSlot?.profile_image_url ? (
                    <img src={targetSlot.profile_image_url} alt="Opponent" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <div className="text-xs font-bold text-red-400 truncate">{targetSlot?.username || '???'}</div>
                <div className="text-[10px] text-slate-500">Lv {targetSlot?.player_level || '?'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Slot #{targetSlot?.slot_number || '?'}</div>
                <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-1.5 mt-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5 text-center">
                  <span className="text-[9px] text-red-400">⚔️ {oppAtk}</span>
                  <span className="text-[9px] text-blue-400">🛡️ {oppDef}</span>
                  <span className="text-[9px] text-emerald-400">💥 {oppTP}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 text-xs text-center text-slate-400">
              ⚡ Win to take their slot!
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFight} className="flex-1 bg-red-600 hover:bg-red-500 font-bold gap-2">
                <Swords className="w-4 h-4" /> FIGHT
              </Button>
              <Button onClick={handleClose} variant="outline" className="border-slate-700 text-slate-400">
                Flee
              </Button>
            </div>
          </div>
        )}

        {/* PHASE: FIGHTING */}
        {phase === 'fighting' && (
          <div className="py-12 text-center space-y-4">
            <div className="text-4xl animate-bounce">⚔️</div>
            <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto" />
            <div className="text-sm text-slate-400">Battle in progress...</div>
            <div className="text-xs text-slate-600">{playerData.username} vs {targetSlot?.username}</div>
          </div>
        )}

        {/* PHASE: RESULT */}
        {phase === 'result' && result && (
          <div className="space-y-4 pt-2 text-center">
            {result.outcome === 'WIN' ? (
              <>
                <Trophy className="w-14 h-14 text-yellow-400 mx-auto" />
                <div className="text-2xl font-black text-yellow-400">VICTORY!</div>
                <div className="text-sm text-slate-300">{result.message}</div>
                <div className="bg-emerald-950/40 border border-emerald-700 rounded-xl p-3 space-y-1">
                  <div className="text-xs text-slate-500">New Position</div>
                  <div className="text-xl font-black text-emerald-400">Slot #{result.slot}</div>
                  <div className="text-sm text-green-400 font-bold">+${getSlotDailyPayout(result.slot)}/day passive income</div>
                </div>
              </>
            ) : result.outcome === 'LOSS' ? (
              <>
                <Skull className="w-14 h-14 text-red-400 mx-auto" />
                <div className="text-2xl font-black text-red-400">DEFEATED!</div>
                <div className="text-sm text-slate-300">{result.message}</div>
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">You held</div>
                  <div className="text-lg font-bold text-slate-300">
                    {mySlotNumber ? `Slot #${mySlotNumber}` : 'No slot gained'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Keep challenging to climb the ranks!</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-red-400">Error</div>
                <div className="text-sm text-slate-400">{result.message}</div>
              </>
            )}

            <Button onClick={handleClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}