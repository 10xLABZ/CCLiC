import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { setEventCache } from "@/lib/playerMemory";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Trophy, X } from "lucide-react";
import BotProfileModal from "../components/tradewars/BotProfileModal";
import { computeCombatStats } from "../components/tradewars/botGenerator";

const fmtStat = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toFixed(0);
};

export default function DefenceLogPage() {
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [viewingBot, setViewingBot] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSync = () => setPlayerData(updateRegenStats());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  // Store the referring page for dynamic back button
  useEffect(() => {
    const referrer = document.referrer;
    const currentUrl = window.location.href;
    
    // If coming from within the app, store the previous page
    if (referrer && referrer.includes(window.location.origin)) {
      const previousPage = referrer.split('/').pop().split('?')[0];
      if (previousPage && previousPage !== 'DefenceLogPage') {
        setEventCache('defenceLogReferrer', previousPage);
      }
    }
  }, []);

  const defenceLog = playerData.defenceLog || [];
  const recentDefences = defenceLog.slice(-10).reverse();

  const canRevenge = (entry) => {
    if (!entry.revengeAvailable) return false;
    const revengeAttempts = entry.revengeAttempts || 0;
    return revengeAttempts < 2;
  };
  
  const getRevengeStatus = (entry) => {
    const revengeAttempts = entry.revengeAttempts || 0;
    return `${revengeAttempts}/2`;
  };

  const handleRevenge = (entry) => {
    if (!canRevenge(entry)) return;
    
    // Find the ACTUAL index in the full defenceLog array (not the reversed display array)
    const log = playerData.defenceLog || [];
    const actualIndex = log.findIndex(e => 
      e.bot.id === entry.bot.id && 
      e.timestamp === entry.timestamp
    );
    
    if (actualIndex === -1) return;
    
    // Increment revenge attempts using correct array index
    const updatedLog = [...log];
    updatedLog[actualIndex] = { 
      ...updatedLog[actualIndex], 
      revengeAttempts: (updatedLog[actualIndex].revengeAttempts || 0) + 1 
    };
    savePlayerData({ defenceLog: updatedLog });
    
    // Store the revenge bot with the correct index
    setEventCache('revengeBot', { ...entry.bot, defenceLogIndex: actualIndex });
    navigate(createPageUrl("MapsPage"));
  };

  const handleFightFromProfile = (bot) => {
    const log = playerData.defenceLog || [];
    // Find the ACTUAL index in the full defenceLog array
    const actualIndex = log.findIndex(e => e.bot.id === bot.id && e.timestamp);
    const entry = actualIndex >= 0 ? log[actualIndex] : null;
    
    if (!entry || !canRevenge(entry)) return;
    
    // Increment revenge attempts using correct array index
    const updatedLog = [...log];
    updatedLog[actualIndex] = { 
      ...updatedLog[actualIndex], 
      revengeAttempts: (updatedLog[actualIndex].revengeAttempts || 0) + 1 
    };
    savePlayerData({ defenceLog: updatedLog });
    
    // Store the bot with the correct index
    setEventCache('revengeBot', { ...bot, defenceLogIndex: actualIndex });
    navigate(createPageUrl("MapsPage"));
  };

  const revengeOpportunities = recentDefences.filter(entry => canRevenge(entry)).length;

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      {/* Sticky header */}
      <div className="sticky top-[110px] z-30 bg-[#060a12] border-b border-slate-800 px-4 py-2 flex items-center justify-between max-w-2xl mx-auto w-full">
        <h1 className="text-lg font-bold text-red-400 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Defence Log
        </h1>
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1.5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="pt-4 max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-full">
            <p className="text-xs text-slate-500 mb-2">
              Recent attack history • <span className="text-amber-400">{revengeOpportunities} revenge {revengeOpportunities === 1 ? 'opportunity' : 'opportunities'}</span>
            </p>
            {(() => {
              const cs = computeCombatStats({
                level: playerData.level,
                fundMembers: playerData.fundMembersOwned || 0,
                equippedLoadout: playerData.loadout || {}
              });
              return (
                <div className="bg-slate-900/70 rounded-lg p-2 border border-slate-700">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-semibold">Your Strength</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    <span className="text-slate-400">Lv<span className="text-white font-bold">{playerData.level}</span></span>
                    <span className="text-red-400">⚔️ <span className="font-bold">{fmtStat(cs.atk)}</span></span>
                    <span className="text-blue-400">🛡️ <span className="font-bold">{fmtStat(cs.def)}</span></span>
                    <span className="text-emerald-400">TP <span className="font-bold">{fmtStat(cs.atk + cs.def)}</span></span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {recentDefences.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">No attack history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDefences.map((entry, idx) => {
              const bot = entry.bot;
              const typeColors = {
                Whale: "text-purple-400 border-purple-900/40",
                Strong: "text-red-400 border-red-900/40",
                Average: "text-slate-400 border-slate-800",
                Weak: "text-green-400 border-green-900/40",
                Noob: "text-blue-400 border-blue-900/40"
              };
              const revengeAllowed = canRevenge(entry);
              // Settled if this entry OR any other entry with same bot is settled
              const isScoreSettled = entry.revengeSettled || recentDefences.some(e => e.bot.id === bot.id && e.revengeSettled);

              return (
                <div 
                  key={idx} 
                  className={`bg-[#0a0f1a] border rounded-lg p-3 flex items-center gap-3 relative ${typeColors[bot.type]} ${
                    entry.outcome === 'WIN' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                  } ${isScoreSettled ? 'opacity-75' : ''}`}
                >
                  {isScoreSettled && (
                    <div className="absolute top-2 right-2 bg-amber-500/20 border border-amber-500 rounded px-2 py-0.5 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span className="text-[9px] font-bold text-amber-400">SCORE SETTLED</span>
                    </div>
                  )}
                  
                  <div className="w-12 h-12 rounded-lg bg-slate-500/10 border border-slate-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {bot.botProfileImage ? (
                      <img src={bot.botProfileImage} alt="Bot" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xl">🧑‍💼</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-200 truncate">{bot.name}</div>
                    <div className={`text-[10px] font-bold uppercase ${typeColors[bot.type]}`}>{bot.type}</div>
                    <div className="flex gap-2 text-xs mt-1 flex-wrap">
                      <span className="text-slate-400">Lv{bot.level}</span>
                      <span className="text-red-400">⚔️{fmtStat(bot.atk)}</span>
                      <span className="text-blue-400">🛡️{fmtStat(bot.def)}</span>
                      <span className="text-emerald-400">TP {fmtStat(bot.atk + bot.def)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${entry.outcome === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.outcome === 'WIN' ? '✓ DEFENDED' : '✗ DEFEATED'}
                      </span>
                      {entry.isOffline && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                          OFFLINE
                        </span>
                      )}
                      <span className="text-xs text-slate-600">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      Revenge: {getRevengeStatus(entry)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => !isScoreSettled && setViewingBot(bot)} 
                      disabled={isScoreSettled}
                      className="border-slate-700 text-slate-400 hover:bg-slate-800 h-7 text-[10px] px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      VIEW
                    </Button>
                    {isScoreSettled ? (
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black h-7 text-[10px] px-2 font-bold flex items-center gap-1"
                        disabled
                      >
                        <Trophy className="w-3 h-3" />
                        SCORE SETTLED
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleRevenge(entry)} 
                        className="bg-red-600 hover:bg-red-500 h-7 text-[10px] px-3"
                        disabled={!revengeAllowed}
                      >
                        {revengeAllowed ? 'REVENGE' : 'LOCKED'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
      <BotProfileModal 
        bot={viewingBot} 
        open={!!viewingBot} 
        onClose={() => setViewingBot(null)} 
        onFight={() => {
          const entry = recentDefences.find(e => e.bot.id === viewingBot.id);
          if (entry && canRevenge(entry)) {
            handleFightFromProfile(viewingBot);
          }
        }}
      />
    </div>
  );
}