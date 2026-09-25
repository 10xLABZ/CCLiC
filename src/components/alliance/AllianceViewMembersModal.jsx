// Browse view: shows members of any alliance with hero leader/officers section + ranked list
import React, { useState, useEffect } from "react";
import { X, Eye, Navigation, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { getPlayerData, savePlayerData } from "../utils/playerStorage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AllianceMemberProfileModal from "./AllianceMemberProfileModal";

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
const LOCATE_COST = 1;
const LOCATE_DURATION_MS = 5 * 60 * 1000;

export default function AllianceViewMembersModal({ alliance, onClose }) {
  const [members, setMembers] = useState([]);
  const [profileMap, setProfileMap] = useState({}); // user_id → { atk, def }
  const [loading, setLoading] = useState(true);
  const [locates, setLocates] = useState({});
  const [locating, setLocating] = useState(null);
  const [travelConfirm, setTravelConfirm] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!alliance) return;
    (async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        if (user) setCurrentUserId(user.id);
        const roster = await base44.entities.AllianceMember.filter({ alliance_id: alliance.id });
        setMembers(roster);
        // Fetch PlayerProfile for each member to get real ATK/DEF
        const profileFetches = roster.map(m =>
          base44.entities.PlayerProfile.filter({ user_id: m.user_id }).then(r => r[0] || null).catch(() => null)
        );
        const profiles = await Promise.all(profileFetches);
        const map = {};
        profiles.forEach((p, i) => {
          if (p) map[roster[i].user_id] = { atk: p.attack_value || 0, def: p.defense_value || 0 };
        });
        setProfileMap(map);
      } catch {}
      setLoading(false);
    })();
  }, [alliance?.id]);

  // Tick locate timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLocates(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(uid => {
          const secs = Math.max(0, Math.floor((updated[uid].expiresAt - now) / 1000));
          if (secs !== updated[uid].secondsLeft) {
            changed = true;
            if (secs <= 0) delete updated[uid];
            else updated[uid] = { ...updated[uid], secondsLeft: secs };
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTP = (userId) => {
    const p = profileMap[userId];
    if (p) return (p.atk || 0) + (p.def || 0);
    const m = members.find(mem => mem.user_id === userId);
    return m?.fund_power || 0; // fallback
  };

  const getProfileImg = (m) => m.profile_image_url;

  const handleLocate = async (member) => {
    const pd = getPlayerData();
    if ((pd.crypto || 0) < LOCATE_COST) { toast.error("Not enough CRYD! You need 1 CRYD to locate."); return; }
    setLocating(member.user_id);
    try {
      const profiles = await base44.entities.PlayerProfile.filter({ user_id: member.user_id });
      const profile = profiles[0];
      if (!profile?.location_city || !profile?.location_state) { toast.error("Player location is unknown."); setLocating(null); return; }
      savePlayerData({ crypto: Math.max(0, (pd.crypto || 0) - LOCATE_COST) });
      const expiresAt = Date.now() + LOCATE_DURATION_MS;
      setLocates(prev => ({ ...prev, [member.user_id]: { city: profile.location_city, state: profile.location_state, expiresAt, secondsLeft: Math.floor(LOCATE_DURATION_MS / 1000) } }));
    } catch { toast.error("Failed to locate player."); }
    setLocating(null);
  };

  const handleConfirmTravel = () => {
    if (!travelConfirm) return;
    const pd = getPlayerData();
    if ((pd.cash || 0) < travelConfirm.cost) { toast.error("Not enough cash to travel!"); setTravelConfirm(null); return; }
    savePlayerData({ cash: Math.max(0, (pd.cash || 0) - travelConfirm.cost), locationCity: travelConfirm.city, locationState: travelConfirm.state });
    setTravelConfirm(null);
    onClose();
    navigate(createPageUrl("OpsPage"));
    toast.success(`Traveled to ${travelConfirm.city}, ${travelConfirm.state}!`);
  };

  const fmtSeconds = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!alliance) return null;

  const sorted = [...members].sort((a, b) => {
    const ri = r => ROLES.indexOf(r ?? 'member');
    if (ri(a.role) !== ri(b.role)) return ri(a.role) - ri(b.role);
    return getTP(b.user_id) - getTP(a.user_id);
  });

  const leader = sorted.find(m => m.role === 'leader');
  const heroOfficers = sorted.filter(m => ['vp', 'war_general', 'strategist', 'diplomat'].includes(m.role));

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70" />
        <div
          className="relative bg-[#0a0f1a] border border-amber-700/40 rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl z-10 overflow-hidden"
          style={{ maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-800 shrink-0">
            <div>
              <div className="text-sm font-bold text-amber-400">[{alliance.tag}] Members</div>
              <div className="text-[10px] text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 56px)' }}>
            {loading ? (
              <div className="text-center text-slate-500 text-sm py-12">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-12">No members found.</div>
            ) : (
              <>
                {/* ── HERO SECTION ── */}
                <div className="relative" style={{ minHeight: 220 }}>
                  <img src={BG_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)' }} />
                  <div className="relative z-10 p-4 flex flex-col items-center">
                    {leader && (
                      <button onClick={() => setViewingProfile(leader)} className="flex flex-col items-center mb-3 group">
                        <div className="relative">
                          <div className="w-18 h-18 rounded-xl overflow-hidden border-2 shadow-lg group-hover:scale-105 transition-transform" style={{ width: 72, height: 72, borderColor: '#f59e0b', boxShadow: '0 0 16px rgba(245,158,11,0.6)' }}>
                            {getProfileImg(leader)
                              ? <img src={getProfileImg(leader)} alt={leader.username} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-2xl">👑</div>}
                          </div>
                          <Crown className="w-6 h-6 text-amber-400 absolute -top-3 left-1/2 -translate-x-1/2" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.9)) drop-shadow(0 0 2px rgba(245,158,11,1))' }} />
                        </div>
                        <div className="mt-1 text-[9px] font-bold tracking-widest text-amber-400 uppercase">Leader</div>
                        <div className="text-sm font-bold text-white drop-shadow">{leader.username}</div>
                      </button>
                    )}
                    {heroOfficers.length > 0 && (
                      <div className="flex gap-3 justify-center flex-wrap">
                        {heroOfficers.map(m => {
                          const borderColor = ROLE_BORDER_COLORS[m.role];
                          return (
                            <button key={m.id} onClick={() => setViewingProfile(m)} className="flex flex-col items-center group">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 group-hover:scale-105 transition-transform" style={{ borderColor, boxShadow: `0 0 8px ${borderColor}80` }}>
                                  {getProfileImg(m)
                                    ? <img src={getProfileImg(m)} alt={m.username} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-slate-800 flex items-center justify-center">👤</div>}
                                </div>
                                <Crown
                                  className="w-4 h-4 absolute -top-2.5 left-1/2 -translate-x-1/2"
                                  style={{ color: borderColor, filter: `drop-shadow(0 0 4px ${borderColor}) drop-shadow(0 0 2px ${borderColor})` }}
                                />
                              </div>
                              <div className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</div>
                              <div className="text-[9px] text-slate-200 font-semibold truncate max-w-[60px]">{m.username}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RANKED MEMBERS LIST ── */}
                <div className="bg-[#0d1320]">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{members.length} Members</span>
                    <span className="text-[9px] text-slate-600 uppercase">TP ▼</span>
                  </div>
                  <div className="divide-y divide-slate-800/50">
                    {sorted.map((m, idx) => {
                      const tp = Math.round(getTP(m.user_id));
                      const imgUrl = getProfileImg(m);
                      const role = m.role || 'member';
                      const borderColor = ROLE_BORDER_COLORS[role];
                      const locateInfo = locates[m.user_id];
                      const isMe = m.user_id === currentUserId;
                      const isLocating = locating === m.user_id;
                      const displayLevel = m.level || 1;

                      return (
                        <div key={m.id} className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {/* Rank */}
                            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold border" style={{ borderColor, color: borderColor, background: `${borderColor}18` }}>
                              {idx + 1}
                            </div>
                            {/* Avatar */}
                            <button onClick={() => setViewingProfile(m)} className="w-10 h-10 rounded-lg overflow-hidden border shrink-0 hover:opacity-80 transition-opacity" style={{ borderColor }}>
                              {imgUrl
                                ? <img src={imgUrl} alt={m.username} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-lg">👤</div>}
                            </button>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <button onClick={() => setViewingProfile(m)} className="font-bold text-sm text-white hover:text-amber-300 transition-colors text-left truncate block w-full">
                                {m.username}{isMe && <span className="text-amber-500 text-[9px] ml-1">(You)</span>}
                              </button>
                              <div className={`text-[9px] font-semibold ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]} · Lv.{displayLevel}</div>
                              <div className="text-[10px] text-amber-300 font-bold">⚡ {tp.toLocaleString()}</div>
                            </div>
                            {/* Locate */}
                            {!isMe && !locateInfo && (
                              <button onClick={() => handleLocate(m)} disabled={isLocating} className="shrink-0 text-[9px] font-bold text-blue-400 hover:text-blue-300 border border-blue-700/50 rounded px-1.5 py-0.5 transition-colors disabled:opacity-50">
                                {isLocating ? '...' : <><Eye className="w-3 h-3 inline mr-0.5" />LOCATE</>}
                              </button>
                            )}
                          </div>
                          {/* Locate result */}
                          {!isMe && locateInfo && (
                            <div className="mt-1.5 ml-[76px] space-y-1">
                              <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-700/40 rounded-lg px-2 py-1">
                                <span className="text-[11px]">🎯</span>
                                <span className="text-[10px] text-blue-200 font-semibold flex-1 truncate">{locateInfo.city}, {locateInfo.state}</span>
                                <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                                <span className="text-[9px] text-blue-400 font-mono">{fmtSeconds(locateInfo.secondsLeft)}</span>
                              </div>
                              <button onClick={() => setTravelConfirm({ city: locateInfo.city, state: locateInfo.state, cost: 500 })} className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                                <Navigation className="w-3 h-3" /> GO THERE →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Travel confirm */}
          {travelConfirm && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="bg-[#0a0f1a] border border-amber-700/40 rounded-2xl p-5 max-w-xs w-full">
                <div className="text-center mb-4">
                  <div className="text-2xl mb-2">✈️</div>
                  <div className="text-sm font-bold text-amber-400">Confirm Travel</div>
                  <div className="text-xs text-slate-400 mt-1">Travel to {travelConfirm.city}, {travelConfirm.state}?</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-4 text-center">
                  <div className="text-xs text-slate-500">Travel Fee</div>
                  <div className="text-base font-bold text-amber-400">💵 ${travelConfirm.cost.toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTravelConfirm(null)} className="flex-1 border-slate-700 text-slate-400 text-xs h-8">Cancel</Button>
                  <Button onClick={handleConfirmTravel} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs h-8">CONFIRM</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewingProfile && (
        <AllianceMemberProfileModal
          member={viewingProfile}
          open={!!viewingProfile}
          onClose={() => setViewingProfile(null)}
          currentUserId={currentUserId}
          isOwnAlliance={false}
        />
      )}
    </>
  );
}