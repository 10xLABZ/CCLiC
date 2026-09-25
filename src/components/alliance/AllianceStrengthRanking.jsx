import React, { useState } from "react";
import { Crown } from "lucide-react";
import AllianceMemberProfileModal from "./AllianceMemberProfileModal";

export default function AllianceStrengthRanking({ members, currentUserId, onDM }) {
  // fund_power on AllianceMember = ATK + DEF + fund bonus (synced on every save)
  // We use this instead of PlayerProfile to avoid RLS blocking reads of other users' profiles
  const sorted = [...members].sort((a, b) => (b.fund_power || 0) - (a.fund_power || 0));
  const [viewingMember, setViewingMember] = useState(null);

  return (
    <>
    <div className="space-y-2">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Ranked by Total Power (TP)</div>
      {sorted.map((m, i) => (
        <div key={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${m.user_id === currentUserId ? 'bg-amber-900/10 border-amber-800/40' : 'bg-[#0d1320] border-slate-800'}`}>
          <div className={`w-6 text-center font-black text-sm shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
            {i === 0 ? <Crown className="w-4 h-4 mx-auto text-yellow-400" /> : `#${i + 1}`}
          </div>
          <button
            onClick={() => setViewingMember(m)}
            className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-amber-600 transition-colors"
          >
            {m.profile_image_url ? <img src={m.profile_image_url} className="w-full h-full object-cover" alt="" /> : <span>👤</span>}
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => setViewingMember(m)} className={`font-semibold text-sm hover:underline ${m.user_id === currentUserId ? 'text-amber-400' : 'text-white'}`}>{m.username}</button>
            {m.user_id === currentUserId && <span className="text-[9px] text-amber-600 ml-1">(You)</span>}
            <div className="text-[10px] text-slate-500">Lv.{m.level}</div>
          </div>
          <div className="text-sm font-bold text-amber-300">⚡ {Math.round(m.fund_power || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
    {viewingMember && (
      <AllianceMemberProfileModal
        member={viewingMember}
        open={!!viewingMember}
        onClose={() => setViewingMember(null)}
        onDM={onDM}
        currentUserId={currentUserId}
        isOwnAlliance={true}
      />
    )}
    </>
  );
}