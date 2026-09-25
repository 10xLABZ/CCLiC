import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, BookOpen, AlertTriangle, FileText, Shield, Trash2, Cloud, Tag, LogOut, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { toast } from "sonner";
import { initializeFromServer } from "@/lib/playerServerSync";

export default function SettingsPage() {
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [userEmail, setUserEmail] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [userAgreementOpen, setUserAgreementOpen] = useState(false);
  const [cloudSavesOpen, setCloudSavesOpen] = useState(false);
  const [cloudSaves, setCloudSaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(u => { if (u) setUserEmail(u.email || ""); }).catch(() => {});
  }, []);

  const handleRedeemCoupon = () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setTimeout(() => {
      setCouponLoading(false);
      toast.error("Invalid or expired coupon code.");
      setCouponCode("");
    }, 800);
  };

  const handleResetAccount = async () => {
    if (resetStep === 0) {
      setResetStep(1);
    } else if (resetStep === 1) {
      setResetStep(2);
    } else if (resetStep === 2) {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        if (user) {
          // Delete ALL server records so initializeFromServer treats this as a new user
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
      } catch (e) {
        console.warn('Reset server delete error:', e);
      }
      // Clear in-memory cache — server records already deleted above
      const { resetInMemoryCache } = await import("@/lib/playerMemory");
      resetInMemoryCache();
      setLoading(false);
      toast.success("Account reset complete! Starting fresh...");
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const resetMessages = [
    "Are you sure?",
    "Are you REALLY sure??",
    "LAST TIME! ARE YOU POSITIVE?"
  ];

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

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[148px] max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 mb-1">SETTINGS</h1>
            <p className="text-xs text-slate-600">Configure your game experience</p>
          </div>
          <Link to={createPageUrl("GameDashboard")}>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              BACK
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {/* Account — top */}
          <div className="bg-[#0a0f1a] border border-yellow-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <LogOut className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-semibold text-slate-200">Account</h3>
            </div>
            {userEmail && (
              <div className="mb-3 px-2 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Logged in as</p>
                <p className="text-xs text-emerald-400 font-semibold">{userEmail}</p>
              </div>
            )}
            <p className="text-xs text-slate-600 mb-3">Switch to a different account or log out</p>
            <div className="flex gap-2">
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                variant="outline"
                className="flex-1 border-yellow-700 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/30 gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Switch Account
              </Button>
              <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="flex-1 border-red-700 bg-red-900/20 text-red-400 hover:bg-red-800/30 gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>

          {/* Tutorial */}
          <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-200">Game Tutorial</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Learn how to play and master all game features</p>
            <Button
              onClick={() => setTutorialOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              Start Tutorial
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-semibold text-slate-200">Disclaimer</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Important information about game content</p>
            <Button
              onClick={() => setDisclaimerOpen(true)}
              variant="outline"
              className="w-full border-slate-700 text-slate-400"
            >
              Read Disclaimer
            </Button>
          </div>

          {/* User Agreement */}
          <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-200">User Agreement</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Terms and conditions of use</p>
            <Button
              onClick={() => setUserAgreementOpen(true)}
              variant="outline"
              className="w-full border-slate-700 text-slate-400"
            >
              View Agreement
            </Button>
          </div>

          {/* Privacy Policy */}
          <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-200">Privacy Policy</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">How we handle your data</p>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-400"
              disabled
            >
              View Policy
            </Button>
          </div>

          {/* Cloud Sync */}
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="w-5 h-5 text-cyan-500" />
              <h3 className="text-sm font-semibold text-cyan-400">Cloud Data Sync</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Force re-sync your data from the server (useful after cross-device issues)</p>
            <Button
              onClick={handleManualSave}
              disabled={syncing}
              className="w-full bg-cyan-600 hover:bg-cyan-500"
            >
              <Cloud className="w-4 h-4 mr-2" />
              {syncing ? "Syncing..." : "Re-sync from Server"}
            </Button>
          </div>



          {/* Coupon Code */}
          <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Tag className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Redeem Coupon</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Enter a coupon code to unlock rewards</p>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase tracking-widest"
                maxLength={20}
              />
              <Button
                onClick={handleRedeemCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                {couponLoading ? "..." : "Redeem"}
              </Button>
            </div>
          </div>

          {/* Reset Account - DANGER ZONE */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mt-6">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">Permanently delete all account data</p>
            <Button
              onClick={handleResetAccount}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {resetStep === 0 ? "RESET ACCOUNT" : resetMessages[resetStep - 1]}
            </Button>
            {resetStep > 0 && (
              <Button
                onClick={() => setResetStep(0)}
                variant="ghost"
                className="w-full mt-2 text-slate-500 hover:text-slate-400"
              >
                Cancel Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">Game Tutorial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-emerald-400 font-semibold mb-2">🎮 Welcome to Insider Trader!</h3>
              <p className="text-slate-300">Master the markets, build your empire, and dominate the trading world.</p>
            </div>

            <div>
              <h3 className="text-blue-400 font-semibold mb-2">📊 Operations</h3>
              <p className="text-slate-400 text-xs mb-2 bg-blue-950/30 border border-blue-800/40 rounded-lg p-2">
                📍 All operations are found on the <strong className="text-white">MAP page</strong> — tap the 📍 MAP button in the bottom navigation bar. Once you have a city selected, the main content area shows all available operations.
              </p>
              <p className="text-slate-300 mb-1">💼 <strong>Jobs:</strong> Complete missions to earn cash, respect, and XP. Look for the <strong>JOBS</strong> tab in the MAP page. Higher heat = higher risk/reward.</p>
              <p className="text-slate-300 mb-1">📊 <strong>Trading:</strong> Execute trades with real-time opportunities. Find the <strong>TRADE DESK</strong> in the MAP page. Buy tips for better odds.</p>
              <p className="text-slate-300 mb-1">⚔️ <strong>Trade Wars:</strong> Battle other traders to steal cash and respect. Look for the <strong>TRADE WARS</strong> tab in the MAP page. Costs Stamina per fight.</p>
              <p className="text-slate-300 mb-1">🤝 <strong>Assists:</strong> Help other players complete their active operations for bonus cash and XP — no stamina cost. Find them in the <strong>ASSISTS</strong> tab on the MAP page.</p>
              <p className="text-slate-300">📉 <strong>Sabotages:</strong> Disrupt other players' operations to earn a cut of their earnings. Found in the same <strong>ASSISTS</strong> tab. Limited uses per day (regenerates).</p>
            </div>

            <div>
              <h3 className="text-purple-400 font-semibold mb-2">✈️ Travel</h3>
              <p className="text-slate-300 mb-1">Expand to new cities and states. Each location has different activity levels:</p>
              <p className="text-slate-300 mb-1"><strong>🔥 Hot Zones:</strong> High activity, more battles, increased heat generation.</p>
              <p className="text-slate-300 mb-1"><strong>✅ Normal Zones:</strong> Standard activity and battle frequency.</p>
              <p className="text-slate-300"><strong>❄️ Cold Zones:</strong> Lower activity, fewer battles, slower progression.</p>
            </div>

            <div>
              <h3 className="text-amber-400 font-semibold mb-2">🛒 Shop & Inventory</h3>
              <p className="text-slate-300 mb-1"><strong>Weapons:</strong> Equip up to 3. Upgrade with Gear Parts to unlock stars (10 stars max).</p>
              <p className="text-slate-300 mb-1"><strong>Vehicles, People, Pets:</strong> Equip 1 of each type to boost your stats.</p>
              <p className="text-slate-300 mb-1"><strong>Avatars:</strong> Change your appearance. Upgrade with Avatar Shards for stat bonuses (10 stars max).</p>
              <p className="text-slate-300 mb-1"><strong>Scenes & Themes:</strong> Customize your profile background and UI theme.</p>
              <p className="text-slate-300"><strong>Consumables:</strong> One-time use items for heat reduction, energy/stamina boosts, and shields.</p>
            </div>

            <div>
              <h3 className="text-red-400 font-semibold mb-2">👥 Fund</h3>
              <p className="text-slate-300 mb-1">Build your fund by recruiting members. More members = more fund power.</p>
              <p className="text-slate-300">Fund power adds to your total combat power in battles.</p>
            </div>

            <div>
              <h3 className="text-violet-400 font-semibold mb-2">⚗️ Development & Research</h3>
              <p className="text-slate-300 mb-1"><strong>Sets:</strong> Collect complete item sets to unlock permanent stat bonuses.</p>
              <p className="text-slate-300 mb-1"><strong>Research Lab:</strong> Unlocks at Level 5. Spend cash to unlock permanent upgrades.</p>
              <p className="text-slate-300">Lab levels unlock 1 per player level after Level 5 (max: Level 50).</p>
            </div>

            <div>
              <h3 className="text-green-400 font-semibold mb-2">💎 Resources</h3>
              <p className="text-slate-300 mb-1"><strong>Cash:</strong> Earn from jobs, trades, and battles. Used to buy most items.</p>
              <p className="text-slate-300 mb-1"><strong>CRYD:</strong> Premium currency for exclusive high-level gear.</p>
              <p className="text-slate-300 mb-1"><strong>Respect:</strong> Climb the reputation ladder by winning wars and completing jobs.</p>
              <p className="text-slate-300 mb-1"><strong>Heat:</strong> Increases from illegal activities. High heat = more live attacks. Regenerates over time.</p>
              <p className="text-slate-300 mb-1"><strong>Energy:</strong> Used for jobs and trades. Regenerates 1 per 3 minutes.</p>
              <p className="text-slate-300"><strong>Stamina:</strong> Used for trade wars. Regenerates 1 per 5 minutes.</p>
            </div>

            <div>
              <h3 className="text-yellow-400 font-semibold mb-2">🎯 Events & Goals</h3>
              <p className="text-slate-300 mb-1"><strong>Fast Five:</strong> Recurring 5-hour event. Complete 5 goals (jobs, assists, trade wars, sabotages, trades) to earn rewards. Cycles every 12.5 hours.</p>
              <p className="text-slate-300 mb-1"><strong>Avatar Shard Frenzy:</strong> Bi-weekly 5-day event with 50-goal challenges. Rewards <strong className="text-yellow-300">Avatar Shards 🧩</strong>.</p>
              <p className="text-slate-300 mb-1"><strong>Gear Overdrive:</strong> Bi-weekly 5-day event alternating with Shard Frenzy. Rewards <strong className="text-orange-300">Gear Parts ⚙️</strong>.</p>
              <p className="text-slate-300 mb-1">Daily Goals reset at midnight and reward cash, XP, and consumables.</p>
              <div className="mt-2 bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-2 text-xs">
                <p className="text-yellow-300 font-semibold mb-1">💡 What to do with your Shards & Parts:</p>
                <p className="text-slate-300 mb-1">🧩 <strong className="text-white">Avatar Shards</strong> — Go to your <strong>Profile page</strong>, click your avatar image, and use the Upgrade button below your equipped avatar. Shards upgrade your avatar to higher star tiers (up to ⭐×10), unlocking powerful passive bonuses like +ATK, +DEF, more cash, or reduced heat.</p>
                <p className="text-slate-300">⚙️ <strong className="text-white">Gear Parts</strong> — Go to your <strong>Profile page</strong> → Equipped Loadout → click any weapon slot → tap UPGRADE. Parts upgrade your weapons to higher stars, adding a % bonus to that weapon's ATK/DEF.</p>
              </div>
            </div>

            <div>
              <h3 className="text-orange-400 font-semibold mb-2">🛡️ Defense & Shields</h3>
              <p className="text-slate-300 mb-1"><strong>Live Attacks:</strong> Players with high heat may be attacked by other traders.</p>
              <p className="text-slate-300 mb-1"><strong>Shields:</strong> Protect yourself from attacks for 12h-3 days. Breaks if you attack someone.</p>
              <p className="text-slate-300">Defense Log shows recent attacks — use revenge to fight back!</p>
            </div>

            <div>
              <h3 className="text-cyan-400 font-semibold mb-2">📈 Progression</h3>
              <p className="text-slate-300 mb-1"><strong>XP & Leveling:</strong> Gain XP from all activities. Each level increases your stats and unlocks new content.</p>
              <p className="text-slate-300 mb-1"><strong>Star Upgrades:</strong> Upgrade weapons (Gear Parts) and avatars (Avatar Shards) to 10 stars.</p>
              <p className="text-slate-300">Higher stars require higher player levels to unlock.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disclaimer Modal */}
      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-yellow-900/40 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Disclaimer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p>This game is a work of fiction. Any resemblance to real persons, organizations, or events is purely coincidental.</p>
            <p>The game contains themes of trading, competition, and economic simulation. It is intended for entertainment purposes only.</p>
            <p>All in-game activities are fictional and do not represent real financial advice or illegal activities.</p>
            <p>Play responsibly and remember this is just a game.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Agreement Modal */}
      <Dialog open={userAgreementOpen} onOpenChange={setUserAgreementOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-slate-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">User Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p><strong>Last Updated:</strong> February 2026</p>
            
            <div>
              <h3 className="text-slate-200 font-semibold mb-1">1. Acceptance of Terms</h3>
              <p>By playing this game, you agree to these terms and conditions.</p>
            </div>

            <div>
              <h3 className="text-slate-200 font-semibold mb-1">2. Game Content</h3>
              <p>All game content is fictional. No real-world trading or financial activities are involved.</p>
            </div>

            <div>
              <h3 className="text-slate-200 font-semibold mb-1">3. User Conduct</h3>
              <p>Users must play fairly and not exploit bugs or glitches intentionally.</p>
            </div>

            <div>
              <h3 className="text-slate-200 font-semibold mb-1">4. Data Storage</h3>
              <p>Game progress is stored locally on your device. Clear browser data at your own risk.</p>
            </div>

            <div>
              <h3 className="text-slate-200 font-semibold mb-1">5. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}