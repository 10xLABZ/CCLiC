import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crown, User, Settings } from "lucide-react";
import AllianceMemberProfileModal from "./AllianceMemberProfileModal";
import { base44 } from "@/api/base44Client";

const ROLES = ["leader", "vp", "war_general", "strategist", "diplomat", "officer", "member"];
const ROLE_LABELS = { leader: "Leader", vp: "VP", war_general: "War General", strategist: "Strategist", diplomat: "Diplomat", officer: "Officer", member: "Member" };
const ROLE_COLORS = {
  leader: "text-amber-400", vp: "text-blue-400", war_general: "text-red-400",
  strategist: "text-purple-400", diplomat: "text-green-400", officer: "text-cyan-400", member: "text-slate-400"
};
const ROLE_BORDER_COLORS = {
  leader: "#f59e0b", vp: "#60a5fa", war_general: "#f87171",
  strategist: "#c084fc", diplomat: "#4ade80", officer: "#22d3ee", member: "#64748b"
};

const BG_IMAGE = "https://media.base44.com/images/public/699169456a354d6cb7082777/ef22fc74a_alliancememberpage-bg1.jpg";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export default function AllianceMembersPage({ members, currentUserId, myRole, onKick, onPromote, onTransferLeadership, onBack, onDM }) {
  const [gearOpen, setGearOpen] = useState(null);
  const [gearPos, setGearPos] = useState({ top: 0, right: 0 });
  const [viewingMemberProfile, setViewingMemberProfile] = useState(null);
  const [profileMap, setProfileMap] = useState({});
  const [transferTarget, setTransferTarget] = useState(null); // member to transfer to
  const [transferStep, setTransferStep] = useState(0); // 0=hidden, 1=first confirm, 2=second confirm

  const canManage = ["leader", "vp", "officer"].includes(myRole);

  // TP is stored directly on AllianceMember.fund_power (synced on every save)
  // PlayerProfile has RLS that blocks reading other users' records, so we use fund_power instead
  const getTP = (userId) => {
    const m = members.find(mem => mem.user_id === userId);
    return m?.fund_power || 0;
  };

  const getProfileImg = (m) => m.profile_image_url;

  // Sort all members by role hierarchy, then TP desc
  const sorted = [...members].sort((a, b) => {
    const ri = r => ROLES.indexOf(r ?? 'member');
    if (ri(a.role) !== ri(b.role)) return ri(a.role) - ri(b.role);
    return getTP(b.user_id) - getTP(a.user_id);
  });

  const leader = sorted.find(m => m.role === 'leader');
  // Officers section: vp, war_general, strategist, diplomat (shown in hero)
  const heroOfficers = sorted.filter(m => ['vp', 'war_general', 'strategist', 'diplomat'].includes(m.role));

  return (
    <>
      <div className="space-y-0">
        {/* ── HERO SECTION — city bg with leader + officers ── */}
        <div className="relative rounded-xl overflow-hidden mb-3" style={{ minHeight: 260 }}>
          {/* Background image */}
          <img src={BG_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />

          <div className="relative z-10 p-4 flex flex-col items-center">
            {/* Leader */}
            {leader && (
              <button
                onClick={() => setViewingMemberProfile(leader)}
                className="flex flex-col items-center mb-3 group"
              >
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-xl overflow-hidden border-2 shadow-lg group-hover:scale-105 transition-transform"
                    style={{ borderColor: '#f59e0b', boxShadow: '0 0 16px rgba(245,158,11,0.6)' }}
                  >
                    {getProfileImg(leader)
                      ? <img src={getProfileImg(leader)} alt={leader.username} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-2xl">👑</div>}
                  </div>
                  {/* Leader crown — 33% larger (w-6 h-6 vs w-4 h-4) with amber glow */}
                  <Crown className="w-6 h-6 text-amber-400 absolute -top-3 left-1/2 -translate-x-1/2" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.9)) drop-shadow(0 0 2px rgba(245,158,11,1))' }} />
                </div>
                <div className="mt-1 text-[10px] font-bold tracking-widest text-amber-400 uppercase">Leader</div>
                <div className="text-sm font-bold text-white drop-shadow">{leader.username}</div>
                <div className="text-[10px] text-amber-300">⚡ {Math.round(getTP(leader.user_id)).toLocaleString()} TP</div>
              </button>
            )}

            {/* Hero officers row */}
            {heroOfficers.length > 0 && (
              <div className="flex gap-3 justify-center flex-wrap">
                {heroOfficers.map(m => {
                  const role = m.role;
                  const borderColor = ROLE_BORDER_COLORS[role];
                  const labelColor = ROLE_COLORS[role];
                  return (
                    <button
                      key={m.id}
                      onClick={() => setViewingMemberProfile(m)}
                      className="flex flex-col items-center group"
                    >
                      <div className="relative">
                        <div
                          className="w-14 h-14 rounded-lg overflow-hidden border-2 group-hover:scale-105 transition-transform"
                          style={{ borderColor, boxShadow: `0 0 10px ${borderColor}80` }}
                        >
                          {getProfileImg(m)
                            ? <img src={getProfileImg(m)} alt={m.username} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-lg">👤</div>}
                        </div>
                        {/* Role crown with matching role color glow */}
                        <Crown
                          className="w-4 h-4 absolute -top-2.5 left-1/2 -translate-x-1/2"
                          style={{ color: borderColor, filter: `drop-shadow(0 0 4px ${borderColor}) drop-shadow(0 0 2px ${borderColor})` }}
                        />
                      </div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${labelColor}`}>{ROLE_LABELS[role]}</div>
                      <div className="text-[10px] text-slate-200 font-semibold truncate max-w-[70px]">{m.username}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── MEMBERS LIST ── */}
        <div className="bg-[#0d1320] border border-slate-800 rounded-xl overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-white">{members.length} MEMBERS</span>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">TP ▼</div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {sorted.map((m, idx) => {
              const prof = profileMap[m.user_id];
              const tp = Math.round(getTP(m.user_id));
              const imgUrl = getProfileImg(m);
              const role = m.role || 'member';
              const borderColor = ROLE_BORDER_COLORS[role];
              const displayLevel = prof?.level || m.level || 1;
              const isOnline = m.last_active && (Date.now() - m.last_active) < ONLINE_THRESHOLD_MS;

              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/30 transition-colors">
                  {/* Rank badge */}
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold border"
                    style={{ borderColor, color: borderColor, background: `${borderColor}18` }}
                  >
                    {idx + 1}
                  </div>

                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setViewingMemberProfile(m)}
                      className="w-10 h-10 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity block"
                      style={{ borderColor }}
                    >
                      {imgUrl
                        ? <img src={imgUrl} alt={m.username} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-lg">👤</div>}
                    </button>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0d1320]" />
                    )}
                  </div>

                  {/* Name + role + TP */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setViewingMemberProfile(m)}
                      className="font-bold text-sm text-white hover:text-amber-300 transition-colors text-left truncate block w-full"
                    >
                      {m.user_id === currentUserId ? <span className="text-amber-400">{m.username}</span> : m.username}
                    </button>
                    <div className={`text-[10px] font-semibold ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]} · Lv.{displayLevel}
                    </div>
                    <div className="text-[10px] text-amber-300 font-bold">⚡ {tp.toLocaleString()}</div>
                  </div>

                  {/* Manage gear */}
                  {canManage && m.user_id !== currentUserId && !(myRole === 'officer' && m.role === 'leader') && (
                    <div className="shrink-0">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setGearPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                          setGearOpen(gearOpen === m.id ? null : m.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manage dropdown — fixed overlay so it always overlaps everything */}
      {gearOpen && (() => {
        const m = sorted.find(mem => mem.id === gearOpen);
        if (!m) return null;
        return (
          <>
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 px-6" onClick={() => setGearOpen(null)} />
            <div
              className="fixed z-[301] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1526] border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
            >
              <div className="text-[10px] text-slate-500 uppercase tracking-widest px-4 pt-3 pb-2 border-b border-slate-800"><span className="text-white font-bold text-sm normal-case tracking-normal block">{m.username}</span>Manage Member</div>
              {(myRole === "leader" || (["vp","officer"].includes(myRole) && m.role !== "leader")) && (
                <button onClick={() => { onKick(m); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-colors">
                  🥾 Kick
                </button>
              )}
              {myRole === "leader" && m.role !== "vp" && m.role !== "leader" && (
                <button onClick={() => { onPromote(m, "vp"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-900/30 transition-colors">
                  ⬆️ Promote to VP
                </button>
              )}
              {myRole === "leader" && m.role !== "war_general" && m.role !== "leader" && m.role !== "vp" && (
                <button onClick={() => { onPromote(m, "war_general"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-colors">
                  ⚔️ War General
                </button>
              )}
              {myRole === "leader" && m.role !== "strategist" && m.role !== "leader" && m.role !== "vp" && (
                <button onClick={() => { onPromote(m, "strategist"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-900/30 transition-colors">
                  🧠 Strategist
                </button>
              )}
              {myRole === "leader" && m.role !== "diplomat" && m.role !== "leader" && m.role !== "vp" && (
                <button onClick={() => { onPromote(m, "diplomat"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-green-400 hover:bg-green-900/30 transition-colors">
                  🤝 Diplomat
                </button>
              )}
              {myRole === "leader" && m.role !== "officer" && m.role !== "leader" && m.role !== "vp" && (
                <button onClick={() => { onPromote(m, "officer"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                  ⭐ Officer
                </button>
              )}
              {myRole === "leader" && ["vp","war_general","strategist","diplomat","officer"].includes(m.role) && (
                <button onClick={() => { onPromote(m, "member"); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors">
                  ⬇️ Demote to Member
                </button>
              )}
              {myRole === "leader" && (
                <button onClick={() => { setTransferTarget(m); setTransferStep(1); setGearOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-900/30 transition-colors border-t border-slate-800">
                  👑 Transfer Leadership
                </button>
              )}
            </div>
          </>
        );
      })()}

      {viewingMemberProfile && (
        <AllianceMemberProfileModal
          member={viewingMemberProfile}
          open={!!viewingMemberProfile}
          onClose={() => setViewingMemberProfile(null)}
          onDM={onDM}
          currentUserId={currentUserId}
          isOwnAlliance={true}
        />
      )}

      {/* Transfer Leadership — 2-step confirmation overlay */}
      {transferStep > 0 && transferTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-6">
          <div className="bg-[#0d1526] border border-amber-700/60 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">👑</div>
            {transferStep === 1 ? (
              <>
                <div className="text-amber-400 font-bold text-lg mb-1">Transfer Leadership?</div>
                <div className="text-slate-300 text-sm mb-1">
                  You are about to hand full control of the alliance to:
                </div>
                <div className="text-white font-bold text-base mb-3">{transferTarget.username}</div>
                <div className="text-slate-400 text-xs mb-5">You will be demoted to Member. This cannot be undone without the new leader's approval.</div>
                <div className="flex gap-3">
                  <button onClick={() => { setTransferStep(0); setTransferTarget(null); }} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => setTransferStep(2)} className="flex-1 py-2 rounded-xl bg-amber-600 text-black text-sm font-bold hover:bg-amber-500 transition-colors">
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-red-400 font-bold text-lg mb-1">⚠️ Final Confirmation</div>
                <div className="text-slate-300 text-sm mb-1">
                  Are you absolutely sure you want to transfer leadership to:
                </div>
                <div className="text-amber-400 font-bold text-base mb-3">{transferTarget.username}</div>
                <div className="text-red-400 text-xs font-semibold mb-5">This action is IRREVERSIBLE. You will lose all leader privileges immediately.</div>
                <div className="flex gap-3">
                  <button onClick={() => { setTransferStep(0); setTransferTarget(null); }} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
                    No, Keep It
                  </button>
                  <button onClick={() => { onTransferLeadership(transferTarget); setTransferStep(0); setTransferTarget(null); }} className="flex-1 py-2 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                    Yes, Transfer 👑
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}