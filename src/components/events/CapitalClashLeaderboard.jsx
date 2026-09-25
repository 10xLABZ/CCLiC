import React, { useState, useEffect } from "react";
import { X, Crown, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import VipFrame from "../vip/VipFrame";
import {
  getCapitalClashData, saveCapitalClashData, isCapitalClashActive,
  applyPlayerJoin, applyPlayerSwap, claimCapitalClashRewards,
  getPlayerRewards, getRewardTier, CAPITAL_CLASH_REWARDS
} from "./capitalClashStorage";
import { computeCombatStats } from "../tradewars/botGenerator";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import { savePlayerData } from "../utils/playerStorage";
import { getAvatarUrl } from "../profile/AvatarPicker";
import { getFrameById } from "../frames/framesData";
import { toast } from "sonner";

// Map leaderboard rank → CC reward frame (display-only on leaderboard)
const RANK_FRAME_MAP = { 1: 'cc_top', 2: 'cc_2nd', 3: 'cc_3rd' };

const getSlotColor = (slot) => {
  if (slot === 1)  return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20';
  if (slot <= 3)   return 'text-orange-400 border-orange-500/30 bg-orange-950/20';
  if (slot <= 10)  return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
  if (slot <= 20)  return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
  if (slot <= 50)  return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  return 'text-slate-400 border-slate-700 bg-slate-900/30';
};

function PlayerCardModal({ entry, onClose }) {
  if (!entry) return null;
  const imageUrl = entry.botProfileImage || (entry.botAvatarId ? getAvatarUrl(entry.botAvatarId) : null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-[#0a0f1a] border border-yellow-700/50 rounded-xl p-4 w-64 shadow-xl z-10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <VipFrame active={entry.isVip} className="w-16 h-16 shrink-0 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
              {imageUrl
                ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
              }
            </div>
          </VipFrame>
          <div>
            <div className="text-sm font-bold text-slate-200 break-all">{entry.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">Level {entry.level}</div>
            <div className="text-xs text-yellow-500 mt-0.5 font-semibold">Slot #{entry.slot}</div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1 text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Combat Strength
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            <div>
              <div className="text-[9px] text-slate-500 mb-0.5">ATK</div>
              <div className="text-sm font-bold text-red-400">{(entry.atk || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 mb-0.5">DEF</div>
              <div className="text-sm font-bold text-blue-400">{(entry.def || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 mb-0.5">FUND</div>
              <div className="text-sm font-bold text-yellow-400">{(entry.fundPower || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 mb-0.5">TP</div>
              <div className="text-sm font-bold text-emerald-400">{(entry.pwr || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CapitalClashLeaderboard({ open, onClose, playerData, onPlayerUpdate }) {
  const [data, setData] = useState(() => getCapitalClashData());
  const [slots, setSlots] = useState([]);
  const [viewingEntry, setViewingEntry] = useState(null);

  useEffect(() => {
    if (open) {
      const fresh = getCapitalClashData();
      setData(fresh);
      setSlots(fresh.slots || []);
    }
  }, [open]);

  if (!open) return null;

  const active = isCapitalClashActive(data);
  const playerSlot = data.playerSlot;
  const isJoined = playerSlot !== null && playerSlot !== undefined;
  const stamina = playerData?.stamina ?? 0;

  const liveStats = computeFullPlayerStats(playerData);

  const handleJoin = () => {
    if (!active) { toast.error("Event is not active right now."); return; }
    const newSlots = applyPlayerJoin(slots, playerData, computeCombatStats);
    setSlots(newSlots);
    setData(getCapitalClashData());
    toast.success("You joined the leaderboard at slot #100!");
  };

  const handleChallenge = (target) => {
    if (!active) { toast.error("Event is not active."); return; }
    if (!isJoined) { toast.error("Join the leaderboard first!"); return; }
    if (stamina < 5) { toast.error("Need 5 stamina to fight!"); return; }
    if (playerSlot <= target.slot) { toast.error("You can only challenge players ranked above you."); return; }

    const myPwr = liveStats.pwr || 1;
    const theirPwr = target.pwr || 1;
    const winChance = 0.3 + (myPwr / (myPwr + theirPwr)) * 0.5;
    const won = Math.random() < winChance;

    if (won) {
      const newSlots = applyPlayerSwap(slots, playerSlot, target.slot, playerData, computeCombatStats);
      setSlots(newSlots);
      setData(getCapitalClashData());
      toast.success(`You climbed to slot #${target.slot}! 🏆`);
    } else {
      toast.error(`You lost to ${target.name}! Try again.`);
    }
  };

  const handleClaim = () => {
    const updated = claimCapitalClashRewards(playerData, (updates) => savePlayerData(updates));
    onPlayerUpdate?.(updated);
    setData(getCapitalClashData());
    toast.success("Capital Clash rewards claimed!");
  };

  const canClaim = isJoined && data.rewardsSent && !data.claimed;
  const currentPlayerSlot = data.playerSlot;

  return (
    <>
      <div className="fixed right-0 top-[200px] w-80 bg-[#0a0f1a] border-l-2 border-yellow-900/40 z-40 flex flex-col" style={{ bottom: '80px' }}>
        {/* Header */}
        <div className="bg-[#0a0f1a] border-b border-yellow-900/40 px-3 pt-3 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-bold text-yellow-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-400" /> Capital Clash
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400 h-6 w-6 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="text-[10px] text-slate-500 mb-2">The Power Index • Mon–Fri</div>

          {/* Status */}
          <div className={`rounded-lg px-3 py-2 border mb-2 ${isJoined ? 'bg-yellow-950/30 border-yellow-700/40' : 'bg-slate-900/60 border-slate-700'}`}>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Your Position</div>
            {isJoined ? (
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-yellow-300">#{currentPlayerSlot}</div>
                {canClaim ? (
                  <Button size="sm" onClick={handleClaim} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-6 text-[10px] px-2">🎁 Claim</Button>
                ) : data.claimed ? (
                  <span className="text-[10px] text-emerald-400">✓ Claimed</span>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">Not ranked — join to compete</div>
            )}
          </div>

          {!isJoined && (
            <Button onClick={handleJoin} disabled={!active} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs disabled:opacity-40 h-7">
              Join Leaderboard
            </Button>
          )}
          {!active && (
            <div className="text-[10px] text-red-400 mt-1 text-center">Event runs Mon–Fri only</div>
          )}
          {stamina < 5 && isJoined && (
            <div className="text-[10px] text-red-400 mt-1 text-center">⚡ Need 5 stamina to fight</div>
          )}

          {/* Reward tiers compact */}
          <div className="mt-2 text-[9px] text-slate-500 space-y-0.5 border-t border-slate-800 pt-2">
            <div className="text-[10px] font-bold text-yellow-400 mb-1">🏆 Reward Tiers</div>
            <div className="text-yellow-300">#1 — Shards×2, Gear, Refills + 25K IGC</div>
            <div className="text-slate-300">#2 — Shards, Gear, Boosts + 12K IGC</div>
            <div className="text-slate-400">#3 — Shards, Gear, Boosts + 7.5K IGC</div>
            <div className="text-slate-500">#4–20 — Shard, Boosts + 5K IGC</div>
            <div className="text-slate-600">#21–100 — Boosts + 5K IGC</div>
          </div>
        </div>

        {/* Leaderboard slots */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {slots.map(entry => {
            const isMe = entry.isPlayer;
            const color = getSlotColor(entry.slot);
            const imageUrl = entry.botProfileImage || (entry.botAvatarId ? getAvatarUrl(entry.botAvatarId) : null);
            const canFight = active && isJoined && !isMe && currentPlayerSlot > entry.slot && stamina >= 5;
            const rankFrameId = RANK_FRAME_MAP[entry.slot];
            const rankFrame = rankFrameId ? getFrameById(rankFrameId) : null;
            const isTop3 = entry.slot <= 3;

            return (
              <div
                key={entry.slot}
                className={`border rounded-lg px-2 py-1.5 ${color} ${isMe ? 'ring-1 ring-yellow-400' : ''} ${isTop3 ? 'ring-1 ring-yellow-500/60 shadow-md shadow-yellow-900/30' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  {/* Slot number */}
                  <div className="text-[10px] font-bold w-5 text-center shrink-0">
                    {entry.slot === 1 ? <Crown className="w-3 h-3 text-yellow-400 mx-auto" /> : `#${entry.slot}`}
                  </div>

                  {/* Avatar with VIP frame + rank frame overlay (display-only) */}
                  <div className="relative w-7 h-7 shrink-0" style={{ isolation: 'isolate' }}>
                    <VipFrame active={!!entry.isVip} className="w-7 h-7">
                      <button
                        className="w-7 h-7 rounded overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer hover:ring-1 hover:ring-yellow-400 transition-all"
                        onClick={() => setViewingEntry(entry)}
                      >
                        {imageUrl
                          ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px]">👤</div>
                        }
                      </button>
                    </VipFrame>
                    {rankFrame && (
                      <img
                        src={rankFrame.imageUrl}
                        alt={rankFrame.name}
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                        style={{ zIndex: 30 }}
                      />
                    )}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-semibold truncate ${isMe ? 'text-yellow-300' : 'text-slate-200'}`}>
                      {entry.name}{isMe ? ' (you)' : ''}
                    </div>
                    {/* Combat stats row — icon-only like Trade Wars */}
                    <div className="flex items-center gap-1.5 text-[9px] mt-0.5 flex-wrap">
                      <span className="text-slate-500">Lv{entry.level}</span>
                      <span className="text-red-400">⚔️{(entry.atk || 0).toFixed(0)}</span>
                      <span className="text-blue-400">🛡️{(entry.def || 0).toFixed(0)}</span>
                      <span className="text-purple-400">👥{entry.fundMembers || 0}</span>
                      <span className="text-cyan-400">🏦{(entry.fundPower || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Fight button */}
                  {canFight && (
                    <button
                      onClick={() => handleChallenge(entry)}
                      className="shrink-0 bg-red-700 hover:bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-0.5"
                    >
                      <Swords className="w-3 h-3 text-white" />
                      <span className="text-[9px] text-white font-bold">FIGHT</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player card popup */}
      {viewingEntry && <PlayerCardModal entry={viewingEntry} onClose={() => setViewingEntry(null)} />}
    </>
  );
}