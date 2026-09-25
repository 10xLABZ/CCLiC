import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plane, Target, Building2, Shield, ShoppingBag, User, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import LevelUpModal from "@/components/dashboard/LevelUpModal";
import GlobalChatBar from "@/components/chat/GlobalChatBar";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { resetInMemoryCache } from "@/lib/playerMemory";

import { Settings, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import CrydIcon from "@/components/shared/CrydIcon";

const MENU_ITEMS = [
  {
    label: "Fund",
    icon: Building2,
    page: "FundPage",
    color: "slate",
    description: "Manage your fund",
  },
  {
    label: "Maps",
    icon: MapPin,
    page: "MapsPage",
    color: "amber",
    description: "Trade Wars & Operations",
  },
  {
    label: "Profile",
    icon: User,
    page: "ProfilePage",
    color: "blue",
    description: "Stats & Equipment",
  },
  {
    label: "Shop",
    icon: ShoppingBag,
    page: "ShopPage",
    color: "yellow",
    description: "Buy gear & upgrades",
  },
  {
    label: "Travel",
    icon: Plane,
    page: "TravelPage",
    color: "emerald",
    description: "Expand to new cities",
  },
  {
    label: "Defense Log",
    icon: Shield,
    page: "DefenceLogPage",
    color: "red",
    description: "View attack history",
  },
];

const colorMap = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-400/50",
    hoverBg: "hover:bg-emerald-950/20",
    icon: "text-emerald-500",
    text: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-amber-500/40",
    text: "text-amber-400/40",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-yellow-500/40",
    text: "text-yellow-400/40",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-red-500/40",
    text: "text-red-400/40",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-blue-500/40",
    text: "text-blue-400/40",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-purple-500/40",
    text: "text-purple-400/40",
  },
  slate: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    hoverBorder: "",
    hoverBg: "",
    icon: "text-slate-500/40",
    text: "text-slate-400/40",
  },
};

export default function HomePage() {
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);
  const [levelUpModal, setLevelUpModal] = useState({ open: false, level: null });
  const [resetStep, setResetStep] = useState(0); // 0=idle, 1=first confirm, 2=second confirm

  useEffect(() => {
    // Auto-navigate to Maps page (Boston, MA) for first-time users
    const player = getPlayerData();
    if (!player.hasCompletedOnboarding && !player.locationCity) {
      savePlayerData({ 
        locationState: 'Massachusetts',
        locationCity: 'Boston',
        hasCompletedOnboarding: true
      });
      window.location.href = createPageUrl("MapsPage");
    }
  }, []);



  const handleResetGame = () => {
    setResetStep(1);
  };

  const confirmReset = () => {
    if (resetStep === 1) {
      setResetStep(2);
    } else if (resetStep === 2) {
      resetInMemoryCache();
      toast.success("Game data reset!");
      window.location.reload();
    }
  };

  const handleDevIncrease = (type) => {
    const updated = getPlayerData();
    switch(type) {
      case 'level':
        savePlayerData({ level: updated.level + 1 });
        toast.success("Level increased!");
        break;
      case 'cash':
        savePlayerData({ cash: updated.cash + 100000 });
        toast.success("+$100,000 cash!");
        break;
      case 'respect':
        savePlayerData({ respect: updated.respect + 500 });
        toast.success("+500 respect!");
        break;
      case 'cryd':
        savePlayerData({ crypto: updated.crypto + 1000 });
        toast.success("+1000 CRYD!");
        break;
      case 'xp':
        savePlayerData({ currentXP: updated.currentXP + 500 });
        toast.success("+500 XP!");
        break;
      case 'reduceheat':
        savePlayerData({ heat: 0 });
        toast.success("Heat reduced to 0!");
        break;
      case 'fillenergy':
        savePlayerData({ energy: 100 });
        toast.success("Energy filled to 100!");
        break;
      case 'fillstamina':
        savePlayerData({ stamina: 100 });
        toast.success("Stamina filled to 100!");
        break;
      case 'wins':
        savePlayerData({ totalTradeWarWins: (updated.totalTradeWarWins || 0) + 10 });
        toast.success("+10 Trade War Wins!");
        break;
      case 'trades':
        savePlayerData({ totalTradesCompleted: (updated.totalTradesCompleted || 0) + 10 });
        toast.success("+10 Trades!");
        break;
      case 'sabotages':
        savePlayerData({ totalSabotages: (updated.totalSabotages || 0) + 10, sabotagesRemaining: (updated.sabotagesRemaining || 0) + 10 });
        toast.success("+10 Sabotages!");
        break;
      case 'assists':
        savePlayerData({ totalAssists: (updated.totalAssists || 0) + 10 });
        toast.success("+10 Assists!");
        break;
      case 'jobs':
        savePlayerData({ totalJobsCompleted: (updated.totalJobsCompleted || 0) + 10 });
        toast.success("+10 Jobs!");
        break;
    }
    setPlayerData(getPlayerData());
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD />

      <div className="pt-[118px] max-w-2xl mx-auto px-4 py-6">
        {/* Settings & Developer Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link to={createPageUrl("SettingsPage")}>
            <Button variant="outline" className="w-full border-slate-700 text-slate-400 hover:bg-slate-900/50 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              SETTINGS
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full border-purple-700 text-purple-400 hover:bg-purple-900/30 flex items-center gap-2">
                <Code className="w-4 h-4" />
                DEVELOPER
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0a0f1a] border border-purple-900/40 w-48">
              <DropdownMenuItem 
                onClick={handleResetGame}
                className="text-red-500 font-bold hover:bg-red-950/30 cursor-pointer"
              >
                🛑 RESET GAME DATA 🛑
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => handleDevIncrease('cash')}
                className="text-green-400 hover:bg-green-950/30 cursor-pointer"
              >
                💵 Add Cash (+100k)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('respect')}
                className="text-purple-400 hover:bg-purple-950/30 cursor-pointer"
              >
                ⭐ Add Respect (+500)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('cryd')}
                className="text-cyan-400 hover:bg-cyan-950/30 cursor-pointer flex items-center gap-1.5"
              >
                <CrydIcon size={14} /> Add CRYD (+1000)
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => handleDevIncrease('reduceheat')}
                className="text-red-400 hover:bg-red-950/30 cursor-pointer"
              >
                🔥 Reduce Heat to 0
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('fillenergy')}
                className="text-yellow-400 hover:bg-yellow-950/30 cursor-pointer"
              >
                ⚡ Fill Energy
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('fillstamina')}
                className="text-blue-400 hover:bg-blue-950/30 cursor-pointer"
              >
                💪 Fill Stamina
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('wins')}
                className="text-green-400 hover:bg-green-950/30 cursor-pointer"
              >
                🏆 +10 Trade War Wins
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('trades')}
                className="text-cyan-400 hover:bg-cyan-950/30 cursor-pointer"
              >
                📊 +10 Trades
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('sabotages')}
                className="text-orange-400 hover:bg-orange-950/30 cursor-pointer"
              >
                📉 +10 Sabotages
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('assists')}
                className="text-yellow-400 hover:bg-yellow-950/30 cursor-pointer"
              >
                🤝 +10 Assists
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDevIncrease('jobs')}
                className="text-teal-400 hover:bg-teal-950/30 cursor-pointer"
              >
                💼 +10 Jobs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Events Banner - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.3 }}
          className="mb-3"
        >
          <Link to={createPageUrl("EventsPage")}>
            <img
              src="https://media.base44.com/images/public/699169456a354d6cb7082777/6d4491875_eventsbanner1.jpg"
              alt="Events"
              className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {MENU_ITEMS.map((item, i) => {
            const buttonImages = {
              FundPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/d817d145b_fundbutton.jpg",
              MapsPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/25d6d7a4a_mapsbutton.jpg",
              ProfilePage: "https://media.base44.com/images/public/699169456a354d6cb7082777/528c53707_profilebutton.jpg",
              ShopPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/bef01ee97_shopbutton.jpg",
              TravelPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/b2735a103_travelbutton.jpg",
              DefenceLogPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/a8b46784b_defenselogbutton.jpg"
            };

            const content = (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className={`relative ${item.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-90"} 
                  rounded-xl overflow-hidden transition-all duration-200`}
              >
                <img
                  src={buttonImages[item.page]}
                  alt={item.label}
                  className="w-full h-auto"
                />
              </motion.div>
            );

            if (item.disabled || !item.page) {
              return <div key={item.label}>{content}</div>;
            }

            return (
              <Link key={item.label} to={createPageUrl(item.page)}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      <GlobalChatBar />
      <BottomNav />
      
      <LevelUpModal
        level={levelUpModal.level}
        open={levelUpModal.open}
        onClose={() => setLevelUpModal({ open: false, level: null })}
      />

      {/* Reset Game Data — 2-step confirmation */}
      {resetStep > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 px-6">
          <div className="bg-[#0d0505] border border-red-700/60 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">🛑</div>
            {resetStep === 1 ? (
              <>
                <div className="text-red-400 font-bold text-lg mb-2">RESET GAME DATA?</div>
                <div className="text-slate-300 text-sm mb-4">This will permanently delete ALL local game data including your stats, inventory, and progress. This cannot be undone.</div>
                <div className="flex gap-3">
                  <button onClick={() => setResetStep(0)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmReset} className="flex-1 py-2 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-red-300 font-bold text-lg mb-2">⚠️ ARE YOU SURE?</div>
                <div className="text-slate-300 text-sm mb-1">FINAL WARNING</div>
                <div className="text-red-400 text-xs font-semibold mb-4">All game data will be wiped PERMANENTLY. You will start from scratch.</div>
                <div className="flex gap-3">
                  <button onClick={() => setResetStep(0)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
                    No, Keep Data
                  </button>
                  <button onClick={confirmReset} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors">
                    🛑 YES, RESET
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}