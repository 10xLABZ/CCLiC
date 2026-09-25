import React, { useState } from "react";
import { X, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFrameById } from "../frames/framesData";
import { AVATAR_SHARD_ICON_URL, GEAR_PART_ICON_URL } from "@/components/shared/shardIcons";

// Map reward keys to proper image URLs (replaces emoji placeholders)
const REWARD_KEY_IMAGES = {
  'AVATAR_SHARD': AVATAR_SHARD_ICON_URL,
  'GEAR_SHARD': GEAR_PART_ICON_URL,
};

const TIER_LABELS = { 1: '🥇 #1 TOP', 2: '🥈 #2', 3: '🥉 #3', '4-20': '#4–20', '21-100': '#21–100' };

const REWARD_TIER_DATA = {
  1: { frames: ['cc_top'], items: ['2× Avatar Shards', '1× Gear Part', 'Energy Refill 100', 'Stamina Refill 100', 'Cover Boost 100', '+25,000 IGC'] },
  2: { frames: ['cc_2nd'], items: ['1× Avatar Shard', '1× Gear Part', 'Energy Boost 75', 'Stamina Boost 75', 'Cover Boost 75', '+12,000 IGC'] },
  3: { frames: ['cc_3rd'], items: ['1× Avatar Shard', '1× Gear Part', 'Energy Boost 50', 'Stamina Boost 50', 'Cover Boost 50', '+7,500 IGC'] },
  '4-20': { frames: [], items: ['1× Avatar Shard', 'Energy Boost 25', 'Stamina Boost 25', 'Cover Boost 25', '+5,000 IGC'] },
  '21-100': { frames: [], items: ['Energy Boost 25', 'Stamina Boost 25', 'Cover Boost 25', '+5,000 IGC'] },
};

export function RewardTiersPanel() {
  const [open, setOpen] = useState(false);

  const ccFrames = {
    1: getFrameById('cc_top'),
    2: getFrameById('cc_2nd'),
    3: getFrameById('cc_3rd'),
  };

  return (
    <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-xs font-bold text-yellow-400">🏆 Reward Tiers</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-800/60">
          {/* Top 3 with frames */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[1, 2, 3].map(rank => {
              const frame = ccFrames[rank];
              const td = REWARD_TIER_DATA[rank];
              return (
                <div key={rank} className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 text-center">
                  <div className="text-xs font-bold text-slate-300 mb-1">{TIER_LABELS[rank]}</div>
                  {frame && (
                    <div className="w-full aspect-square mb-1 rounded overflow-hidden bg-slate-800">
                      <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  {frame && (
                    <div className="text-[9px] text-amber-400 mb-1">🖼️ {frame.name} Frame</div>
                  )}
                  {(rank === 1 || rank === 2 || rank === 3) && <div className="text-[8px] text-amber-300/70 mb-1">TEMP — 1 week</div>}
                  <div className="space-y-0.5">
                    {td.items.map((item, i) => (
                      <div key={i} className="text-[9px] text-slate-400">{item}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Lower tiers */}
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between text-slate-500">
              <span>#4–20</span><span>1× Shard + Boosts + 5K IGC</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>#21–100</span><span>Boosts + 5K IGC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClashRewardModal({ open, onClose, rewards, slotNumber }) {
  if (!open || !rewards) return null;

  const tier = slotNumber === 1 ? 1 : slotNumber === 2 ? 2 : slotNumber === 3 ? 3 : slotNumber <= 20 ? '4-20' : '21-100';
  const tierData = REWARD_TIER_DATA[tier] || { frames: [], items: [] };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative bg-gradient-to-b from-[#0d1420] to-[#060a12] border border-yellow-700/50 rounded-2xl w-full max-w-sm shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow header */}
        <div className="bg-gradient-to-r from-yellow-900/40 via-yellow-600/20 to-yellow-900/40 px-4 py-4 text-center border-b border-yellow-700/30">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <div className="text-xl font-black text-yellow-300">🎉 Congratulations!</div>
          <div className="text-sm text-yellow-500 mt-0.5">Capital Clash Rewards</div>
          <div className="mt-1 text-xs text-slate-400">Slot #{slotNumber} • {TIER_LABELS[tier]}</div>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Frame reward */}
          {tierData.frames.map(frameId => {
            const frame = getFrameById(frameId);
            if (!frame) return null;
            return (
              <div key={frameId} className="bg-yellow-950/30 border border-yellow-700/40 rounded-xl p-3 flex items-center gap-3">
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-900">
                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="text-xs font-bold text-yellow-300">🖼️ {frame.name} Profile Frame</div>
                  <div className="text-[9px] text-amber-400 mt-0.5">{frame.type === 'temporary' ? 'TEMPORARY — ' + frame.description : frame.description}</div>
                  <div className="text-[9px] text-slate-500 mt-1">→ Sent to your Frames collection<br/>Go to: Profile Image → My Frames to equip</div>
                </div>
              </div>
            );
          })}

          {/* Items */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">You've received:</div>
            <div className="space-y-2">
              {rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  {REWARD_KEY_IMAGES[r.key] ? (
                    <img src={REWARD_KEY_IMAGES[r.key]} alt={r.label} className="w-6 h-6 object-contain shrink-0" />
                  ) : (
                    <span className="text-base w-6 text-center shrink-0">{r.icon}</span>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{r.label}</div>
                    <div className="text-[9px] text-slate-500">→ {r.cash ? 'Added to your cash balance' : r.frameId ? 'Sent to your Frames collection' : 'Sent to Inventory → Consumables'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button onClick={onClose} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
            Awesome! 🎉
          </Button>
        </div>
      </div>
    </div>
  );
}