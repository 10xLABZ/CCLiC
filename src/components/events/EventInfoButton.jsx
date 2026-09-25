import React, { useState } from "react";
import { Info, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EVENT_INFO = {
  fastfive: {
    title: "⚡ FAST FIVE",
    description: "Complete 5 attacks, 5 jobs, 5 assists, 5 sabotages, and 5 insider trades during the active window. All five goals must be completed to claim rewards.",
    howTo: "Play normally — every attack, job, assist, sabotage, and trade counts. Progress is tracked from the event start time. Claim your rewards before the timer ends or they'll be sent to your Messages tab!",
    schedule: "Runs multiple times daily in short 5-hour windows with cooldowns between.",
  },
  shardfrenzy: {
    title: "🧩 AVATAR SHARD FRENZY",
    description: "Complete 50 attacks, 50 jobs, 50 assists, 50 sabotages, and 50 insider trades during the active window to earn avatar shards and boosts.",
    howTo: "Grind your daily activities at a higher volume. Progress is tracked from the event start. Claim before it ends or rewards go to Messages.",
    schedule: "Week-long event with a 2-day cooldown between cycles.",
  },
  gearoverdrive: {
    title: "⚙️ GEAR OVERDRIVE",
    description: "Complete 50 attacks, 50 jobs, 50 assists, 50 sabotages, and 50 insider trades to earn gear parts and boosts.",
    howTo: "Same goals as Shard Frenzy but rewards focus on gear parts for weapon upgrades. Push your activity to the max!",
    schedule: "Week-long event alternating with Shard Frenzy.",
  },
  worldtour: {
    title: "🌍 WORLD TOUR",
    description: "Complete jobs, attacks, assists, and sabotages in EVERY city across the map (3 of each action type per city), plus a target number of insider trades.",
    howTo: "Travel to different cities and perform all 4 action types (jobs, attacks, assists, sabotages) in each one. Use the World Tour tracker to see which cities still need work. Each city needs 3 of each action type.",
    schedule: "Month-long event. Resets at the start of each month.",
  },
  capitalclash: {
    title: "🏆 CAPITAL CLASH",
    description: "Fight your way up a 100-slot leaderboard. Battle players above you to take their slot. Higher rank = better rewards at event end.",
    howTo: "Join by fighting a slot in the 96–100 range. Win to swap positions. You can challenge up to 5 slots above you. The #1 slot holder can defend against slots 2–4. Costs 5 stamina per fight.",
    schedule: "Monday–Friday weekly event.",
  },
  fvf: {
    title: "⚔️ FUND vs FUND (FvF)",
    description: "Your alliance is matched against another alliance. Compete daily from Monday to Saturday across themed days. The alliance with the most day-wins takes the victory.",
    howTo: "Each day has a theme (Intel, Firearms Dev, Research, Avatar, Full Prep, Battle). Complete the daily goals to earn points for your alliance. The alliance with more points each day wins 2 event points (4 on Saturday). Most event points at the end wins!",
    schedule: "Monday–Saturday. Sunday is cooldown. Weekly cycle.",
  },
};

export default function EventInfoButton({ eventKey }) {
  const [open, setOpen] = useState(false);
  const info = EVENT_INFO[eventKey];
  if (!info) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
        title="How to play"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm pr-8">
              {info.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Overview</div>
              <div className="text-slate-300 leading-relaxed">{info.description}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">How to Play</div>
              <div className="text-slate-300 leading-relaxed">{info.howTo}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Schedule</div>
              <div className="text-slate-400 leading-relaxed">{info.schedule}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}