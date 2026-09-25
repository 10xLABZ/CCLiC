import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Zap } from "lucide-react";

export default function LevelUpModal({ open, onClose, newLevel }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-emerald-500/50 text-white max-w-md">
        <div className="text-center py-8">
          <div className="text-7xl mb-4">🎉</div>
          <h2 className="text-4xl font-bold mb-2 text-emerald-400">
            LEVEL UP!
          </h2>
          <div className="text-6xl font-bold text-white mb-6">
            {newLevel}
          </div>
          
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">Congratulations!</span>
            </div>
            <p className="text-sm text-slate-300">
              You've reached <span className="text-emerald-400 font-bold">Level {newLevel}</span>!
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Keep trading and fighting to level up further!
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-500"
          >
            <Zap className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}