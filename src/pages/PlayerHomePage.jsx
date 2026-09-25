import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Pencil, RefreshCw, LogOut, Cloud, Tag, Trash2, ChevronRight, Code, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { getPlayerData, savePlayerData } from "@/components/utils/playerStorage";
import { getEquippedFrameUrl, getOwnedFrames, equipFrame, unequipFrame, getEquippedFrameId } from "@/components/frames/framesStorage";
import { getFrameById } from "@/components/frames/framesData";
import { isVipActive, formatVipTime, getVipTimeRemaining } from "@/lib/vipHelper";
import { initializeFromServer, applyServerReward, saveProfileCore } from "@/lib/playerServerSync";
import { toast } from "sonner";
import CosmeticSaveOverlay from "@/components/profile/CosmeticSaveOverlay";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CrydIcon from "@/components/shared/CrydIcon";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import GlobalChatBar from "@/components/chat/GlobalChatBar";

import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import CustomizeProfileOverlay from "@/components/profile/CustomizeProfileOverlay";

const PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ba9b16930_profilepicture-bots-022.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e788cd81d_profilepicture-bots-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/9701ed03d_profilepicture-bots-027.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4da43053e_profilepicture-bots-female-020.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/815d131dd_profilepicture-bots-female-021.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5e71076b9_profilepicture-bots-female-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d5fc792fd_profilepicture-bots-female-025.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/821b1b4dd_profilepicture-bots-female-004.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f266a58a0_profilepicture-bots-female-007.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/afe80e37f_profilepicture-bots-048.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/067c165ff_profilepicture-bots-037.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a888307a0_profilepicture-bots-044.jpg",
];

export default function PlayerHomePage() {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [mainTab, setMainTab] = useState("home");
  const [customizeTab, setCustomizeTab] = useState("profile_pic");

  // Settings state
  const [userEmail, setUserEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resetStep, setResetStep] = useState(0);

  // Customize overlay (centralized profile editing)
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Blocking save overlay for profile changes (username, image, frame)
  const [saveStatus, setSaveStatus] = useState(null);

  const runSave = async (updates) => {
    setSaveStatus('saving');
    try {
      await saveProfileCore(updates);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 800);
    } catch (e) {
      setSaveStatus(null);
      throw e;
    }
  };

  // Dev
  const [devResetStep, setDevResetStep] = useState(0);

  const equippedFrameUrl = getEquippedFrameUrl(playerData);
  const ownedFrames = getOwnedFrames(playerData);
  const equippedFrameId = getEquippedFrameId(playerData);

  // Generate stable player account number: IT-XXXXXX (6 alphanumeric chars from user ID hash)
  const generateAccountNumber = (userId) => {
    if (!userId) return "IT-??????";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    let result = "";
    let n = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      result += chars[n % chars.length];
      n = Math.floor(n / chars.length) + (userId.charCodeAt(i % userId.length) || 0);
    }
    return `IT-${result}`;
  };
  const accountNumber = generateAccountNumber(playerData?.userId);

  useEffect(() => {
    base44.auth.me().then(u => { if (u) setUserEmail(u.email || ""); }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const { pwr: tp } = computeFullPlayerStats(playerData);

  const handleImageSelect = async (url) => {
    try {
      await runSave({ profileImageDataUrl: url });
      setPlayerData(getPlayerData());
    } catch {
      toast.error("Failed to save profile image");
    }
  };

  const handleEquipFrame = async (frameId) => {
    try {
      await runSave({ equippedFrameId: frameId });
      setPlayerData(getPlayerData());
    } catch {
      toast.error("Failed to equip frame");
    }
  };

  const handleUnequipFrame = async () => {
    try {
      await runSave({ equippedFrameId: null });
      setPlayerData(getPlayerData());
    } catch {
      toast.error("Failed to remove frame");
    }
  };

  const handleRedeemCoupon = () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setTimeout(() => {
      setCouponLoading(false);
      toast.error("Invalid or expired coupon code.");
      setCouponCode("");
    }, 800);
  };

  const handleManualSave = async () => {
    setSyncing(true);
    const result = await initializeFromServer();
    setSyncing(false);
    if (result.success) {
      toast.success("Data synced from server!");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.error("Sync failed: " + result.reason);
    }
  };

  const handleResetAccount = async () => {
    if (resetStep < 2) { setResetStep(s => s + 1); return; }
    try {
      const user = await base44.auth.me();
      if (user) {
        const [profiles, inventories, funds] = await Promise.all([
          base44.entities.PlayerProfile.filter({ user_id: user.id }),
          base44.entities.PlayerInventory.filter({ user_id: user.id }),
          base44.entities.PlayerFund.filter({ user_id: user.id }),
        ]);
        await Promise.all([
          ...profiles.map(r => base44.entities.PlayerProfile.delete(r.id)),
          ...inventories.map(r => base44.entities.PlayerInventory.delete(r.id)),
          ...funds.map(r => base44.entities.PlayerFund.delete(r.id)),
        ]);
      }
    } catch {}
    const { resetInMemoryCache } = await import("@/lib/playerMemory");
    resetInMemoryCache();
    toast.success("Account reset!");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleDevIncrease = async (type) => {
    const updated = getPlayerData();
    switch (type) {
      case 'cash':
        await applyServerReward({ cash_delta: 100000, reason: 'dev_tool' });
        toast.success("+$100,000!");
        break;
      case 'respect':
        await applyServerReward({ respect_delta: 500, reason: 'dev_tool' });
        toast.success("+500 respect!");
        break;
      case 'cryd':
        await applyServerReward({ crypto_delta: 1000, reason: 'dev_tool' });
        toast.success("+1000 CRYD!");
        break;
      case 'reduceheat':
        savePlayerData({ heat: 0 });
        toast.success("Heat → 0!");
        break;
      case 'fillenergy':
        await applyServerReward({ energy_delta: 100, reason: 'dev_tool' });
        toast.success("Energy filled!");
        break;
      case 'fillstamina':
        await applyServerReward({ stamina_delta: 100, reason: 'dev_tool' });
        toast.success("Stamina filled!");
        break;
      case 'wins':
        await applyServerReward({ stat_fields: { total_trade_war_wins: (updated.totalTradeWarWins || 0) + 10 }, reason: 'dev_tool' });
        toast.success("+10 Wins!");
        break;
      case 'trades':
        await applyServerReward({ stat_fields: { total_trades_completed: (updated.totalTradesCompleted || 0) + 10 }, reason: 'dev_tool' });
        toast.success("+10 Trades!");
        break;
      case 'sabotages':
        await applyServerReward({ stat_fields: { total_sabotages: (updated.totalSabotages || 0) + 10, sabotages_remaining: (updated.sabotagesRemaining || 0) + 10 }, reason: 'dev_tool' });
        toast.success("+10 Sabotages!");
        break;
      case 'assists':
        await applyServerReward({ stat_fields: { total_assists: (updated.totalAssists || 0) + 10 }, reason: 'dev_tool' });
        toast.success("+10 Assists!");
        break;
      case 'jobs':
        await applyServerReward({ stat_fields: { total_jobs_completed: (updated.totalJobsCompleted || 0) + 10 }, reason: 'dev_tool' });
        toast.success("+10 Jobs!");
        break;
      case 'devReset':
        if (devResetStep === 0) { setDevResetStep(1); return; }
        import("@/lib/playerMemory").then(({ resetInMemoryCache }) => resetInMemoryCache());
        toast.success("Game data reset!"); setTimeout(() => window.location.reload(), 600); return;
    }
    setPlayerData(getPlayerData());
  };

  const resetMessages = ["Are you sure?", "Are you REALLY sure??", "LAST TIME! CONFIRM?"];

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD isPlayerHomePage />

      <div className="pt-[118px] max-w-lg mx-auto px-4">
        {/* ── PROFILE CARD ── */}
        <div className="bg-[#0a0f1a] border border-emerald-900/40 rounded-2xl overflow-hidden mb-3">
          {/* Close button */}
          <div className="flex justify-end px-3 pt-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
          <div className="pt-4 pb-3 px-4 border-b border-slate-800/60">
            {/* Top row: profile image (left) + stats (right) */}
            <div className="flex items-start gap-3 mb-3">
              {/* Profile image — 33% smaller (w-16 vs w-24) */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-xl border-2 border-emerald-600/50 overflow-hidden bg-slate-900 relative">
                  {playerData?.profileImageDataUrl ? (
                    <img src={playerData.profileImageDataUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-2xl">👤</div>
                  )}
                  {equippedFrameUrl && (
                    <img src={equippedFrameUrl} alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ zIndex: 10 }} />
                  )}
                </div>
                {/* Change button overlaps the frame at bottom-right */}
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-[#0a0f1a] transition-colors"
                  style={{ zIndex: 20 }}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* Stats column to the right of image */}
              <div className="flex-1 grid grid-cols-1 gap-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Level</span>
                  <span className="text-emerald-400 font-bold">{playerData?.level || 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account #</span>
                  <span className="text-amber-300 font-mono font-bold text-[11px]">{accountNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Power</span>
                  <span className="text-amber-400 font-bold">{tp.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">HQ Lv.</span>
                  <span className="text-cyan-400 font-bold">{playerData?.fundMembersOwned || 0}</span>
                </div>
              </div>
            </div>

            {/* Username + Alliance Tag row */}
            <div className="w-full flex items-center justify-center gap-2 mb-1">
              {/* Alliance tag badge */}
              {playerData?.allianceTag && (
                <button
                  onClick={() => navigate(createPageUrl("AlliancePage"))}
                  className="shrink-0 px-2 py-0.5 rounded-md border bg-amber-900/30 border-amber-700/50 text-amber-400 text-xs font-bold hover:bg-amber-800/40 transition-colors"
                >
                  [{playerData.allianceTag}]
                </button>
              )}

                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-white">{playerData?.username || "Unknown"}</span>
                  <button onClick={() => setCustomizeOpen(true)}>
                    <Pencil className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400" />
                  </button>
                </div>

              {/* No-alliance browse link */}
              {!playerData?.allianceTag && (
                <button
                  onClick={() => navigate(createPageUrl("AlliancePage"))}
                  className="shrink-0 px-2 py-0.5 rounded-md border bg-slate-800/50 border-slate-700/50 text-slate-500 text-xs hover:bg-slate-700/40 transition-colors"
                >
                  + Alliance
                </button>
              )}
            </div>
          </div>

          {/* ── MAIN TABS ── */}
          {mainTab !== "customize" && (
            <div className="flex border-b border-slate-800">
              {["home", "settings", "help"].map(t => (
                <button
                  key={t}
                  onClick={() => setMainTab(t)}
                  className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all ${mainTab === t ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {t === "home" ? "🏠 Home" : t === "settings" ? "⚙️ Settings" : "❓ Help"}
                </button>
              ))}
            </div>
          )}

          {/* ── CUSTOMIZE TABS ── */}
          {mainTab === "customize" && (
            <div className="flex items-center border-b border-slate-800 px-2 gap-2">
              <button onClick={() => setMainTab("home")} className="text-xs text-slate-400 hover:text-white py-2.5 shrink-0">← Back</button>
              <div className="flex flex-1">
                {["profile_pic", "my_frames"].map(t => (
                  <button
                    key={t}
                    onClick={() => setCustomizeTab(t)}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all ${customizeTab === t ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {t === "profile_pic" ? "📷 Profile Pic" : `🖼️ My Frames${ownedFrames.length > 0 ? ` (${ownedFrames.length})` : ""}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB CONTENT ── */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 440px)', minHeight: '200px' }}>

            {/* HOME */}
            {mainTab === "home" && (
              <div className="p-4 space-y-2">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest text-center mb-3">Quick Actions</div>
                {[
                  { label: "📊 View Full Profile", page: "ProfilePage" },
                  { label: "🛒 Shop", page: "ShopPage" },
                  { label: "🤝 Alliance", page: "AlliancePage" },
                ].map(item => (
                  <button
                    key={item.page}
                    onClick={() => navigate(createPageUrl(item.page))}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
                  >
                    <span className="text-sm text-slate-200">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}

                <div className="pt-2 border-t border-slate-800">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full border-purple-700 text-purple-400 hover:bg-purple-900/30 flex items-center gap-2 text-xs">
                        <Code className="w-3.5 h-3.5" /> DEVELOPER TOOLS
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#0a0f1a] border border-purple-900/40 w-52 z-[200]">
                      <DropdownMenuItem onClick={() => handleDevIncrease('devReset')} className="text-red-500 font-bold hover:bg-red-950/30 cursor-pointer">
                        {devResetStep === 0 ? "🛑 RESET GAME DATA" : "🛑 CONFIRM RESET?"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('cash')} className="text-green-400 hover:bg-green-950/30 cursor-pointer">💵 Add Cash (+100k)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('respect')} className="text-purple-400 hover:bg-purple-950/30 cursor-pointer">⭐ Add Respect (+500)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('cryd')} className="text-cyan-400 hover:bg-cyan-950/30 cursor-pointer flex items-center gap-1.5"><CrydIcon size={14} /> Add CRYD (+1000)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('reduceheat')} className="text-red-400 hover:bg-red-950/30 cursor-pointer">🔥 Reduce Heat to 0</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('fillenergy')} className="text-yellow-400 hover:bg-yellow-950/30 cursor-pointer">⚡ Fill Energy</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('fillstamina')} className="text-blue-400 hover:bg-blue-950/30 cursor-pointer">💪 Fill Stamina</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('wins')} className="text-green-400 hover:bg-green-950/30 cursor-pointer">🏆 +10 Trade War Wins</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('trades')} className="text-cyan-400 hover:bg-cyan-950/30 cursor-pointer">📊 +10 Trades</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('sabotages')} className="text-orange-400 hover:bg-orange-950/30 cursor-pointer">📉 +10 Sabotages</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('assists')} className="text-yellow-400 hover:bg-yellow-950/30 cursor-pointer">🤝 +10 Assists</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDevIncrease('jobs')} className="text-teal-400 hover:bg-teal-950/30 cursor-pointer">💼 +10 Jobs</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {mainTab === "settings" && (
              <div className="p-4 space-y-3">
                {/* Account */}
                <div className="bg-[#060a12] border border-yellow-700/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <LogOut className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-semibold text-slate-200">Account</span>
                  </div>
                  {userEmail && (
                    <div className="mb-2 px-2 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Logged in as</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">{userEmail}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => base44.auth.redirectToLogin()} variant="outline" size="sm" className="flex-1 border-yellow-700 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/30 gap-1 text-[10px] h-8">
                      <RefreshCw className="w-3 h-3" /> Switch Account
                    </Button>
                    <Button onClick={() => base44.auth.logout()} variant="outline" size="sm" className="flex-1 border-red-700 bg-red-900/20 text-red-400 hover:bg-red-800/30 gap-1 text-[10px] h-8">
                      <LogOut className="w-3 h-3" /> Logout
                    </Button>
                  </div>
                </div>

                {/* Cloud Sync */}
                <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-semibold text-cyan-400">Cloud Data Sync</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mb-2">Force re-sync your data from the server</p>
                  <Button onClick={handleManualSave} disabled={syncing} size="sm" className="w-full bg-cyan-600 hover:bg-cyan-500 text-[10px] h-8">
                    <Cloud className="w-3 h-3 mr-1.5" />{syncing ? "Syncing..." : "Re-sync from Server"}
                  </Button>
                </div>

                {/* Coupon */}
                <div className="bg-[#060a12] border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Redeem Coupon</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase tracking-widest"
                      maxLength={20}
                    />
                    <Button onClick={handleRedeemCoupon} disabled={couponLoading || !couponCode.trim()} size="sm" className="bg-amber-600 hover:bg-amber-500 text-[10px] h-8">
                      {couponLoading ? "..." : "Redeem"}
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-semibold text-red-400">Danger Zone</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mb-2">Permanently delete all account data</p>
                  <Button onClick={handleResetAccount} size="sm" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] h-8">
                    {resetStep === 0 ? "RESET ACCOUNT" : resetStep === 1 ? "Are you sure?" : "CONFIRM — DELETE ALL DATA"}
                  </Button>
                  {resetStep > 0 && (
                    <Button onClick={() => setResetStep(0)} variant="ghost" size="sm" className="w-full mt-1 text-slate-500 hover:text-slate-400 text-[10px] h-7">Cancel Reset</Button>
                  )}
                </div>
              </div>
            )}

            {/* HELP */}
            {mainTab === "help" && <HelpTab />}

            {/* CUSTOMIZE — Profile Pic */}
            {mainTab === "customize" && customizeTab === "profile_pic" && (
              <div className="p-3">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 text-center">Choose Your Profile Image</div>
                <div className="grid grid-cols-4 gap-2">
                  {PROFILE_IMAGES.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => handleImageSelect(url)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                        playerData?.profileImageDataUrl === url ? 'border-emerald-500 ring-2 ring-emerald-400/50' : 'border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      <img src={url} alt={`Profile ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOMIZE — Frames */}
            {mainTab === "customize" && customizeTab === "my_frames" && (
              <div className="p-3">
                {ownedFrames.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-2">🖼️</div>
                    <div className="text-sm text-slate-500">No frames earned yet</div>
                    <div className="text-xs text-slate-600 mt-1">Win Capital Clash or activate VIP!</div>
                  </div>
                ) : (
                  <>
                    {equippedFrameId && (
                      <button onClick={handleUnequipFrame} className="w-full mb-3 text-xs py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all">
                        ✕ Remove Current Frame
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {ownedFrames.map(f => {
                        const frame = getFrameById(f.id);
                        if (!frame) return null;
                        const isEquipped = equippedFrameId === f.id;
                        const isVipFrame = f.id === 'vip';
                        const timeLeft = isVipFrame ? getVipTimeRemaining(playerData) : (f.expiresAt ? Math.max(0, f.expiresAt - Date.now()) : null);
                        return (
                          <div key={f.id} className={`bg-[#060a12] border rounded-xl p-2 ${isEquipped ? `${frame.borderColor} ring-2 ring-offset-1 ring-offset-[#060a12] ${frame.borderColor}` : 'border-slate-800'}`}>
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 mb-2">
                              <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                              {isEquipped && (
                                <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className={`text-xs font-bold ${frame.color} text-center mb-0.5`}>{frame.name}</div>
                            {frame.type === 'temporary' && timeLeft && (
                              <div className="text-[9px] text-amber-400 text-center mb-1">TEMPORARY • {formatVipTime(timeLeft)}</div>
                            )}
                            <div className="text-[9px] text-slate-500 text-center mb-2 leading-tight">{frame.description}</div>
                            {isEquipped ? (
                              <Button size="sm" onClick={handleUnequipFrame} variant="outline" className="w-full text-[10px] h-6 border-red-700 text-red-400 hover:bg-red-950/30">Remove</Button>
                            ) : (
                              <Button size="sm" onClick={() => handleEquipFrame(f.id)} className="w-full text-[10px] h-6 bg-emerald-600 hover:bg-emerald-500">Equip</Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <GlobalChatBar />
      <BottomNav />

      <CustomizeProfileOverlay open={customizeOpen} onClose={() => setCustomizeOpen(false)} />

      <CosmeticSaveOverlay status={saveStatus} />
    </div>
  );
}

// ── HELP TAB ──
function HelpTab() {
  const [activeItem, setActiveItem] = useState(null);
  const helpItems = [
    { id: "faq_game", label: "FAQ: Game", icon: "🎮" },
    { id: "faq_social", label: "FAQ: Social", icon: "👥" },
    { id: "faq_purchases", label: "FAQ: Purchases", icon: "💳" },
    { id: "contact", label: "Contact Us", icon: "📧" },
    { id: "privacy", label: "Privacy Policy", icon: "🔒" },
    { id: "agreement", label: "User Agreement", icon: "📄" },
  ];

  if (activeItem) {
    return (
      <div className="p-4">
        <button onClick={() => setActiveItem(null)} className="text-xs text-slate-400 hover:text-white mb-3 flex items-center gap-1">← Back</button>
        <HelpContent id={activeItem} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {helpItems.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveItem(item.id)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
        >
          <span className="text-sm text-slate-200">{item.icon} {item.label}</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      ))}
    </div>
  );
}

function HelpContent({ id }) {
  if (id === "faq_game") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">🎮 FAQ: Game</h3>
      <div><p className="text-slate-400 font-semibold mb-0.5">How do I earn cash?</p><p>Complete jobs on the MAP page, win Trade Wars, or execute profitable trades on the Trade Desk.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is Heat?</p><p>Heat rises from illegal activities. High heat makes you visible to live attackers. It regenerates down over time.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">How do I level up?</p><p>Earn XP from jobs, trades, and trade wars. Each level requires more XP but unlocks new content and items.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is Total Power (TP)?</p><p>TP = ATK + DEF + Fund Members. Higher TP wins more battles and improves your rankings.</p></div>
    </div>
  );
  if (id === "faq_social") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">👥 FAQ: Social</h3>
      <div><p className="text-slate-400 font-semibold mb-0.5">How do I join an Alliance?</p><p>Go to the Alliance page. Browse open alliances and tap Join, or create your own.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">How does Alliance Chat work?</p><p>Tap the chat bar above the bottom nav. You must be in an alliance to use alliance chat.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is FvF?</p><p>Weekly alliance events where your alliance is matched against another across themed daily challenges.</p></div>
    </div>
  );
  if (id === "faq_purchases") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">💳 FAQ: Purchases</h3>
      <div><p className="text-slate-400 font-semibold mb-0.5">What can I buy?</p><p>CRYD (premium currency), VIP subscriptions, exclusive items, and consumable packs from the Shop.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is VIP?</p><p>VIP provides daily bonus rewards, exclusive frames, and other perks for the duration of your subscription.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">Are purchases refundable?</p><p>Refunds are handled through the App Store (iOS) or Google Play (Android) per their respective policies.</p></div>
    </div>
  );
  if (id === "contact") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">📧 Contact Us</h3>
      <p>For support, bug reports, or account issues, please reach out:</p>
      <div className="bg-slate-800/60 rounded-xl p-3 space-y-2">
        <div><span className="text-slate-500">Email:</span> <span className="text-emerald-400 font-semibold">support@insidertrader.gg</span></div>
        <div><span className="text-slate-500">Response Time:</span> <span className="text-slate-300">24–72 hours</span></div>
      </div>
      <p className="text-slate-500">Please include your username and User ID when contacting support.</p>
    </div>
  );
  if (id === "privacy") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">🔒 Privacy Policy</h3>
      <p className="text-[10px] text-slate-500">Last Updated: June 2026</p>
      <div><h4 className="text-slate-200 font-semibold mb-1">1. Information We Collect</h4><p>We collect information you provide directly (username, email) and gameplay data (progress, purchases, device identifiers). We do not collect sensitive financial information beyond what is processed by App Store or Google Play.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">2. How We Use Your Information</h4><p>We use data to operate and improve the game, personalize your experience, process purchases, prevent fraud, and respond to support. We do not sell your personal data.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">3. Data Sharing</h4><p>We may share data with service providers (hosting, analytics, payment). All partners are bound by data protection agreements.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">4. Children's Privacy</h4><p>This game is not intended for children under 13. Contact us immediately if you believe a child has provided data.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">5. Your Rights</h4><p>You may request access, correction, or deletion of your data. Contact support@insidertrader.gg.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">6. Contact</h4><p>support@insidertrader.gg</p></div>
    </div>
  );
  if (id === "agreement") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">📄 User Agreement</h3>
      <p className="text-[10px] text-slate-500">Last Updated: June 2026</p>
      <div><h4 className="text-slate-200 font-semibold mb-1">1. Acceptance</h4><p>By using Insider Trader you agree to these Terms. If you disagree, do not use the game.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">2. License</h4><p>We grant a limited, non-exclusive, revocable license for personal non-commercial use. No modification, distribution, or reverse engineering.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">3. Virtual Items</h4><p>All in-game items and currency are licensed, not sold. They have no real-world monetary value and cannot be transferred outside the game.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">4. In-App Purchases</h4><p>Processed through Apple App Store or Google Play. Consumable items are non-refundable once used. Refunds per platform policy.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">5. User Conduct</h4><p>No cheating, exploiting, harassing other players, or unauthorized software. Violations may result in account suspension.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">6. Disclaimer</h4><p>The game is provided "as is". All content is fictional and for entertainment only.</p></div>
      <div><h4 className="text-slate-200 font-semibold mb-1">7. Contact</h4><p>support@insidertrader.gg</p></div>
    </div>
  );
  return null;
}