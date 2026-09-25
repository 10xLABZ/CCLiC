import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData, savePlayerData, addXP } from "../utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import { kvGet, kvSet } from "@/lib/playerMemory";
import { useJobManager } from "@/lib/useJobManager";
import { base44 } from "@/api/base44Client";
import HumanPlayerMarkers from "./HumanPlayerMarkers";
import ShieldTimerPopup from "./ShieldTimerPopup";

import { toast } from "sonner";
import { generateCityBots, computeCombatStats, BOT_MALE_PROFILE_IMAGES, BOT_FEMALE_PROFILE_IMAGES, BOT_ALL_PROFILE_IMAGES } from "../tradewars/botGenerator";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import { WEAPONS } from "../store/catalogData";
import { getWeaponStarProgress } from "../weapons/weaponUpgradeSystem";
import { generateBotName } from "../utils/botNameGenerator";
import BattleEngine from "../tradewars/BattleEngine";
import BotProfileModal from "../tradewars/BotProfileModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Swords, RefreshCw, AlertCircle, List, Plane, Briefcase, Handshake, X, Skull, Shield } from "lucide-react";
import EnemyMapMarkers from "./EnemyMapMarkers";
import TerritoryBuildingMarkers from "../territory/TerritoryBuildingMarkers";
import TerritoryLeaderboardPanel from "../territory/TerritoryLeaderboardPanel";
import BuildingModal from "../territory/BuildingModal";
import TerritoriesModal from "../profile/TerritoriesModal";
import AssistMapPins from "./AssistMapPins";
import { getMapImage, hasMapModeToggle } from "../utils/mapData";
import MapOverlay from "../maps/MapOverlay";
import { isDailyGiftClaimed, syncDailyGiftClaimedState } from "@/lib/dailyGiftHelper";
import { getStateRisk } from "../utils/stateRiskData";
import { generateCityJobs } from "../jobs/jobsCatalog";
import { getSabotageData, formatSabotageTimer, getSabotageXP, rollHeatReduction } from "../utils/sabotageHelper";
import { logWorldTourCityAction } from "../events/worldTourStorage";
import { MapPin, Zap, DollarSign, TrendingUp, Flame, Trophy } from "lucide-react";
import VipFrame from "../vip/VipFrame";
// ResourceReplenishModal removed — depleted resources now route to inventory pages

const fmtStat = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toFixed(2);
};

function AssistItem({ assist, onAssist, onSabotage, onExpire, sabotagesRemaining = 10 }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((assist.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) onExpire();
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [assist.expiresAt, onExpire]);

  const tierColors = {
    "Street": "border-slate-800 bg-slate-900/30",
    "Hustle": "border-emerald-800/40 bg-emerald-950/20",
    "Scheme": "border-amber-800/40 bg-amber-950/20",
    "High Stakes": "border-red-800/40 bg-red-950/20"
  };

  return (
    <div className={`border rounded-lg p-2 ${tierColors[assist.tier]}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden">
          <img src={assist.profileImage} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-200 truncate">{assist.playerName}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">{assist.tier}</span>
            <span className="text-[9px] text-amber-400">⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>
      {/* Split: left image = assist, right image = sabotage */}
      <div className="flex gap-1.5">
        {/* ASSIST side */}
        <div className="flex-1 bg-blue-950/40 border border-blue-800/40 rounded-lg overflow-hidden flex flex-col">
          <div className="flex flex-col gap-1 p-2">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className="flex-1 border-t border-blue-800/40" />
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider whitespace-nowrap px-1">Assist</div>
              <div className="flex-1 border-t border-blue-800/40" />
            </div>
            <div className="flex gap-2 items-center justify-end text-[9px]">
              <span className="text-slate-400">💵</span><span className="text-green-400 font-bold">+{assist.cashReward}</span>
              <span className="text-slate-400 ml-1">⭐</span><span className="text-blue-400 font-bold">+{assist.xpReward}</span>
              <span className="text-slate-400 ml-1">🛡️</span><span className="text-slate-400 font-bold">-1</span>
            </div>
            <div className="border-t border-blue-800/40 pt-1 mt-1 text-center">
              <div className="text-[8px] text-white font-bold">1x 🔋 Energy</div>
            </div>
            <Button size="sm" onClick={() => onAssist(assist)} className="bg-blue-600 hover:bg-blue-500 text-[9px] h-6 w-full px-1 mt-0.5">
              <Handshake className="w-2.5 h-2.5 mr-0.5" /> GO
            </Button>
          </div>
        </div>
        {/* SABOTAGE side */}
        <div className={`flex-1 bg-red-950/40 border border-red-800/40 rounded-lg overflow-hidden flex flex-col ${sabotagesRemaining < 1 ? 'opacity-50' : ''}`}>
          <div className="flex flex-col gap-1 p-2">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className="flex-1 border-t border-red-800/40" />
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider whitespace-nowrap px-1">Sabotage</div>
              <div className="flex-1 border-t border-red-800/40" />
            </div>
            <div className="flex gap-2 items-center justify-end text-[9px]">
              <span className="text-slate-400">🛡️</span><span className="text-cyan-400 font-bold">+1</span>
              <span className="text-slate-400 ml-1">⭐</span><span className="text-blue-400 font-bold">+{getSabotageXP(assist.tier)}</span>
              <span className="text-slate-400 ml-1">⚔️</span><span className="text-red-400 font-bold">{sabotagesRemaining}/20</span>
            </div>
            <div className="border-t border-red-800/40 pt-1 mt-1 text-center">
              <div className="text-[8px] text-white font-bold">2x ⚡ + 1x 🔋</div>
            </div>
            <Button size="sm" onClick={() => onSabotage(assist)} disabled={sabotagesRemaining < 1} className="bg-red-700 hover:bg-red-600 text-[9px] h-6 w-full px-1 mt-0.5 disabled:opacity-40">
              <Skull className="w-2.5 h-2.5 mr-0.5" /> GO
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradeWarsContent({ playerData: propPlayerData, onUpdate, showGoals, setShowGoals, liveAttackBot, onLiveAttackComplete }) {
  const navigate = useNavigate();
  const [cityBots, setCityBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [viewingBot, setViewingBot] = useState(null);
  const [foughtBots, setFoughtBots] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [botGenerationSeed, setBotGenerationSeed] = useState(Date.now());
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showJobsList, setShowJobsList] = useState(false);
  const [showAssistsList, setShowAssistsList] = useState(false);
  const [showTerritoryPanel, setShowTerritoryPanel] = useState(false);
  const [showMOBuilding, setShowMOBuilding] = useState(false);
  const [showTerritories, setShowTerritories] = useState(false);
  const [showFlyDialog, setShowFlyDialog] = useState(false);
  const { startJob, getActiveJobs } = useJobManager();
  const [activeJobs, setActiveJobs] = useState([]);
  const [assists, setAssists] = useState([]);
  const [jobAssists, setJobAssists] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobResult, setJobResult] = useState(null);
  const [assistResult, setAssistResult] = useState(null);
  const [sabotageResult, setSabotageResult] = useState(null);
  const [assistConfirm, setAssistConfirm] = useState(null); // assist object pending choice
  const [sabotageTimer, setSabotageTimer] = useState(null);
  // replenishType: 'energy' | 'stamina' | 'opCover' — routes to inventory page instead of modal
  const [replenishType, setReplenishType] = useState(null);
  const [humanPlayers, setHumanPlayers] = useState([]);
  const [humanPlayersLoading, setHumanPlayersLoading] = useState(false);
  const [humanPlayersLoadTimer, setHumanPlayersLoadTimer] = useState(0);
  const [shieldTimerOpen, setShieldTimerOpen] = useState(false);
  const [viewingHuman, setViewingHuman] = useState(null);
  const [mapMode, setMapMode] = useState('light');
  const [dvsGiftClaimed, setDvsGiftClaimed] = useState(() => isDailyGiftClaimed('dvs'));
  const mapContainerRef = useRef(null);
  const currentUserId = useRef(null);

  // Fetch human players in same city — capped at 5, sequential to avoid rate limits
  useEffect(() => {
    if (!propPlayerData.locationCity || !propPlayerData.locationState) return;

    let debounceTimer = null;
    let isCancelled = false;
    let loadTimerInterval = null;

    const fetchHumanPlayers = async () => {
      if (isCancelled) return;
      setHumanPlayersLoading(true);
      setHumanPlayersLoadTimer(0);
      loadTimerInterval = setInterval(() => {
        setHumanPlayersLoadTimer(t => t + 1);
      }, 1000);

      try {
        const user = await base44.auth.me();
        currentUserId.current = user?.id;

        // Limit profile query to reduce payload and rate-limit pressure
        const profiles = await base44.entities.PlayerProfile.filter({
          location_city: propPlayerData.locationCity,
          location_state: propPlayerData.locationState,
        }, '-updated_date', 20);

        if (isCancelled) return;
        const now = Date.now();
        const levelMin = (propPlayerData.level || 1) - 10;
        const levelMax = (propPlayerData.level || 1) + 10;
        const BANNED_USER_IDS = ['bot_jimmy_bali'];
        const filtered = profiles.filter(p =>
          p.user_id !== user?.id &&
          !BANNED_USER_IDS.includes(p.user_id) &&
          (p.level || 1) >= levelMin &&
          (p.level || 1) <= levelMax &&
          (!p.hidden_until || p.hidden_until < now) &&
          (!p.shield_active_until || p.shield_active_until < now)
        ).slice(0, 5);

        // Fetch inventories sequentially with delay to stay under rate limits
        // Alliance tag is read directly from the profile field — no extra lookups
        const enriched = [];
        for (const p of filtered) {
          if (isCancelled) return;
          try {
            const inventories = await base44.entities.PlayerInventory.filter({ user_id: p.user_id });
            const inv = inventories[0] || {};
            enriched.push({
              ...p,
              alliance_tag: p.alliance_tag || null,
              _loadout: inv.loadout || {},
              _weaponUpgrades: inv.weaponUpgrades || {},
              _avatarUpgrades: inv.avatarUpgrades || {},
            });
          } catch (invErr) {
            // Skip this player if rate-limited, but keep the ones we already have
            console.warn('Inventory fetch failed for', p.user_id, invErr?.message);
          }
          await new Promise(r => setTimeout(r, 1200));
        }

        if (!isCancelled) {
          setHumanPlayers(enriched);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('fetchHumanPlayers error:', err?.message);
          setHumanPlayers([]);
        }
      } finally {
        if (!isCancelled) {
          setHumanPlayersLoading(false);
          clearInterval(loadTimerInterval);
        }
      }
    };

    // Delay initial fetch slightly to avoid colliding with other page-load requests
    debounceTimer = setTimeout(fetchHumanPlayers, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
      clearInterval(loadTimerInterval);
      setHumanPlayersLoading(false);
    };
  }, [propPlayerData.locationCity, propPlayerData.locationState, propPlayerData.level]);

  // Sync active jobs from global manager on mount and on changes
  useEffect(() => {
    const syncJobs = () => {
      const stored = getActiveJobs();
      setActiveJobs(prev => prev.map(j => {
        const found = stored.find(s => s.id === j.id);
        if (!found) return { ...j, inProgress: false }; // completed
        return { ...j, inProgress: true, assistsReceived: found._assistsReceived || 0 };
      }));
    };
    const onChanged = () => syncJobs();
    window.addEventListener('active_jobs_changed', onChanged);
    syncJobs();
    return () => window.removeEventListener('active_jobs_changed', onChanged);
  }, []);

  useEffect(() => {
    if (propPlayerData.locationCity) {
      // Restore frozen bots from sessionStorage if same city (prevents stat changes on nav away/back)
      const storageKey = `frozenBotsV7_${propPlayerData.locationCity}_${propPlayerData.locationState}`;
      const frozen = kvGet(storageKey);
      if (frozen) {
        try {
          const parsed = JSON.parse(frozen);
          if (parsed && parsed.length > 0) {
            setCityBots(parsed);
            setBotGenerationSeed(parsed[0]?.seed || Date.now());
            const jobs = generateCityJobs(propPlayerData.locationCity);
            const positions = [];
            const minDistance = 10;
            const MO_X2 = 50, MO_Y2 = 44, MO_CLEAR2 = 14;
            const jobsWithAssists = jobs.map(job => {
              let x, y, attempts = 0;
              do { x = 15 + Math.random() * 70; y = 15 + Math.random() * 70; attempts++; }
              while (attempts < 80 && (positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance) || Math.hypot(MO_X2 - x, MO_Y2 - y) < MO_CLEAR2));
              positions.push({ x, y });
              const assistsByTier = { "Street": 3, "Hustle": 5, "Scheme": 8, "High Stakes": 12 };
              return { ...job, assistsNeeded: assistsByTier[job.tier] || 3, assistsReceived: 0, inProgress: false,
                cashMin: Math.floor(job.cashMin * 0.8), cashMax: Math.floor(job.cashMax * 0.8),
                xpGain: Math.floor(job.xpGain * 0.8), respectGain: job.respectGain,
                heatGain: Math.max(1, Math.floor(job.heatGain * 0.8)),
              opCoverCost: { "Street": 1, "Hustle": 2, "Scheme": 3, "High Stakes": 4 }[job.tier] || 1,
              x, y };
            });
            setActiveJobs(jobsWithAssists);
            generateAssists();
            return;
          }
        } catch {}
      }

      const riskTier = getStateRisk(propPlayerData.locationState).tier;
      const newBots = generateCityBots(propPlayerData.level, propPlayerData.locationCity, propPlayerData.locationState, riskTier, propPlayerData.locationCity);
      const storageKeyNew = `frozenBotsV7_${propPlayerData.locationCity}_${propPlayerData.locationState}`;
      kvSet(storageKeyNew, JSON.stringify(newBots));
      setCityBots(newBots);
      setBotGenerationSeed(Date.now());
      
      const jobs = generateCityJobs(propPlayerData.locationCity);
      const positions = [];
      const minDistance = 10;
      
      const MO_X = 50, MO_Y = 44, MO_CLEAR = 14;
      const jobsWithAssists = jobs.map(job => {
        let x, y, attempts = 0;
        
        do {
          x = 15 + Math.random() * 70;
          y = 15 + Math.random() * 70;
          attempts++;
        } while (
          attempts < 80 &&
          (positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance) ||
           Math.hypot(MO_X - x, MO_Y - y) < MO_CLEAR)
        );
        
        positions.push({ x, y });
        
        const assistsByTier = {
          "Street": 3,
          "Hustle": 5,
          "Scheme": 8,
          "High Stakes": 12
        };
        
        return {
          ...job,
          assistsNeeded: assistsByTier[job.tier] || 3,
          assistsReceived: 0,
          inProgress: false,
          energyCost: job.energyCost,
          cashMin: Math.floor(job.cashMin * 0.8),
          cashMax: Math.floor(job.cashMax * 0.8),
          xpGain: Math.floor(job.xpGain * 0.8),
          respectGain: job.respectGain,
          heatGain: Math.max(1, Math.floor(job.heatGain * 0.8)),
          opCoverCost: { "Street": 1, "Hustle": 2, "Scheme": 3, "High Stakes": 4 }[job.tier] || 1,
          x,
          y
        };
      });
      setActiveJobs(jobsWithAssists);
      
      generateAssists();
    }
  }, [propPlayerData.locationCity]);

  useEffect(() => {
    const interval = setInterval(generateAssists, 15000);
    return () => clearInterval(interval);
  }, [propPlayerData.level]);

  // Listen for external refresh trigger (from left-side button in MapsPage)
  useEffect(() => {
    const handler = () => handleRefresh();
    window.addEventListener('refreshMapBots', handler);
    const handleGiftChanged = () => setDvsGiftClaimed(isDailyGiftClaimed('dvs'));
    window.addEventListener('daily_gift_changed', handleGiftChanged);
    // Server-authoritative sync: verify DVS claim state on mount
    syncDailyGiftClaimedState('dvs').then(claimed => setDvsGiftClaimed(claimed));
    return () => {
      window.removeEventListener('refreshMapBots', handler);
      window.removeEventListener('daily_gift_changed', handleGiftChanged);
    };
  }, []);

  const generateAssists = () => {
    const newAssists = [];
    const count = 3 + Math.floor(Math.random() * 3);
    
    const riskTier = getStateRisk(propPlayerData.locationState).tier;
    const riskWeights = { 1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 1.0 };
    const tierMult = riskWeights[riskTier] || 0.5;
    
    for (let i = 0; i < count; i++) {
      const level = Math.max(1, propPlayerData.level + Math.floor((Math.random() - 0.5) * 3));
      const tier = ["Street", "Hustle", "Scheme", "High Stakes"][Math.floor(Math.random() * 4)];
      
      const jobAttrs = {
        "Street": { cashMin: 25, cashMax: 75, xp: 4, heat: 1 },
        "Hustle": { cashMin: 75, cashMax: 175, xp: 7, heat: 2 },
        "Scheme": { cashMin: 175, cashMax: 350, xp: 13, heat: 3 },
        "High Stakes": { cashMin: 425, cashMax: 850, xp: 22, heat: 5 }
      };
      
      const attrs = jobAttrs[tier];
      const tierCashPayout = { "Street": 10, "Hustle": 20, "Scheme": 30, "High Stakes": 40 };
      const cashReward = tierCashPayout[tier] || 10;
      const xpReward = Math.max(1, Math.floor(attrs.xp * 0.2));
      
      const seed = Math.random();
      const genderRoll = Math.random();
      let profileImage;
      
      const MALE_PROFILE_IMAGES = BOT_MALE_PROFILE_IMAGES;
      const FEMALE_PROFILE_IMAGES = BOT_FEMALE_PROFILE_IMAGES;
      
      if (genderRoll < 0.55) {
        profileImage = MALE_PROFILE_IMAGES[Math.floor(Math.random() * MALE_PROFILE_IMAGES.length)];
      } else {
        profileImage = FEMALE_PROFILE_IMAGES[Math.floor(Math.random() * FEMALE_PROFILE_IMAGES.length)];
      }
      
      const randomDuration = 14000 + Math.random() * 76000;
      newAssists.push({
        id: `assist_${Date.now()}_${i}`,
        playerName: generateBotName(seed),
        level,
        tier,
        xpReward,
        cashReward,
        heatGain: 1,
        profileImage,
        expiresAt: Date.now() + randomDuration
      });
    }
    
    setAssists(newAssists);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const freshSeed = Date.now();
    const riskTier = getStateRisk(propPlayerData.locationState).tier;
    await new Promise(resolve => setTimeout(resolve, 500));
    const newBots = generateCityBots(propPlayerData.level, propPlayerData.locationCity, propPlayerData.locationState, riskTier, freshSeed);
    const storageKeyRefresh = `frozenBotsV7_${propPlayerData.locationCity}_${propPlayerData.locationState}`;
    kvSet(storageKeyRefresh, JSON.stringify(newBots));
    setCityBots(newBots);
    setFoughtBots(new Set());
    setBotGenerationSeed(freshSeed);
    setIsRefreshing(false);
  };

  const getHumanType = (hp, playerLevel) => {
    const diff = (hp.level || 1) - playerLevel;
    if (diff >= 5) return 'Whale';
    if (diff >= 2) return 'Strong';
    if (diff <= -5) return 'Noob';
    if (diff <= -2) return 'Weak';
    return 'Average';
  };

  const humanToBot = (hp) => {
    const loadout = hp._loadout || {};
    const weaponUpgrades = hp._weaponUpgrades || {};
    const cs = computeCombatStats({ level: hp.level || 1, fundMembers: hp.fund_members_owned || 0, equippedLoadout: loadout });
    const serverAtk = hp.attack_value && hp.attack_value > 10 ? hp.attack_value : null;
    const serverDef = hp.defense_value && hp.defense_value > 10 ? hp.defense_value : null;
    let finalAtk, finalDef;
    if (serverAtk !== null && serverDef !== null) {
      finalAtk = Math.round(serverAtk * 100) / 100;
      finalDef = Math.round(serverDef * 100) / 100;
    } else {
      let wUpAtk = 0, wUpDef = 0;
      ['weapon1', 'weapon2', 'weapon3'].forEach(slot => {
        const wId = loadout[slot];
        if (typeof wId === 'string') {
          const wData = WEAPONS.find(w => w.id === wId);
          const spent = weaponUpgrades[wId] || 0;
          const { star, subTier } = getWeaponStarProgress(spent);
          const completedSubs = star * 5 + subTier;
          const bonusPct = (completedSubs * 0.4) / 100;
          if (wData) { wUpAtk += (wData.atk || 0) * bonusPct; wUpDef += (wData.def || 0) * bonusPct; }
        }
      });
      finalAtk = Math.round((cs.atk + wUpAtk) * 100) / 100;
      finalDef = Math.round((cs.def + wUpDef) * 100) / 100;
    }
    const finalTp = Math.round((finalAtk + finalDef + cs.fundPower) * 100) / 100;
    return {
      id: `human_${hp.user_id}`,
      humanProfileId: hp.id,
      humanUserId: hp.user_id,
      isHuman: true,
      name: hp.alliance_tag ? `[${hp.alliance_tag}]${hp.username || 'Rival'}` : (hp.username || 'Rival'),
      level: hp.level || 1,
      type: getHumanType(hp, propPlayerData.level),
      atk: finalAtk,
      def: finalDef,
      fundMembers: hp.fund_members_owned || 0,
      fundPower: cs.fundPower,
      pwr: finalTp,
      botProfileImage: hp.profile_image_url || null,
      botAvatar: hp.equipped_avatar_id ? null : hp.profile_image_url,
      botAvatarId: hp.equipped_avatar_id || null,
      botSceneId: hp.equipped_scene_id || null,
      reputationTitle: '',
      equipped: {
        weapon1: loadout.weapon1 || null,
        weapon2: loadout.weapon2 || null,
        weapon3: loadout.weapon3 || null,
        weapon4: loadout.weapon4 || null,
        vehicle: loadout.vehicle || null,
        power: loadout.power || null,
        pet: loadout.pet || null,
      },
      weaponUpgrades,
      avatarShards: Object.values(hp._avatarUpgrades || {}).reduce((a, b) => a + b, 0),
      rewardMult: 1,
      respect: hp.respect || 0,
      winstreak: hp.winstreak || 0,
      totalTradeWarWins: hp.total_trade_war_wins || 0,
      totalTradeWarLosses: hp.total_trade_war_losses || 0,
      totalJobsCompleted: hp.total_jobs_completed || 0,
      totalAssists: hp.total_assists || 0,
      totalSabotages: hp.total_sabotages || 0,
      totalTradesCompleted: hp.total_trades_completed || 0,
      vipActiveUntil: hp.vip_active_until || 0,
    };
  };

  const handleFightHuman = (hp) => {
    const current = getPlayerData();
    const now = Date.now();
    const shieldActive = (current.shieldActiveUntil || 0) > now;
    if (shieldActive) {
      const confirmed = window.confirm(
        "⚠️ SHIELD ACTIVE\n\nAttacking this player will BREAK your shield protection!\n\nDo you want to proceed and break your shield?"
      );
      if (!confirmed) return;
    }
    if (current.stamina < 5) { navigate(createPageUrl('StaminaInventoryPage')); return; }
    if ((current.opCover ?? 0) < 5) { navigate(createPageUrl('OpCoverInventoryPage')); return; }
    // Deduct stamina server-side, clear shield locally (non-resource)
    applyServerReward({ stamina_delta: -5, reason: 'fight_human' });
    savePlayerData({ shieldActiveUntil: 0, shieldType: null });
    onUpdate(getPlayerData());
    setSelectedBot(humanToBot(hp));
  };

  const handleFightClick = (bot) => {
    const current = getPlayerData();
    const now = Date.now();
    const shieldActive = (current.shieldActiveUntil || 0) > now;
    const isDefense = bot.battleContext === 'defense';
    const isRevenge = bot.battleContext === 'revenge';
    if (shieldActive && !isDefense && !isRevenge) {
      const confirmed = window.confirm(
        "⚠️ SHIELD ACTIVE\n\nAttacking this player will BREAK your shield protection!\n\nDo you want to proceed and break your shield?"
      );
      if (!confirmed) return;
    }
    if (!isDefense && current.stamina < 5) { navigate(createPageUrl('StaminaInventoryPage')); return; }
    if (!isDefense && (current.opCover ?? 0) < 5) { navigate(createPageUrl('OpCoverInventoryPage')); return; }
    if (!isDefense) {
      // Deduct stamina server-side, clear shield locally (non-resource)
      applyServerReward({ stamina_delta: -5, reason: 'fight_bot' });
      savePlayerData({ shieldActiveUntil: 0, shieldType: null });
      onUpdate(getPlayerData());
    }
    setSelectedBot(bot);
  };

  // Auto-select live attack bot if present
  useEffect(() => {
    if (liveAttackBot && !selectedBot) {
      setSelectedBot(liveAttackBot);
    }
  }, [liveAttackBot]);

  const handleBattleComplete = (didWin) => {
    const updated = getPlayerData();
    onUpdate(updated);
    if (selectedBot?.isHuman) {
      // Always remove human from list after fighting
      setHumanPlayers(prev => prev.filter(p => p.user_id !== selectedBot.humanUserId));
    }
    if (selectedBot?.battleContext === 'defense') {
      onLiveAttackComplete?.();
    } else if (selectedBot && !selectedBot.isHuman) {
      if (didWin !== false) {
        // Remove bot on win (or unknown outcome) — keep on explicit loss
        setFoughtBots(prev => new Set([...prev, selectedBot.id]));
        setCityBots(prev => {
          const next = prev.filter(b => b.id !== selectedBot.id);
          // Keep sessionStorage in sync so nav away/back doesn't restore removed bot
          const storageKey = `frozenBotsV7_${propPlayerData.locationCity}_${propPlayerData.locationState}`;
          kvSet(storageKey, JSON.stringify(next));
          return next;
        });
      }
    }
    setSelectedBot(null);
  };

  const handleViewBot = (bot) => setViewingBot(bot);
  const handleFightFromProfile = () => {
    if (viewingBot) {
      setViewingBot(null);
      handleFightClick(viewingBot);
    }
  };

  const handleFlyOut = () => {
    setShowFlyDialog(false);
    navigate(createPageUrl("TravelPage"));
  };

  const handleStartJob = (job) => {
    const current = getPlayerData();
    if (current.energy < job.energyCost) {
      navigate(createPageUrl('EnergyInventoryPage'));
      return;
    }

    const successRoll = Math.random() * 100;
    const success = successRoll <= job.baseSuccessPct;

    // Deduct energy server-side
    applyServerReward({ energy_delta: -job.energyCost, reason: 'start_job' });
    onUpdate(getPlayerData());

    if (!success) {
      const tierCoverCost = { "Street": 1, "Hustle": 2, "Scheme": 3, "High Stakes": 4 };
      const coverCost = tierCoverCost[job.tier] || 1;
      const newOpCover = Math.max(0, (current.opCover ?? 100) - coverCost);
      savePlayerData({ opCover: newOpCover });
      setJobResult({ success: false, opCoverCost: coverCost });
      onUpdate(getPlayerData());
      return;
    }

    // Mark in-progress locally for map pin display
    setActiveJobs(prev => prev.map(j => j.id === job.id ? { ...j, inProgress: true, assistsReceived: 0 } : j));

    // Delegate to global job manager — simulation survives page navigation
    startJob(job, propPlayerData.locationCity);
  };

  const handleAssist = (assist) => {
    const current = getPlayerData();
    
    if (current.energy < 1) { navigate(createPageUrl('EnergyInventoryPage')); return; }
    
    const newOpCover = Math.max(0, (current.opCover ?? 100) - 1);
    const xpResult = addXP(assist.xpReward);

    // Deduct energy + apply cash/opcover server-side
    applyServerReward({ energy_delta: -1, cash_delta: assist.cashReward, op_cover_delta: -1, reason: 'assist' });
    savePlayerData({ ...xpResult, opCover: newOpCover, totalAssists: (current.totalAssists || 0) + 1 });
    logWorldTourCityAction(propPlayerData.locationCity, 'assists');
    setAssistResult({ xp: assist.xpReward, cash: assist.cashReward, playerName: assist.playerName, profileImage: assist.profileImage });
    setAssists(prev => prev.filter(a => a.id !== assist.id));
    onUpdate(getPlayerData());
  };

  // Sabotage timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      const sabData = getSabotageData(propPlayerData);
      setSabotageTimer(sabData);
    }, 1000);
    setSabotageTimer(getSabotageData(propPlayerData));
    return () => clearInterval(interval);
  }, [propPlayerData.sabotagesRemaining, propPlayerData.lastSabotageRegenTimestamp]);

  const handleSabotage = (assist) => {
    const current = getPlayerData();

    if (current.stamina < 2) { navigate(createPageUrl('StaminaInventoryPage')); return; }
    if (current.energy < 1) { navigate(createPageUrl('EnergyInventoryPage')); return; }

    const sabData = getSabotageData(current);
    if (sabData.remaining < 1) { toast.error("No sabotage attempts remaining!"); return; }

    const newSabotagesRemaining = Math.max(0, sabData.remaining - 1);

    // Sabotage is now 100% success — no failure branch
    const xpGain = getSabotageXP(assist.tier);
    const xpResult = addXP(xpGain);

    // Deduct stamina + energy, AND grant +1 op cover — all server-authoritative
    applyServerReward({ stamina_delta: -2, energy_delta: -1, op_cover_delta: 1, reason: 'sabotage_success' });
    savePlayerData({ ...xpResult, sabotagesRemaining: newSabotagesRemaining, lastSabotageRegenTimestamp: sabData.lastRegen, totalSabotages: (current.totalSabotages || 0) + 1 });
    logWorldTourCityAction(propPlayerData.locationCity, 'sabotages');
    onUpdate(getPlayerData());
    setSabotageResult({ success: true, opCoverGain: 1, xp: xpGain, playerName: assist.playerName, profileImage: assist.profileImage });

    setAssists(prev => prev.filter(a => a.id !== assist.id));
  };

  const hasToggle = hasMapModeToggle(propPlayerData.locationCity, propPlayerData.locationState);
  const mapImagePath = getMapImage(propPlayerData.locationCity, propPlayerData.locationState, mapMode);

  useEffect(() => {
    if (mapContainerRef.current && mapImagePath) {
      const container = mapContainerRef.current;
      setTimeout(() => {
        const scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
        const scrollTop = (container.scrollHeight - container.clientHeight) / 2;
        container.scrollLeft = scrollLeft;
        container.scrollTop = scrollTop;
      }, 100);
    }
  }, [mapImagePath]);

  return (
    <>
      <div className="relative">
        <div 
          ref={mapContainerRef}
          className="relative w-full overflow-auto rounded-xl mb-4 scrollbar-hide"
          style={{ height: 'calc(100vh - 190px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {mapImagePath && (
            <div style={{ position: 'relative', width: '1600px', height: '1100px', minWidth: '1600px', minHeight: '1100px' }}>
              <img src={mapImagePath} alt="City Map" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <EnemyMapMarkers bots={cityBots} onView={handleViewBot} playerStamina={propPlayerData.stamina} />
              <HumanPlayerMarkers humanPlayers={humanPlayers} onView={setViewingHuman} />
              {activeJobs.map((job) => {
                const TIER_CONFIG = {
                  'Street':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/5e70e6874_jobs-lv1.png', size: 44 },
                  'Hustle':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d2988220f_jobs-lv2.png', size: 54 },
                  'Scheme':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/4367fc9d1_jobs-lv3.png', size: 64 },
                  'High Stakes': { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d416644bb_jobs-lv4.png', size: 76 },
                };
                const tier = TIER_CONFIG[job.tier] || TIER_CONFIG['Street'];
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="absolute hover:scale-110 transition-transform"
                    style={{ left: `${job.x}%`, top: `${job.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <img
                      src={tier.img}
                      alt={job.tier}
                      style={{
                        width: tier.size,
                        height: tier.size,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.9))',
                        animation: 'jobGlow 2s ease-in-out infinite'
                      }}
                    />
                  </button>
                );
              })}
              <AssistMapPins assists={assists} onAssistClick={(assist) => setAssistConfirm(assist)} expiresAt={true} />
              <TerritoryBuildingMarkers city={propPlayerData.locationCity} state={propPlayerData.locationState} playerData={propPlayerData} />
            </div>
          )}
        </div>
        <MapOverlay hasToggle={hasToggle} mapMode={mapMode} onToggleMode={setMapMode} />

        {/* Floating buttons on right side */}
        <div className="fixed right-4 top-[200px] flex flex-col gap-2 z-40">
          <style>{`
            @keyframes jobGlow {
              0%, 100% { filter: drop-shadow(0 0 6px rgba(52,211,153,0.8)); }
              50% { filter: drop-shadow(0 0 16px rgba(52,211,153,1)); }
            }
            @keyframes valueSalePulse {
              0% { transform: scale(1); }
              10% { transform: scale(1.10); }
              30% { transform: scale(1.10); }
              40% { transform: scale(1); }
              100% { transform: scale(1); }
            }
            .value-sale-btn { animation: valueSalePulse 20s ease-in-out infinite; }
          `}</style>
          <Link to={createPageUrl("DailyValueSalePage")} className="relative block">
            <button title="Daily Value Sale" className="value-sale-btn hover:opacity-90 transition-opacity" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #b45309, 0 0 10px 3px #d97706, 0 0 20px 6px rgba(217,119,6,0.5)', width: 36, height: 36, overflow: 'hidden' }}>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/81c8ab362_3313853f-0379-49b6-a5df-9799e4230333.png" alt="Value Sale" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
            {!dvsGiftClaimed && (
              <span className="red-blink-dot absolute -top-1 -left-1 bg-red-500 rounded-full" style={{ width: 12, height: 12, zIndex: 10 }} />
            )}
          </Link>
          <button onClick={() => setShowFlyDialog(true)} title="Travel" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #1d4ed8, 0 0 10px 3px #3b82f6, 0 0 20px 6px rgba(59,130,246,0.5)', width: 36, height: 36, overflow: 'hidden' }} className="hover:opacity-90 transition-opacity">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/6f1a1ddd6_mapbuttons-travel2.PNG" alt="Travel" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          <button onClick={() => setShowPlayerList(!showPlayerList)} title="Trade Wars" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #991b1b, 0 0 10px 3px #ef4444, 0 0 20px 6px rgba(239,68,68,0.5)', width: 36, height: 36, overflow: 'hidden' }} className="hover:opacity-90 transition-opacity">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/6225fbaf5_mapbuttons-tradewars2.PNG" alt="Trade Wars" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          <button onClick={() => setShowJobsList(!showJobsList)} title="Jobs" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #166534, 0 0 10px 3px #22c55e, 0 0 20px 6px rgba(34,197,94,0.5)', width: 36, height: 36, overflow: 'hidden' }} className="hover:opacity-90 transition-opacity">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/0230ca5b2_mapbuttons-jobs2.PNG" alt="Jobs" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          <button onClick={() => setShowAssistsList(!showAssistsList)} title="Assist / Sabotage" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #1d4ed8, 0 0 10px 3px #3b82f6, 0 0 20px 6px rgba(59,130,246,0.5)', width: 36, height: 36, overflow: 'hidden' }} className="hover:opacity-90 transition-opacity">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/61474c4b8_mapbuttons-assist-sab2.PNG" alt="Assist/Sabotage" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          <button onClick={() => setShowMOBuilding(true)} title="Mayor's Office" style={{ display: 'block', borderRadius: '10px', border: '1.5px solid #000', boxShadow: '0 0 0 2px #6b21a8, 0 0 10px 3px #a855f7, 0 0 20px 6px rgba(168,85,247,0.5)', width: 36, height: 36, overflow: 'hidden' }} className="hover:opacity-90 transition-opacity">
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/d148930a3_mapbuttons-mayorsoffice2.PNG" alt="Mayor's Office" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          {(propPlayerData.hiddenUntil || 0) > Date.now() && (
            <Button size="icon" onClick={() => setShieldTimerOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 w-12 h-12 animate-pulse border-2 border-emerald-400">
              🛡️
            </Button>
          )}
        </div>

        {/* Trade Wars List */}
        {showPlayerList && (
          <div className="fixed right-0 top-[200px] w-96 bg-[#0a0f1a] border-l-2 border-red-900/30 z-40 flex flex-col" style={{ bottom: '80px' }}>
            <div className="bg-[#0a0f1a] border-b border-red-900/30 px-4 pt-4 pb-3 z-30 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Swords className="w-4 h-4 text-red-500" />
                  <span className="font-semibold">TRADE WARS</span>
                </div>
                <div className="flex items-center gap-2">
                  <style>{`
                    @keyframes defLogPulse {
                      0%, 100% { box-shadow: 0 0 4px 1px rgba(239,68,68,0.7), 0 0 10px 2px rgba(239,68,68,0.4); }
                      50% { box-shadow: 0 0 10px 3px rgba(239,68,68,1), 0 0 20px 6px rgba(239,68,68,0.6); }
                    }
                    .defense-log-btn { animation: defLogPulse 1.4s ease-in-out infinite; }
                  `}</style>
                  <Link to={createPageUrl("DefenceLogPage")}>
                    <Button size="sm" className="defense-log-btn bg-red-600 hover:bg-red-500 text-white text-[10px] h-7 px-3 font-black border border-red-400/60 flex items-center gap-1"><Shield className="w-3 h-3 shrink-0" />DEFENSE LOG</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} title="Refresh opponents" className="border-slate-500 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 font-bold h-7 w-7 p-0">
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPlayerList(false)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
              {(() => {
                const cs = computeFullPlayerStats(propPlayerData);
                return (
                  <div className="bg-slate-900/70 rounded-lg p-2 border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-semibold">Your Stats</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                      <span className="text-slate-400">Lv<span className="text-white font-bold">{propPlayerData.level}</span></span>
                      <span className="text-red-400">⚔️ <span className="font-bold">{fmtStat(cs.atk)}</span></span>
                      <span className="text-blue-400">🛡️ <span className="font-bold">{fmtStat(cs.def)}</span></span>
                      <span className="text-emerald-400">TP <span className="font-bold">{fmtStat(cs.atk + cs.def)}</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-4 pb-4 pt-3 overflow-y-auto flex-1">
              {humanPlayersLoading && (
                <div className="flex items-center justify-between bg-slate-900/80 border border-amber-700/40 rounded-lg px-3 py-2 mb-3">
                  <span className="text-amber-400 text-[11px] font-bold animate-pulse">⏳ Loading more opponents, stand by...</span>
                  <span className="text-amber-500 text-[11px] font-mono font-bold">{humanPlayersLoadTimer}s</span>
                </div>
              )}
              <div className="space-y-2 mt-0">
                {humanPlayers.map((hp) => {
                  const hpBot = humanToBot(hp);
                  const hpType = getHumanType(hp, propPlayerData.level);
                  const typeColors = { Whale: "text-purple-400 border-purple-900/40", Strong: "text-red-400 border-red-900/40", Average: "text-slate-400 border-slate-800", Weak: "text-green-400 border-green-900/40", Noob: "text-blue-400 border-blue-900/40" };
                  return (
                    <div key={hp.id} className={`bg-[#0a0f1a] border rounded-lg p-2 flex items-center gap-2 ${typeColors[hpType]}`}>
                      <VipFrame active={(hp.vip_active_until || 0) > Date.now()} className="w-10 h-10 shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
                          {hp.profile_image_url ? <img src={hp.profile_image_url} alt="Player" className="w-full h-full object-cover" /> : <div className="text-lg">🧑‍💼</div>}
                        </div>
                      </VipFrame>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-200 truncate">
                          {hp.alliance_tag && <span className="text-amber-400 font-bold">[{hp.alliance_tag}]</span>}{hp.username || 'Rival'}
                        </div>
                        <div className={`text-[9px] font-bold uppercase ${typeColors[hpType].split(' ')[0]}`}>{hpType}</div>
                        <div className="flex gap-1 text-[11px] mt-0.5 flex-wrap">
                         <span className="text-slate-400">Lv{hp.level || 1}</span>
                         <span className="text-red-400">⚔️{fmtStat(hpBot.atk)}</span>
                         <span className="text-blue-400">🛡️{fmtStat(hpBot.def)}</span>
                         <span className="text-emerald-400">TP {fmtStat(hpBot.atk + hpBot.def)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Button size="sm" variant="outline" onClick={() => setViewingHuman(hp)} className="border-slate-700 text-slate-400 hover:bg-slate-800 h-6 text-[10px] px-2">VIEW</Button>
                        <Button size="sm" onClick={() => handleFightHuman(hp)} className="bg-red-600 hover:bg-red-500 h-6 text-[10px] px-2">FIGHT</Button>
                        <div className="text-[9px] text-blue-400">⚡ 5 stamina + 🛡️ 2 cover</div>
                      </div>
                    </div>
                  );
                })}
                {cityBots.map((bot) => {
                  const typeColors = { Whale: "text-purple-400 border-purple-900/40", Strong: "text-red-400 border-red-900/40", Average: "text-slate-400 border-slate-800", Weak: "text-green-400 border-green-900/40", Noob: "text-blue-400 border-blue-900/40" };
                  return (
                    <div key={bot.id} className={`bg-[#0a0f1a] border rounded-lg p-2 flex items-center gap-2 ${typeColors[bot.type]}`}>
                      <VipFrame active={!!bot.hasVipFrame} className="w-10 h-10 shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
                          {bot.botProfileImage ? <img src={bot.botProfileImage} alt="Bot" className="w-full h-full object-cover" /> : <div className="text-lg">🧑‍💼</div>}
                        </div>
                      </VipFrame>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-200 truncate">
                          {(bot.alliance_tag || bot.allianceTag) && <span className="text-amber-400 font-bold">[{bot.alliance_tag || bot.allianceTag}]</span>}{bot.name}
                        </div>
                        <div className={`text-[9px] font-bold uppercase ${typeColors[bot.type]}`}>{bot.type}</div>
                        <div className="flex gap-1 text-[11px] mt-0.5 flex-wrap">
                         <span className="text-slate-400">Lv{bot.level}</span>
                         <span className="text-red-400">⚔️{fmtStat(bot.atk)}</span>
                         <span className="text-blue-400">🛡️{fmtStat(bot.def)}</span>
                         <span className="text-emerald-400">TP {fmtStat(bot.atk + bot.def)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Button size="sm" variant="outline" onClick={() => handleViewBot(bot)} className="border-slate-700 text-slate-400 hover:bg-slate-800 h-6 text-[10px] px-2">VIEW</Button>
                        <Button size="sm" onClick={() => handleFightClick(bot)} className="bg-red-600 hover:bg-red-500 h-6 text-[10px] px-2">FIGHT</Button>
                        <div className="text-[9px] text-blue-400">⚡ 5 stamina + 🛡️ 2 cover</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {showJobsList && (
          <div className="fixed right-0 top-[200px] w-96 bg-[#0a0f1a] border-l-2 border-emerald-900/30 z-40 max-h-[calc(100vh-280px)] overflow-y-auto" style={{ bottom: '80px' }}>
            <div className="sticky top-0 bg-[#0a0f1a] border-b border-emerald-900/30 px-4 pt-4 pb-3 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">JOBS</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowJobsList(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <div className="space-y-2">
                {activeJobs.map((job) => {
                  const tierColors = { "Street": "border-slate-800 bg-slate-900/30", "Hustle": "border-emerald-800/40 bg-emerald-950/20", "Scheme": "border-amber-800/40 bg-amber-950/20", "High Stakes": "border-red-800/40 bg-red-950/20" };
                  const coverCost = job.opCoverCost ?? job.heatGain ?? 1;
                  const playerCover = propPlayerData.opCover ?? 0;
                  const isBlocked = playerCover < coverCost;
                  return (
                    <div key={job.id} className="relative">
                      <div className={`border rounded-lg p-3 ${tierColors[job.tier]} ${isBlocked ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-200">{job.name}</h3>
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">{job.tier}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button size="sm" onClick={() => handleStartJob(job)} disabled={job.inProgress} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 h-6 text-[10px] px-2">
                              {job.inProgress ? `${job.assistsReceived}/${job.assistsNeeded}` : 'START'}
                            </Button>
                            <div className="flex items-center gap-1">
                              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/9e375fe4f_b7f85242-d893-409c-ab55-f7bc704445f1-2.png" alt="Assists" className="w-3 h-3 rounded-full object-cover" />
                              <span className="text-[9px] text-slate-500">Req. {job.assistsNeeded}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                          <div className="flex items-center gap-1 text-slate-500"><Zap className="w-3 h-3 text-yellow-500" />Energy: {job.energyCost}</div>
                          <div className="flex items-center gap-1 text-slate-500"><span className="text-green-500">💵</span>{job.cashMin}-{job.cashMax}</div>
                          <div className="flex items-center gap-1 text-slate-500"><TrendingUp className="w-3 h-3 text-blue-500" />XP: {job.xpGain}</div>
                          <div className="flex items-center gap-1 text-slate-500">🛡️ Op Cover: -{coverCost}</div>
                        </div>
                      </div>
                      {isBlocked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-[2px] pointer-events-auto">
                          <div className="bg-slate-950 border-2 border-orange-600/80 rounded-xl px-4 py-3 text-center shadow-2xl mx-3 w-full max-w-[260px]">
                            <div className="text-sm font-bold text-orange-400 mb-0.5">🔥 TOO HOT TO OPERATE</div>
                            <div className="text-[10px] text-slate-400 mb-2">
                              Need <span className="text-orange-300 font-bold">{coverCost} Op Cover</span> — you have <span className="text-red-400 font-bold">{playerCover}</span>
                            </div>
                            <div className="flex gap-1.5 justify-center">
                              <Link to="/OpCoverInventoryPage" onClick={() => setShowJobsList(false)} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                                🛡️ Inventory
                              </Link>
                              <Link to="/ShopPage?tab=consumables&sub=opcover" onClick={() => setShowJobsList(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                                🛒 Shop
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Assists List */}
        {showAssistsList && (
          <div className="fixed right-0 top-[200px] w-96 bg-[#0a0f1a] border-l-2 border-blue-900/30 z-40 max-h-[calc(100vh-280px)] overflow-y-auto" style={{ bottom: '80px' }}>
            <div className="sticky top-0 bg-[#0a0f1a] border-b border-blue-900/30 px-4 pt-4 pb-3 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Handshake className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">ASSISTS / SABOTAGES</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowAssistsList(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <div className="bg-slate-900/50 border border-red-900/40 rounded-lg p-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-semibold flex items-center gap-1">
                    <Skull className="w-3 h-3" /> Sabotages: {sabotageTimer?.remaining ?? 20}/20
                  </span>
                  {sabotageTimer?.timeUntilNext && (
                    <span className="text-slate-500 flex items-center gap-1">
                      Next <span className="font-bold text-red-400">+1</span> in: {formatSabotageTimer(sabotageTimer.timeUntilNext)} <span className="ml-0.5">⏱</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">(Uses 2x⚡Stamina + 1x🔋Energy)</div>
              </div>
              <div className="space-y-2">
                {assists.map((assist) => (
                  <AssistItem
                    key={assist.id}
                    assist={assist}
                    onAssist={handleAssist}
                    onSabotage={handleSabotage}
                    onExpire={() => setAssists(prev => prev.filter(a => a.id !== assist.id))}
                    sabotagesRemaining={sabotageTimer?.remaining ?? 20}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBot && <BattleEngine player={propPlayerData} bot={selectedBot} onComplete={handleBattleComplete} locationCity={propPlayerData.locationCity} />}
      <ShieldTimerPopup open={shieldTimerOpen} onClose={() => setShieldTimerOpen(false)} hiddenUntil={propPlayerData.hiddenUntil || 0} />
      {/* depleted resources now route to inventory pages via navigate() */}
      <TerritoryLeaderboardPanel open={showTerritoryPanel} onClose={() => setShowTerritoryPanel(false)} city={propPlayerData.locationCity} state={propPlayerData.locationState} playerData={propPlayerData} />
      <BuildingModal
        open={showMOBuilding}
        onClose={() => setShowMOBuilding(false)}
        building={{ id: 'mayors_office', name: "Mayor's Office" }}
        city={propPlayerData.locationCity}
        state={propPlayerData.locationState}
        isUSA={true}
        playerData={propPlayerData}
        onOpenTerritoryControl={() => { setShowMOBuilding(false); setShowTerritories(true); }}
      />
      <TerritoriesModal open={showTerritories} onClose={() => setShowTerritories(false)} playerData={propPlayerData} />
      <BotProfileModal bot={viewingBot} open={!!viewingBot} onClose={() => setViewingBot(null)} onFight={handleFightFromProfile} />
      <BotProfileModal
        bot={viewingHuman ? humanToBot(viewingHuman) : null}
        open={!!viewingHuman}
        onClose={() => setViewingHuman(null)}
        onFight={() => { const h = viewingHuman; setViewingHuman(null); handleFightHuman(h); }}
      />

      {/* Fly Dialog */}
      <Dialog open={showFlyDialog} onOpenChange={setShowFlyDialog}>
        <DialogContent className="bg-slate-950 border-blue-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2">
              <Plane className="w-5 h-5" /> Fly Out
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-300">Fly out from {propPlayerData.locationCity}, {propPlayerData.locationState}?</div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFlyDialog(false)} className="border-slate-700 text-slate-400">No</Button>
            <Button onClick={handleFlyOut} className="bg-blue-600 hover:bg-blue-500">Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Failed (immediate — not from global manager) */}
      {jobResult && !jobResult.success && (
        <Dialog open={!!jobResult} onOpenChange={() => setJobResult(null)}>
          <DialogContent className="bg-red-950/40 border-red-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">JOB FAILED!</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">You got caught! Energy spent, no rewards.</p>
              <div className="flex justify-between"><span className="text-slate-400">🛡️ Op Cover:</span><span className="text-orange-400">-{jobResult.opCoverCost}</span></div>
            </div>
            <Button onClick={() => setJobResult(null)} className="w-full bg-slate-800">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Sabotage Result */}
      {sabotageResult && (
        <Dialog open={!!sabotageResult} onOpenChange={() => setSabotageResult(null)}>
          <DialogContent className={sabotageResult.success ? "bg-emerald-950/40 border-emerald-800 text-white" : "bg-red-950/40 border-red-800 text-white"}>
            <DialogHeader><DialogTitle className={sabotageResult.success ? "text-emerald-400" : "text-red-400"}>
              {sabotageResult.success ? "💣 SABOTAGE SUCCESS!" : "💣 SABOTAGE FAILED!"}
            </DialogTitle></DialogHeader>
            <div className="flex flex-col items-center mb-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden mb-2 ${sabotageResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <img src={sabotageResult.profileImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
              {sabotageResult.success ? (
                <p className="text-sm text-slate-300">You sabotaged <span className="text-emerald-400 font-semibold">{sabotageResult.playerName}'s</span> operation!</p>
              ) : (
                <p className="text-sm text-slate-300">You got caught sabotaging <span className="text-red-400 font-semibold">{sabotageResult.playerName}</span>!</p>
              )}
            </div>
            {sabotageResult.success ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">🛡️ Op Cover:</span><span className="font-bold text-cyan-400">+{sabotageResult.opCoverGain}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">XP:</span><span className="font-bold text-blue-500">+{sabotageResult.xp}</span></div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Stamina and sabotage attempt used. No rewards.</div>
            )}
            <Button onClick={() => setSabotageResult(null)} className="w-full bg-slate-800">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Assist Result */}
      {assistResult && (
        <Dialog open={!!assistResult} onOpenChange={() => setAssistResult(null)}>
          <DialogContent className="bg-blue-950/40 border-blue-800 text-white">
            <DialogHeader><DialogTitle className="text-blue-400">ASSIST SUCCESS!</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center overflow-hidden mb-2">
                <img src={assistResult.profileImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-slate-300">You assisted <span className="text-blue-400 font-semibold">{assistResult.playerName}'s</span> job!</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">XP:</span><span className="font-bold text-blue-500">+{assistResult.xp}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Cash:</span><span className="font-bold text-green-500">+💵{assistResult.cash}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">🛡️ Op Cover:</span><span className="text-orange-400">-1</span></div>
            </div>
            <Button onClick={() => setAssistResult(null)} className="w-full bg-slate-800">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Assist / Sabotage Confirmation */}
      {assistConfirm && (() => {
        const sabData = getSabotageData(propPlayerData);
        const canSabotage = sabData.remaining > 0;
        return (
          <Dialog open={!!assistConfirm} onOpenChange={() => setAssistConfirm(null)}>
            <DialogContent className="bg-[#0a0f1a] border-slate-700 text-white max-w-sm p-0 overflow-hidden">
              {/* Player info header */}
              <DialogHeader className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                    <img src={assistConfirm.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm text-slate-200">{assistConfirm.playerName}</DialogTitle>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{assistConfirm.tier} Operation</p>
                  </div>
                </div>
              </DialogHeader>

              {/* Split image buttons — no gap, images never cropped */}
              <div className="flex mx-4 mb-3 rounded-xl overflow-hidden">

                {/* ASSIST side */}
                <div className="flex-1 relative flex flex-col" style={{aspectRatio: '3/5'}}>
                  <img
                    src="https://media.base44.com/images/public/699169456a354d6cb7082777/13847b297_assist-selection-bg1.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
                  />
                  {/* Spacer — top 50% is image header, no content */}
                  <div style={{flex: '0 0 50%'}} />
                  {/* Bottom 50%: content */}
                  <div className="relative flex flex-col gap-1.5 p-2 pb-2.5" style={{flex: '0 0 50%'}}>
                    <button
                      onClick={() => { handleAssist(assistConfirm); setAssistConfirm(null); }}
                      className="w-full bg-blue-600/90 hover:bg-blue-500 active:scale-95 transition-all text-white font-black text-xs py-1.5 rounded-lg tracking-wider shadow-lg shadow-blue-900/60"
                    >
                      START
                    </button>
                    <div className="bg-black/80 border border-blue-500/30 rounded-lg px-2 py-1 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Cash</span>
                        <span className="text-green-400 font-bold">+💵{assistConfirm.cashReward}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">XP</span>
                        <span className="text-blue-400 font-bold">+{assistConfirm.xpReward}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">🛡️ Op Cover</span>
                        <span className="text-orange-400 font-bold">-1</span>
                      </div>
                    </div>
                    <div className="bg-black/80 border border-blue-500/20 rounded-lg px-2 py-1 text-center">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">Requires</div>
                      <div className="text-[9px] font-bold text-blue-300">1x 🔋 Energy</div>
                    </div>
                  </div>
                </div>

                {/* SABOTAGE side */}
                <div className={`flex-1 relative flex flex-col ${!canSabotage ? 'opacity-50' : ''}`} style={{aspectRatio: '3/5'}}>
                  <img
                    src="https://media.base44.com/images/public/699169456a354d6cb7082777/db2d4066d_sabotage-selection-bg1.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
                  />
                  <div style={{flex: '0 0 50%'}} />
                  <div className="relative flex flex-col gap-1.5 p-2 pb-2.5" style={{flex: '0 0 50%'}}>
                    <button
                      disabled={!canSabotage}
                      onClick={() => { handleSabotage(assistConfirm); setAssistConfirm(null); }}
                      className="w-full bg-red-700/90 hover:bg-red-600 active:scale-95 transition-all text-white font-black text-xs py-1.5 rounded-lg tracking-wider shadow-lg shadow-red-900/60 disabled:cursor-not-allowed"
                    >
                      START
                    </button>
                    <div className="bg-black/80 border border-red-500/30 rounded-lg px-2 py-1 space-y-1">
                      {canSabotage ? (
                        <>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">🛡️ Op Cover</span>
                            <span className="text-cyan-400 font-bold">+1</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">XP</span>
                            <span className="text-blue-400 font-bold">+{getSabotageXP(assistConfirm.tier)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">Attempts</span>
                            <span className="text-red-400 font-bold">{sabData.remaining}/20</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-500 text-center py-1">No attempts remaining</div>
                      )}
                    </div>
                    <div className="bg-black/80 border border-red-500/20 rounded-lg px-2 py-1 text-center">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-0.5">Requires</div>
                      <div className="text-[9px] font-bold text-red-300">2x ⚡ Stamina + 1x 🔋</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4">
                <Button variant="ghost" onClick={() => setAssistConfirm(null)} className="w-full text-slate-500 text-xs h-8">Cancel</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Selected Job Dialog */}
      {selectedJob && (() => {
        const coverCost = selectedJob.opCoverCost ?? selectedJob.heatGain ?? 1;
        const playerCover = propPlayerData.opCover ?? 0;
        const isBlocked = playerCover < coverCost;
        return (
          <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
            <DialogContent className="bg-[#0a0f1a] border-emerald-900/40 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-emerald-400">{selectedJob.name}</DialogTitle>
                <p className="text-[10px] text-slate-600 uppercase">{selectedJob.tier}</p>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-500" /> Energy: {selectedJob.energyCost}</div>
                  <div className="flex items-center gap-1">💵 {selectedJob.cashMin}-{selectedJob.cashMax}</div>
                  <div className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> XP: {selectedJob.xpGain}</div>
                  <div className="flex items-center gap-1">🛡️ Op Cover: -{coverCost}</div>
                </div>
                {isBlocked ? (
                  <div className="bg-slate-950 border-2 border-orange-600/80 rounded-xl px-4 py-3 text-center shadow-xl">
                    <div className="text-sm font-bold text-orange-400 mb-0.5">🔥 TOO HOT TO OPERATE</div>
                    <div className="text-[10px] text-slate-400 mb-2">
                      Need <span className="text-orange-300 font-bold">{coverCost} Op Cover</span> — you have <span className="text-red-400 font-bold">{playerCover}</span>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                      <Link to="/OpCoverInventoryPage" onClick={() => setSelectedJob(null)} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        🛡️ Inventory
                      </Link>
                      <Link to="/ShopPage?tab=consumables&sub=opcover" onClick={() => setSelectedJob(null)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        🛒 Shop
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg px-3 py-2">
                      <p className="text-sm text-yellow-400 font-semibold">⚠️ Requires {selectedJob.assistsNeeded} assists to complete</p>
                    </div>
                    <Button onClick={() => { handleStartJob(selectedJob); setSelectedJob(null); }} disabled={selectedJob.inProgress} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40">
                      START JOB & GET HELPS
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}