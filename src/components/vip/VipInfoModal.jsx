import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  VIP_XP_THRESHOLDS, VIP_STAT_BONUS, VIP_DAILY_CASH, VIP_DAILY_BOOSTS,
  VIP_DAILY_AVATAR_SHARDS, VIP_DAILY_WEAPON_PARTS, VIP_FRAME_URL, VIP_LEGEND_FRAME_URL,
  VIP_DAILY_CLAIM_XP,
} from '@/lib/vipHelper';
import { AvatarShardIcon, GearPartIcon } from '@/components/shared/shardIcons';

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function VipInfoModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0805] border-2 border-yellow-600/60 text-white max-w-sm max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0805] border-b border-yellow-800/40 px-4 py-3 z-10">
          <div className="text-center text-sm font-black text-yellow-400 uppercase tracking-wider">VIP Progression Guide</div>
          <div className="text-center text-[10px] text-slate-500 mt-0.5">20 Levels · Permanent XP</div>
        </div>

        <div className="px-3 py-3 space-y-3">
          {/* XP Sources */}
          <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-2">
            <div className="text-[10px] font-bold text-yellow-500 uppercase mb-1">XP Sources</div>
            <div className="text-[10px] text-slate-300 space-y-0.5">
              <div>• Daily claim: +{VIP_DAILY_CLAIM_XP} XP</div>
              <div>• CRYD conversion: 1 CRYD = 1 VIP XP</div>
              <div>• XP is permanent — never decreases</div>
              <div>• Buffs only apply while VIP is active</div>
              <div>• VIP Legend frame unlocks at Level 10</div>
            </div>
          </div>

          {/* VIP Frames */}
          <div className="bg-slate-900/60 border border-yellow-800/30 rounded-lg p-2">
            <div className="text-[10px] font-bold text-yellow-500 uppercase mb-1.5">VIP Frames</div>
            <div className="flex gap-2">
              <div className="flex-1 text-center">
                <img src={VIP_FRAME_URL} alt="VIP Frame" className="w-full rounded-lg" />
                <div className="text-[9px] text-slate-400 mt-0.5">VIP Frame<br/><span className="text-yellow-500">L1+</span></div>
              </div>
              <div className="flex-1 text-center">
                <img src={VIP_LEGEND_FRAME_URL} alt="VIP Legend Frame" className="w-full rounded-lg" />
                <div className="text-[9px] text-purple-400 mt-0.5">VIP Legend<br/><span className="text-purple-500">L10+</span></div>
              </div>
            </div>
          </div>

          {/* Level Breakdown */}
          <div>
            <div className="text-[10px] font-bold text-yellow-500 uppercase mb-1.5">Level Breakdown — All 20 Tiers</div>
            <div className="space-y-0.5">
              {/* Header row */}
              <div className="flex items-center gap-1 text-[8px] text-slate-500 font-bold uppercase px-1 pb-1 border-b border-slate-800">
                <span className="w-5 text-center">Lv</span>
                <span className="w-12">XP</span>
                <span className="w-9">Stats</span>
                <span className="w-10">Cash</span>
                <span className="w-10">Boosts</span>
                <span className="flex-1">Shards</span>
              </div>
              {LEVELS.map(level => {
                const xpNeeded = VIP_XP_THRESHOLDS[level - 1];
                const statPct = VIP_STAT_BONUS[level] || 5;
                const cash = VIP_DAILY_CASH[level] || 5000;
                const boosts = VIP_DAILY_BOOSTS[level] || 2;
                const shards = VIP_DAILY_AVATAR_SHARDS[level] || 1;
                const parts = VIP_DAILY_WEAPON_PARTS[level] || 1;
                const isMilestone = level === 10 || level === 20;

                return (
                  <div
                    key={level}
                    className={`flex items-center gap-1 rounded px-1 py-1 text-[9px] ${isMilestone ? 'bg-yellow-900/30 border border-yellow-700/40' : 'bg-slate-900/40'}`}
                  >
                    <span className={`w-5 text-center font-black ${level >= 10 ? 'text-purple-400' : 'text-yellow-400'}`}>{level}</span>
                    <span className="w-12 text-slate-300">{xpNeeded === 0 ? '0' : xpNeeded >= 1000 ? `${(xpNeeded / 1000).toFixed(0)}K` : xpNeeded}</span>
                    <span className="w-9 text-emerald-400 font-bold">+{statPct}%</span>
                    <span className="w-10 text-slate-300">${(cash / 1000).toFixed(0)}K</span>
                    <span className="w-10 text-slate-300">{boosts}× each</span>
                    <span className="flex-1 flex items-center gap-1 text-slate-300">
                      <AvatarShardIcon size={9} />{shards}
                      <GearPartIcon size={9} />{parts}
                      {level === 10 && <span className="text-purple-400 font-bold text-[8px] ml-1">👑LEGEND</span>}
                      {level === 20 && <span className="text-yellow-300 font-bold text-[8px] ml-1">⭐MAX</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIP Features */}
          <div className="bg-slate-900/60 border border-yellow-800/30 rounded-lg p-2">
            <div className="text-[10px] font-bold text-yellow-500 uppercase mb-1">VIP Features</div>
            <div className="text-[10px] text-slate-300 space-y-0.5">
              <div>🚀 One-click buy/trade all tips</div>
              <div>👑 Exclusive VIP Profile Frame (L1+)</div>
              <div>💜 VIP Legend Frame unlock (L10+)</div>
              <div>💪 Level-based ATK/DEF/Cash boost</div>
              <div>🎁 Level-based daily rewards</div>
              <div>📈 Higher tiers = better everything</div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}