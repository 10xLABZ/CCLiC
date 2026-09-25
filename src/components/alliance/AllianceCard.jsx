import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Lock, Unlock } from "lucide-react";
import { getAllianceImageUrl } from "@/components/fund/FundImagePicker";

export default function AllianceCard({ alliance, onJoin, isMine, joining }) {
  const desc = alliance.description
    ? alliance.description.length > 40
      ? alliance.description.slice(0, 40) + "..."
      : alliance.description
    : null;

  const emblemUrl = getAllianceImageUrl(alliance.emblem);

  return (
    <div className="bg-[#0d1320] border border-slate-800 rounded-xl p-3 w-full overflow-hidden">
      {/* Row 1: emblem + name + tag + MINE badge */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-700 shrink-0 overflow-hidden">
          {emblemUrl
            ? <img src={emblemUrl} alt="emblem" className="w-full h-full object-cover" />
            : <span className="text-xl">{alliance.emblem || "🏰"}</span>}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-bold text-white text-sm truncate">{alliance.name}</span>
          <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-800/40 px-1 py-0.5 rounded font-mono shrink-0">[{alliance.tag}]</span>
          {isMine && (
            <span className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/30 px-1.5 py-0.5 rounded font-semibold shrink-0">MINE</span>
          )}
        </div>
      </div>

      {/* Row 2: description (truncated) */}
      {desc && (
        <div className="text-[10px] text-slate-500 mt-1 truncate">{desc}</div>
      )}

      {/* Row 3: stats + JOIN button */}
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-0.5 shrink-0"><Users className="w-3 h-3" />{alliance.member_count || 1}</span>
        <span className="flex items-center gap-0.5 shrink-0">⚡ {Math.round(alliance.total_power || 0).toLocaleString()}</span>
        {alliance.is_open
          ? <span className="flex items-center gap-0.5 text-emerald-500 shrink-0"><Unlock className="w-3 h-3" />Open</span>
          : <span className="flex items-center gap-0.5 text-red-500 shrink-0"><Lock className="w-3 h-3" />Closed</span>}
        {!isMine && (
          alliance.is_open === false
            ? <Button
                size="sm"
                disabled
                className="ml-auto bg-slate-700 text-slate-500 font-bold text-[10px] h-6 px-2.5 shrink-0 cursor-not-allowed opacity-60"
              >
                CLOSED
              </Button>
            : <Button
                size="sm"
                onClick={() => onJoin(alliance)}
                disabled={joining}
                className="ml-auto bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] h-6 px-2.5 shrink-0"
              >
                JOIN
              </Button>
        )}
      </div>
    </div>
  );
}