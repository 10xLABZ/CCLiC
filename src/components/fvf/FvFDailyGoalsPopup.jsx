import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

/**
 * FvFDailyGoalsPopup — shows a single day's FvF daily goals in a popup dialog.
 * Same content as the Daily Goals tab but accessible via (i) icon.
 */
export default function FvFDailyGoalsPopup({ theme, open, onClose }) {
  if (!theme) return null;
  const c = THEME_COLOR_MAP[theme.color];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-sm p-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className={`${c.bg} ${c.border} border-b px-4 py-4 flex items-center gap-3`}>
          <span className="text-3xl">{theme.icon}</span>
          <div className="flex-1">
            <div className={`font-bold text-sm ${c.text}`}>{theme.day} — {theme.label}</div>
            <div className="text-[11px] text-slate-400">{theme.description}</div>
          </div>
          {theme.isDouble && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-[10px]">2× SAT</Badge>
          )}
        </div>

        {/* Goals list */}
        <div className="space-y-2 p-4">
          {theme.goals.map((goal, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-300">{goal.label}</span>
              <span className={`text-xs font-bold ml-2 shrink-0 ${c.text}`}>+{goal.points} pt{goal.points > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 text-[11px] text-slate-400">
          Alliance contributions are pooled. Day winner earns <span className="text-yellow-400 font-bold">{theme.isDouble ? 4 : 2} event points</span> toward the weekly total.
        </div>
      </DialogContent>
    </Dialog>
  );
}

const THEME_COLOR_MAP = {
  blue:   { border: "border-blue-500/40",   bg: "bg-blue-900/20",   text: "text-blue-400",   bar: "bg-blue-500"   },
  red:    { border: "border-red-500/40",    bg: "bg-red-900/20",    text: "text-red-400",    bar: "bg-red-500"    },
  purple: { border: "border-purple-500/40", bg: "bg-purple-900/20", text: "text-purple-400", bar: "bg-purple-500" },
  pink:   { border: "border-pink-500/40",   bg: "bg-pink-900/20",   text: "text-pink-400",   bar: "bg-pink-500"   },
  yellow: { border: "border-yellow-500/40", bg: "bg-yellow-900/20", text: "text-yellow-400", bar: "bg-yellow-500" },
  orange: { border: "border-orange-500/40", bg: "bg-orange-900/20", text: "text-orange-400", bar: "bg-orange-500" },
};