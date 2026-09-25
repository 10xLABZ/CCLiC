import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  VIP_BADGE_ACTIVE, VIP_BADGE_INACTIVE, VIP_FRAME_URL,
  isVipActive, getVipTimeRemaining, buyVip, canClaimDailyVip, claimDailyVip, formatVipTime,
  getVipDailyRewards,
} from '@/lib/vipHelper';
import VipXpBar from './VipXpBar';
import { getPlayerData } from '@/components/utils/playerStorage';
import { AvatarShardIcon, GearPartIcon } from '@/components/shared/shardIcons';
import DailyGiftChest from '@/components/shared/DailyGiftChest';
import AlreadyClaimedPopup from '@/components/shared/AlreadyClaimedPopup';
import VipInfoModal from './VipInfoModal';
import { Info } from 'lucide-react';

const DAILY_REWARDS = [
  { icon: '🌟', iconImage: 'avatar_shard', label: '1× Avatar Shard' },
  { icon: '⚙️', iconImage: 'gear_shard', label: '1× Weapon Parts' },
  { icon: '💵', label: '$10,000 Cash' },
  { icon: '🛡️', label: '2× Cover Boost +25' },
  { icon: '⚡', label: '2× Stamina Boost +25' },
  { icon: '🔋', label: '2× Energy Boost +25' },
];

export default function VipModal({ open, onClose, playerData, onPlayerUpdate }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const vip = isVipActive(playerData);
  const dailyRewards = getVipDailyRewards(playerData);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      setTimeLeft(getVipTimeRemaining(playerData));
      setCanClaim(canClaimDailyVip(playerData));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, playerData]);

  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    const result = await buyVip(playerData);
    setBuying(false);
    if (!result.success) { toast.error(result.message); return; }
    onPlayerUpdate(result.updated);
    toast.success('🎉 VIP Activated! Enjoy your perks!');
  };

  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (claimSuccess) {
      import('canvas-confetti').then(({ default: confetti }) => {
        const colors = ['#fbbf24', '#f59e0b', '#fde047', '#10b981', '#3b82f6'];
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors });
        setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
        setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors }), 400);
      }).catch(() => {});
    }
  }, [claimSuccess]);

  const handleClaimDaily = async () => {
    setClaiming(true);
    const result = await claimDailyVip(playerData);
    setClaiming(false);
    if (!result.success) {
      setShowAlreadyClaimed(true);
      return;
    }
    onPlayerUpdate(result.updated);
    setCanClaim(false);
    setClaimSuccess(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => { setClaimSuccess(false); onClose(); }}>
        <DialogContent className="bg-[#0a0805] border-2 border-yellow-600/60 text-white max-w-sm overflow-hidden p-0">
        {/* VIP Banner + Frame — images touching, zero gap */}
        <div className="relative">
          {/* Free daily gift — left aligned, absolute so it doesn't affect layout */}
          <div className="absolute left-1 top-2 z-10 flex flex-col items-center">
            <DailyGiftChest giftType="vip" size={56} glowDuration="0.6s" glowStrong onClaimed={() => onPlayerUpdate(getPlayerData())} />
            <span className="text-white text-[8px] font-bold mt-0.5 tracking-wide whitespace-nowrap">FREE DAILY REWARD</span>
          </div>
          <div className="relative">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/741c9cb3f_vipbanner01.png" alt="VIP Banner" className="w-full object-contain max-h-[73px] block" />
            {/* Sparkle overlay — looping twinkle for premium feel */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[
                { top: '12%', left: '8%', delay: '0s', size: 6 },
                { top: '25%', left: '28%', delay: '0.5s', size: 4 },
                { top: '55%', left: '18%', delay: '1s', size: 5 },
                { top: '35%', left: '48%', delay: '0.3s', size: 4 },
                { top: '65%', left: '58%', delay: '0.8s', size: 6 },
                { top: '18%', left: '68%', delay: '1.2s', size: 3 },
                { top: '45%', left: '78%', delay: '0.6s', size: 5 },
                { top: '30%', left: '88%', delay: '1.5s', size: 4 },
                { top: '70%', left: '38%', delay: '0.4s', size: 3 },
                { top: '15%', left: '48%', delay: '1.8s', size: 5 },
              ].map((s, i) => (
                <div key={i} className="absolute vip-sparkle" style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }} />
              ))}
            </div>
          </div>
          <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/a68279edf_vipframesection1.png" alt="VIP Profile Frame" className="w-full object-contain max-h-28 block" />
        </div>

        <div className="px-4 pb-7 space-y-1.5">
          <VipXpBar playerData={playerData} onPlayerUpdate={onPlayerUpdate} />

            {/* VIP Features */}
            <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-2">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <span className="text-xs font-black text-yellow-400 uppercase tracking-wider text-center">⚡ VIP FEATURES ⚡</span>
                <button onClick={() => setShowInfo(true)} className="text-yellow-500 hover:text-yellow-300 transition-colors" title="VIP Info">
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1">
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
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-sm font-black text-yellow-400 uppercase tracking-wider text-center">🎁 DAILY REWARDS 🎁</span>
                <button onClick={() => setShowInfo(true)} className="text-yellow-500 hover:text-yellow-300 transition-colors" title="Rewards Info">
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5"><AvatarShardIcon size={14} /><span className="text-[11px] font-semibold text-slate-200">{dailyRewards.avatarShards}× Avatar Shard</span></div>
                <div className="flex items-center gap-1.5"><span className="text-xs">🛡️</span><span className="text-[11px] font-semibold text-slate-200">{dailyRewards.boosts}× Cover Boost +25</span></div>
                <div className="flex items-center gap-1.5"><GearPartIcon size={14} /><span className="text-[11px] font-semibold text-slate-200">{dailyRewards.weaponParts}× Weapon Parts</span></div>
                <div className="flex items-center gap-1.5"><span className="text-xs">⚡</span><span className="text-[11px] font-semibold text-slate-200">{dailyRewards.boosts}× Stamina Boost +25</span></div>
                <div className="flex items-center gap-1.5"><span className="text-xs">💵</span><span className="text-[11px] font-semibold text-slate-200">${dailyRewards.cash.toLocaleString()} Cash</span></div>
                <div className="flex items-center gap-1.5"><span className="text-xs">🔋</span><span className="text-[11px] font-semibold text-slate-200">{dailyRewards.boosts}× Energy Boost +25</span></div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500">
              Subscription: <span className="text-yellow-600 font-bold">30 Days</span>
            </div>

            {vip ? (
              <div className="space-y-3">
                <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-xl p-1 text-center">
                  <div className="text-[9px] text-yellow-600 uppercase tracking-widest">Time Remaining</div>
                  <div className="text-base font-black text-yellow-400 font-mono">{formatVipTime(timeLeft)}</div>
                </div>
                <Button
                  onClick={handleClaimDaily}
                  disabled={!canClaim || claiming}
                  className={`w-full font-bold ${canClaim ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                >
                  {canClaim ? '🎁 CLAIM DAILY REWARDS' : '✅ Daily Rewards Claimed'}
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">Close</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button onClick={handleBuy} disabled={buying} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black text-lg h-12">
                  {buying ? '⏳ Processing...' : '💎 BUY NOW — 1000 CRYD'}
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-slate-500 text-xs">Maybe Later</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Congrats popup — separate Dialog so it doesn't affect VIP modal positioning */}
      <Dialog open={claimSuccess} onOpenChange={() => setClaimSuccess(false)}>
        <DialogContent className="bg-[#0a0805] border-2 border-yellow-600/60 text-white max-w-xs">
          <div className="text-center py-2">
            <div className="text-5xl mb-3">🎉</div>
            <div className="text-xl font-black text-yellow-400 mb-1">Congratulations!</div>
            <div className="text-sm text-slate-300 mb-4">You've got your daily VIP rewards:</div>
            <div className="space-y-2 mb-5 text-left">
              {[
                { icon: '🌟', label: `${dailyRewards.avatarShards}× Avatar Shard`, iconImage: 'avatar_shard' },
                { icon: '⚙️', label: `${dailyRewards.weaponParts}× Weapon Parts`, iconImage: 'gear_shard' },
                { icon: '💵', label: `$${dailyRewards.cash.toLocaleString()} Cash` },
                { icon: '🛡️', label: `${dailyRewards.boosts}× Cover Boost +25` },
                { icon: '⚡', label: `${dailyRewards.boosts}× Stamina Boost +25` },
                { icon: '🔋', label: `${dailyRewards.boosts}× Energy Boost +25` },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-900/60 rounded-lg px-3 py-1.5">
                  <span className="flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
                    {r.iconImage === 'avatar_shard' ? <AvatarShardIcon size={18} /> : r.iconImage === 'gear_shard' ? <GearPartIcon size={18} /> : <span className="text-lg">{r.icon}</span>}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{r.label}</span>
                  <span className="ml-auto text-emerald-400 font-bold">✓</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setClaimSuccess(false)}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlreadyClaimedPopup
        open={showAlreadyClaimed}
        onClose={() => setShowAlreadyClaimed(false)}
        message="You've already claimed your VIP daily rewards today. Check back after the daily server reset."
      />

      <VipInfoModal open={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}