import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { applyServerReward, grantConsumables } from '@/lib/playerServerSync';
import {
  isDailyGiftClaimed, markDailyGiftClaimed, syncDailyGiftClaimedState,
  VIP_GIFTS, DVS_GIFT,
  CHEST_BG_URL, CHEST_IMG_URLS,
} from '@/lib/dailyGiftHelper';

const IDLE_FRAMES = [1, 2, 3, 2];
const OPENING_FRAMES = [4, 5, 6];

export default function DailyGiftChest({ giftType = 'dvs', size = 130, onClaimed, glowDuration = '1.5s', glowStrong = false }) {
  const alreadyClaimed = isDailyGiftClaimed(giftType);
  const [phase, setPhase] = useState(alreadyClaimed ? 'opened' : 'idle');
  const [idleFrameIdx, setIdleFrameIdx] = useState(0);
  const [openingFrameIdx, setOpeningFrameIdx] = useState(0);
  const [reward, setReward] = useState(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedState, setClaimedState] = useState(alreadyClaimed);
  const claimId = useRef(0);

  // Preload all chest images
  useEffect(() => {
    [1, 2, 3, 4, 5, 6].forEach(n => { const img = new Image(); img.src = CHEST_IMG_URLS[n]; });
    const bg = new Image(); bg.src = CHEST_BG_URL;
  }, []);

  // Server-authoritative sync on mount — verifies localStorage claim state
  // against the server to prevent false "unclaimed" chest display.
  useEffect(() => {
    let cancelled = false;
    syncDailyGiftClaimedState(giftType).then((serverClaimed) => {
      if (cancelled) return;
      if (serverClaimed && !claimedState) {
        setClaimedState(true);
        setPhase('opened');
      }
    });
    return () => { cancelled = true; };
  }, [giftType]);

  // Idle animation loop — cycles chest-1,2,3,2 at 250ms each
  useEffect(() => {
    if (phase !== 'idle') return;
    const interval = setInterval(() => {
      setIdleFrameIdx(prev => (prev + 1) % IDLE_FRAMES.length);
    }, 250);
    return () => clearInterval(interval);
  }, [phase]);

  const fireConfetti = () => {
    const colors = ['#FFD700', '#FFA500', '#FFEB3B', '#4CAF50', '#2196F3'];
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 400);
  };

  const handleClick = async () => {
    if (claiming || phase !== 'idle' || claimedState) return;
    setClaiming(true);
    const myClaimId = ++claimId.current;

    // Start opening animation immediately
    setPhase('opening');
    setOpeningFrameIdx(0);

    // Run server calls in parallel with animation
    const serverPromise = (async () => {
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const rewardKey = `daily_gift_${giftType}_${dateStr}`;
        const res = await base44.functions.invoke('claimReward', {
          reward_type: `daily_gift_${giftType}`,
          reward_key: rewardKey,
          cycle_id: rewardKey,
        });

        if (!res.data?.success) {
          // Already claimed on server — sync local state, signal rejection
          markDailyGiftClaimed(giftType);
          setClaimedState(true);
          return { rejected: true };
        }

        // Determine reward
        const gift = giftType === 'dvs' ? DVS_GIFT : VIP_GIFTS[Math.floor(Math.random() * VIP_GIFTS.length)];

        // Grant reward — server-authoritative for both IGC and consumables
        if (gift.type === 'igc') {
          await applyServerReward({ cash_delta: gift.amount, reason: `daily_gift_${giftType}` });
        } else {
          await grantConsumables({ [gift.key]: gift.amount });
        }

        markDailyGiftClaimed(giftType);
        setClaimedState(true);
        return { gift, rejected: false };
      } catch (e) {
        console.error('Daily gift claim failed:', e);
        return { rejected: true };
      }
    })();

    // Animate through opening frames (200ms each)
    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;
    setOpeningFrameIdx(1);
    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;
    setOpeningFrameIdx(2);
    await new Promise(r => setTimeout(r, 200));
    if (myClaimId !== claimId.current) return;

    // Wait for server calls to complete
    const result = await serverPromise;
    if (myClaimId !== claimId.current) return;

    setPhase('opened');
    if (result?.rejected) {
      // Server rejected — already claimed on another device
      setShowAlreadyClaimed(true);
    } else {
      setReward(result?.gift || null);
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

  return (
    <>
      <style>{`
        @keyframes chestGlowPulse {
          0%, 100% {
            box-shadow: 0 0 8px 2px rgba(255,215,0,0.4), 0 0 16px 4px rgba(255,215,0,0.2);
            opacity: 0.7;
          }
          50% {
            box-shadow: 0 0 16px 4px rgba(255,215,0,0.7), 0 0 32px 8px rgba(255,215,0,0.4);
            opacity: 1;
          }
        }
        .chest-glow { animation: chestGlowPulse 1.5s ease-in-out infinite; }
      `}</style>

      <div
        className="relative cursor-pointer select-none"
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        {/* Chest background frame */}
        <img
          src={CHEST_BG_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
          draggable={false}
        />

        {/* Golden animated glow behind chest */}
        {phase === 'idle' && !claimedState && (
          <div
            className="chest-glow absolute rounded-full pointer-events-none"
            style={{
              width: glowStrong ? '90%' : '70%',
              height: glowStrong ? '90%' : '70%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: glowStrong
                ? 'radial-gradient(circle, rgba(255,215,0,0.55) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%)',
              animationDuration: glowDuration,
            }}
          />
        )}

        {/* Chest image overlay at 75% size, centered */}
        <img
          src={CHEST_IMG_URLS[currentFrame]}
          alt="Daily Gift"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
          style={{ width: '75%', height: '75%' }}
          draggable={false}
        />

        {/* Already claimed badge */}
        {claimedState && phase === 'opened' && !showCongrats && !showAlreadyClaimed && (
          <div className="absolute top-0 right-0 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg">
            ✓
          </div>
        )}
      </div>

      {/* Congratulations popup */}
      {showCongrats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4">
          <div className="bg-gradient-to-b from-yellow-950 to-[#0a0805] border-2 border-yellow-500 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-black text-yellow-400 mb-2 tracking-wide">CONGRATULATIONS!</h2>
            <p className="text-sm text-slate-300 mb-3">YOU'VE GOT...</p>
            {reward ? (
              <div className="text-2xl font-black text-yellow-300 mb-5">
                {reward.icon} {reward.label}
              </div>
            ) : (
              <div className="text-sm text-slate-400 mb-5">Already claimed today — come back tomorrow!</div>
            )}
            <button
              onClick={() => setShowCongrats(false)}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black py-2.5 rounded-xl transition-colors"
            >
              AWESOME!
            </button>
          </div>
        </div>
      )}

      {/* Already claimed popup — distinct from congrats */}
      {showAlreadyClaimed && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4">
          <div className="bg-gradient-to-b from-slate-900 to-[#0a0805] border-2 border-slate-600 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-black text-slate-200 mb-2 tracking-wide">ALREADY CLAIMED</h2>
            <p className="text-sm text-slate-400 mb-5">
              You've already claimed your free daily reward for today. Check back after the daily server reset for your next one.
            </p>
            <button
              onClick={() => setShowAlreadyClaimed(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
}