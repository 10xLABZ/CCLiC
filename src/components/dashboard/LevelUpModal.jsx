import React, { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Star } from "lucide-react";
import { getPlayerData, savePlayerData } from "@/components/utils/playerStorage";
import { addMessage } from "@/components/events/eventStorage";

const COUNTDOWN_SECS = 5;

// Rewards granted per level-up
const LEVELUP_REWARDS = [
  { id: 'ENERGY_100', label: 'Energy Refill (+100)', icon: '⚡', consumable: 'ENERGY_100', amount: 1 },
  { id: 'STAMINA_100', label: 'Stamina Refill (+100)', icon: '💪', consumable: 'STAMINA_100', amount: 1 },
  { id: 'OPCOVER_100', label: 'Cover Refill (+100)', icon: '🛡️', consumable: 'OPCOVER_100', amount: 1 },
];

function applyLevelUpRewards(levelsCount = 1) {
  const player = getPlayerData();
  const consumables = { ...(player.consumables || {}) };
  for (const r of LEVELUP_REWARDS) {
    consumables[r.consumable] = (consumables[r.consumable] || 0) + levelsCount;
  }
  return savePlayerData({ consumables });
}

function sendToMessages(levels) {
  addMessage({
    id: `msg_levelup_${Date.now()}`,
    title: `🎉 Level Up Rewards — Level ${levels.join(', ')}`,
    body: 'You dismissed the level-up screen. Tap CLAIM to collect your rewards.',
    rewards: LEVELUP_REWARDS,
    rewardType: 'levelup',
    levelsCount: levels.length,
    claimed: false,
    timestamp: Date.now(),
  });
}

export default function LevelUpModal({ open, levels, onClose }) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [claimed, setClaimed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open || !levels || levels.length === 0) return;
    setClaimed(false);
    setCountdown(COUNTDOWN_SECS);

    // Confetti
    const duration = 3000;
    const animEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const confettiInterval = setInterval(() => {
      const timeLeft = animEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(confettiInterval);
      const pc = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount: pc, origin: { x: Math.random() * 0.3 + 0.1, y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount: pc, origin: { x: Math.random() * 0.3 + 0.7, y: Math.random() - 0.2 } });
    }, 250);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      clearInterval(confettiInterval);
      clearInterval(timerRef.current);
    };
  }, [open, levels]);

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);
    clearInterval(timerRef.current);
    applyLevelUpRewards(levels ? levels.length : 1);
    setTimeout(onClose, 800);
  };

  const handleDismiss = () => {
    if (!claimed) {
      sendToMessages(levels || []);
    }
    clearInterval(timerRef.current);
    onClose();
  };

  if (!open || !levels || levels.length === 0) return null;

  const topLevel = levels[levels.length - 1];

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="bg-gradient-to-br from-yellow-900 via-amber-800 to-yellow-900 border-2 border-yellow-400 text-white max-w-sm">
        <div className="text-center py-4">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <Trophy className="w-16 h-16 text-yellow-300 animate-bounce" />
              <Star className="w-7 h-7 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1 text-yellow-100">LEVEL UP!</h2>
          <div className="text-5xl font-black mb-1 text-yellow-300 drop-shadow-lg">{topLevel}</div>
          {levels.length > 1 && (
            <div className="text-xs text-yellow-400 mb-1">(+{levels.length} levels gained)</div>
          )}

          <p className="text-sm mb-4 text-yellow-200">You've reached Level {topLevel}!</p>

          {/* Rewards */}
          <div className="bg-black/30 rounded-xl p-3 mb-4 space-y-2">
            <div className="text-xs font-bold text-yellow-300 uppercase tracking-wider mb-2">🎁 Level Up Rewards</div>
            {LEVELUP_REWARDS.map(r => (
              <div key={r.id} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5">
                <span className="text-lg">{r.icon}</span>
                <span className="text-sm text-yellow-100">{r.label}</span>
                {levels.length > 1 && <span className="ml-auto text-yellow-400 text-xs font-bold">x{levels.length}</span>}
              </div>
            ))}
          </div>

          {claimed ? (
            <div className="text-emerald-300 font-bold text-lg py-2">✓ Rewards Added!</div>
          ) : (
            <>
              <Button
                onClick={handleClaim}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base py-3 mb-2"
              >
                🎁 CLAIM REWARDS {countdown > 0 ? `(${countdown}s)` : ''}
              </Button>
              <button
                onClick={handleDismiss}
                className="text-yellow-600 text-xs underline hover:text-yellow-400 transition-colors"
              >
                Dismiss (rewards saved to Messages)
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}