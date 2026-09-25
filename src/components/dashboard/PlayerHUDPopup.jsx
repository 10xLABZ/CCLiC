import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Pencil, RefreshCw, LogOut, Cloud, Tag, Trash2, BookOpen, AlertTriangle, FileText, Shield, Code, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { getPlayerData, savePlayerData } from "@/components/utils/playerStorage";
import { getEquippedFrameUrl } from "@/components/frames/framesStorage";
import { getOwnedFrames, equipFrame, unequipFrame, getEquippedFrameId } from "@/components/frames/framesStorage";
import { getFrameById } from "@/components/frames/framesData";
import { isVipActive, formatVipTime, getVipTimeRemaining } from "@/lib/vipHelper";
import { CheckCircle2 } from "lucide-react";
import { initializeFromServer } from "@/lib/playerServerSync";
import { resetInMemoryCache } from "@/lib/playerMemory";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CrydIcon from "@/components/shared/CrydIcon";

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

export default function PlayerHUDPopup({ open, onClose, playerData, onUpdate }) {
  const navigate = useNavigate();
  // "home" | "settings" | "help" | "customize"
  const [mainTab, setMainTab] = useState("home");
  // "profile_pic" | "my_frames" — only when mainTab === "customize"
  const [customizeTab, setCustomizeTab] = useState("profile_pic");

  // Settings state
  const [userEmail, setUserEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resetStep, setResetStep] = useState(0);

  // Edit username
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(playerData?.username || "");

  // Dev menu reset
  const [devResetStep, setDevResetStep] = useState(0);

  const equippedFrameUrl = getEquippedFrameUrl(playerData);
  const ownedFrames = getOwnedFrames(playerData);
  const equippedFrameId = getEquippedFrameId(playerData);

  useEffect(() => {
    if (open) {
      base44.auth.me().then(u => { if (u) setUserEmail(u.email || ""); }).catch(() => {});
      setMainTab("home");
      setCustomizeTab("profile_pic");
      setEditingUsername(false);
      setUsernameInput(playerData?.username || "");
      setResetStep(0);
      setDevResetStep(0);
    }
  }, [open]);

  if (!open) return null;

  // Computed stats
  const tp = (playerData?.attackValue || 0) + (playerData?.defenseValue || 0) + (playerData?.fundMembersOwned || 0);

  const handleImageSelect = (url) => {
    const updated = savePlayerData({ profileImageDataUrl: url });
    onUpdate?.(updated);
  };

  const handleEquipFrame = (frameId) => {
    equipFrame(frameId);
    const updated = savePlayerData({ equippedFrameId: frameId });
    onUpdate?.(updated);
  };

  const handleUnequipFrame = () => {
    unequipFrame();
    const updated = savePlayerData({ equippedFrameId: null });
    onUpdate?.(updated);
  };

  const handleSaveUsername = () => {
    if (!usernameInput.trim()) return;
    const updated = savePlayerData({ username: usernameInput.trim() });
    onUpdate?.(updated);
    setEditingUsername(false);
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
    if (resetStep < 2) {
      setResetStep(s => s + 1);
      return;
    }
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
    resetInMemoryCache();
    toast.success("Account reset! Starting fresh...");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleDevIncrease = (type) => {
    const updated = getPlayerData();
    switch (type) {
      case 'cash': savePlayerData({ cash: updated.cash + 100000 }); toast.success("+$100,000 cash!"); break;
      case 'respect': savePlayerData({ respect: updated.respect + 500 }); toast.success("+500 respect!"); break;
      case 'cryd': savePlayerData({ crypto: updated.crypto + 1000 }); toast.success("+1000 CRYD!"); break;
      case 'reduceheat': savePlayerData({ heat: 0 }); toast.success("Heat reduced to 0!"); break;
      case 'fillenergy': savePlayerData({ energy: 100 }); toast.success("Energy filled!"); break;
      case 'fillstamina': savePlayerData({ stamina: 100 }); toast.success("Stamina filled!"); break;
      case 'wins': savePlayerData({ totalTradeWarWins: (updated.totalTradeWarWins || 0) + 10 }); toast.success("+10 Wins!"); break;
      case 'trades': savePlayerData({ totalTradesCompleted: (updated.totalTradesCompleted || 0) + 10 }); toast.success("+10 Trades!"); break;
      case 'sabotages': savePlayerData({ totalSabotages: (updated.totalSabotages || 0) + 10, sabotagesRemaining: (updated.sabotagesRemaining || 0) + 10 }); toast.success("+10 Sabotages!"); break;
      case 'assists': savePlayerData({ totalAssists: (updated.totalAssists || 0) + 10 }); toast.success("+10 Assists!"); break;
      case 'jobs': savePlayerData({ totalJobsCompleted: (updated.totalJobsCompleted || 0) + 10 }); toast.success("+10 Jobs!"); break;
      case 'devReset':
        if (devResetStep === 0) { setDevResetStep(1); return; }
        if (devResetStep === 1) { resetInMemoryCache(); toast.success("Game data reset!"); setTimeout(() => window.location.reload(), 600); return; }
        break;
    }
    onUpdate?.(getPlayerData());
  };

  const resetMessages = ["Are you sure?", "Are you REALLY sure??", "LAST TIME! ARE YOU POSITIVE?"];

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="relative bg-[#0a0f1a] border border-emerald-900/40 rounded-2xl w-full max-w-sm shadow-2xl z-10 overflow-hidden mt-2 mx-3"
        style={{ maxHeight: 'calc(100dvh - 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        {mainTab !== "customize" ? (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#060a12]">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">HOME</span>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-slate-300" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-[#060a12]">
            <button onClick={() => setMainTab("home")} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              ← Back
            </button>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest ml-auto mr-6">CUSTOMIZE</span>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-slate-300" /></button>
          </div>
        )}

        {/* ── PROFILE AREA (shown on home, settings, help) ── */}
        {mainTab !== "customize" && (
          <div className="flex flex-col items-center pt-4 pb-2 px-4 border-b border-slate-800/60">
            {/* Profile image with switch button */}
            <div className="relative mb-2">
              <div className="w-20 h-20 rounded-2xl border-2 border-emerald-600/50 overflow-hidden bg-slate-900 relative">
                {playerData?.profileImageDataUrl ? (
                  <img src={playerData.profileImageDataUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl">👤</div>
                )}
                {equippedFrameUrl && (
                  <img src={equippedFrameUrl} alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ zIndex: 10 }} />
                )}
              </div>
              {/* Switch icon — bottom right */}
              <button
                onClick={() => setMainTab("customize")}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-[#0a0f1a] transition-colors"
                title="Customize profile image"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Username + pencil */}
            <div className="flex items-center gap-1.5 mb-1">
              {editingUsername ? (
                <div className="flex items-center gap-1">
                  <input
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                    className="bg-slate-800 border border-emerald-600/50 rounded-md px-2 py-0.5 text-sm text-white w-32 focus:outline-none focus:border-emerald-500"
                    maxLength={20}
                    autoFocus
                  />
                  <button onClick={handleSaveUsername} className="text-emerald-400 text-xs font-bold hover:text-emerald-300">Save</button>
                  <button onClick={() => setEditingUsername(false)} className="text-slate-500 text-xs hover:text-slate-300">✕</button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-bold text-white">{playerData?.username || "Unknown"}</span>
                  <button onClick={() => { setEditingUsername(true); setUsernameInput(playerData?.username || ""); }}>
                    <Pencil className="w-3 h-3 text-slate-500 hover:text-emerald-400" />
                  </button>
                </>
              )}
            </div>

            {/* Stats grid */}
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1 px-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Level</span>
                <span className="text-emerald-400 font-bold">{playerData?.level || 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">User ID</span>
                <span className="text-slate-400 font-mono text-[10px]">{playerData?.userId?.slice(0, 8) || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">TP</span>
                <span className="text-amber-400 font-bold">{tp.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">HQ Lv.</span>
                <span className="text-cyan-400 font-bold">{playerData?.fundMembersOwned || 0}</span>
              </div>
            </div>

            {/* Alliance tag button */}
            {playerData?.allianceTag && (
              <button
                onClick={() => { onClose(); navigate(createPageUrl("AlliancePage")); }}
                className="mt-2 px-4 py-1 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-400 font-bold text-xs hover:bg-amber-800/40 transition-colors"
              >
                [{playerData.allianceTag}] — VIEW ALLIANCE
              </button>
            )}
            {!playerData?.allianceTag && (
              <button
                onClick={() => { onClose(); navigate(createPageUrl("AlliancePage")); }}
                className="mt-2 px-4 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-500 text-xs hover:bg-slate-700/40 transition-colors"
              >
                No Alliance — Browse
              </button>
            )}
          </div>
        )}

        {/* ── MAIN TAB BAR ── */}
        {mainTab !== "customize" && (
          <div className="flex border-b border-slate-800 shrink-0">
            {["home", "settings", "help"].map(t => (
              <button
                key={t}
                onClick={() => setMainTab(t)}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${mainTab === t ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-slate-500 hover:text-slate-300"}`}
              >
                {t === "home" ? "🏠 Home" : t === "settings" ? "⚙️ Settings" : "❓ Help"}
              </button>
            ))}
          </div>
        )}

        {/* ── CUSTOMIZE TAB BAR ── */}
        {mainTab === "customize" && (
          <div className="flex border-b border-slate-800 shrink-0">
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
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>

          {/* HOME TAB */}
          {mainTab === "home" && (
            <div className="p-4 space-y-3">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest text-center">Quick Actions</div>
              <button
                onClick={() => { onClose(); navigate(createPageUrl("ProfilePage")); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
              >
                <span className="text-sm text-slate-200">📊 View Full Profile</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => { onClose(); navigate(createPageUrl("ShopPage")); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
              >
                <span className="text-sm text-slate-200">🛒 Shop</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => { onClose(); navigate(createPageUrl("AlliancePage")); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
              >
                <span className="text-sm text-slate-200">🤝 Alliance</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* Developer Button */}
              <div className="pt-2 border-t border-slate-800">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full border-purple-700 text-purple-400 hover:bg-purple-900/30 flex items-center gap-2 text-xs">
                      <Code className="w-3.5 h-3.5" />
                      DEVELOPER TOOLS
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0a0f1a] border border-purple-900/40 w-52 z-[10000]">
                    <DropdownMenuItem
                      onClick={() => handleDevIncrease('devReset')}
                      className="text-red-500 font-bold hover:bg-red-950/30 cursor-pointer"
                    >
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

          {/* SETTINGS TAB */}
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
                  <Cloud className="w-3 h-3 mr-1.5" />
                  {syncing ? "Syncing..." : "Re-sync from Server"}
                </Button>
              </div>

              {/* Coupon Code */}
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
                  {resetStep === 0 ? "RESET ACCOUNT" : resetMessages[resetStep - 1]}
                </Button>
                {resetStep > 0 && (
                  <Button onClick={() => setResetStep(0)} variant="ghost" size="sm" className="w-full mt-1 text-slate-500 hover:text-slate-400 text-[10px] h-7">
                    Cancel Reset
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* HELP TAB */}
          {mainTab === "help" && (
            <HelpTab playerData={playerData} />
          )}

          {/* CUSTOMIZE — PROFILE PIC */}
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

          {/* CUSTOMIZE — MY FRAMES */}
          {mainTab === "customize" && customizeTab === "my_frames" && (
            <div className="p-3">
              {ownedFrames.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div className="text-sm text-slate-500">No frames earned yet</div>
                  <div className="text-xs text-slate-600 mt-1">Win Capital Clash events or activate VIP!</div>
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
                          {frame.type === 'temporary' && (
                            <div className="text-[9px] text-amber-400 text-center mb-1">
                              TEMPORARY{timeLeft ? ` • ${formatVipTime(timeLeft)}` : ''}
                            </div>
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
  );

  return ReactDOM.createPortal(content, document.body);
}

// ── HELP TAB CONTENT ──
function HelpTab({ playerData }) {
  const [activeItem, setActiveItem] = useState(null);

  const helpItems = [
    { id: "faq_game", label: "FAQ: Game", icon: "🎮" },
    { id: "faq_social", label: "FAQ: Social", icon: "👥" },
    { id: "faq_purchases", label: "FAQ: Purchases / ETC.", icon: "💳" },
    { id: "contact", label: "Contact Us", icon: "📧" },
    { id: "privacy", label: "Privacy Policy", icon: "🔒" },
    { id: "agreement", label: "User Agreement", icon: "📄" },
  ];

  if (activeItem) {
    return (
      <div className="p-4">
        <button onClick={() => setActiveItem(null)} className="text-xs text-slate-400 hover:text-white mb-3 flex items-center gap-1">
          ← Back
        </button>
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
      <div><p className="text-slate-400 font-semibold mb-0.5">What is Heat?</p><p>Heat rises from illegal activities. High heat makes you visible to live attackers. It regenerates down over time, or use consumables to reduce it.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">How do I level up?</p><p>Earn XP from jobs, trades, and trade wars. Each level requires more XP but unlocks new content and items.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What are Gear Parts and Avatar Shards?</p><p>Upgrade materials earned from events. Gear Parts upgrade weapons (up to 10 stars). Avatar Shards upgrade avatars for stat bonuses.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is Total Power (TP)?</p><p>TP = ATK + DEF + Fund Members. Higher TP wins more battles and improves your rankings.</p></div>
    </div>
  );

  if (id === "faq_social") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">👥 FAQ: Social</h3>
      <div><p className="text-slate-400 font-semibold mb-0.5">How do I join an Alliance?</p><p>Go to the Alliance page from the Home screen. Browse open alliances and tap Join, or create your own.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What do Alliance roles mean?</p><p>Leader manages settings. VPs assist the leader. Officers manage members. Members participate in events. Roles give different permissions.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">How does Alliance Chat work?</p><p>Tap the chat bar above the bottom nav. You must be in an alliance to use alliance chat. DMs are available to message individual alliance members.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is FvF (Faction vs Faction)?</p><p>Weekly alliance events where your alliance is matched against another. Earn points throughout the week across themed daily challenges.</p></div>
    </div>
  );

  if (id === "faq_purchases") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">💳 FAQ: Purchases</h3>
      <div><p className="text-slate-400 font-semibold mb-0.5">What can I buy with real money?</p><p>CRYD (premium currency), VIP subscriptions, exclusive items, and consumable packs from the Shop.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">Can I restore purchases?</p><p>Yes! Go to Settings → purchases are tied to your account and can be restored if lost by contacting support.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">What is VIP?</p><p>VIP provides daily bonus rewards, exclusive frames, and other perks for the duration of your subscription.</p></div>
      <div><p className="text-slate-400 font-semibold mb-0.5">Are purchases refundable?</p><p>Refunds are handled through the App Store (iOS) or Google Play (Android) per their respective policies.</p></div>
    </div>
  );

  if (id === "contact") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">📧 Contact Us</h3>
      <p>For support, bug reports, or account issues, please reach out to us:</p>
      <div className="bg-slate-800/60 rounded-xl p-3 space-y-2">
        <div><span className="text-slate-500">Email:</span> <span className="text-emerald-400 font-semibold">support@insidertrader.gg</span></div>
        <div><span className="text-slate-500">Response Time:</span> <span className="text-slate-300">24–72 hours</span></div>
      </div>
      <p className="text-slate-500">Please include your username and User ID when contacting support to help us assist you faster.</p>
    </div>
  );

  if (id === "privacy") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">🔒 Privacy Policy</h3>
      <p className="text-[10px] text-slate-500">Last Updated: June 2026</p>

      <div><h4 className="text-slate-200 font-semibold mb-1">1. Information We Collect</h4><p>We collect information you provide directly (username, email) and data generated through gameplay (progress, in-app purchases, device identifiers). We do not collect sensitive personal data such as financial information beyond what is processed by the App Store or Google Play.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">2. How We Use Your Information</h4><p>We use collected data to operate and improve the game, personalize your experience, process purchases, prevent fraud, and respond to support requests. We do not sell your personal data to third parties.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">3. Data Sharing</h4><p>We may share data with service providers who assist us in operating the game (hosting, analytics, payment processing). All partners are bound by data protection agreements. We may disclose data if required by law.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">4. Data Retention</h4><p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting support.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">5. Children's Privacy</h4><p>This game is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us data, contact us immediately.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">6. Security</h4><p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">7. Your Rights</h4><p>Depending on your jurisdiction, you may have rights to access, correct, or delete your data. Contact us at support@insidertrader.gg to exercise these rights.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">8. Changes to This Policy</h4><p>We may update this policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">9. Contact</h4><p>For privacy inquiries: support@insidertrader.gg</p></div>
    </div>
  );

  if (id === "agreement") return (
    <div className="space-y-3 text-xs text-slate-300">
      <h3 className="text-emerald-400 font-bold text-sm">📄 User Agreement</h3>
      <p className="text-[10px] text-slate-500">Last Updated: June 2026</p>

      <div><h4 className="text-slate-200 font-semibold mb-1">1. Acceptance of Terms</h4><p>By downloading, installing, or using Insider Trader ("the Game"), you agree to be bound by these Terms. If you do not agree, do not use the Game. These Terms apply to all users regardless of platform (iOS, Android, Web).</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">2. License</h4><p>We grant you a limited, non-exclusive, non-transferable, revocable license to use the Game for personal, non-commercial entertainment. You may not modify, distribute, reverse engineer, or create derivative works of the Game.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">3. Virtual Items & Currency</h4><p>All in-game items, currency (CRYD, Cash), and virtual goods are licensed, not sold. They have no real-world monetary value and cannot be transferred, traded, or redeemed outside the Game. We reserve the right to modify, suspend, or discontinue virtual items at any time.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">4. In-App Purchases</h4><p>Purchases are processed through the Apple App Store or Google Play. All sales are final unless required by applicable law or platform policy. Refund requests must be submitted through the respective platform. Consumable items are non-refundable once used.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">5. User Conduct</h4><p>You agree not to: cheat, exploit bugs, use unauthorized software, harass other players, or engage in any activity that disrupts the Game or other users' experience. Violations may result in account suspension or termination.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">6. Account</h4><p>You are responsible for maintaining the confidentiality of your account credentials. You are liable for all activity under your account. We reserve the right to terminate accounts that violate these Terms.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">7. Disclaimer of Warranties</h4><p>The Game is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free operation. All game content is fictional and for entertainment only.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">8. Limitation of Liability</h4><p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Game.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">9. Governing Law</h4><p>These Terms are governed by applicable law. Disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">10. Changes to Terms</h4><p>We may update these Terms at any time. Continued use after changes constitutes acceptance. We recommend reviewing these Terms periodically.</p></div>

      <div><h4 className="text-slate-200 font-semibold mb-1">11. Contact</h4><p>Questions about these Terms: support@insidertrader.gg</p></div>
    </div>
  );

  return null;
}