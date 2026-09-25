import React, { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { getFundData } from "../components/utils/fundStorage";
import { base44 } from "@/api/base44Client";
import AllianceCard from "@/components/alliance/AllianceCard";
import AllianceMembersPage from "@/components/alliance/AllianceMembersPage";
import AllianceSettingsModal from "@/components/alliance/AllianceSettingsModal";
import AllianceStrengthRanking from "@/components/alliance/AllianceStrengthRanking";
import GlobalChatBar from "@/components/chat/GlobalChatBar";
// AllianceChatPanel is now handled by GlobalChatBar
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Settings, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AllianceCreateModal from "@/components/alliance/AllianceCreateModal";
import FundImagePicker, { getAllianceImageUrl } from "@/components/fund/FundImagePicker";
import AllianceViewModal from "@/components/alliance/AllianceViewModal";
import FundResearchPanel from "@/components/alliance/FundResearchPanel";
import FundShopPanel from "@/components/alliance/FundShopPanel";
import { applyServerReward } from "@/lib/playerServerSync";
import { clearCachedAllianceTag } from "@/lib/useAllianceTag";

const ALLIANCE_CREATION_COST_CRYD = 50;

// Propagate a tag change to all members' PlayerProfile.alliance_tag
// Uses server-side function (syncAllianceTag) to bypass RLS — client-side
// updates fail because users can only update their own profile.
const propagateAllianceTagChange = async (members, newTag) => {
  clearCachedAllianceTag();
  try {
    await base44.functions.invoke('syncAllianceTag', {
      alliance_id: members[0]?.alliance_id,
      tag: newTag,
    });
  } catch (e) {
    console.error('syncAllianceTag failed:', e);
  }
  // Update the current player's local cache
  savePlayerData({ allianceTag: newTag });
};

const BROWSE_TABS = ["Browse", "My Alliance"];
const MY_ALLIANCE_TABS = ["Overview", "Members", "Strength", "Fund Shop", "Fund Research"];

export default function AlliancePage() {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [tab, setTab] = useState("Browse");
  const [myAllianceTab, setMyAllianceTab] = useState("Overview");
  const [alliances, setAlliances] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [myAlliance, setMyAlliance] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [editingAllianceName, setEditingAllianceName] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [showEmblemPicker, setShowEmblemPicker] = useState(false);
  const [viewingAlliance, setViewingAlliance] = useState(null);

  const fundData = getFundData();
  const playerFund = fundData.playerFund || {};
  const myFundPower = playerFund.fundPower || 0;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user) { setLoading(false); return; }
      setCurrentUser(user);

      const [allianceList, membership] = await Promise.all([
        base44.entities.Alliance.list("-total_power", 50),
        base44.entities.AllianceMember.filter({ user_id: user.id }),
      ]);

      setAlliances(allianceList);

      if (membership.length > 0) {
        setMyMembership(membership[0]);
        const alliance = allianceList.find(a => a.id === membership[0].alliance_id);
        if (alliance) {
          const rosterMembers = await base44.entities.AllianceMember.filter({ alliance_id: alliance.id });

          // Pull each member's real TP + last-active timestamp from their PlayerProfile
          let realTotalPower = 0;
          const profileUpdates = await Promise.all(
            rosterMembers.map(async (m) => {
              const profiles = await base44.entities.PlayerProfile.filter({ user_id: m.user_id });
              if (profiles.length > 0) {
                const p = profiles[0];
                // TP = ATK + DEF (fund contributions now integrated)
                const realTP = (p.attack_value || 0) + (p.defense_value || 0);
                realTotalPower += realTP;
                const realLevel = p.level || m.level || 1;
                // Use the PlayerProfile's updated_date as the true "last active" signal
                const lastActive = p.updated_date ? new Date(p.updated_date).getTime() : 0;
                const needsUpdate = Math.abs(realTP - (m.fund_power || 0)) > 0.01 || realLevel !== m.level;
                if (needsUpdate) {
                  base44.entities.AllianceMember.update(m.id, { fund_power: realTP, level: realLevel }).catch(() => {});
                  return { ...m, fund_power: realTP, level: realLevel, last_active: lastActive };
                }
                return { ...m, last_active: lastActive };
              }
              return m;
            })
          );
          const updatedAlliance = { ...alliance, total_power: realTotalPower, member_count: profileUpdates.length };
          setMyAlliance(updatedAlliance);
          if (Math.abs(realTotalPower - (alliance.total_power || 0)) > 0.01 || profileUpdates.length !== alliance.member_count) {
            base44.entities.Alliance.update(alliance.id, { total_power: realTotalPower, member_count: profileUpdates.length }).catch(() => {});
          }
          setMembers(profileUpdates);
          setTab("My Alliance");
        }
      }
    } catch (e) {
      toast.error("Failed to load alliances");
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    loadData();
    // Force a fresh pull from server on mount so TopHUD Energy/Stamina/OpCover are never stale
    import('@/lib/playerServerSync').then(({ refreshFromServer }) => refreshFromServer());
  }, [loadData]);

  // Keep playerData in sync with server-authoritative updates
  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  // Real-time TP updates: when a player's profile changes, update alliance TP
  useEffect(() => {
    const unsubscribe = base44.entities.PlayerProfile.subscribe((event) => {
      if (event.type === 'update' && (event.data.attack_value !== undefined || event.data.defense_value !== undefined)) {
        // Partial updates may only include the changed field — fill missing values from old_data
        const newAtk = event.data.attack_value ?? event.old_data?.attack_value ?? 0;
        const newDef = event.data.defense_value ?? event.old_data?.defense_value ?? 0;
        const oldAtk = event.old_data?.attack_value ?? newAtk;
        const oldDef = event.old_data?.defense_value ?? newDef;
        const oldTP = oldAtk + oldDef;
        const newTP = newAtk + newDef;
        const tpDiff = newTP - oldTP;
        
        // Update browse alliances
        setAlliances(prev => prev.map(a => {
          const memberInAlliance = prev.find(al => al.id === a.id)?.id && 
            members.find(m => m.user_id === event.data.user_id && m.alliance_id === a.id);
          if (memberInAlliance) {
            return { ...a, total_power: Math.max(0, (a.total_power || 0) + tpDiff) };
          }
          return a;
        }));
        
        // Update my alliance if player is in it
        if (myAlliance && members.find(m => m.user_id === event.data.user_id)) {
          setMyAlliance(prev => ({ ...prev, total_power: Math.max(0, (prev?.total_power || 0) + tpDiff) }));
        }
      }
    });
    return () => unsubscribe();
  }, [myAlliance?.id, members.length]);

  const handleCreate = async (formData) => {
    // Check CRYD balance
    if ((playerData.crypto || 0) < ALLIANCE_CREATION_COST_CRYD) {
      toast.error(`You need ${ALLIANCE_CREATION_COST_CRYD} CRYD to create an alliance.`);
      return;
    }
    setCreating(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;

      // Check tag uniqueness
      const existingTag = await base44.entities.Alliance.filter({ tag: formData.tag.toUpperCase() });
      if (existingTag && existingTag.length > 0) {
        toast.error("That alliance tag is already taken. Please choose another.");
        setCreating(false);
        return;
      }

      // Deduct CRYD charge atomically via server
      const rewardResult = await applyServerReward({ crypto_delta: -ALLIANCE_CREATION_COST_CRYD, reason: 'alliance_creation' });
      if (!rewardResult) {
        toast.error("Failed to process CRYD payment. Please try again.");
        setCreating(false);
        return;
      }
      setPlayerData(getPlayerData());

      const newAlliance = await base44.entities.Alliance.create({
        ...formData,
        tag: formData.tag.toUpperCase(),
        leader_user_id: user.id,
        leader_username: playerData.username,
        member_count: 1,
        total_power: myFundPower,
        hq_state: playerFund.hqState || "",
        hq_city: playerFund.hqCity || "",
      });
      await base44.entities.AllianceMember.create({
        alliance_id: newAlliance.id,
        user_id: user.id,
        username: playerData.username,
        profile_image_url: playerData.profileImageDataUrl || "",
        level: playerData.level || 1,
        fund_power: myFundPower,
        role: "leader",
        joined_at: Date.now(),
      });
      // Store alliance tag on PlayerProfile for leaderboard display
      const profiles = await base44.entities.PlayerProfile.filter({ user_id: user.id });
      if (profiles.length > 0) base44.entities.PlayerProfile.update(profiles[0].id, { alliance_tag: newAlliance.tag }).catch(() => {});
      savePlayerData({ allianceTag: newAlliance.tag });

      setShowCreateModal(false);
      toast.success(`Alliance "${newAlliance.name}" created!`);
      await loadData();
    } catch (e) {
      toast.error("Failed to create alliance");
    }
    setCreating(false);
  };

  const handleJoin = async (alliance) => {
    if (myMembership) {
      toast.error("⚠️ You're already in an alliance! You must leave your current alliance before joining a new one.", { duration: 4000 });
      return;
    }
    if (alliance.min_level && playerData.level < alliance.min_level) {
      toast.error(`Need level ${alliance.min_level} to join`); return;
    }
    setJoining(true);
    try {
      const user = await base44.auth.me();
      if (!user) {
        toast.error("Authentication error. Please reload and try again.");
        return;
      }
      await base44.entities.AllianceMember.create({
        alliance_id: alliance.id,
        user_id: user.id,
        username: playerData.username,
        profile_image_url: playerData.profileImageDataUrl || "",
        level: playerData.level || 1,
        fund_power: myFundPower,
        role: "member",
        joined_at: Date.now(),
      });
      // Alliance stats update — fire-and-forget (don't let RLS or network issues block the join)
      base44.entities.AllianceMember.filter({ alliance_id: alliance.id }).then(async (allMembers) => {
        const allProfiles = await base44.entities.PlayerProfile.filter({ user_id: { $in: allMembers.map(m => m.user_id) } }, null, 100);
        const newTotalPower = allProfiles.reduce((sum, p) => sum + ((p.attack_value || 0) + (p.defense_value || 0)), 0);
        base44.entities.Alliance.update(alliance.id, {
          member_count: (alliance.member_count || 1) + 1,
          total_power: newTotalPower,
        }).catch(() => {});
      }).catch(() => {});
      // Profile tag update — fire-and-forget
      base44.entities.PlayerProfile.filter({ user_id: user.id }).then(profiles => {
        if (profiles.length > 0) base44.entities.PlayerProfile.update(profiles[0].id, { alliance_tag: alliance.tag }).catch(() => {});
      }).catch(() => {});
      savePlayerData({ allianceTag: alliance.tag });
      toast.success(`Joined ${alliance.name}!`);
      setViewingAlliance(null);
      await loadData();
    } catch (e) {
      toast.error("Failed to join: " + (e?.message || "Unknown error"));
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!myMembership || !myAlliance) return;
    try {
      await base44.entities.AllianceMember.delete(myMembership.id);
      if ((myAlliance.member_count || 1) <= 1) {
        await base44.entities.Alliance.delete(myAlliance.id);
      } else {
        await base44.entities.Alliance.update(myAlliance.id, {
          member_count: Math.max(0, (myAlliance.member_count || 1) - 1),
          total_power: Math.max(0, (myAlliance.total_power || 0) - myFundPower),
        });
      }
      // Clear alliance tag from PlayerProfile + localStorage
      if (currentUser) {
        const profiles = await base44.entities.PlayerProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) base44.entities.PlayerProfile.update(profiles[0].id, { alliance_tag: null }).catch(() => {});
      }
      savePlayerData({ allianceTag: null });
      setMyMembership(null); setMyAlliance(null); setMembers([]);
      setTab("Browse");
      toast.success("Left alliance");
      await loadData();
    } catch (e) {
      toast.error("Failed to leave");
    }
  };

  const handleDisband = async () => {
    if (!myAlliance) return;
    try {
      // Clear all members' alliance_tag before deleting (RLS prevents client update)
      base44.functions.invoke('syncAllianceTag', {
        alliance_id: myAlliance.id,
        tag: null,
      }).catch(() => {});
      // Delete all members then alliance
      for (const m of members) {
        await base44.entities.AllianceMember.delete(m.id);
      }
      await base44.entities.Alliance.delete(myAlliance.id);
      savePlayerData({ allianceTag: null });
      setMyMembership(null); setMyAlliance(null); setMembers([]);
      setTab("Browse");
      toast.success("Alliance disbanded");
      await loadData();
    } catch (e) {
      toast.error("Failed to disband");
    }
  };

  const handleKick = async (member) => {
    try {
      await base44.entities.AllianceMember.delete(member.id);
      await base44.entities.Alliance.update(myAlliance.id, {
        member_count: Math.max(0, (myAlliance.member_count || 1) - 1),
        total_power: Math.max(0, (myAlliance.total_power || 0) - (member.fund_power || 0)),
      });
      // Clear the kicked member's alliance_tag server-side (RLS prevents client update)
      base44.functions.invoke('syncAllianceTag', {
        clear_user_id: member.user_id,
      }).catch(() => {});
      setMembers(prev => prev.filter(m => m.id !== member.id));
      toast.success(`${member.username} removed`);
    } catch (e) {
      toast.error("Failed to kick member");
    }
  };

  const handlePromote = async (member, newRole) => {
    try {
      await base44.entities.AllianceMember.update(member.id, { role: newRole });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
      toast.success(`${member.username} is now ${newRole === 'officer' ? 'VP/Officer' : 'Member'}`);
    } catch (e) {
      toast.error("Failed to update role");
    }
  };

  const handleTransferLeadership = async (newLeaderMember) => {
    if (!myAlliance || !myMembership || !currentUser) return;
    try {
      // Demote current leader to member
      await base44.entities.AllianceMember.update(myMembership.id, { role: "member" });
      // Promote new leader
      await base44.entities.AllianceMember.update(newLeaderMember.id, { role: "leader" });
      // Update alliance record
      await base44.entities.Alliance.update(myAlliance.id, {
        leader_user_id: newLeaderMember.user_id,
        leader_username: newLeaderMember.username,
      });
      toast.success(`👑 ${newLeaderMember.username} is now the Alliance Leader!`);
      await loadData();
    } catch (e) {
      toast.error("Failed to transfer leadership");
    }
  };

  const handleSaveAllianceInfo = async () => {
    const name = editNameInput.trim();
    const tag = editTagInput.trim().replace(/[\[\]]/g, '').slice(0, 5).toUpperCase();
    if (name.length < 3 || name.length > 30) { toast.error("Name must be 3-30 characters"); return; }
    if (tag.length < 2 || tag.length > 5) { toast.error("Tag must be 2-5 characters"); return; }
    try {
      await base44.entities.Alliance.update(myAlliance.id, { name, tag });
      setMyAlliance(prev => ({ ...prev, name, tag }));
      setAlliances(prev => prev.map(a => a.id === myAlliance.id ? { ...a, name, tag } : a));
      // Propagate tag change to all member profiles so profiles/trade wars show updated tag
      propagateAllianceTagChange(members, tag);
      setEditingAllianceName(false);
      toast.success("Alliance info updated!");
    } catch { toast.error("Failed to update"); }
  };

  const handleSaveEmblem = async (imageId) => {
    try {
      await base44.entities.Alliance.update(myAlliance.id, { emblem: imageId });
      setMyAlliance(prev => ({ ...prev, emblem: imageId }));
      setAlliances(prev => prev.map(a => a.id === myAlliance.id ? { ...a, emblem: imageId } : a));
      setShowEmblemPicker(false);
      toast.success("Alliance emblem updated!");
    } catch { toast.error("Failed to update emblem"); }
  };

  const filteredAlliances = alliances
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Open alliances first, closed last
      const aOpen = a.is_open !== false ? 0 : 1;
      const bOpen = b.is_open !== false ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      // Within same group, sort by total_power descending
      return (b.total_power || 0) - (a.total_power || 0);
    });

  const currentUserId = currentUser?.id;
  const amLeader = myAlliance && (myAlliance.leader_user_id === currentUserId);
  const myRole = myMembership?.role || "member";

  // Online = PlayerProfile updated within last 5 minutes (real player activity signal)
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
  const onlineUserIds = new Set(
    members
      .filter(m => m.last_active && (Date.now() - m.last_active) < ONLINE_THRESHOLD_MS)
      .map(m => m.user_id)
  );
  const onlineCount = onlineUserIds.size;

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      {/* Full-width header banner — flush under TopHUD */}
      <div className="pt-[108px]">
        <div className="relative w-full">
          <img
            src="https://media.base44.com/images/public/699169456a354d6cb7082777/73258f182_header-banner-fundalliance.png"
            alt="Fund Alliance"
            className="w-full block"
            style={{ display: 'block', margin: 0, padding: 0 }}
          />
          {!myMembership && (
            <div className="absolute bottom-3 right-3">
              <Button onClick={() => setShowCreateModal(true)} className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs h-8 px-3">
                <Plus className="w-3 h-3 mr-1" />Create
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4" style={{ paddingTop: '2px', paddingBottom: '16px' }}>

        {/* Top-level Tabs */}
        <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 mb-4">
          {BROWSE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === t ? "bg-amber-600 text-black" : "text-slate-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {!myMembership && tab === "Browse" && (
          <div className="flex justify-end mb-2">
            <Button onClick={() => setShowCreateModal(true)} className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs h-8 px-3">
              <Plus className="w-3 h-3 mr-1" />Create Alliance
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Loading...</div>
        ) : tab === "Browse" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alliances..." className="bg-slate-900 border-slate-700 text-white pl-9" />
            </div>
            {filteredAlliances.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No alliances found. <button onClick={() => setShowCreateModal(true)} className="text-amber-400 underline">Create the first one!</button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Alliance TP Leaderboard */}
                <div className="bg-slate-900/40 rounded-lg overflow-hidden border border-slate-800">
                  <div className="grid grid-cols-12 gap-1 p-3 border-b border-slate-800 bg-slate-900/60 text-[10px] font-semibold text-slate-400">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-6">Alliance</div>
                    <div className="col-span-2 text-right">Power</div>
                    <div className="col-span-2 text-center">Members</div>
                    <div className="col-span-1 text-center">Status</div>
                  </div>
                  {filteredAlliances.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => setViewingAlliance(a)}
                      className="w-full grid grid-cols-12 gap-1 p-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors text-left items-center last:border-b-0"
                    >
                      <div className="col-span-1 text-center text-xs font-mono text-slate-500">#{i + 1}</div>
                      <div className="col-span-6 min-w-0">
                        <div className="font-semibold text-white text-sm leading-tight break-words">{a.name}</div>
                        <div className="text-[10px] text-slate-500">[{a.tag}]</div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-amber-400 text-[11px] whitespace-nowrap">⚡ {Math.round(a.total_power || 0).toLocaleString()}</div>
                      </div>
                      <div className="col-span-2 text-center text-xs text-slate-400">{a.member_count || 1}/100</div>
                      <div className="col-span-1 text-center text-base" title={a.is_open !== false ? "Open / Recruiting" : "Closed / Not accepting"}>
                        {a.is_open !== false ? "🟢" : "🚫"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          myAlliance ? (
            <>
              {showMembers ? (
                <AllianceMembersPage
                  members={members}
                  currentUserId={currentUserId}
                  myRole={myRole}
                  onKick={handleKick}
                  onPromote={handlePromote}
                  onTransferLeadership={handleTransferLeadership}
                  onBack={() => setShowMembers(false)}
                />
              ) : (
                <div className="space-y-4">
                  {/* My Alliance Sub-tabs — only show when not on Overview (Overview uses image button grid) */}
                  {myAllianceTab !== "Overview" && (
                    <div className="flex gap-1 bg-slate-900/40 rounded-lg p-0.5 overflow-x-auto items-center">
                      <button
                        onClick={() => setMyAllianceTab("Overview")}
                        className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors text-slate-400 hover:text-white"
                      >
                        ← Back
                      </button>
                      <span className="text-xs font-semibold text-amber-400 px-2">{myAllianceTab}</span>
                      {(myAllianceTab === "Overview" || myAllianceTab === "Members" || myAllianceTab === "Strength") && (
                        <button
                          onClick={() => setShowSettingsModal(true)}
                          className="ml-auto shrink-0 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {myAllianceTab === "Overview" && (
                    <div className="space-y-0">
                      {/* Alliance Info Card — carbon fiber background */}
                      <div
                        className="relative w-full rounded-xl overflow-hidden"
                        style={{
                          backgroundImage: "url('https://media.base44.com/images/public/699169456a354d6cb7082777/d006137f3_carbonfiber1a.png')",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        {/* Gear emoji — top right corner of overview header */}
                        <button
                          onClick={() => setShowSettingsModal(true)}
                          className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 transition-colors text-lg"
                          title="Alliance Settings"
                        >
                          ⚙️
                        </button>
                        <div className="p-4">
                          <div className="flex items-center gap-4 mb-3">
                            {/* Emblem — 2x larger */}
                            <div className="relative shrink-0">
                              <div className="w-28 h-28 flex items-center justify-center bg-black/40 rounded-xl border border-amber-700/50 overflow-hidden">
                                {getAllianceImageUrl(myAlliance.emblem)
                                  ? <img src={getAllianceImageUrl(myAlliance.emblem)} alt="emblem" className="w-full h-full object-cover" />
                                  : <span className="text-6xl">{myAlliance.emblem || "🏰"}</span>}
                              </div>
                              {amLeader && (
                                <button
                                  onClick={() => setShowEmblemPicker(true)}
                                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 hover:bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                                >
                                  <Pencil className="w-3 h-3 text-black" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {!editingAllianceName ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-lg font-bold text-white">{myAlliance.name}</span>
                                  <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded font-mono">[{myAlliance.tag}]</span>
                                  {amLeader && (
                                    <button
                                      onClick={() => { setEditNameInput(myAlliance.name); setEditTagInput(myAlliance.tag); setEditingAllianceName(true); }}
                                      className="p-0.5 text-slate-500 hover:text-amber-400 transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <Input value={editNameInput} onChange={e => setEditNameInput(e.target.value)} placeholder="Alliance name" className="bg-slate-900 border-slate-700 text-white h-7 text-xs" maxLength={30} />
                                  <Input value={editTagInput} onChange={e => setEditTagInput(e.target.value.toUpperCase())} placeholder="TAG (2-5 chars)" className="bg-slate-900 border-slate-700 text-white h-7 text-xs" maxLength={5} />
                                  <div className="flex gap-1.5">
                                    <Button size="sm" onClick={handleSaveAllianceInfo} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black text-xs h-6">Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingAllianceName(false)} className="flex-1 border-slate-700 text-slate-400 text-xs h-6">Cancel</Button>
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-slate-500 mt-0.5">Leader: <span className="text-amber-400">{myAlliance.leader_username}</span></div>
                              {myAlliance.description && <div className="text-xs text-slate-500 mt-0.5">{myAlliance.description}</div>}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center border-t border-amber-900/30 pt-3">
                            <div>
                              <div className="text-amber-400 font-bold">{myAlliance.member_count || 1}/100</div>
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] text-green-400 font-semibold">{onlineCount} Online</span>
                              </div>
                              <div className="text-[10px] text-slate-500">Members</div>
                            </div>
                            <div>
                              <div className="text-amber-400 font-bold">⚡ {Math.round(myAlliance.total_power || 0).toLocaleString()}</div>
                              <div className="text-[10px] text-slate-500">Total Power</div>
                            </div>
                            <div>
                              <div className="text-amber-400 font-bold capitalize">{myMembership?.role || "member"}</div>
                              <div className="text-[10px] text-slate-500">Your Role</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Nav buttons — container2 background, 2 rows of 3, image buttons with amber border */}
                      <div
                        className="relative w-full rounded-xl overflow-hidden mt-2"
                        style={{
                          backgroundImage: "url('https://media.base44.com/images/public/699169456a354d6cb7082777/72c0df38f_alliance-container2.png')",
                          backgroundSize: "100% 100%",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        <div className="grid grid-cols-3 gap-0 p-0">
                          {[
                            { tab: "Overview", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/89960ba39_alliance-button-overview2.png" },
                            { tab: "Members", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/ece07054d_alliance-button-members2.png" },
                            { tab: "Strength", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/2f45dad89_alliance-button-fundstrength2.png" },
                            { tab: "Fund Shop", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/8ffc74d64_alliance-button-fundshop2.png" },
                            { tab: "Fund Research", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/ceb1425c3_alliance-button-fundresearch2.png" },
                            { tab: "fvf", img: "https://media.base44.com/images/public/699169456a354d6cb7082777/0718ced56_alliancefvfbutton02.png", isFvf: true },
                            ].map(({ tab: t, img, isFvf }) => {
                            const isActive = !isFvf && myAllianceTab === t;
                            return (
                            <button
                             key={t}
                             onClick={() => isFvf ? navigate('/FvFEventPage') : setMyAllianceTab(t)}
                              className="relative aspect-video w-full overflow-hidden"
                              style={{
                                border: isActive ? '2px solid #fbbf24' : '1.5px solid #b45309',
                                boxShadow: isActive ? '0 0 10px 2px rgba(251,191,36,0.6), inset 0 0 6px rgba(251,191,36,0.15)' : 'none',
                                boxSizing: 'border-box',
                                zIndex: isActive ? 1 : 0,
                                position: 'relative',
                              }}
                            >
                              <img src={img} alt={t} className="w-full h-full object-cover block" />
                            </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {myAllianceTab === "Members" && (
                    <AllianceMembersPage
                      members={members}
                      currentUserId={currentUserId}
                      myRole={myRole}
                      onKick={handleKick}
                      onPromote={handlePromote}
                      onTransferLeadership={handleTransferLeadership}
                      onBack={() => setMyAllianceTab("Overview")}
                    />
                  )}

                  {myAllianceTab === "Strength" && (
                    <AllianceStrengthRanking members={members} currentUserId={currentUserId} />
                  )}

                  {myAllianceTab === "Fund Shop" && (
                    <FundShopPanel allianceId={myAlliance?.id} userId={currentUserId} />
                  )}

                  {myAllianceTab === "Fund Research" && (
                    <FundResearchPanel allianceId={myAlliance?.id} allianceTag={myAlliance?.tag} userId={currentUserId} />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <div className="text-4xl mb-3">🤝</div>
              You're not in an alliance yet.
              <br />
              <button onClick={() => setTab("Browse")} className="text-amber-400 underline mt-1 block mx-auto">Browse alliances</button>
              <span className="text-slate-600 text-xs"> or </span>
              <button onClick={() => setShowCreateModal(true)} className="text-amber-400 underline">create your own</button>
            </div>
          )
        )}
      </div>

      <AllianceCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        loading={creating}
      />

      {/* Emblem picker for leader */}
      <FundImagePicker
        open={showEmblemPicker}
        onClose={() => setShowEmblemPicker(false)}
        onSelect={handleSaveEmblem}
        currentImageId={myAlliance?.emblem || "fund_01"}
      />

      <AllianceSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isLeader={amLeader}
        onDisband={handleDisband}
        onLeave={handleLeave}
        allianceName={myAlliance?.name}
        allianceTag={myAlliance?.tag}
        onSaveInfo={async (name, tag) => {
          if (name.length < 3 || tag.length < 2) { toast.error("Invalid name or tag"); return; }
          try {
            await base44.entities.Alliance.update(myAlliance.id, { name, tag });
            setMyAlliance(prev => ({ ...prev, name, tag }));
            setAlliances(prev => prev.map(a => a.id === myAlliance.id ? { ...a, name, tag } : a));
            propagateAllianceTagChange(members, tag);
            toast.success("Alliance updated!");
          } catch { toast.error("Failed to update"); }
        }}
      />

      {viewingAlliance && (
        <AllianceViewModal
          alliance={viewingAlliance}
          onClose={() => setViewingAlliance(null)}
          onJoin={(al) => handleJoin(al)}
          isInAlliance={!!myMembership}
          joining={joining}
        />
      )}

      <GlobalChatBar />

      <BottomNav />
    </div>
  );
}