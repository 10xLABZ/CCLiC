import React from "react";
import { Button } from "@/components/ui/button";
import { Crown, Shield, User, LogOut } from "lucide-react";

const ROLE_ICONS = { leader: <Crown className="w-3 h-3 text-amber-400" />, officer: <Shield className="w-3 h-3 text-blue-400" />, member: <User className="w-3 h-3 text-slate-500" /> };

export default function AllianceRoster({ members, currentUserId, isLeader, onKick, onLeave }) {
  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.id} className="flex items-center gap-3 bg-[#0d1320] border border-slate-800 rounded-lg px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {m.profile_image_url ? <img src={m.profile_image_url} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">👤</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {ROLE_ICONS[m.role]}
              <span className={`font-semibold text-sm ${m.user_id === currentUserId ? "text-amber-400" : "text-white"}`}>{m.username}</span>
              {m.user_id === currentUserId && <span className="text-[9px] text-amber-600">(You)</span>}
            </div>
            <div className="text-[10px] text-slate-500">Lv.{m.level} · ⚡ {Math.round(m.fund_power || 0)}</div>
          </div>
          {isLeader && m.user_id !== currentUserId && (
            <Button size="sm" variant="ghost" onClick={() => onKick(m)} className="text-red-500 hover:text-red-400 hover:bg-red-950 h-6 px-2 text-[10px]">
              Kick
            </Button>
          )}
          {!isLeader && m.user_id === currentUserId && (
            <Button size="sm" variant="ghost" onClick={onLeave} className="text-red-500 hover:text-red-400 hover:bg-red-950 h-6 px-2 text-[10px]">
              <LogOut className="w-3 h-3 mr-1" />Leave
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}