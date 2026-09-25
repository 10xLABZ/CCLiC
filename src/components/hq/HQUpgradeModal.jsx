import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import CrydIcon from "@/components/shared/CrydIcon";

export default function HQUpgradeModal({ open, level, cashCost, cryptoCost, onUpgradeCash, onUpgradeCryd, onClose }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (open && !firedRef.current) {
      firedRef.current = true;
      const duration = 2500;
      const end = Date.now() + duration;
      const colors = ["#fbbf24", "#f59e0b", "#fde687", "#ffffff", "#fcd34d"];
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, scalar: 0.9 });
        confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, scalar: 0.9 });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors, scalar: 1.2 });
    }
    if (!open) firedRef.current = false;
  }, [open, level]);

  const fireSmallConfetti = () => {
    const colors = ["#fbbf24", "#f59e0b", "#fde687", "#ffffff", "#fcd34d"];
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, colors, scalar: 0.8, startVelocity: 25 });
  };

  const handleUpgradeCash = () => { fireSmallConfetti(); onUpgradeCash?.(); };
  const handleUpgradeCryd = () => { fireSmallConfetti(); onUpgradeCryd?.(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#0a0f1a] border-2 border-yellow-600/50 text-white max-w-xs" style={{ boxShadow: "0 0 40px rgba(234,179,8,0.3)" }}>
        <div className="text-center space-y-1 pt-2">
          <div className="text-base font-black text-yellow-400 uppercase tracking-widest">🎉 Congratulations!</div>
          <div className="text-xs text-slate-400 mt-1">You've upgraded your HQ to level</div>

          {/* Glowing level number on its own line */}
          <div
            className="font-black text-yellow-400 leading-none py-3"
            style={{
              fontSize: level >= 1000 ? "48px" : level >= 100 ? "64px" : "80px",
              textShadow: "0 0 20px rgba(234,179,8,0.9), 0 0 40px rgba(234,179,8,0.5), 0 0 60px rgba(234,179,8,0.3)",
            }}
          >
            {level}
          </div>

          {/* Seamless upgrade buttons */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full bg-green-700 hover:bg-green-600 h-[34px] px-2"
              style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}
              onClick={handleUpgradeCash}
            >
              <span className="flex items-center gap-1 text-left">
                <span className="text-sm">💵</span>
                <span className="text-[9px] font-black leading-tight">UPGRADE AGAIN</span>
              </span>
              <span className="text-green-200 font-black text-[9px]">
                ${cashCost?.toLocaleString()}
              </span>
            </Button>
            <Button
              className="w-full h-[34px] px-2"
              style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)", border: "1px solid #7c3aed", justifyContent: "space-between", display: "flex", alignItems: "center" }}
              onClick={handleUpgradeCryd}
            >
              <span className="flex items-center gap-1 text-left">
                <CrydIcon size={13} />
                <span className="text-[9px] font-black leading-tight">UPGRADE AGAIN</span>
              </span>
              <span className="flex items-center gap-0.5 font-black text-purple-200 text-[9px]">
                {cryptoCost} <CrydIcon size={11} /> CRYD
              </span>
            </Button>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full border-slate-700 text-slate-400 mt-1 h-7 text-[10px]">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}