import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import VipModal from "@/components/vip/VipModal";
import {
  VIP_BADGE_ACTIVE, VIP_BADGE_INACTIVE,
  isVipActive, getVipTimeRemaining, buyVip, canClaimDailyVip, formatVipTime
} from "@/lib/vipHelper";

export default function ShopVipTab({ playerData, onPlayerUpdate }) {
  const [timeLeft, setTimeLeft] = useState(getVipTimeRemaining(playerData));
  const [canClaim, setCanClaim] = useState(canClaimDailyVip(playerData));
  const [showVipModal, setShowVipModal] = useState(false);
  const vip = isVipActive(playerData);

  // Tick timer once per second
  useEffect(() => {
    const tick = () => {
      setTimeLeft(getVipTimeRemaining(playerData));
      setCanClaim(canClaimDailyVip(playerData));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [playerData]);

  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    const result = await buyVip(playerData);
    setBuying(false);
    if (!result.success) { toast.error(result.message); return; }
    onPlayerUpdate(result.updated);
    toast.success("🎉 VIP Activated! Enjoy your perks!");
  };

  const handleClaimDaily = () => {
    setShowVipModal(true);
  };

  return (
    <div className="bg-[#0a0805] border-2 border-yellow-600/60 rounded-xl overflow-hidden">
      {/* Gold header */}
      <div className="bg-gradient-to-b from-yellow-950/80 to-[#0a0805] px-4 pt-5 pb-0.5 text-center">
        <img src={vip ? VIP_BADGE_ACTIVE : VIP_BADGE_INACTIVE} alt="VIP" className="w-12 h-12 object-contain mx-auto mb-0.5 drop-shadow-lg" />
        <h2 className="text-lg font-black text-yellow-400 tracking-wider">WELCOME TO VIP!</h2>
        <p className="text-[10px] text-yellow-600 uppercase tracking-widest">Elite Member Perks</p>
      </div>

      <div className="px-4 pb-6 space-y-1.5">
        {/* VIP Frame Preview */}
        <div className="rounded-lg overflow-hidden border border-yellow-800/40">
          <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/a68279edf_vipframesection1.png" alt="VIP Profile Frame" className="w-full object-contain max-h-28" />
        </div>

        {/* VIP Features */}
        <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-2.5">
          <div className="text-xs font-black text-yellow-400 uppercase tracking-wider mb-2 text-center">⚡ VIP FEATURES ⚡</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs">🚀</span>
              <span className="text-[11px] font-semibold text-slate-200">ONE-CLICK BUY/TRADE ALL TIPS INSTANT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">👑</span>
              <span className="text-[11px] font-semibold text-slate-200">Exclusive VIP Profile Frame</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">💪</span>
              <span className="text-[11px] font-semibold text-slate-200">+5% ATK, DEF & Cash Earnings</span>
            </div>
          </div>
        </div>

        {/* Daily Rewards */}
        <div className="bg-slate-900/60 border border-yellow-800/30 rounded-xl p-2.5">
          <div className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-2 text-center">🎁 DAILY REWARDS 🎁</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5"><span className="text-xs">🌟</span><span className="text-[11px] font-semibold text-slate-200">1× Avatar Shard</span></div>
            <div className="flex items-center gap-1.5"><span className="text-xs">🛡️</span><span className="text-[11px] font-semibold text-slate-200">2× Cover Boost</span></div>
            <div className="flex items-center gap-1.5"><span className="text-xs">⚙️</span><span className="text-[11px] font-semibold text-slate-200">1× Weapon Parts</span></div>
            <div className="flex items-center gap-1.5"><span className="text-xs">⚡</span><span className="text-[11px] font-semibold text-slate-200">2× Stamina Boost</span></div>
            <div className="flex items-center gap-1.5"><span className="text-xs">💵</span><span className="text-[11px] font-semibold text-slate-200">$10,000 Cash</span></div>
            <div className="flex items-center gap-1.5"><span className="text-xs">🔋</span><span className="text-[11px] font-semibold text-slate-200">2× Energy Boost</span></div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500">
          Subscription: <span className="text-yellow-600 font-bold">30 Days</span>
        </div>

        {vip ? (
          <div className="space-y-2">
            <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-xl p-2 text-center">
              <div className="text-[9px] text-yellow-600 uppercase tracking-widest mb-0.5">Time Remaining</div>
              <div className="text-lg font-black text-yellow-400 font-mono">{formatVipTime(timeLeft)}</div>
            </div>
            <Button
              onClick={handleClaimDaily}
              disabled={!canClaim}
              className={`w-full font-bold ${canClaim ? "bg-yellow-600 hover:bg-yellow-500 text-black" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
            >
              {canClaim ? "🎁 CLAIM DAILY REWARDS" : "✅ Daily Rewards Claimed"}
            </Button>
          </div>
        ) : (
          <Button onClick={handleBuy} disabled={buying} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black text-lg h-12">
            {buying ? "⏳ Processing..." : "💎 BUY NOW — 1000 CRYD"}
          </Button>
        )}
      </div>

      <VipModal
        open={showVipModal}
        onClose={() => setShowVipModal(false)}
        playerData={playerData}
        onPlayerUpdate={onPlayerUpdate}
      />
    </div>
  );
}