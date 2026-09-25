import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { getEventCache, clearEventCache } from "@/lib/playerMemory";

import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Trophy, Shield, Calendar, Mail, RefreshCw } from "lucide-react";
import VipModal from "../components/vip/VipModal";
import { isVipActive, VIP_BADGE_ACTIVE, VIP_BADGE_INACTIVE } from "../lib/vipHelper";
import { isDailyGiftClaimed, syncDailyGiftClaimedState } from "@/lib/dailyGiftHelper";
import { getMessages } from "../components/events/eventStorage";
import TradeWarsContent from "../components/ops/TradeWarsContent";
import DailyGoalsPanel from "../components/goals/DailyGoalsPanel";
import { getLocationDisplay } from "../components/utils/stateRiskData";
import { getCityActivity } from "../components/travel/zoneActivity";
import { generateCityBots } from "../components/tradewars/botGenerator";
import LiveAttackBriefing from "../components/attacks/LiveAttackBriefing";
import { resolveAutoPilot } from "../components/attacks/autoPilotEngine";
import LevelUpModal from "../components/dashboard/LevelUpModal";
import LoadingScreen from "../components/loading/LoadingScreen";
import GlobalChatBar from "@/components/chat/GlobalChatBar";

const LIVE_ATTACK_TEST_MODE = false;

export default function MapsPage() {
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [showGoals, setShowGoals] = useState(false);
  const [showAttackAlert, setShowAttackAlert] = useState(false);
  const [showSecondAttackWarning, setShowSecondAttackWarning] = useState(false);
  const [autoPilotResult, setAutoPilotResult] = useState(null);
  const [showShieldInfo, setShowShieldInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unclaimedMessages, setUnclaimedMessages] = useState(() => getMessages().filter(m => !m.claimed).length);
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipGiftClaimed, setVipGiftClaimed] = useState(isDailyGiftClaimed('vip'));
  const [dvsGiftClaimed, setDvsGiftClaimed] = useState(isDailyGiftClaimed('dvs'));
  const [serverClaimedGoals, setServerClaimedGoals] = useState({});
  const timerRef = useRef(null);

  const hasLocation = playerData.locationCity && playerData.locationState;

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    const handleGiftChanged = () => {
      setVipGiftClaimed(isDailyGiftClaimed('vip'));
      setDvsGiftClaimed(isDailyGiftClaimed('dvs'));
    };
    window.addEventListener('daily_gift_changed', handleGiftChanged);
    return () => {
      window.removeEventListener('player_synced', handleSync);
      window.removeEventListener('daily_gift_changed', handleGiftChanged);
    };
  }, []);

  // Server-authoritative sync on mount: verify VIP + DVS gift claim state
  // against the server to prevent false notification dots.
  useEffect(() => {
    syncDailyGiftClaimedState('vip').then((claimed) => setVipGiftClaimed(claimed));
    syncDailyGiftClaimedState('dvs').then((claimed) => setDvsGiftClaimed(claimed));
  }, []);

  // Server-authoritative check: which daily goals have been claimed today?
  // Stores per-goal claim state so the notification dot only shows when a
  // completed goal is genuinely unclaimed on the server.
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    import('@/lib/rewardClaimHelper').then(async ({ isRewardClaimedServer }) => {
      try {
        const goalKeys = ['jobs', 'trades', 'tradewars', 'all_bonus'];
        const results = await Promise.all(
          goalKeys.map(g => isRewardClaimedServer(`daily_goals_${g}_${today}`))
        );
        const map = {};
        goalKeys.forEach((g, i) => { map[g] = results[i]; });
        setServerClaimedGoals(map);
      } catch {
        setServerClaimedGoals({});
      }
    });
  }, [playerData?.lastClaimDate, playerData?.jobsCompletedToday, playerData?.tradesCompletedToday, playerData?.tradeWarsWonToday]);

  // Check for revenge bot from DefenceLogPage
  useEffect(() => {
    const revengeBotStr = getEventCache('revengeBot');
    if (revengeBotStr) {
      setLoading(true);
      clearEventCache('revengeBot');
      const bot = typeof revengeBotStr === 'string' ? JSON.parse(revengeBotStr) : revengeBotStr;
      
      // Check if defender has shield active
      const now = Date.now();
      const defenderShieldActive = bot.shieldActiveUntil && bot.shieldActiveUntil > now;
      
      if (defenderShieldActive) {
        alert("⚠️ This player is currently protected by a shield and cannot be attacked!");
        setLoading(false);
        return;
      }
      
      // Check if attacker has shield active - show warning dialog
      const playerShieldActive = (playerData.shieldActiveUntil || 0) > now;
      
      if (playerShieldActive) {
        const confirmed = window.confirm(
          "⚠️ SHIELD WARNING\n\n" +
          "You currently have an active shield.\n\n" +
          "If you proceed with this revenge attack, your shield will be REMOVED!\n\n" +
          "Do you want to continue?"
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
        
        // Remove shield and proceed
        savePlayerData({ shieldActiveUntil: 0, shieldType: null });
        setPlayerData(prev => ({ ...prev, shieldActiveUntil: 0, shieldType: null }));
      }
      
      // Mark as revenge battle (costs stamina)
      setTimeout(() => {
        setPlayerData(prev => ({ ...prev, selectedLiveAttackBot: { ...bot, battleContext: 'revenge' } }));
        setLoading(false);
      }, 300);
    }
  }, []);

  // Update last active timestamp (offline attack check moved to Layout)
  useEffect(() => {
    const updateLastActive = () => {
      savePlayerData({ lastActiveTimestamp: Date.now() });
    };
    
    updateLastActive();
    const interval = setInterval(updateLastActive, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const player = getPlayerData();
    if (!player.liveAttack) {
      savePlayerData({
        liveAttack: {
          isActive: false,
          attackerBot: null,
          startedAt: 0,
          roundCount: 0,
          nextAttackAllowedAt: 0
        }
      });
    } else if (player.liveAttack.isActive && player.liveAttack.attackerBot) {
      setShowAttackAlert(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLocation) return;

    const scheduleNextRoll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    let delay;
    if (LIVE_ATTACK_TEST_MODE) {
      delay = (5 + Math.random() * 3) * 1000;
    } else {
      const cover = getPlayerData().opCover ?? 100;
      if (cover <= 15) {
        delay = (15 + Math.random() * 15) * 1000; // 15-30s
      } else if (cover <= 30) {
        delay = (20 + Math.random() * 25) * 1000; // 20-45s
      } else if (cover <= 50) {
        delay = (20 + Math.random() * 40) * 1000; // 20-60s
      } else if (cover <= 90) {
        delay = (20 + Math.random() * 40) * 1000; // 20-60s
      } else {
        delay = 60 * 1000; // No attacks above 90 cover
      }
    }

      timerRef.current = setTimeout(() => {
        checkAndTriggerAttack();
        scheduleNextRoll();
      }, delay);
    };

    const checkAndTriggerAttack = () => {
      const player = getPlayerData();
      const nowMs = Date.now();

      // SHIELD PROTECTION: Block if shield active
      if (nowMs < (player.shieldActiveUntil || 0)) return;

      if (player.liveAttack?.isActive && !player.liveAttack.attackerBot) {
        savePlayerData({
          liveAttack: { ...player.liveAttack, isActive: false }
        });
        return;
      }

      if (player.liveAttack?.isActive) return;
      if (nowMs < (player.liveAttack?.nextAttackAllowedAt || 0)) return;

      const cover = player.opCover ?? 100;
      if (!LIVE_ATTACK_TEST_MODE && cover > 90) return;

      let triggerChance = 0;
      if (LIVE_ATTACK_TEST_MODE) {
        triggerChance = 1;
      } else {
        if (cover <= 15) triggerChance = 0.33;
        else if (cover <= 30) triggerChance = 0.25;
        else if (cover <= 50) triggerChance = 0.15;
        else if (cover <= 90) triggerChance = 0.10;
      }

      // Apply location activity multiplier (hot zones increase trigger chance)
      const activity = getCityActivity(player.locationCity || "");
      const activityMultiplier = activity === 'hot' ? 1.5 : 1.0;
      triggerChance = Math.min(triggerChance * activityMultiplier, 1.0);

      if (Math.random() < triggerChance) {
        const bots = generateCityBots(
          Number(player.level) || 1,
          player.locationCity || "Boston",
          player.locationState || "Massachusetts",
          1,
          Date.now() + Math.random() * 1000000
        );
        
        if (bots && bots.length > 0) {
          let attacker = bots[0];
          
          // Ensure bot has valid data
          attacker.level = Number(attacker.level) || 1;
          attacker.name = attacker.name || "Unknown";
          attacker.type = attacker.type || "Average";
          attacker.fundMembers = Number(attacker.fundMembers) || attacker.level + Math.floor(Math.random() * 6) + 1;
          
          // Ensure equippedLoadout exists (fix for missing loadout)
          if (!attacker.equippedLoadout && attacker.equipped) {
            attacker.equippedLoadout = attacker.equipped;
          }
          
          // Recalculate stats to ensure no NaN
          attacker.atk = Number(attacker.atk) || 0;
          attacker.def = Number(attacker.def) || 0;
          attacker.fundPower = Number(attacker.fundPower) || Math.round((1 + (attacker.fundMembers * 0.05)) * 100) / 100;
          attacker.pwr = Math.round((attacker.atk + attacker.def + attacker.fundPower) * 100) / 100;
          attacker.totalPower = attacker.pwr;
          
          const cooldown = LIVE_ATTACK_TEST_MODE 
            ? 30 * 1000
            : 45 * 1000;

          savePlayerData({
            liveAttack: {
              isActive: true,
              attackerBot: attacker,
              startedAt: nowMs,
              roundCount: 0,
              nextAttackAllowedAt: nowMs + cooldown
            }
          });

          setPlayerData(prev => ({
            ...prev,
            liveAttack: {
              isActive: true,
              attackerBot: attacker,
              startedAt: nowMs,
              roundCount: 0,
              nextAttackAllowedAt: nowMs + cooldown
            }
          }));

          setShowAttackAlert(true);
        }
      }
    };

    scheduleNextRoll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasLocation]);

  if (!hasLocation) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
        <TopHUD />
        
        <div className="pt-[118px] flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-400 mb-2">Trade Wars</h1>
            <p className="text-slate-600 text-sm mb-6">
              Select a location from MAP to begin operations.
            </p>
            <Link to={createPageUrl("TravelPage")}>
              <Button className="bg-emerald-600 hover:bg-emerald-500">
                <MapPin className="w-4 h-4 mr-2" />
                Go to MAP
              </Button>
            </Link>
          </div>
        </div>

        <GlobalChatBar />
        <BottomNav />
      </div>
    );
  }

  const handleJoinBattle = () => {
    setShowAttackAlert(false);
    const attacker = playerData.liveAttack?.attackerBot;
    if (attacker) {
      // Mark this as a defense battle (no stamina cost)
      const defenseBot = { ...attacker, battleContext: 'defense' };
      setPlayerData(prev => ({ ...prev, selectedLiveAttackBot: defenseBot }));
    }
  };

  const handleBattleComplete = () => {
    setPlayerData(prev => ({ ...prev, selectedLiveAttackBot: null }));
    
    // Check for double attack (20% chance)
    const doubleAttackChance = 0.20;
    if (Math.random() < doubleAttackChance) {
      // Same bot attacks again
      const attacker = playerData.liveAttack?.attackerBot;
      if (attacker) {
        // Show "coming back for seconds" warning
        setShowSecondAttackWarning(true);
        setTimeout(() => {
          setShowSecondAttackWarning(false);
          setShowAttackAlert(true); // Show regular attack warning
        }, 3000);
        return;
      }
    }
    
    // No double attack - clear and set cooldown
    const cooldown = LIVE_ATTACK_TEST_MODE ? 10 * 1000 : 45 * 1000;
    const updatedData = {
      liveAttack: {
        isActive: false,
        attackerBot: null,
        startedAt: 0,
        roundCount: 0,
        nextAttackAllowedAt: Date.now() + cooldown
      }
    };
    savePlayerData(updatedData);
    setPlayerData(prev => ({ ...prev, ...updatedData }));
  };

  const handleAutoPilot = () => {
    setShowAttackAlert(false);
    const attacker = playerData.liveAttack?.attackerBot;
    if (!attacker) return;

    const result = resolveAutoPilot(attacker, playerData);
    setAutoPilotResult(result);

    // Clear attack state - ensure attackerBot is null
    const cooldown = LIVE_ATTACK_TEST_MODE ? 10 * 1000 : 45 * 1000;
    const finalData = {
      ...result.updatedPlayer,
      liveAttack: {
        isActive: false,
        attackerBot: null,
        startedAt: 0,
        roundCount: 0,
        nextAttackAllowedAt: Date.now() + cooldown
      }
    };
    savePlayerData(finalData);
    setPlayerData(finalData);
  };

  const handleCountdownComplete = () => {
    handleAutoPilot();
  };

  const attacker = playerData.liveAttack?.attackerBot;
  
  const now = Date.now();
  const shieldActive = (playerData.shieldActiveUntil || 0) > now;
  const shieldTimeLeft = Math.max(0, (playerData.shieldActiveUntil || 0) - now);
  
  const formatShieldTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={`min-h-screen bg-[#060a12] text-white pb-[108px] ${showAttackAlert ? 'attack-alert-active' : ''}`}>
      <TopHUD />

      <div className="pt-[118px] max-w-2xl mx-auto px-4">
        {/* Location Info - Fixed */}
        <div className="fixed top-[110px] left-0 right-0 bg-[#060a12] border-b border-slate-800 px-4 py-1.5 z-30">
          <p className="text-xs text-slate-400 max-w-2xl mx-auto flex items-center gap-1.5">
            <span>📍</span>
            {getLocationDisplay(playerData.locationCity, playerData.locationState)}
            <span className="ml-1">{(() => {
              const activity = getCityActivity(playerData.locationCity);
              if (activity === 'hot') return '🔥';
              if (activity === 'cold') return '❄️';
              return '✅';
            })()}</span>
          </p>
        </div>
        <div className="pt-8"></div>

        <TradeWarsContent 
          playerData={playerData} 
          onUpdate={setPlayerData} 
          showGoals={showGoals} 
          setShowGoals={setShowGoals}
          liveAttackBot={playerData.selectedLiveAttackBot}
          onLiveAttackComplete={handleBattleComplete}
        />

        {/* Goals Panel */}
        {showGoals && (
          <div className="fixed right-0 top-[200px] w-96 bg-[#0a0f1a] border-l-2 border-amber-900/30 z-40 max-h-[calc(100vh-280px)] overflow-y-auto" style={{ bottom: '80px' }}>
            <div className="sticky top-0 bg-[#0a0f1a] border-b border-amber-900/30 px-4 pt-4 pb-3 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">DAILY GOALS</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowGoals(false)}>
                  <span className="text-slate-400">✕</span>
                </Button>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <DailyGoalsPanel playerData={playerData} onPlayerUpdate={setPlayerData} />
            </div>
          </div>
        )}
        
        {/* Left side buttons: VIP, Events + Messages */}
        <div className="fixed left-4 top-[200px] z-30 flex flex-col gap-2">
          {/* VIP Badge - purple neon */}
          <div className="relative">
            <button
              onClick={() => setShowVipModal(true)}
              title="VIP"
              className="hover:opacity-90 transition-opacity flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #6b21a8, 0 0 10px 3px #a855f7, 0 0 20px 6px rgba(168,85,247,0.5)', overflow: 'hidden', background: '#000' }}
            >
              <img
                src={isVipActive(playerData) ? VIP_BADGE_ACTIVE : VIP_BADGE_INACTIVE}
                alt="VIP"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </button>
            {!vipGiftClaimed && (
              <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 12, height: 12, zIndex: 10 }} />
            )}
          </div>
          {/* Events - orange neon */}
          <Link to={createPageUrl("EventsPage")}>
            <button title="Events" className="hover:opacity-90 transition-opacity" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #c2410c, 0 0 10px 3px #f97316, 0 0 20px 6px rgba(249,115,22,0.5)', width: 36, height: 36, overflow: 'hidden' }}>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/80d9ce8c1_mapbuttons-events2.png" alt="Events" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          </Link>
          {/* FvF Event - red/blue neon loop */}
          <Link to={createPageUrl("FvFEventPage")}>
            <button title="Fund vs Fund Event" className="fvf-glow hover:opacity-90 transition-opacity" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', width: 36, height: 36, overflow: 'hidden' }}>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/cd33daca3_vsicon1.png" alt="FvF Event" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </button>
          </Link>
          {/* Messages - blue neon */}
          <Link to={createPageUrl("EventsPage") + "?tab=messages"} className="relative block">
            <button title="Messages" className={`hover:opacity-90 transition-opacity ${unclaimedMessages > 0 ? 'messages-glow' : ''}`} style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #1d4ed8, 0 0 10px 3px #3b82f6, 0 0 20px 6px rgba(59,130,246,0.5)', width: 36, height: 36, overflow: 'hidden' }}>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/10d0636a6_mapbuttons-messages.png" alt="Messages" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
            {unclaimedMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center z-10" style={{ animation: 'dmUnreadBlink 1s ease-in-out infinite alternate' }}>{unclaimedMessages}</span>
            )}
          </Link>
          {/* Daily Goals - green neon */}
          <div className="relative">
            <button onClick={() => setShowGoals(!showGoals)} title="Daily Goals" className="relative hover:opacity-90 transition-opacity" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #166534, 0 0 10px 3px #22c55e, 0 0 20px 6px rgba(34,197,94,0.5)', width: 36, height: 36, overflow: 'hidden' }}>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/e929ccafe_mapbuttons-dailygoals.png" alt="Daily Goals" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
            {(() => {
               const today = new Date().toISOString().split('T')[0];
               const claimedGoals = playerData.claimedDailyGoals || [];
               const isSameDay = playerData.lastClaimDate === today;
               const jobsDone = (playerData.jobsCompletedToday || 0) >= 5 && !(isSameDay && claimedGoals.includes('jobs')) && !serverClaimedGoals['jobs'];
               const tradesDone = (playerData.tradesCompletedToday || 0) >= 3 && !(isSameDay && claimedGoals.includes('trades')) && !serverClaimedGoals['trades'];
               const warsDone = (playerData.tradeWarsWonToday || 0) >= 3 && !(isSameDay && claimedGoals.includes('tradewars')) && !serverClaimedGoals['tradewars'];
               const allDone = jobsDone && tradesDone && warsDone && !(isSameDay && claimedGoals.includes('all_bonus')) && !serverClaimedGoals['all_bonus'];
               const canClaim = (jobsDone || tradesDone || warsDone || allDone);
               return canClaim ? (
                 <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 12, height: 12, zIndex: 50 }} />
               ) : null;
             })()}
          </div>
          {/* Refresh - grey neon */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('refreshMapBots'))}
            title="Refresh Map"
            className="hover:opacity-90 transition-opacity"
            style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #374151, 0 0 10px 3px #9ca3af, 0 0 20px 6px rgba(156,163,175,0.5)', width: 36, height: 36, overflow: 'hidden' }}
          >
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/f0a68579d_mapicon12.png" alt="Refresh Map" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          {shieldActive && (
            <Button
              size="icon"
              onClick={() => setShowShieldInfo(true)}
              className="bg-emerald-600 hover:bg-emerald-500 w-12 h-12 animate-pulse border-2 border-emerald-400"
              title="Shield Active"
            >
              <Shield className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Shield Info Dialog */}
      <Dialog open={showShieldInfo} onOpenChange={setShowShieldInfo}>
        <DialogContent className="bg-emerald-950 border-2 border-emerald-600 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Shield Active
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="text-6xl">🛡️</div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-emerald-300">
                {formatShieldTime(shieldTimeLeft)}
              </p>
              <p className="text-sm text-slate-300">
                You are protected from incoming attacks.
              </p>
              <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded-lg p-2">
                ⚠️ WARNING: Attacking any player will BREAK your shield!
              </p>
            </div>
            <Button onClick={() => setShowShieldInfo(false)} className="w-full bg-emerald-700 hover:bg-emerald-600">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Attack Briefing */}
      <LiveAttackBriefing
        open={showAttackAlert}
        attacker={attacker}
        playerData={playerData}
        onJoinBattle={handleJoinBattle}
        onAutoPilot={handleAutoPilot}
        onCountdownComplete={handleCountdownComplete}
      />

      {/* Auto Pilot Result */}
      <Dialog open={!!autoPilotResult} onOpenChange={() => setAutoPilotResult(null)}>
        <DialogContent className="bg-slate-950 border-2 border-slate-700 text-white max-w-sm">
          <div className="text-center space-y-4 py-4">
            <h2 className={`text-2xl font-bold ${autoPilotResult?.outcome === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
              Auto Pilot Result: {autoPilotResult?.outcome}
            </h2>
            {autoPilotResult && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash:</span>
                  <span className={autoPilotResult.cashDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {autoPilotResult.cashDelta >= 0 ? '+' : ''}{autoPilotResult.cashDelta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Respect:</span>
                  <span className={autoPilotResult.respectDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {autoPilotResult.respectDelta >= 0 ? '+' : ''}{autoPilotResult.respectDelta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stamina:</span>
                  <span className="text-blue-400">{autoPilotResult.staminaDelta}</span>
                </div>
                {autoPilotResult.xpGain > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">XP:</span>
                    <span className="text-purple-400">+{autoPilotResult.xpGain}</span>
                  </div>
                )}
              </div>
            )}
            <Button onClick={() => setAutoPilotResult(null)} className="w-full">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Up Modal */}
      {autoPilotResult?.updatedPlayer?.levelsGained && (
        <LevelUpModal
          levelsGained={autoPilotResult.updatedPlayer.levelsGained}
          newLevel={autoPilotResult.updatedPlayer.level}
          onClose={() => {
            setAutoPilotResult(prev => ({
              ...prev,
              updatedPlayer: { ...prev.updatedPlayer, levelsGained: undefined }
            }));
          }}
        />
      )}

      {/* Second Attack Warning */}
      <Dialog open={showSecondAttackWarning} onOpenChange={() => {}}>
        <DialogContent className="bg-red-950 border-4 border-red-600 text-white max-w-md">
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-red-400 mb-4 animate-pulse">
              🚨 LOOK OUT!
            </h2>
            <p className="text-xl font-semibold text-white">
              THEY'RE COMING BACK FOR SECONDS!
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <VipModal
        open={showVipModal}
        onClose={() => { setShowVipModal(false); setVipGiftClaimed(isDailyGiftClaimed('vip')); }}
        playerData={playerData}
        onPlayerUpdate={setPlayerData}
      />

      <GlobalChatBar />
      <BottomNav />
      
      {loading && <LoadingScreen />}

      <style>{`
        .attack-alert-active {
          animation: redPulse 1.5s ease-in-out infinite;
        }
        @keyframes redPulse {
          0%, 100% {
            box-shadow: inset 0 0 0 0 rgba(220, 38, 38, 0);
          }
          50% {
            box-shadow: inset 0 0 60px 10px rgba(220, 38, 38, 0.3);
          }
        }
      `}</style>
    </div>
  );
}