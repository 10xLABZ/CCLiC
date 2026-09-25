import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatTimeLeft(ms) {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ShieldTimerPopup({ open, onClose, hiddenUntil }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!open) return;
    const tick = () => setTimeLeft(Math.max(0, hiddenUntil - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, hiddenUntil]);

  useEffect(() => {
    if (open && timeLeft === 0 && hiddenUntil && hiddenUntil < Date.now()) {
      onClose();
    }
  }, [timeLeft]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-emerald-700/50 text-white max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 text-base">🛡️ Recovery Shield Active</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="text-5xl font-black text-emerald-300 font-mono tracking-widest mb-2">
            {formatTimeLeft(timeLeft)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            You're protected from opponents until the timer expires.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}