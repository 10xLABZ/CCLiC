import React from "react";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MemberPlayerCard({ member, onClose, onDM }) {
  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-[#0a0f1a] border border-amber-900/40 rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#060a12] border-b border-slate-800">
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wide">Player Profile</span>
          <button onPointerDown={onClose} className="p-1 rounded hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Profile image + name */}
        <div className="flex flex-col items-center pt-5 pb-3 px-4">
          <div className="w-20 h-20 rounded-xl border-2 border-amber-700/50 overflow-hidden bg-slate-900 mb-3">
            {member.profile_image_url ? (
              <img src={member.profile_image_url} alt={member.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-slate-700">👤</div>
            )}
          </div>
          <div className="text-sm font-bold text-amber-400">{member.username || "Unknown"}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Lv {member.level || 1} &bull; <span className="capitalize text-slate-400">{member.role || "member"}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 mb-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
          <CardStatRow icon="💥" label="Fund Power" value={(member.fund_power || 0).toLocaleString()} />
          <CardStatRow icon="👥" label="Alliance" value={member.role === 'leader' ? '👑 Leader' : member.role === 'officer' ? '⭐ Officer' : '🔰 Member'} />
        </div>

        {/* Actions */}
        <div className="px-4 pb-4">
          <Button
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm h-9 flex items-center gap-2"
            onPointerDown={() => { onDM(member); onClose(); }}
          >
            <MessageCircle className="w-4 h-4" /> Send DM
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardStatRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 flex items-center gap-1.5"><span>{icon}</span>{label}</span>
      <span className="text-slate-200 font-semibold">{value}</span>
    </div>
  );
}