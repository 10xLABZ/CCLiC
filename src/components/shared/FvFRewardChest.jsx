import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { patchPlayerData } from '@/lib/playerMemory';
import {
  isFvfRewardClaimed, markFvfRewardClaimed,
  FVF_WINNING_REWARDS, FVF_LOSING_REWARDS,
} from '@/lib/fvfRewardHelper';
import { CHEST_BG_URL, CHEST_IMG_URLS } from '@/lib/dailyGiftHelper';
import AlreadyClaimedPopup from '@/components/shared/AlreadyClaimedPopup';

const IDLE_FRAMES = [1, 2, 3, 2];
const OPENING_FRAMES = [4, 5, 6];

export default function FvFRewardChest({ weekStartDate, isWinner, size = 120, onClaimed }) {
  const alreadyClaimed = isFvfRewardClaimed(weekStartDate);
  const [phase, setPhase] = useState(alreadyClaimed ? 'opened' : 'idle');
  const [idleFrameIdx, setIdleFrameIdx] = useState(0);
  const [openingFrameIdx, setOpeningFrameIdx] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const claimId = useRef(0);

  useEffect(() => {
    [1, 2, 3, 4, 5, 6].forEach(n => { const img = new Image(); img.src = CHEST_IMG_URLS[n]; });
    const bg = new Image(); bg.src = CHEST_BG_URL;
  }, []);

  useEffect(() => {
    if (phase !== 'idle') return;
    const interval = setInterval(() => {
      setIdleFrameIdx(prev => (prev + 1) % IDLE_FRAMES.length);
    }, 250);
    return () => clearInterval(interval);
  }, [phase]);

  const fireConfetti = () => {
    const colors = isWinner
      ? ['#FFD700', '#FFA500', '#FFEB3B', '#4CAF50', '#2196F3']
      : ['#9CA3AF', '#6B7280', '#4B5563', '#3B82F6', '#60A5FA'];
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 400);
  };

  const handleClick = async () => {
    if (claiming || phase !== 'idle' || alreadyClaimed) return;
    setClaiming(true);
    const myClaimId = ++claimId.current;

    setPhase('opening');
    setOpeningFrameIdx(0);

    const rewards = isWinner ? FVF_WINNING_REWARDS : FVF_LOSING_REWARDS;

    const serverPromise = (async () => {
      try {
        const res = await base44.functions.invoke('claimFvfRewards', {
          week_start_date: weekStartDate,
          is_winner: isWinner,
        });
        const data = res?.data;

        if (!data?.success) {
          // Only mark as claimed locally if the SERVER says it was already
          // claimed (lock exists). For other errors (delivery failure, etc.),
          // do NOT mark locally — the user should be able to retry.
          if (data.already_claimed) {
            markFvfRewardClaimed(weekStartDate);
          }
          return { rejected: true, alreadyClaimed: !!data.already_claimed };
        }

        // Patch local cache from authoritative server response
        const patch = {};
        if (data.new_cash != null) patch.cash = data.new_cash;
        if (data.new_consumables != null) patch.consumables = data.new_consumables;
        if (Object.keys(patch).length > 0) patchPlayerData(patch);

        markFvfRewardClaimed(weekStartDate);
        return { rejected: false };
      } catch (e) {
        console.error('FvF reward claim failed:', e);
        return { rejected: true };
      }
    })();

    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;
    setOpeningFrameIdx(1);
    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;
    setOpeningFrameIdx(2);
    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;

    const result = await serverPromise;
    if (myClaimId !== claimId.current) return;

    setPhase('opened');
    if (result?.rejected) {
      setShowAlreadyClaimed(true);
    } else {
      setShowCongrats(true);
      fireConfetti();
    }
    setClaiming(false);
    onClaimed?.();
  };

  const currentFrame = phase === 'idle'
    ? IDLE_FRAMES[idleFrameIdx]
    : phase === 'opening'
      ? OPENING_FRAMES[Math.min(openingFrameIdx, OPENING_FRAMES.length - 1)]
      : 6;

  const rewards = isWinner ? FVF_WINNING_REWARDS : FVF_LOSING_REWARDS;

  return (
    <>
      <style>{`
        @keyframes fvfChestGlowPulse {
          0%, 100% {
            box-shadow: 0 0 8px 2px rgba(255,215,0,0.4), 0 0 16px 4px rgba(255,215,0,0.2);
            opacity: 0.7;
          }
          50% {
            box-shadow: 0 0 16px 4px rgba(255,215,0,0.7), 0 0 32px 8px rgba(255,215,0,0.4);
            opacity: 1;
          }
        }
        .fvf-chest-glow { animation: fvfChestGlowPulse 1.5s ease-in-out infinite; }
      `}</style>

      <div
        className="relative cursor-pointer select-none"
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        <img
          src={CHEST_BG_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
          draggable={false}
        />

        {phase === 'idle' && !alreadyClaimed && (
          <div
            className="fvf-chest-glow absolute rounded-full pointer-events-none"
            style={{
              width: '70%',
              height: '70%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%)',
            }}
          />
        )}

        <img
          src={CHEST_IMG_URLS[currentFrame]}
          alt="FvF Reward"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
          style={{ width: '75%', height: '75%' }}
          draggable={false}
        />

        {alreadyClaimed && phase === 'opened' && !showCongrats && (
          <div className="absolute top-0 right-0 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg">
            ✓
          </div>
        )}
      </div>

      <AlreadyClaimedPopup
        open={showAlreadyClaimed}
        onClose={() => setShowAlreadyClaimed(false)}
        message="You've already claimed your FvF event rewards for this week. Check back after the next server reset."
      />

      {showCongrats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4">
          <div className={`bg-gradient-to-b ${isWinner ? 'from-yellow-950 to-[#0a0805] border-2 border-yellow-500' : 'from-slate-800 to-[#0a0805] border-2 border-slate-500'} rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl`}>
            <div className="text-5xl mb-3">{isWinner ? '🏆' : '🎁'}</div>
            <h2 className={`text-xl font-black mb-2 tracking-wide ${isWinner ? 'text-yellow-400' : 'text-slate-200'}`}>
              {isWinner ? 'VICTORY!' : 'PARTICIPATION REWARDS'}
            </h2>
            <p className="text-sm text-slate-300 mb-3">
              {isWinner ? 'Your alliance won the FvF event!' : 'Your alliance fought valiantly!'}
            </p>
            <div className="space-y-2 mb-5">
              {rewards.map((r, i) => (
                <div key={i} className={`flex items-center justify-center gap-2 text-sm font-bold ${isWinner ? 'text-yellow-300' : 'text-slate-300'}`}>
                  <span>{r.icon}</span> {r.label}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCongrats(false)}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black py-2.5 rounded-xl transition-colors"
            >
              AWESOME!
            </button>
          </div>
        </div>
      )}
    </>
  );
}