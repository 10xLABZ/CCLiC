import React, { useState, useEffect, useRef, useMemo } from "react";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { base44 } from "@/api/base44Client";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Info } from "lucide-react";
import {
  getEventData, tickEvent, getEventProgress, isEventComplete,
  FAST_FIVE_REWARDS, FAST_FIVE_GOALS, FAST_FIVE_GOAL_ICONS, initEventBaseline,
  getMessages, saveMessages,
  getShardFrenzyData, getShardFrenzyProgress, isShardFrenzyComplete,
  SHARD_FRENZY_GOALS, SHARD_FRENZY_REWARDS, tickShardFrenzy,
  saveShardFrenzyData,
  getGearOverdriveData, getGearOverdriveProgress, isGearOverdriveComplete,
  GEAR_OVERDRIVE_GOALS, GEAR_OVERDRIVE_REWARDS, tickGearOverdrive,
  saveGearOverdriveData,
  isWeeklyEventActive,
  saveEventData,
} from "../components/events/eventStorage";
import {
  getWorldTourData, tickWorldTour, isWorldTourComplete,
  WORLD_TOUR_REWARDS, isWorldTourActive,
  saveWorldTourData,
} from "../components/events/worldTourStorage";
import { patchPlayerData } from "@/lib/playerMemory";

import WorldTourTracker from "../components/events/WorldTourTracker";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCapitalClashData, tickCapitalClash, isCapitalClashActive } from "../components/events/capitalClashStorage";
import { toast } from "sonner";
import SystemMessagesTab from "@/components/events/SystemMessagesTab";
import MessagesTabContent from "@/components/events/MessagesTabContent";
import CrydIcon from "@/components/shared/CrydIcon";
import { getRewardImageUrl, AVATAR_SHARD_ICON_URL, GEAR_PART_ICON_URL } from "@/components/shared/shardIcons";
import EventInfoButton from "@/components/events/EventInfoButton";
import AlreadyClaimedPopup from "@/components/shared/AlreadyClaimedPopup";

const WORLD_TOUR_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/f30ce57ff_image.png";
const FVF_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/44242b8e4_fundvsfundevent.jpg";
const CAPITAL_CLASH_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/e5b6036a3_CapitalClashThePowerIndexEvent.jpg";
const FAST_FIVE_IMG = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/42490b5a2_Events-FastFive.jpg";
const SHARD_FRENZY_IMG = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/3ba373fbb_Events-AvatarShardFrenzy.jpg";
const GEAR_OVERDRIVE_IMG = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/6c6e0c642_Events-GearOverdrive.jpg";

function RewardRow({ r }) {
  const imgUrl = getRewardImageUrl(r.id);
  return (
    <div key={r.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
      {r.id === 'cryd' ? <CrydIcon size={22} /> : imgUrl ? <img src={imgUrl} alt="" className="w-5 h-5 object-contain" /> : <span className="text-lg">{r.icon}</span>}
      <span className="text-sm text-slate-300">{r.label}</span>
    </div>
  );
}

function ClaimRewardRow({ r }) {
  const imgUrl = getRewardImageUrl(r.id);
  return (
    <div key={r.id} className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/30 rounded-lg px-3 py-2">
      {r.id === 'cryd' ? <CrydIcon size={22} /> : imgUrl ? <img src={imgUrl} alt="" className="w-5 h-5 object-contain" /> : <span className="text-lg">{r.icon}</span>}
      <span className="text-sm text-slate-300">{r.label}</span>
      <span className="ml-auto text-emerald-400 text-xs font-bold">✓ Added</span>
    </div>
  );
}

function formatCountdown(ms) {
  if (ms <= 0) return '0h 0m 00s';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatCountdownFull(ms) {
  if (ms <= 0) return '0h 0m 00s';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m ${s.toString().padStart(2, '0')}s`;
  return `${h}h ${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    return t === 'messages' ? 'messages' : t === 'system' ? 'system' : 'event';
  }, []);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [eventData, setEventData] = useState(() => {
    const p = getPlayerData();
    return initEventBaseline(p);
  });
  const [shardFrenzyData, setShardFrenzyData] = useState(() => getShardFrenzyData());
  const [gearOverdriveData, setGearOverdriveData] = useState(() => getGearOverdriveData());
  const [worldTourData, setWorldTourData] = useState(() => getWorldTourData(getPlayerData()));
  const [worldTourTrackerOpen, setWorldTourTrackerOpen] = useState(false);
  const [worldTourRewardsOpen, setWorldTourRewardsOpen] = useState(false);
  const [capitalClashData, setCapitalClashData] = useState(() => getCapitalClashData());
  const [messages, setMessages] = useState(getMessages);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [shardRewardsOpen, setShardRewardsOpen] = useState(false);
  const [gearRewardsOpen, setGearRewardsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(null); // 'fastfive' | 'shardfrenzy' | 'gearoverdrive'
  const [claimResultOpen, setClaimResultOpen] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [serverTimeDisplay, setServerTimeDisplay] = useState(null);
  const serverOffsetRef = useRef(0);

  // Fetch server time on mount to calibrate offset
  useEffect(() => {
    base44.functions.invoke('serverTime', {}).then(res => {
      const serverNow = res.data?.serverTime;
      if (serverNow) {
        serverOffsetRef.current = serverNow - Date.now();
        setNow(Date.now() + serverOffsetRef.current);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const calibratedNow = Date.now() + serverOffsetRef.current;
      const p = getPlayerData();
      const ev = tickEvent(p);
      setEventData(ev);
      setShardFrenzyData(tickShardFrenzy(p));
      setGearOverdriveData(tickGearOverdrive(p));
      const p2 = getPlayerData();
      const wtEv = tickWorldTour(p2);
      setWorldTourData(wtEv);
      const ccTick = tickCapitalClash();
      setCapitalClashData(ccTick);
      setMessages(getMessages());
      setNow(calibratedNow);

      // Update server time display string (no seconds)
      const d = new Date(calibratedNow);
      const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
      // Daily reset = next 05:00 UTC
      // Daily reset = midnight ET = 4:00 AM UTC (EDT, UTC-4)
      const nextReset = new Date(calibratedNow);
      nextReset.setUTCHours(4, 0, 0, 0);
      if (nextReset.getTime() <= calibratedNow) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      const resetMs = nextReset.getTime() - calibratedNow;
      const rh = Math.floor(resetMs / 3600000);
      const rm = Math.floor((resetMs % 3600000) / 60000);
      setServerTimeDisplay({ dateStr, timeStr, resetStr: `${rh}h ${rm.toString().padStart(2, '0')}m` });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fast Five state
  const progress = getEventProgress(playerData);
  const allDone = isEventComplete(playerData);
  const inCooldown = eventData.cooldownEnd && now < eventData.cooldownEnd;
  const timeLeft = inCooldown
    ? eventData.cooldownEnd - now
    : Math.max(0, eventData.endTime - now);
  const fastFiveNotStarted = now < eventData.startTime && !inCooldown;
  const fastFiveActive = !inCooldown && now >= eventData.startTime && now < eventData.endTime;

  // Shard Frenzy state
  const sfNotStarted = now < shardFrenzyData.startTime;
  const sfActive = isWeeklyEventActive(shardFrenzyData);
  const sfInCooldown = !!(shardFrenzyData.cooldownEnd && now < shardFrenzyData.cooldownEnd);
  const sfProgress = getShardFrenzyProgress(playerData);
  const sfAllDone = isShardFrenzyComplete(playerData);
  const sfTimeLeft = sfNotStarted
    ? shardFrenzyData.startTime - now
    : sfInCooldown
    ? shardFrenzyData.cooldownEnd - now
    : Math.max(0, shardFrenzyData.endTime - now);

  // Gear Overdrive state
  const goNotStarted = now < gearOverdriveData.startTime;
  const goActive = isWeeklyEventActive(gearOverdriveData);
  const goInCooldown = !!(gearOverdriveData.cooldownEnd && now < gearOverdriveData.cooldownEnd);
  const goProgress = getGearOverdriveProgress(playerData);
  const goAllDone = isGearOverdriveComplete(playerData);
  const goTimeLeft = goNotStarted
    ? gearOverdriveData.startTime - now
    : goInCooldown
    ? gearOverdriveData.cooldownEnd - now
    : Math.max(0, gearOverdriveData.endTime - now);

  // World Tour state (computed before ordering)
  const wtActive = isWorldTourActive(worldTourData);
  const wtNotStarted = now < worldTourData.startTime && !worldTourData.cooldownEnd;
  const wtInCooldown = !!(worldTourData.cooldownEnd && now < worldTourData.cooldownEnd);
  const wtTimeLeft = wtNotStarted
    ? worldTourData.startTime - now
    : wtInCooldown
    ? worldTourData.cooldownEnd - now
    : Math.max(0, worldTourData.endTime - now);
  const wtAllDone = isWorldTourComplete(playerData);

  // Capital Clash state
  const ccActive = isCapitalClashActive(capitalClashData);
  const ccInCooldown = !!(capitalClashData.cooldownEnd && now < capitalClashData.cooldownEnd);
  const ccNotStarted = now < capitalClashData.startTime && !capitalClashData.cooldownEnd;
  const ccTimeLeft = ccNotStarted ? capitalClashData.startTime - now : ccInCooldown ? capitalClashData.cooldownEnd - now : Math.max(0, capitalClashData.endTime - now);

  // Any event active?
  const anyWeeklyActive = sfActive || goActive || wtActive || ccActive;

  // Sort all non-Fast Five events: active first, then by soonest time
  const sfPriority = sfActive ? 0 : sfInCooldown ? (shardFrenzyData.cooldownEnd - now) : sfNotStarted ? (shardFrenzyData.startTime - now) : 9999;
  const goPriority = goActive ? 0 : goInCooldown ? (gearOverdriveData.cooldownEnd - now) : goNotStarted ? (gearOverdriveData.startTime - now) : 9999;
  const wtPriority = wtActive ? 0 : wtInCooldown ? (worldTourData.cooldownEnd - now) : wtNotStarted ? (worldTourData.startTime - now) : 9999;
  const ccPriority = ccActive ? 0 : ccInCooldown ? (capitalClashData.cooldownEnd - now) : ccNotStarted ? (capitalClashData.startTime - now) : 9999;
  const weeklyEventOrder = [
    { key: 'capitalclash', priority: ccPriority },
    { key: 'shardfrenzy', priority: sfPriority },
    { key: 'gearoverdrive', priority: goPriority },
    { key: 'worldtour', priority: wtPriority },
  ].sort((a, b) => a.priority - b.priority).map(e => e.key);

  const [claimingEvent, setClaimingEvent] = useState(null); // track which event is being claimed
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [fastFiveInfoOpen, setFastFiveInfoOpen] = useState(false);

  // ── Server-authoritative claim status check on mount ─────────────────
  // Queries SystemMessage for reward_claimed records and patches local
  // event caches so the UI reflects the server's truth, not stale memory.
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const ffStart = String(eventData.startTime);
        const sfStart = String(shardFrenzyData.startTime);
        const goStart = String(gearOverdriveData.startTime);
        const wtStart = String(worldTourData.startTime);

        const keys = [
          `fastfive_${ffStart}`,
          `shardfrenzy_${sfStart}`,
          `gearoverdrive_${goStart}`,
          `worldtour_${wtStart}`,
        ];

        const records = await base44.entities.SystemMessage.filter({
          user_id: user.id,
          type: 'reward_claimed',
        });

        const claimedKeys = new Set(records.map(r => r.item_id));

        if (claimedKeys.has(`fastfive_${ffStart}`) && !eventData.claimed) {
          const ev = getEventData();
          ev.claimed = true;
          ev.rewardsSent = true;
          saveEventData(ev);
          setEventData(ev);
        }
        if (claimedKeys.has(`shardfrenzy_${sfStart}`) && !shardFrenzyData.claimed) {
          const ev = getShardFrenzyData();
          ev.claimed = true;
          ev.rewardsSent = true;
          saveShardFrenzyData(ev);
          setShardFrenzyData(ev);
        }
        if (claimedKeys.has(`gearoverdrive_${goStart}`) && !gearOverdriveData.claimed) {
          const ev = getGearOverdriveData();
          ev.claimed = true;
          ev.rewardsSent = true;
          saveGearOverdriveData(ev);
          setGearOverdriveData(ev);
        }
        if (claimedKeys.has(`worldtour_${wtStart}`) && !worldTourData.claimed) {
          const ev = getWorldTourData();
          ev.claimed = true;
          ev.rewardsSent = true;
          saveWorldTourData(ev);
          setWorldTourData(ev);
        }
      } catch (e) {
        console.error('Server claim status check failed:', e);
      }
    })();
  }, []);

  const handleClaimEventAtomic = async (eventType, startTime, rewardList, eventDataSetter, eventCacheGetter, successMsg) => {
    setClaimingEvent(eventType);
    try {
      const res = await base44.functions.invoke('claimEventRewards', {
        event_type: eventType,
        cycle_id: String(startTime),
      });
      const data = res?.data;

      if (!data?.success) {
        setShowAlreadyClaimed(true);
        setClaimingEvent(null);
        return;
      }

      // Patch local cache from authoritative server response
      const patch = {};
      if (data.new_cash != null) patch.cash = data.new_cash;
      if (data.new_crypto != null) patch.crypto = data.new_crypto;
      if (data.new_consumables != null) patch.consumables = data.new_consumables;
      if (Object.keys(patch).length > 0) patchPlayerData(patch);

      // Mark event as claimed locally
      const ev = eventCacheGetter();
      ev.claimed = true;
      ev.rewardsSent = true;
      eventDataSetter(ev);

      setClaimedRewards(rewardList);
      setClaimResultOpen(true);
      toast.success(successMsg);
    } catch (e) {
      console.error(`${eventType} claim failed:`, e);
      setShowAlreadyClaimed(true);
    }
    setClaimingEvent(null);
  };

  const handleClaim = () => handleClaimEventAtomic('fastfive', eventData.startTime, FAST_FIVE_REWARDS, (ev) => { setEventData(ev); saveEventData(ev); }, getEventData, 'Rewards claimed!');
  const handleClaimShardFrenzy = () => handleClaimEventAtomic('shardfrenzy', shardFrenzyData.startTime, SHARD_FRENZY_REWARDS, (ev) => { setShardFrenzyData(ev); saveShardFrenzyData(ev); }, getShardFrenzyData, 'Shard Frenzy rewards claimed!');
  const handleClaimGearOverdrive = () => handleClaimEventAtomic('gearoverdrive', gearOverdriveData.startTime, GEAR_OVERDRIVE_REWARDS, (ev) => { setGearOverdriveData(ev); saveGearOverdriveData(ev); }, getGearOverdriveData, 'Gear Overdrive rewards claimed!');
  const handleClaimWorldTour = () => handleClaimEventAtomic('worldtour', worldTourData.startTime, WORLD_TOUR_REWARDS, (ev) => { setWorldTourData(ev); saveWorldTourData(ev); }, getWorldTourData, 'World Tour rewards claimed!');

  const handleClaimMessage = async (msgId) => {
    const msgs = getMessages();
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.claimed) return;
    setClaimingEvent(msgId);
    try {
      const res = await base44.functions.invoke('claimEventRewards', {
        event_type: msg.rewardType || 'fastfive',
        cycle_id: msgId,
      });
      const data = res?.data;

      if (!data?.success) {
        setShowAlreadyClaimed(true);
        setClaimingEvent(null);
        return;
      }

      // Patch local cache from authoritative server response
      const patch = {};
      if (data.new_cash != null) patch.cash = data.new_cash;
      if (data.new_crypto != null) patch.crypto = data.new_crypto;
      if (data.new_consumables != null) patch.consumables = data.new_consumables;
      if (Object.keys(patch).length > 0) patchPlayerData(patch);

      msg.claimed = true;
      saveMessages(msgs);
      setMessages(getMessages());
      setClaimedRewards(msg?.rewards || FAST_FIVE_REWARDS);
      setClaimResultOpen(true);
      toast.success('Message rewards claimed!');
    } catch (e) {
      console.error('Message claim failed:', e);
      setShowAlreadyClaimed(true);
    }
    setClaimingEvent(null);
  };

  const unclaimedCount = messages.filter(m => !m.claimed).length;

  // Build the weekly event cards in priority order
  const renderWeeklyEvent = (key) => {
    if (key === 'capitalclash') {
      return (
        <div key="capitalclash" className="bg-[#0a0f1a] border border-yellow-900/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse inline-block ${ccActive ? 'bg-green-500' : ccNotStarted ? 'bg-red-500' : 'bg-slate-500'}`} />
              <div className={`text-sm font-bold font-mono ${ccActive ? 'text-yellow-400' : ccNotStarted ? 'text-red-400' : 'text-slate-400'}`}>
                {ccNotStarted ? `⏳ Starts: ${formatCountdown(ccTimeLeft)}` : ccInCooldown ? `⏳ Next: ${formatCountdown(ccTimeLeft)}` : `ENDS: ${formatCountdown(ccTimeLeft)}`}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <EventInfoButton eventKey="capitalclash" />
              <span className="text-[10px] text-yellow-600 font-bold">Mon–Fri</span>
            </div>
          </div>
          <button onClick={() => navigate(createPageUrl('CapitalClashPage'))} className="w-full block">
            <div className="w-full" style={{ aspectRatio: '1024/400' }}>
              <img src={CAPITAL_CLASH_IMG} alt="Capital Clash" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      );
    } else if (key === 'shardfrenzy') {
      return (
        <div key="shardfrenzy" className="bg-[#0a0f1a] border border-purple-900/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              {sfNotStarted && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
              {sfActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
              {sfInCooldown && <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse inline-block" />}
              <div className={`text-sm font-bold font-mono ${sfNotStarted ? 'text-red-400' : sfInCooldown ? 'text-slate-400' : 'text-purple-400'}`}>
                {sfNotStarted
                  ? `⏳ Starts in: ${formatCountdown(sfTimeLeft)}`
                  : sfInCooldown
                  ? `⏳ Next in: ${formatCountdown(sfTimeLeft)}`
                  : `ENDS IN: ${formatCountdown(sfTimeLeft)}`
                }
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <EventInfoButton eventKey="shardfrenzy" />
              <button
                onClick={() => setShardRewardsOpen(true)}
                className="relative flex flex-col items-center justify-center bg-purple-600/20 border border-purple-600/50 text-purple-400 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-purple-600/30 transition-colors leading-tight"
              >
                <span>🎁</span><span>REWARDS</span>
                {sfAllDone && sfActive && !shardFrenzyData.claimed && (
                  <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 8, height: 8, zIndex: 20 }} />
                )}
              </button>
            </div>
          </div>
          <button onClick={() => setGoalsOpen('shardfrenzy')} className="w-full block">
            <div className="w-full" style={{ aspectRatio: '1024/400' }}>
              <img src={SHARD_FRENZY_IMG} alt="AVATAR SHARD FRENZY" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      );
    } else if (key === 'gearoverdrive') {
      return (
        <div key="gearoverdrive" className="bg-[#0a0f1a] border border-orange-900/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              {goNotStarted && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
              {goActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
              {goInCooldown && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
              <div className={`text-sm font-bold font-mono ${goInCooldown ? 'text-red-400' : goNotStarted ? 'text-red-400' : 'text-orange-400'}`}>
                {goNotStarted
                  ? `⏳ Starts in: ${formatCountdownFull(goTimeLeft)}`
                  : goInCooldown
                  ? `⏳ Next in: ${formatCountdownFull(goTimeLeft)}`
                  : `ENDS IN: ${formatCountdownFull(goTimeLeft)}`
                }
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <EventInfoButton eventKey="gearoverdrive" />
              <button
                onClick={() => setGearRewardsOpen(true)}
                className="relative flex flex-col items-center justify-center bg-orange-600/20 border border-orange-600/50 text-orange-400 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-orange-600/30 transition-colors leading-tight"
              >
                <span>🎁</span><span>REWARDS</span>
                {goAllDone && goActive && !gearOverdriveData.claimed && (
                  <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 8, height: 8, zIndex: 20 }} />
                )}
              </button>
            </div>
          </div>
          <button onClick={() => setGoalsOpen('gearoverdrive')} className="w-full block">
            <div className="w-full" style={{ aspectRatio: '1024/400' }}>
              <img src={GEAR_OVERDRIVE_IMG} alt="GEAR OVERDRIVE" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      );
    } else if (key === 'worldtour') {
      return (
        <div key="worldtour" className="bg-[#0a0f1a] border border-blue-900/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse inline-block ${wtActive ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className={`text-sm font-bold font-mono ${wtActive ? 'text-blue-400' : 'text-red-400'}`}>
                {wtNotStarted
                  ? `⏳ Starts in: ${formatCountdownFull(wtTimeLeft)}`
                  : wtInCooldown
                  ? `⏳ Next in: ${formatCountdownFull(wtTimeLeft)}`
                  : `ENDS IN: ${formatCountdownFull(wtTimeLeft)}`
                }
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <EventInfoButton eventKey="worldtour" />
              <button
                onClick={() => setWorldTourRewardsOpen(true)}
                className="relative flex flex-col items-center justify-center bg-blue-600/20 border border-blue-600/50 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-blue-600/30 transition-colors leading-tight"
              >
                <span>🎁</span><span>REWARDS</span>
                {wtActive && wtAllDone && !worldTourData.claimed && (
                  <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 8, height: 8, zIndex: 20 }} />
                )}
              </button>
            </div>
          </div>
          <button onClick={() => setWorldTourTrackerOpen(true)} className="w-full block">
            <div className="w-full" style={{ aspectRatio: '1024/400' }}>
              <img src={WORLD_TOUR_IMG} alt="WORLD TOUR" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />
      <div className="pt-[118px] max-w-2xl mx-auto px-4 py-4">
        {/* Server Time Bar */}
        {serverTimeDisplay && (
          <div className="mb-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[10px] text-slate-400">
              <span className="text-slate-500">🌐 Server: </span>
              <span className="text-slate-200 font-semibold">{serverTimeDisplay.dateStr}</span>
              <span className="text-slate-400 ml-1">{serverTimeDisplay.timeStr} ET</span>
            </div>
            <div className="text-[10px] text-slate-400">
              <span className="text-slate-500">🔄 Daily Reset In: </span>
              <span className="text-amber-400 font-bold font-mono">{serverTimeDisplay.resetStr}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('event')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all relative ${activeTab === 'event' ? 'bg-amber-600 border-amber-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
          >
            🎯 EVENTS
            {anyWeeklyActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#060a12]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all relative ${activeTab === 'messages' ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
          >
            📬 MESSAGES
            {unclaimedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{unclaimedCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${activeTab === 'system' ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
          >
            ⚙️ SYSTEM
          </button>
        </div>

        {activeTab === 'event' ? (
          <div className="space-y-4">
            {/* FUND vs FUND — always at top */}
            <div className="bg-[#0a0f1a] border border-yellow-600/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
                  <div className="text-sm font-bold font-mono text-yellow-400">⚔️ ALLIANCE WAR — MON–SAT</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <EventInfoButton eventKey="fvf" />
                  <span className="text-[10px] text-yellow-600 font-bold">WEEKLY</span>
                </div>
              </div>
              <button onClick={() => navigate(createPageUrl('FvFEventPage'))} className="w-full block">
                <div className="w-full" style={{ aspectRatio: '1920/750' }}>
                  <img src={FVF_IMG} alt="Fund vs Fund Alliance War" className="w-full h-full object-cover" />
                </div>
              </button>
            </div>

          {/* FAST FIVE — always first */}
            <div className="bg-[#0a0f1a] border border-amber-900/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse inline-block ${fastFiveActive ? 'bg-green-500' : inCooldown ? 'bg-slate-500' : 'bg-red-500'}`} />
                  <div className={`text-sm font-bold font-mono ${timeLeft < 60000 && !inCooldown ? 'text-red-400 animate-pulse' : inCooldown ? 'text-slate-400' : fastFiveNotStarted ? 'text-red-400' : 'text-amber-400'}`}>
                    {inCooldown ? `⏳ Next in: ${formatCountdown(timeLeft)}` : fastFiveNotStarted ? `⏳ Starts in: ${formatCountdown(eventData.startTime - now)}` : `ENDS IN: ${formatCountdown(timeLeft)}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <EventInfoButton eventKey="fastfive" />
                  <button
                    onClick={() => setRewardsOpen(true)}
                    className="relative flex flex-col items-center justify-center bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-yellow-600/30 transition-colors leading-tight"
                  >
                    <span>🎁</span><span>REWARDS</span>
                    {allDone && !eventData.claimed && !inCooldown && (
                      <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 8, height: 8, zIndex: 20 }} />
                    )}
                  </button>
                </div>
              </div>
              <button onClick={() => setGoalsOpen('fastfive')} className="w-full block">
                <div className="w-full" style={{ aspectRatio: '1024/400' }}>
                  <img src={FAST_FIVE_IMG} alt="FAST FIVE" className="w-full h-full object-cover" />
                </div>
              </button>
            </div>

            {/* Weekly events in priority order — includes World Tour */}
            {weeklyEventOrder.map(key => renderWeeklyEvent(key))}
          </div>
        ) : activeTab === 'system' ? (
          <SystemMessagesTab onPlayerUpdate={setPlayerData} />
        ) : (
          <MessagesTabContent
            messages={messages}
            claimingEvent={claimingEvent}
            onClaimMessage={handleClaimMessage}
            onClaimAll={async () => {
              const unclaimed = messages.filter(m => !m.claimed);
              for (const msg of unclaimed) {
                await handleClaimMessage(msg.id);
              }
            }}
            onMarkAllRead={() => {
              const updated = messages.map(m => ({ ...m, claimed: true }));
              saveMessages(updated);
              setMessages(updated);
              toast.success('All messages marked as read');
            }}
            onDeleteAll={() => {
              saveMessages([]);
              setMessages([]);
              toast.success('All messages deleted');
            }}
          />
        )}
      </div>

      {/* Fast Five Goals Modal */}
      <Dialog open={goalsOpen === 'fastfive'} onOpenChange={() => setGoalsOpen(null)}>
        <DialogContent className="bg-[#0a0f1a] border border-amber-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-1.5">
              ⚡ FAST FIVE — Goals
              <button
                onClick={() => setFastFiveInfoOpen(true)}
                className="text-amber-500/70 hover:text-amber-400 transition-colors"
                title="How to complete"
              >
                <Info className="w-4 h-4" />
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {FAST_FIVE_GOALS.map(goal => {
              const done = progress[goal.id] || 0;
              const complete = done >= goal.target;
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 flex items-center gap-1.5">{FAST_FIVE_GOAL_ICONS[goal.id] && <img src={FAST_FIVE_GOAL_ICONS[goal.id]} alt="" className="w-5 h-5 object-contain shrink-0" />}{goal.label}</span>
                    <span className={`text-xs font-bold ${complete ? 'text-emerald-400' : 'text-slate-400'}`}>{done}/{goal.target} {complete ? '✓' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full transition-all ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (done / goal.target) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              {eventData.claimed ? (
                <div className="text-center text-emerald-400 text-sm font-bold py-2">✓ Rewards Claimed!</div>
              ) : allDone && !inCooldown ? (
                <Button onClick={() => { handleClaim(); setGoalsOpen(null); }} disabled={claimingEvent === 'fastfive'} className="w-full bg-amber-600 hover:bg-amber-500 font-bold text-sm disabled:opacity-50">
                  {claimingEvent === 'fastfive' ? '⏳ Claiming...' : '🎁 CLAIM REWARDS'}
                </Button>
              ) : inCooldown ? (
                <div className="text-center text-slate-500 text-sm">Event on cooldown</div>
              ) : (
                <Button disabled className="w-full opacity-40 text-sm">Complete all goals to claim</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shard Frenzy Goals Modal */}
      <Dialog open={goalsOpen === 'shardfrenzy'} onOpenChange={() => setGoalsOpen(null)}>
        <DialogContent className="bg-[#0a0f1a] border border-purple-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-1.5"><img src={AVATAR_SHARD_ICON_URL} alt="" className="w-5 h-5 object-contain inline-block" /> AVATAR SHARD FRENZY — Goals</DialogTitle>
          </DialogHeader>
          {sfNotStarted ? (
            <div className="text-center py-4">
              <div className="text-slate-400 text-sm mb-2">Event hasn't started yet</div>
              <div className="text-purple-400 font-bold font-mono">{formatCountdown(sfTimeLeft)} until start</div>
            </div>
          ) : (
            <div className="space-y-3">
              {SHARD_FRENZY_GOALS.map(goal => {
                const done = sfProgress[goal.id] || 0;
                const complete = done >= goal.target;
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{goal.icon} {goal.label}</span>
                      <span className={`text-xs font-bold ${complete ? 'text-emerald-400' : 'text-slate-400'}`}>{done}/{goal.target} {complete ? '✓' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full transition-all ${complete ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(100, (done / goal.target) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                {shardFrenzyData.claimed ? (
                  <div className="text-center text-emerald-400 text-sm font-bold py-2">✓ Rewards Claimed!</div>
                ) : sfAllDone && sfActive ? (
                   <Button onClick={() => { handleClaimShardFrenzy(); setGoalsOpen(null); }} disabled={claimingEvent === 'shardfrenzy'} className="w-full bg-purple-600 hover:bg-purple-500 font-bold text-sm disabled:opacity-50">
                    {claimingEvent === 'shardfrenzy' ? '⏳ Claiming...' : 'CLAIM REWARDS'}
                  </Button>
                ) : sfInCooldown ? (
                  <div className="text-center text-slate-500 text-sm">Event on cooldown</div>
                ) : (
                  <Button disabled className="w-full opacity-40 text-sm">Complete all goals to claim</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gear Overdrive Goals Modal */}
      <Dialog open={goalsOpen === 'gearoverdrive'} onOpenChange={() => setGoalsOpen(null)}>
        <DialogContent className="bg-[#0a0f1a] border border-orange-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-1.5"><img src={GEAR_PART_ICON_URL} alt="" className="w-5 h-5 object-contain inline-block" /> GEAR OVERDRIVE — Goals</DialogTitle>
          </DialogHeader>
          {goNotStarted ? (
            <div className="text-center py-4">
              <div className="text-slate-400 text-sm mb-2">Event hasn't started yet</div>
              <div className="text-orange-400 font-bold font-mono">{formatCountdown(goTimeLeft)} until start</div>
            </div>
          ) : (
            <div className="space-y-3">
              {GEAR_OVERDRIVE_GOALS.map(goal => {
                const done = goProgress[goal.id] || 0;
                const complete = done >= goal.target;
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{goal.icon} {goal.label}</span>
                      <span className={`text-xs font-bold ${complete ? 'text-emerald-400' : 'text-slate-400'}`}>{done}/{goal.target} {complete ? '✓' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full transition-all ${complete ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, (done / goal.target) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                {gearOverdriveData.claimed ? (
                  <div className="text-center text-emerald-400 text-sm font-bold py-2">✓ Rewards Claimed!</div>
                ) : goAllDone && goActive ? (
                  <Button onClick={() => { handleClaimGearOverdrive(); setGoalsOpen(null); }} disabled={claimingEvent === 'gearoverdrive'} className="w-full bg-orange-600 hover:bg-orange-500 font-bold text-sm disabled:opacity-50">
                    {claimingEvent === 'gearoverdrive' ? '⏳ Claiming...' : 'CLAIM REWARDS'}
                  </Button>
                ) : goInCooldown ? (
                  <div className="text-center text-slate-500 text-sm">Event on cooldown</div>
                ) : (
                  <Button disabled className="w-full opacity-40 text-sm">Complete all goals to claim</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fast Five Info Popup — Rewards + How to Complete */}
      <Dialog open={fastFiveInfoOpen} onOpenChange={setFastFiveInfoOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-amber-900/40 text-white max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2"><Info className="w-4 h-4" /> FAST FIVE — How to Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Rewards */}
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Rewards</div>
              <div className="space-y-1.5">
                {FAST_FIVE_REWARDS.map(r => <RewardRow key={r.id} r={r} />)}
              </div>
            </div>
            {/* Goal Instructions */}
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Goals & How to Complete Them</div>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="flex gap-2"><img src="https://media.base44.com/images/public/699169456a354d6cb7082777/a534afd53_attacksimage1.jpg" alt="" className="w-5 h-5 object-contain shrink-0" /><span><b className="text-amber-400">5 Attacks</b> — Win 5 Trade Wars against other players. Tap any player on the map or in the Capital Clash leaderboard and initiate a Trade War. Each victory counts as one attack.</span></div>
                <div className="flex gap-2"><img src="https://media.base44.com/images/public/699169456a354d6cb7082777/0928f9759_jobsimage1.jpg" alt="" className="w-5 h-5 object-contain shrink-0" /><span><b className="text-amber-400">5 Jobs</b> — Complete 5 City Jobs. Open the Ops page, select a city, and run any job (Hustle, Scheme, or High Stakes). Each completed job counts toward this goal.</span></div>
                <div className="flex gap-2"><img src="https://media.base44.com/images/public/699169456a354d6cb7082777/b3f8cda3f_assistimage1.jpg" alt="" className="w-5 h-5 object-contain shrink-0" /><span><b className="text-amber-400">5 Assists</b> — Assist alliance members 5 times. From the Ops page, find assist targets on the map and send help. Each successful assist counts.</span></div>
                <div className="flex gap-2"><img src="https://media.base44.com/images/public/699169456a354d6cb7082777/f4b5586f2_sabotageimage1.jpg" alt="" className="w-5 h-5 object-contain shrink-0" /><span><b className="text-amber-400">5 Sabotages</b> — Sabotage 5 rival players. Use the Ops page to find sabotage targets and execute a sabotage op. Each successful sabotage counts.</span></div>
                <div className="flex gap-2"><img src="https://media.base44.com/images/public/699169456a354d6cb7082777/fe0fc9a2b_insidertradeimage1.jpg" alt="" className="w-5 h-5 object-contain shrink-0" /><span><b className="text-amber-400">5 Insider Trades</b> — Execute 5 trades on the Trade Desk. Open the Trade Desk, pick a stock, and buy or sell. Each trade counts toward this goal.</span></div>
              </div>
            </div>
            <div className="bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 text-[11px] text-amber-300/80">
              All 5 goals must be completed before the timer ends. Claim your rewards from the Goals screen — if you miss the window, unclaimed rewards are sent to your Messages tab.
            </div>
          </div>
          <Button variant="outline" onClick={() => setFastFiveInfoOpen(false)} className="w-full mt-1 border-slate-700 text-slate-400">Got it</Button>
        </DialogContent>
      </Dialog>

      {/* Fast Five Rewards Preview */}
      <Dialog open={rewardsOpen} onOpenChange={setRewardsOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-amber-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2"><Gift className="w-5 h-5" /> FAST FIVE Rewards</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {FAST_FIVE_REWARDS.map(r => <RewardRow key={r.id} r={r} />)}
          </div>
          {fastFiveActive && (
            <Button onClick={() => { setRewardsOpen(false); setGoalsOpen('fastfive'); }} className="w-full mt-2 bg-amber-600 hover:bg-amber-500 font-bold">
              📊 VIEW PROGRESS
            </Button>
          )}
          <Button variant="outline" onClick={() => setRewardsOpen(false)} className="w-full mt-1 border-slate-700 text-slate-400">Close</Button>
        </DialogContent>
      </Dialog>

      {/* Shard Frenzy Rewards Preview */}
      <Dialog open={shardRewardsOpen} onOpenChange={setShardRewardsOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-purple-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2"><Gift className="w-5 h-5" /> AVATAR SHARD FRENZY Rewards</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {SHARD_FRENZY_REWARDS.map(r => <RewardRow key={r.id} r={r} />)}
          </div>
          {sfActive && (
            <Button onClick={() => { setShardRewardsOpen(false); setGoalsOpen('shardfrenzy'); }} className="w-full mt-2 bg-purple-600 hover:bg-purple-500 font-bold">
              📊 VIEW PROGRESS
            </Button>
          )}
          <Button variant="outline" onClick={() => setShardRewardsOpen(false)} className="w-full mt-1 border-slate-700 text-slate-400">Close</Button>
        </DialogContent>
      </Dialog>

      {/* Gear Overdrive Rewards Preview */}
      <Dialog open={gearRewardsOpen} onOpenChange={setGearRewardsOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-orange-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-2"><Gift className="w-5 h-5" /> GEAR OVERDRIVE Rewards</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {GEAR_OVERDRIVE_REWARDS.map(r => <RewardRow key={r.id} r={r} />)}
          </div>
          {goActive && (
            <Button onClick={() => { setGearRewardsOpen(false); setGoalsOpen('gearoverdrive'); }} className="w-full mt-2 bg-orange-600 hover:bg-orange-500 font-bold">
              📊 VIEW PROGRESS
            </Button>
          )}
          <Button variant="outline" onClick={() => setGearRewardsOpen(false)} className="w-full mt-1 border-slate-700 text-slate-400">Close</Button>
        </DialogContent>
      </Dialog>

      {/* Claim Result Dialog */}
      <Dialog open={claimResultOpen} onOpenChange={setClaimResultOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">🎉 Rewards Received!</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(claimedRewards || []).map(r => <ClaimRewardRow key={r.id} r={r} />)}
          </div>
          <Button onClick={() => setClaimResultOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-500">Awesome!</Button>
        </DialogContent>
      </Dialog>



      {/* World Tour Tracker Modal */}
      <WorldTourTracker
        open={worldTourTrackerOpen}
        onClose={() => setWorldTourTrackerOpen(false)}
        playerData={playerData}
        worldTourData={worldTourData}
        onClaim={wtActive && wtAllDone && !worldTourData.claimed ? () => { handleClaimWorldTour(); setWorldTourTrackerOpen(false); } : undefined}
      />

      {/* World Tour Rewards Preview */}
      <Dialog open={worldTourRewardsOpen} onOpenChange={setWorldTourRewardsOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-blue-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2"><Gift className="w-5 h-5" /> WORLD TOUR Rewards</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {WORLD_TOUR_REWARDS.map(r => <RewardRow key={r.id} r={r} />)}
          </div>
          {wtActive && wtAllDone && !worldTourData.claimed && (
            <Button onClick={() => { handleClaimWorldTour(); setWorldTourRewardsOpen(false); }} className="w-full bg-blue-600 hover:bg-blue-500 font-bold">
              🌍 CLAIM REWARDS
            </Button>
          )}
          <Button variant="outline" onClick={() => setWorldTourRewardsOpen(false)} className="w-full mt-1 border-slate-700 text-slate-400">Close</Button>
        </DialogContent>
      </Dialog>

      <AlreadyClaimedPopup
        open={showAlreadyClaimed}
        onClose={() => setShowAlreadyClaimed(false)}
      />

      <BottomNav />
    </div>
  );
}