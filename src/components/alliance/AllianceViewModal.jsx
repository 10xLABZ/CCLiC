// Read-only overview of any alliance — shown when a player clicks on a browsed alliance
import React, { useState, useEffect } from "react";
import { X, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getAllianceImageUrl } from "@/components/fund/FundImagePicker";
import { Button } from "@/components/ui/button";
import AllianceViewMembersModal from "./AllianceViewMembersModal";
import AllianceMemberProfileModal from "./AllianceMemberProfileModal";

export default function AllianceViewModal({ alliance, onClose, onJoin, isInAlliance, joining }) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [viewingMemberProfile, setViewingMemberProfile] = useState(null);

  if (!alliance) return null;

  const emblemUrl = getAllianceImageUrl(alliance.emblem);

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-[#0a0f1a] border border-amber-700/40 rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-800">
          <div className="text-sm font-bold text-amber-400">Alliance Overview</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alliance info */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 flex items-center justify-center bg-black/40 rounded-xl border border-amber-700/50 overflow-hidden shrink-0">
              {emblemUrl
                ? <img src={emblemUrl} alt="emblem" className="w-full h-full object-cover" />
                : <span className="text-5xl">{alliance.emblem || "🏰"}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-white truncate">{alliance.name}</span>
                <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded font-mono">[{alliance.tag}]</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Leader: <span className="text-amber-400">{alliance.leader_username}</span></div>
              {alliance.description && (
                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{alliance.description}</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div>
              <button onClick={() => setShowMembersModal(true)} className="hover:opacity-80 transition-opacity">
                <div className="text-amber-400 font-bold underline decoration-dotted">{alliance.member_count || 1}/100</div>
                <div className="text-[10px] text-slate-500">Members</div>
              </button>
            </div>
            <div>
              <div className="text-amber-400 font-bold">⚡ {Math.round(alliance.total_power || 0).toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">Total Power</div>
            </div>
            <div>
              <div className={`text-sm font-bold ${alliance.is_open ? 'text-emerald-400' : 'text-red-400'}`}>
                {alliance.is_open ? '🔓 Open' : '🔒 Closed'}
              </div>
              <div className="text-[10px] text-slate-500">Status</div>
            </div>
          </div>

          {alliance.min_level > 1 && (
            <div className="text-xs text-slate-500 text-center">
              Minimum Level Required: <span className="text-amber-400 font-bold">{alliance.min_level}</span>
            </div>
          )}

          {/* Join button */}
          {alliance.is_open === false ? (
            <Button disabled className="w-full bg-slate-700 text-slate-500 font-bold cursor-not-allowed opacity-60">
              🔒 CLOSED — NOT ACCEPTING MEMBERS
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onJoin(alliance)}
                disabled={joining || isInAlliance}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold disabled:opacity-50"
              >
                {isInAlliance ? '⚠️ Leave Your Alliance First' : 'JOIN THIS ALLIANCE'}
              </Button>
              {isInAlliance && (
                <p className="text-[11px] text-amber-600 text-center -mt-2">
                  You must leave your current alliance before joining a new one.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {showMembersModal && (
      <AllianceViewMembersModal
        alliance={alliance}
        onClose={() => setShowMembersModal(false)}
        onViewMemberProfile={(m) => setViewingMemberProfile(m)}
      />
    )}
    {viewingMemberProfile && (
      <AllianceMemberProfileModal
        member={viewingMemberProfile}
        open={!!viewingMemberProfile}
        onClose={() => setViewingMemberProfile(null)}
        isOwnAlliance={false}
      />
    )}
  </>
  );
}