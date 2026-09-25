import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Crown, Swords, Trophy, Skull, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import VipFrame from "@/components/vip/VipFrame";
import { base44 } from "@/api/base44Client";
import { kvGet, kvSet, patchPlayerData } from "@/lib/playerMemory";
import {
  getCapitalClashData, isCapitalClashActive, getCurrentCCStart,
  getRewardTier, CAPITAL_CLASH_REWARDS,
  saveCapitalClashData,
  getCCBattleHistory, saveCCBattleRecord,
  getCCDefenseHistory, saveCCDefenseRecord, rollCCDefenseLogs,
  recordPlayerFight,
  PERMANENT_BOTS, initBotChallengeTimers, getBotChallengeTimers, rollNextBotChallengeTimer
} from "../components/events/capitalClashStorage";
import { RewardTiersPanel } from "../components/clash/ClashRewardModal";
import ClashRewardModal from "../components/clash/ClashRewardModal";
import AlreadyClaimedPopup from "@/components/shared/AlreadyClaimedPopup";
import { grantFrame } from "../components/frames/framesStorage";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { getAvatarUrl } from "../components/profile/AvatarPicker";
import { isVipActive } from "@/lib/vipHelper";
import { getFrameById } from "@/components/frames/framesData";
import { toast } from "sonner";

// Map leaderboard rank → CC reward frame (display-only on leaderboard)
const RANK_FRAME_MAP = { 1: 'cc_top', 2: 'cc_2nd', 3: 'cc_3rd' };

// ─── Bot leaderboard (fills empty slots, purely local/deterministic) ──────────
import { generateLeaderboardBots } from "../components/events/capitalClashBots";

const getSlotColor = (slot) => {
  if (slot === 1)  return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20';
  if (slot <= 3)   return 'text-orange-400 border-orange-500/30 bg-orange-950/20';
  if (slot <= 10)  return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
  if (slot <= 20)  return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
  if (slot <= 50)  return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  return 'text-slate-400 border-slate-700 bg-slate-900/30';
};

// HP-based battle sim — HP scales from DEF×2 + ATK, small random variance (±3%)
const simulateHPBattle = (aAtk, aDef, bAtk, bDef) => {
  let aHP = Math.max(5, Math.round(aDef * 2 + aAtk));
  let bHP = Math.max(5, Math.round(bDef * 2 + bAtk));
  for (let i = 0; i < 60 && aHP > 0 && bHP > 0; i++) {
    const aVariance = (Math.random() * 0.06 - 0.03) * aAtk; // ±3% of ATK
    const bVariance = (Math.random() * 0.06 - 0.03) * bAtk;
    bHP -= Math.max(0.5, aAtk - bDef * 0.5 + aVariance);
    if (bHP <= 0) break;
    aHP -= Math.max(0.5, bAtk - aDef * 0.5 + bVariance);
  }
  return aHP > bHP;
};

// ─── Player Card Popup ────────────────────────────────────────────────────────
function PlayerCard({ entry, onClose }) {
  const imageUrl = entry.profile_image_url || entry.botProfileImage || (entry.botAvatarId ? getAvatarUrl(entry.botAvatarId) : null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-[#0a0f1a] border border-yellow-700/50 rounded-xl p-4 w-64 shadow-xl z-10" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-4">
          <VipFrame active={!!entry.is_vip || !!entry.isVip} className="w-16 h-16 shrink-0 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
              {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>}
            </div>
          </VipFrame>
          <div>
            <div className="text-sm font-bold text-slate-200 break-all">{entry.name || entry.username}</div>
            <div className="text-xs text-slate-500">Level {entry.level || entry.player_level}</div>
            <div className="text-xs text-yellow-500 font-semibold mt-0.5">Slot #{entry.slot || entry.slot_number}</div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-2">⊙ Combat Strength</div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div><div className="text-[9px] text-slate-500">ATK</div><div className="text-sm font-bold text-red-400">{(entry.atk || 0).toFixed(2)}</div></div>
            <div><div className="text-[9px] text-slate-500">DEF</div><div className="text-sm font-bold text-blue-400">{(entry.def || 0).toFixed(2)}</div></div>
            <div><div className="text-[9px] text-slate-500">TP</div><div className="text-sm font-bold text-emerald-400">{((entry.atk || 0) + (entry.def || 0)).toFixed(2)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Battle Modal ─────────────────────────────────────────────────────────────
function BattleModal({ playerData, target, mySlotNumber, onResult, onClose }) {
  const [phase, setPhase] = useState('preview');
  const [result, setResult] = useState(null);
  const myStats = computeFullPlayerStats(playerData);
  const oppImageUrl = target.profile_image_url || target.botProfileImage || (target.botAvatarId ? getAvatarUrl(target.botAvatarId) : null);

  const handleFight = () => {
    if ((playerData.stamina || 0) < 5) { toast.error("Need 5 stamina!"); return; }
    setPhase('fighting');
    setTimeout(() => {
      const won = simulateHPBattle(
        myStats.atk, myStats.def,
        target.atk || 0, target.def || 0
      );
      const current = getPlayerData();
      savePlayerData({
        stamina: Math.max(0, (current.stamina || 0) - 5),
        totalTradeWarWins: won ? (current.totalTradeWarWins || 0) + 1 : (current.totalTradeWarWins || 0),
        totalTradeWarLosses: !won ? (current.totalTradeWarLosses || 0) + 1 : (current.totalTradeWarLosses || 0),
        winstreak: won ? (current.winstreak || 0) + 1 : 0,
        losstreak: !won ? (current.losstreak || 0) + 1 : 0,
      });
      saveCCBattleRecord({
        type: 'OFFENSIVE', outcome: won ? 'WIN' : 'LOSS',
        opponentName: target.name || target.username,
        opponentLevel: target.level || target.player_level,
        opponentSlot: target.slot || target.slot_number,
        mySlot: mySlotNumber,
        myAtk: myStats.atk, myDef: myStats.def, myTP: myStats.pwr,
        oppAtk: target.atk || 0, oppDef: target.def || 0, oppTP: (target.atk || 0) + (target.def || 0),
        timestamp: Date.now(),
      });
      const outcome = won ? 'WIN' : 'LOSS';
      setResult({ outcome, targetSlot: target.slot || target.slot_number });
      setPhase('result');
      onResult(outcome, target);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={phase === 'result' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-[#060a12] border border-red-900/40 rounded-xl text-white w-80 p-5 shadow-2xl z-10" onClick={e => e.stopPropagation()}>
        {phase === 'preview' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Capital Clash</div>
              <div className="text-base font-bold text-red-400">The Power Index</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center">
                <div className="w-14 h-14 rounded-xl border-2 border-emerald-500/60 bg-slate-900 overflow-hidden mx-auto mb-1.5">
                  {playerData.profileImageDataUrl ? <img src={playerData.profileImageDataUrl} alt="You" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                </div>
                <div className="text-[11px] font-bold text-emerald-400 truncate">{playerData.username || 'You'}</div>
                <div className="text-[9px] text-slate-500">Lv {playerData.level}</div>
                {mySlotNumber && <div className="text-[9px] text-slate-500">Slot #{mySlotNumber}</div>}
                <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-1.5 mt-1.5 grid grid-cols-2 gap-x-1 gap-y-0.5 text-center">
                  <span className="text-[9px] text-red-400">⚔️{fmtStat(myStats.atk)}</span>
                  <span className="text-[9px] text-blue-400">🛡️{fmtStat(myStats.def)}</span>
                  <span className="text-[9px] text-emerald-400">TP{fmtStat(myStats.pwr)}</span>
                </div>
              </div>
              <div className="flex flex-col items-center shrink-0"><Swords className="w-6 h-6 text-red-500" /><span className="text-xs font-bold text-red-500">VS</span></div>
              <div className="flex-1 text-center">
                <div className="w-14 h-14 rounded-xl border-2 border-red-500/60 bg-slate-900 overflow-hidden mx-auto mb-1.5">
                  {oppImageUrl ? <img src={oppImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                </div>
                <div className="text-[11px] font-bold text-red-400 truncate">{target.name || target.username}</div>
                <div className="text-[9px] text-slate-500">Lv {target.level || target.player_level}</div>
                <div className="text-[9px] text-slate-500">Slot #{target.slot || target.slot_number}</div>
                <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-1.5 mt-1.5 grid grid-cols-2 gap-x-1 gap-y-0.5 text-center">
                  <span className="text-[9px] text-red-400">⚔️{fmtStat(target.atk)}</span>
                  <span className="text-[9px] text-blue-400">🛡️{fmtStat(target.def)}</span>
                  <span className="text-[9px] text-emerald-400">TP{fmtStat((target.atk||0)+(target.def||0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 text-xs text-center text-slate-400">
              Fight & Win to take their slot!
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFight} disabled={(playerData.stamina || 0) < 5} className="flex-1 bg-red-600 hover:bg-red-500 font-bold gap-2 disabled:opacity-50">
                <Swords className="w-4 h-4" /> FIGHT
              </Button>
              <Button onClick={onClose} variant="outline" className="border-slate-700 text-slate-400">Flee</Button>
            </div>
          </div>
        )}
        {phase === 'fighting' && (
          <div className="py-10 text-center space-y-4">
            <div className="text-5xl animate-bounce">⚔️</div>
            <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto" />
            <div className="text-sm text-slate-400">Battle in progress...</div>
          </div>
        )}
        {phase === 'result' && result && (
          <div className="space-y-4 pt-2 text-center">
            {result.outcome === 'WIN' ? (
              <><Trophy className="w-14 h-14 text-yellow-400 mx-auto" /><div className="text-2xl font-black text-yellow-400">VICTORY!</div><div className="bg-emerald-950/40 border border-emerald-700 rounded-xl p-3"><div className="text-xs text-slate-500 mb-1">New Position</div><div className="text-xl font-black text-emerald-400">Slot #{result.targetSlot}</div></div></>
            ) : (
              <><Skull className="w-14 h-14 text-red-400 mx-auto" /><div className="text-2xl font-black text-red-400">DEFEATED!</div><div className="bg-red-950/40 border border-red-800 rounded-xl p-3"><div className="text-xs text-slate-400">Keep fighting to climb the ranks!</div></div></>
            )}
            <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 font-bold">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const fmtStat = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toFixed(2);
};

export default function CapitalClashPage() {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [authUserId, setAuthUserId] = useState(null);
  const authUserIdRef = useRef(null);
  const [humanSlots, setHumanSlots] = useState([]); // from DB
  const [loading, setLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [battleTarget, setBattleTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [battleHistory, setBattleHistory] = useState([]);
  const [defenseHistory, setDefenseHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('offensive');
  const [claimModal, setClaimModal] = useState(null); // { rewards, slotNumber }
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const mySlotRef = useRef(null);

  const cycleStart = getCurrentCCStart();
  const ccData = getCapitalClashData();
  const active = isCapitalClashActive(ccData);

  // ── Poll for slot changes (bot challenges now driven by server automation) ──
  const pollForUpdates = async () => {
    if (!active) return;
    try {
      await fetchSlots();
      if (authUserIdRef.current) await fetchLogs(authUserIdRef.current);
    } catch {}
  };

  // Get auth user id
  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) { setAuthUserId(u.id); authUserIdRef.current = u.id; }
    }).catch(() => {});
  }, []);

  // Fetch battle logs from DB
  const fetchLogs = async (uid) => {
    if (!uid) return;
    try {
      const logs = await base44.entities.CCBattleLog.filter({ user_id: uid, cycle_start: cycleStart }, '-timestamp', 50);
      setBattleHistory(logs.filter(l => l.type === 'OFFENSIVE'));
      setDefenseHistory(logs.filter(l => l.type === 'DEFENSIVE'));
    } catch {}
  };

  // On new cycle start: purge all human slots from previous cycle (keep only permbot slots)
  const cleanOldHumanSlots = async () => {
    const cleanedKey = `cc_humans_cleaned_${cycleStart}`;
    if (kvGet(cleanedKey)) return; // already cleaned this cycle
    try {
      // Get ALL slots not belonging to this cycle (previous cycles)
      const allSlots = await base44.entities.CapitalClashSlot.list();
      const oldHumanSlots = allSlots.filter(s =>
        s.cycle_start !== cycleStart &&
        s.user_id &&
        !s.user_id.startsWith('permbot_') &&
        !s.user_id.startsWith('bot_')
      );
      await Promise.all(oldHumanSlots.map(s => base44.entities.CapitalClashSlot.delete(s.id)));
      kvSet(cleanedKey, '1');
    } catch {}
  };

  // Fetch all slots — seed perm bots in background, don't block leaderboard
  const fetchSlots = async () => {
    setLoading(true);
    try {
      await cleanOldHumanSlots();
      // Seed perm bots in background — don't await so it never blocks the leaderboard
      base44.functions.invoke('seedPermanentCCBots', { cycleStart }).catch(() => {});
      const slots = await base44.entities.CapitalClashSlot.filter({ cycle_start: cycleStart });
      // Enrich alliance tags live from PlayerProfile for human (non-bot) slots
      const humanUserIds = slots
        .filter(s => s.user_id && !s.user_id.startsWith('permbot_') && !s.user_id.startsWith('bot_'))
        .map(s => s.user_id);
      if (humanUserIds.length > 0) {
        try {
          const profiles = await Promise.all(
            humanUserIds.map(uid => base44.entities.PlayerProfile.filter({ user_id: uid }).then(r => r[0] || null).catch(() => null))
          );
          const tagMap = {};
          humanUserIds.forEach((uid, i) => {
            if (profiles[i]?.alliance_tag) tagMap[uid] = profiles[i].alliance_tag;
          });
          const enriched = slots.map(s => tagMap[s.user_id] !== undefined ? { ...s, alliance_tag: tagMap[s.user_id] } : s);
          setHumanSlots(enriched);
        } catch { setHumanSlots(slots); }
      } else {
        setHumanSlots(slots);
      }
    } catch (e) {
      console.error('fetchSlots error:', e);
      try {
        const slots = await base44.entities.CapitalClashSlot.filter({ cycle_start: cycleStart });
        setHumanSlots(slots);
      } catch { setHumanSlots([]); }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Fetch logs once we have the auth user id
  useEffect(() => {
    if (authUserId) fetchLogs(authUserId);
  }, [authUserId]);

  // Check server-authoritative claim status for this CC cycle
  // NOTE: moved below the `isJoined` declaration — referencing it here throws
  // a temporal-dead-zone ReferenceError and crashes the page white.

  // Poll for updates every 10s + refresh on tab focus so displaced slot shows immediately
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => pollForUpdates(), 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') pollForUpdates(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [active]);

  // My DB slot record
  const myDbSlot = authUserId ? humanSlots.find(s => s.user_id === authUserId) : null;
  const mySlotNumber = myDbSlot?.slot_number ?? null;
  const isJoined = mySlotNumber !== null;
  const stamina = playerData?.stamina ?? 0;

  // Check server-authoritative claim status for this CC cycle
  useEffect(() => {
    if (!authUserId || !isJoined) return;
    const rewardKey = `capitalclash_${cycleStart}`;
    base44.entities.SystemMessage.filter({
      user_id: authUserId,
      type: 'reward_claimed',
      item_id: rewardKey,
    }).then(records => {
      setHasClaimed(records.length > 0);
    }).catch(() => {});
  }, [authUserId, isJoined, cycleStart]);

  // Build the full 100-slot leaderboard — all slots (including perm bots) come from DB
  const PERM_BOT_USER_IDS = new Set(['permbot_mnb_001']);
  const botSlots = generateLeaderboardBots(cycleStart);

  const displaySlots = Array.from({ length: 100 }, (_, i) => {
    const num = i + 1;
    const humanRecord = humanSlots.find(s => s.slot_number === num);
    if (humanRecord) {
      const isPermBot = PERM_BOT_USER_IDS.has(humanRecord.user_id);
      const isMe = humanRecord.user_id === authUserId;
      return {
        slot: num, isHuman: !isPermBot, isMe,
        isPermBot,
        user_id: humanRecord.user_id,
        name: humanRecord.alliance_tag
          ? `[${humanRecord.alliance_tag}]${humanRecord.username || 'Player'}`
          : (humanRecord.username || 'Player'),
        level: humanRecord.player_level || 1,
        atk: humanRecord.atk || 0,
        def: humanRecord.def || 0,
        fund_power: humanRecord.fund_power || 0,
        profile_image_url: humanRecord.profile_image_url || null,
        is_vip: humanRecord.is_vip || false,
        _record: humanRecord,
      };
    }
    const bot = botSlots.find(b => b.slot === num);
    return bot ? { ...bot, isHuman: false, isMe: false } : { slot: num, isHuman: false, isMe: false, name: '—', level: 1, atk: 0, def: 0, fund_power: 0 };
  });

  const canFightSlot = (entry) => {
    if (entry.isMe) return false;
    // Not yet joined: can only enter by fighting slots 96-100
    if (!isJoined) return entry.slot >= 96 && entry.slot <= 100;
    // Slot #1 holder can fight up to 3 slots below them to defend
    if (mySlotNumber === 1) return entry.slot > 1 && entry.slot <= 4;
    // Everyone else: fight up to 5 slots above (lower number = higher rank)
    return entry.slot < mySlotNumber && entry.slot >= mySlotNumber - 5;
  };

  // Upsert player into DB leaderboard — always re-query to avoid stale myDbSlot
  const upsertPlayerSlot = async (slotNum, statsOverride) => {
    const pd = getPlayerData();
    const stats = statsOverride || computeFullPlayerStats(pd);
    const payload = {
      user_id: authUserId,
      username: pd.username || 'Player',
      profile_image_url: pd.profileImageDataUrl || null,
      player_level: pd.level || 1,
      atk: stats.atk,
      def: stats.def,
      fund_power: stats.fundPower || 0,
      slot_number: slotNum,
      cycle_start: cycleStart,
      is_vip: isVipActive(pd),
      alliance_tag: pd.allianceTag || null,
    };
    // Always fetch fresh to avoid stale closure / duplicate slot bug
    const freshSlots = await base44.entities.CapitalClashSlot.filter({ user_id: authUserId, cycle_start: cycleStart });
    if (freshSlots && freshSlots.length > 0) {
      // Delete any duplicates, keep only the first
      for (let i = 1; i < freshSlots.length; i++) {
        await base44.entities.CapitalClashSlot.delete(freshSlots[i].id).catch(() => {});
      }
      await base44.entities.CapitalClashSlot.update(freshSlots[0].id, payload);
    } else {
      await base44.entities.CapitalClashSlot.create(payload);
    }
  };

  const handleBattleResult = async (outcome, target) => {
    const current = getPlayerData();
    setPlayerData(current);
    recordPlayerFight();

    // Write offensive log to DB
    if (authUserId) {
      const stats = computeFullPlayerStats(current);
      await base44.entities.CCBattleLog.create({
        user_id: authUserId,
        cycle_start: cycleStart,
        type: 'OFFENSIVE',
        outcome: outcome,
        challenger_name: target.name || target.username,
        challenger_level: target.level || target.player_level || 1,
        challenger_slot: target.slot || target.slot_number,
        challenger_atk: target.atk || 0,
        my_slot: mySlotNumber,
        my_atk: stats.atk,
        my_def: stats.def,
        my_tp: stats.pwr,
        opp_atk: target.atk || 0,
        opp_def: target.def || 0,
        opp_tp: (target.atk || 0) + (target.def || 0),
        timestamp: Date.now(),
      });
      await fetchLogs(authUserId);
    }
    if (outcome === 'WIN') {
      const targetSlotNum = target.slot || target.slot_number;
      const stats = computeFullPlayerStats(current);
      const isDefendingDown = mySlotNumber !== null && targetSlotNum > mySlotNumber;

      if (isDefendingDown) {
        // Slot #1 defending downward — no position change needed
      } else {
        // Challenging upward — re-fetch target record fresh to avoid stale ref
        const freshAll = await base44.entities.CapitalClashSlot.filter({ cycle_start: cycleStart });
        const freshTargetRecord = freshAll.find(s => (s.slot_number === targetSlotNum) && s.user_id !== authUserId);
        if (freshTargetRecord) {
          const pushDownSlot = isJoined ? mySlotNumber : 100;
          await base44.entities.CapitalClashSlot.update(freshTargetRecord.id, { slot_number: pushDownSlot });
        }
        await upsertPlayerSlot(targetSlotNum, stats);
      }
      await fetchSlots();
    }
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);

    // Server-authoritative atomic claim — lock + delivery in one call
    const res = await base44.functions.invoke('claimCapitalClashRewards', {
      cycle_id: String(cycleStart),
    });
    if (!res.data?.success) {
      setClaiming(false);
      if (res.data?.already_claimed) {
        setShowAlreadyClaimed(true);
      } else {
        toast.error(res.data?.error || 'Claim failed');
      }
      return;
    }

    // Use the server-authoritative response — do NOT read local cache
    const slot = res.data.slot_number;
    const tier = res.data.tier;
    const rewards = res.data.rewards_delivered || CAPITAL_CLASH_REWARDS[tier] || [];

    // Patch local player data from authoritative server response
    const patch = {};
    if (res.data.new_cash != null) patch.cash = res.data.new_cash;
    if (res.data.new_crypto != null) patch.crypto = res.data.new_crypto;
    if (res.data.new_consumables != null) patch.consumables = res.data.new_consumables;
    if (Object.keys(patch).length > 0) patchPlayerData(patch);

    // Mark local CC data as claimed (UI flag only — server is the source of truth)
    const localData = getCapitalClashData();
    localData.claimed = true;
    saveCapitalClashData(localData);
    setHasClaimed(true);

    // Refresh player data from server to get authoritative inventory state
    const refreshed = updateRegenStats();
    setPlayerData(refreshed);
    setClaimModal({ rewards, slotNumber: slot });
    setClaiming(false);
  };

  const localCCData = getCapitalClashData();
  const canClaim = isJoined && localCCData.rewardsSent && !hasClaimed;
  const myRewardTier = isJoined ? getRewardTier(mySlotNumber) : null;
  const myRewards = myRewardTier ? CAPITAL_CLASH_REWARDS[myRewardTier] : null;

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[118px] max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(createPageUrl('EventsPage'))} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#0a0f1a] border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-all">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div>
            <div className="text-lg font-black text-yellow-400 flex items-center gap-2"><Trophy className="w-5 h-5" /> Capital Clash</div>
            <div className="text-[10px] text-slate-500">The Power Index • Mon–Fri Event</div>
          </div>
          <div className="ml-auto">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${active ? 'bg-green-950/40 border-green-700/50 text-green-400' : 'bg-red-950/40 border-red-800/50 text-red-400'}`}>
              {active ? '● LIVE' : '● Inactive'}
            </span>
          </div>
        </div>

        {/* Player status */}
        <div className={`rounded-xl px-4 py-3 border mb-4 ${isJoined ? 'bg-yellow-950/30 border-yellow-700/40' : 'bg-slate-900/60 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Your Position</div>
              {isJoined ? (
                <div className="text-xl font-black text-yellow-300 mt-0.5">Slot #{mySlotNumber}</div>
              ) : (
                <div className="text-sm text-slate-500 italic mt-0.5">Not ranked — fight slots #96–100 to enter</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canClaim ? (
                <Button onClick={handleClaim} disabled={claiming} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold disabled:opacity-50 claim-glow-pulse animate-pulse">
                  {claiming ? '⏳ Claiming...' : '🎁 Claim Rewards'}
                </Button>
              ) : hasClaimed ? (
                <Button disabled className="bg-slate-700 text-slate-400 font-bold opacity-60 cursor-not-allowed">
                  ✓ CLAIMED
                </Button>
              ) : null}
              {isJoined && (
                <button
                  onClick={() => {
                    if (mySlotRef.current) {
                      mySlotRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      mySlotRef.current.classList.add('ring-2', 'ring-yellow-400');
                      setTimeout(() => mySlotRef.current?.classList.remove('ring-2', 'ring-yellow-400'), 2000);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                >
                  GO
                </button>
              )}
            </div>
          </div>
          {isJoined && myRewards && !localCCData.claimed && (
            <div className="mt-2 text-[10px] text-slate-400">Your tier rewards: {myRewards.map(r => r.label).join(' • ')}</div>
          )}
        </div>

        <RewardTiersPanel />

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeTab === 'leaderboard' ? 'bg-yellow-600 border-yellow-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>🏆 Leaderboard</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeTab === 'history' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>📜 History {battleHistory.length > 0 && `(${battleHistory.length})`}</button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button onClick={() => setHistoryTab('offensive')} className={`flex-1 py-1 rounded text-[11px] font-bold border transition-all ${historyTab === 'offensive' ? 'bg-red-700 border-red-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>⚔️ Offensive ({battleHistory.length})</button>
              <button onClick={() => setHistoryTab('defensive')} className={`flex-1 py-1 rounded text-[11px] font-bold border transition-all ${historyTab === 'defensive' ? 'bg-blue-700 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>🛡️ Defensive ({defenseHistory.length})</button>
              
            </div>

            {historyTab === 'offensive' && (
              battleHistory.length === 0
                ? <div className="text-center text-slate-600 py-10 text-sm">No battles yet. Fight to build your record!</div>
                : battleHistory.map((record, idx) => {
                    const isWin = record.outcome === 'WIN';
                    return (
                      <div key={idx} className={`border rounded-lg px-3 py-2.5 ${isWin ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-red-800/50 bg-red-950/20'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">⚔️ OFFENSIVE</span>
                            <span className={`text-xs font-black ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>{isWin ? '✓ WIN' : '✗ LOSS'}</span>
                          </div>
                          <span className="text-[9px] text-slate-600">{new Date(record.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-200 font-semibold">{record.challenger_name} <span className="text-slate-500 font-normal text-[10px]">Lv{record.challenger_level} • Slot #{record.challenger_slot}</span></div>
                        <div className="flex gap-4 mt-1 text-[9px]">
                          <span className="text-slate-500">You: <span className="text-red-400">⚔️{(record.my_atk||0).toFixed(1)}</span> <span className="text-blue-400">🛡️{(record.my_def||0).toFixed(1)}</span> <span className="text-emerald-400">TP{(record.my_tp||0).toFixed(1)}</span></span>
                          <span className="text-slate-500">Opp: <span className="text-red-400">⚔️{(record.opp_atk||0).toFixed(1)}</span> <span className="text-blue-400">🛡️{(record.opp_def||0).toFixed(1)}</span> <span className="text-emerald-400">TP{(record.opp_tp||0).toFixed(1)}</span></span>
                        </div>
                      </div>
                    );
                  })
            )}

            {historyTab === 'defensive' && (
              defenseHistory.length === 0
                ? <div className="text-center text-slate-600 py-8 text-sm italic">No defense activity yet. Check back after your next fight!</div>
                : defenseHistory.map((record, idx) => {
                    const defended = record.outcome === 'DEFENDED';
                    return (
                      <div key={idx} className={`border rounded-lg px-3 py-2.5 ${defended ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-red-800/50 bg-red-950/20'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">🛡️ DEFENSIVE</span>
                            <span className={`text-xs font-black ${defended ? 'text-emerald-400' : 'text-red-400'}`}>{defended ? '✓ DEFENDED' : '✗ SLOT LOST'}</span>
                          </div>
                          <span className="text-[9px] text-slate-600">{new Date(record.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-200 font-semibold">{record.challenger_name} <span className="text-slate-500 font-normal text-[10px]">Lv{record.challenger_level} • Slot #{record.challenger_slot}</span></div>
                        <div className="text-[9px] text-slate-500 mt-1">Challenged your slot #{record.my_slot} • Challenger ATK: <span className="text-red-400">{(record.challenger_atk||0).toFixed(1)}</span></div>
                        {record.pushed_to_slot && <div className="text-[9px] text-red-400 mt-0.5">→ Pushed to slot #{record.pushed_to_slot}</div>}
                      </div>
                    );
                  })
            )}
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-yellow-400" /></div>
            ) : displaySlots.map(entry => {
              const color = getSlotColor(entry.slot);
              const imageUrl = entry.profile_image_url || entry.botProfileImage || (entry.botAvatarId ? getAvatarUrl(entry.botAvatarId) : null);
              const showFight = active && !entry.isMe && canFightSlot(entry);
              const liveStats = entry.isMe ? computeFullPlayerStats(playerData) : null;
              const displayAtk = entry.isMe ? liveStats.atk : (entry.atk || 0);
              const displayDef = entry.isMe ? liveStats.def : (entry.def || 0);

              const rankFrameId = RANK_FRAME_MAP[entry.slot];
              const rankFrame = rankFrameId ? getFrameById(rankFrameId) : null;
              const isTop3 = entry.slot <= 3;

              return (
                <div key={entry.slot} ref={entry.isMe ? mySlotRef : null} className={`border rounded-lg px-2 py-1.5 ${color} ${entry.isMe ? 'ring-1 ring-yellow-400' : ''} ${isTop3 ? 'ring-1 ring-yellow-500/60 shadow-md shadow-yellow-900/30' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold w-6 text-center shrink-0">
                      {entry.slot === 1 ? <Crown className="w-3.5 h-3.5 text-yellow-400 mx-auto" /> : `#${entry.slot}`}
                    </div>
                    <div className="relative w-8 h-8 shrink-0" style={{ isolation: 'isolate' }}>
                      <VipFrame active={!!entry.is_vip || !!entry.isVip} className="w-8 h-8">
                        <button className="w-8 h-8 rounded overflow-hidden bg-slate-800 border border-slate-700 hover:ring-1 hover:ring-yellow-400 transition-all" onClick={() => setViewingEntry({ ...entry, atk: displayAtk, def: displayDef })}>
                          {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">👤</div>}
                        </button>
                      </VipFrame>
                      {rankFrame && (
                        <img
                          src={rankFrame.imageUrl}
                          alt={rankFrame.name}
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                          style={{ zIndex: 30 }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-semibold truncate ${entry.isMe ? 'text-yellow-300' : 'text-slate-200'}`}>
                        {entry.isMe && playerData?.allianceTag
                          ? <><span className="text-amber-400 font-bold">[{playerData.allianceTag}]</span>{playerData.username || entry.name}</>
                          : entry.name}{entry.isMe ? ' (you)' : ''}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] mt-0.5 flex-wrap">
                        <span className="text-slate-500">Lv{entry.level}</span>
                        <span className="text-red-400">⚔️{fmtStat(displayAtk)}</span>
                        <span className="text-blue-400">🛡️{fmtStat(displayDef)}</span>
                        <span className="text-emerald-400">TP {fmtStat(displayAtk + displayDef)}</span>
                      </div>
                    </div>
                    {showFight && (
                      <button onClick={() => setBattleTarget(entry)} disabled={stamina < 5} className="shrink-0 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded px-2 py-1 flex items-center gap-1">
                        <Swords className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-bold">FIGHT</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && stamina < 5 && <div className="text-center text-xs text-red-400 mt-3">⚡ Need 5 stamina to fight</div>}
          </div>
        )}
      </div>

      <AlreadyClaimedPopup
        open={showAlreadyClaimed}
        onClose={() => setShowAlreadyClaimed(false)}
        message="You've already claimed your Capital Clash rewards for this cycle. Check back next week."
      />

      {viewingEntry && <PlayerCard entry={viewingEntry} onClose={() => setViewingEntry(null)} />}
      <ClashRewardModal
        open={!!claimModal}
        onClose={() => setClaimModal(null)}
        rewards={claimModal?.rewards}
        slotNumber={claimModal?.slotNumber}
      />
      {battleTarget && (
        <BattleModal
          playerData={playerData}
          target={battleTarget}
          mySlotNumber={mySlotNumber}
          onResult={handleBattleResult}
          onClose={() => setBattleTarget(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}