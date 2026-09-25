import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Swords, ChevronLeft, ChevronDown, ChevronRight, Gift, Info } from "lucide-react";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AllianceEmblem } from "@/components/fund/FundImagePicker";
import { updateRegenStats } from "@/components/utils/regenHelper";
import { getRewardImageUrl } from "@/components/shared/shardIcons";
import FvFRewardChest from "@/components/shared/FvFRewardChest";
import { isFvfRewardClaimed } from "@/lib/fvfRewardHelper";
import { isRewardClaimedServer } from "@/lib/rewardClaimHelper";
import FvFServerResetBar from "@/components/fvf/FvFServerResetBar";
import FvFDailyGoalsPopup from "@/components/fvf/FvFDailyGoalsPopup";

const FVF_BANNER = "https://media.base44.com/images/public/699169456a354d6cb7082777/44242b8e4_fundvsfundevent.jpg";

const SCORECARD_BG = "https://media.base44.com/images/public/699169456a354d6cb7082777/f8ea4f446_Scorecard1b.jpg";
const VS_SPLAT = "https://media.base44.com/images/public/699169456a354d6cb7082777/3ee028d17_vs-splat.png";
const SCOREBOX_BLUE = "https://media.base44.com/images/public/699169456a354d6cb7082777/cdf1b4ae7_scorebox-blue.png";
const SCOREBOX_RED = "https://media.base44.com/images/public/699169456a354d6cb7082777/5160ec74e_scorebox-red.png";
const BLUESIDE = "https://media.base44.com/images/public/699169456a354d6cb7082777/c983472c6_blueside.png";
const REDSIDE = "https://media.base44.com/images/public/699169456a354d6cb7082777/6b12f384d_redside.png";

const DAILY_THEMES = [
  { key: "intel_day",            day: "MON", label: "Intel Day",              icon: "🕵️", color: "blue",   description: "Activity, stamina usage & market operations", goals: [
    { label: "Spend 1 Stamina or Energy", points: 200 },
    { label: "Complete 1 Insider Trade", points: 100 },
    { label: "Use 1 CRYD", points: 100 },
  ]},
  { key: "firearm_dev_day",      day: "TUE", label: "Firearms Dev Day",       icon: "🔫", color: "red",    description: "Firearm progression & overall account growth", goals: [
    { label: "Use 1 Parts Shard on Firearms", points: 500 },
    { label: "Upgrade HQ by +1 level", points: 2500 },
    { label: "Spend 1 Stamina or Energy", points: 100 },
    { label: "Use 1 CRYD", points: 100 },
  ]},
  { key: "research_day",         day: "WED", label: "Research Day",           icon: "🧪", color: "purple", description: "Research & development systems", goals: [
    { label: "Spend $1,000 on Research or Lab Upgrades", points: 100 },
    { label: "Upgrade Research Lab by +1 level", points: 2500 },
    { label: "Complete Research Tier I (5 levels)", points: 500 },
    { label: "Complete Research Tier II (10 levels)", points: 1500 },
    { label: "Complete Research Tier III (15 levels)", points: 4000 },
    { label: "Complete 1 Insider Trade", points: 100 },
    { label: "Use 1 CRYD", points: 100 },
  ]},
  { key: "avatar_accessory_day", day: "THU", label: "Avatar & Accessory Day", icon: "✨", color: "pink",   description: "Character progression & accessory upgrades", goals: [
    { label: "Use 1 Avatar Shard", points: 2500 },
    { label: "Use 1 Parts Shard on Accessory", points: 500 },
    { label: "Use 1 CRYD", points: 100 },
  ]},
  { key: "full_prep_day",        day: "FRI", label: "Full Prep Day",          icon: "🛡️", color: "yellow", description: "Catch-up & universal progression day", goals: [
    { label: "Complete 1 Insider Trade", points: 100 },
    { label: "Use 1 Parts Shard on Firearms", points: 500 },
    { label: "Use 1 Parts Shard on Accessories", points: 500 },
    { label: "Use 1 Avatar Shard", points: 2500 },
    { label: "Use 1 CRYD", points: 100 },
  ]},
  { key: "battle_day",           day: "SAT", label: "Battle Day — 2× Points", icon: "⚔️", color: "orange", description: "PvP combat & alliance warfare — Saturday winner earns 4 pts!", goals: [
    { label: "Win any Battle", points: 100 },
    { label: "Defeat an opposing alliance member", points: 2500 },
    { label: "Use 1 CRYD", points: 100 },
  ], isDouble: true },
];

const THEME_COLOR_MAP = {
  blue:   { border: "border-blue-500/40",   bg: "bg-blue-900/20",   text: "text-blue-400",   bar: "bg-blue-500"   },
  red:    { border: "border-red-500/40",    bg: "bg-red-900/20",    text: "text-red-400",    bar: "bg-red-500"    },
  purple: { border: "border-purple-500/40", bg: "bg-purple-900/20", text: "text-purple-400", bar: "bg-purple-500" },
  pink:   { border: "border-pink-500/40",   bg: "bg-pink-900/20",   text: "text-pink-400",   bar: "bg-pink-500"   },
  yellow: { border: "border-yellow-500/40", bg: "bg-yellow-900/20", text: "text-yellow-400", bar: "bg-yellow-500" },
  orange: { border: "border-orange-500/40", bg: "bg-orange-900/20", text: "text-orange-400", bar: "bg-orange-500" },
};

const WINNING_REWARDS = [
  { id: "cover_boost", icon: "🛡️", label: "6× Cover Boost +25" },
  { id: "stamina_boost", icon: "⚡", label: "6× Stamina Boost +25" },
  { id: "energy_boost", icon: "🔋", label: "6× Energy Boost +25" },
  { id: "avatar_shard", icon: "🧩", label: "2× Avatar Shards" },
  { id: "gear_shard", icon: "⚙️", label: "3× Gear Part Shards" },
  { id: "cash", icon: "💵", label: "+$50,000 Cash" },
];

const LOSING_REWARDS = [
  { id: "cover_boost", icon: "🛡️", label: "2× Cover Boost +25" },
  { id: "stamina_boost", icon: "⚡", label: "2× Stamina Boost +25" },
  { id: "energy_boost", icon: "🔋", label: "2× Energy Boost +25" },
  { id: "gear_shard", icon: "⚙️", label: "1× Gear Parts" },
  { id: "cash", icon: "💵", label: "+$5,000 Cash" },
];

// Scoring logic: each day, winning alliance earns 2 pts; Saturday = 4 pts
const DAY_POINTS = { default: 2, battle_day: 4 };

export default function FvFEventPage() {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(null);
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [showWinningRewards, setShowWinningRewards] = useState(false);
  const [showLosingRewards, setShowLosingRewards] = useState(false);
  const [fvfRewardClaimed, setFvfRewardClaimed] = useState(false);
  const [goalsPopupTheme, setGoalsPopupTheme] = useState(null);

  // Fetch current user
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch current FvF event — refetch on mount so status is always fresh
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['fvfEvent'],
    queryFn: async () => {
      // Fetch the event for the CURRENT ET week, not just the most recently created.
      // This prevents a prematurely-created new-week event from showing before
      // Monday server reset (which would overlap old results with new opponent).
      // Calculate current ET week start (Monday) purely from the ET date string.
      // Avoids toISOString() which converts to UTC and can shift the date for
      // users in non-UTC timezones.
      const etParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()).split('-');
      const etYear = parseInt(etParts[0], 10);
      const etMonth = parseInt(etParts[1], 10);
      const etDay = parseInt(etParts[2], 10);
      const etDateObj = new Date(etYear, etMonth - 1, etDay);
      const dayOfWeek = etDateObj.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      etDateObj.setDate(etDateObj.getDate() - daysSinceMonday);
      const currentWeekStart = `${etDateObj.getFullYear()}-${String(etDateObj.getMonth() + 1).padStart(2, '0')}-${String(etDateObj.getDate()).padStart(2, '0')}`;

      const events = await base44.entities.FvFEvent.filter({ week_start_date: currentWeekStart });
      if (events[0]) return events[0];
      // Fallback: most recent event if this week's matchmaking hasn't run yet
      const recent = await base44.entities.FvFEvent.list('-created_date', 1);
      return recent[0] || null;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch all alliances
  const { data: alliances = [] } = useQuery({
    queryKey: ['alliances'],
    queryFn: () => base44.entities.Alliance.list()
  });

  // Fetch user's alliance membership
  const { data: myMembership } = useQuery({
    queryKey: ['myMembership', me?.id],
    queryFn: async () => {
      if (!me?.id) return null;
      const members = await base44.entities.AllianceMember.filter({ user_id: me.id });
      return members[0] || null;
    },
    enabled: !!me?.id
  });

  // Fetch scores for current week — always refetch on mount so newly earned
  // points show up immediately after the user does trades/jobs on other pages
  const { data: scores = [] } = useQuery({
    queryKey: ['fvfScores', event?.week_start_date],
    queryFn: async () => {
      if (!event) return [];
      return base44.entities.FvFScore.filter({ event_week_start: event.week_start_date });
    },
    enabled: !!event,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Determine the matched alliance pair for this player
  const { myAlliance, opponentAlliance, brackets } = useMemo(() => {
    if (!event?.matchmaking_brackets || !myMembership?.alliance_id) return { myAlliance: null, opponentAlliance: null, brackets: [] };
    let parsed = [];
    try { parsed = JSON.parse(event.matchmaking_brackets); } catch { return { myAlliance: null, opponentAlliance: null, brackets: [] }; }
    
    const myId = myMembership.alliance_id;
    const myBracket = parsed.find(b => b.alliance_a_id === myId || b.alliance_b_id === myId);
    if (!myBracket) return { myAlliance: null, opponentAlliance: null, brackets: parsed };
    
    const oppId = myBracket.alliance_a_id === myId ? myBracket.alliance_b_id : myBracket.alliance_a_id;
    return {
      myAlliance: alliances.find(a => a.id === myId) || null,
      opponentAlliance: alliances.find(a => a.id === oppId) || null,
      brackets: parsed
    };
  }, [event, myMembership, alliances]);

  // Calculate per-alliance daily point wins (alliance wins a day = +2 pts, battle_day = +4)
  const allianceScores = useMemo(() => {
    if (!myAlliance || !opponentAlliance) return null;
    const myId = myAlliance.id;
    const oppId = opponentAlliance.id;

    const dayTotals = { [myId]: {}, [oppId]: {} };
    DAILY_THEMES.forEach(t => {
      dayTotals[myId][t.key] = 0;
      dayTotals[oppId][t.key] = 0;
    });

    scores.forEach(s => {
      if (dayTotals[s.alliance_id] !== undefined) {
        dayTotals[s.alliance_id][s.day_theme] = (dayTotals[s.alliance_id][s.day_theme] || 0) + (s.points || 0);
      }
    });

    // Determine day winners and event points
    let myEventPts = 0, oppEventPts = 0;
    const dayResults = {};
    DAILY_THEMES.forEach(t => {
      const myPts = dayTotals[myId][t.key] || 0;
      const oppPts = dayTotals[oppId][t.key] || 0;
      const reward = DAY_POINTS[t.key] || DAY_POINTS.default;
      let winner = null;
      if (myPts > oppPts) { myEventPts += reward; winner = myId; }
      else if (oppPts > myPts) { oppEventPts += reward; winner = oppId; }
      dayResults[t.key] = { myPts, oppPts, winner, reward };
    });

    return { dayTotals, dayResults, myEventPts, oppEventPts };
  }, [scores, myAlliance, opponentAlliance]);

  // Sync FvF reward claimed status — server-authoritative check on mount
  useEffect(() => {
    if (event?.week_start_date) {
      // Check localStorage first for instant UI, then verify with server
      setFvfRewardClaimed(isFvfRewardClaimed(event.week_start_date));
      isRewardClaimedServer(`fvf_event_${event.week_start_date}`).then(serverClaimed => {
        if (serverClaimed) {
          setFvfRewardClaimed(true);
        } else {
          // Server says NOT claimed — clear stale localStorage entry so
          // the chest becomes claimable again (fixes orphaned lock recovery)
          try { localStorage.removeItem(`fvf_reward_${event.week_start_date}`); } catch {}
          setFvfRewardClaimed(false);
        }
      }).catch(() => {});
    }
  }, [event?.week_start_date]);

  useEffect(() => {
    const handler = () => {
      if (event?.week_start_date) {
        setFvfRewardClaimed(isFvfRewardClaimed(event.week_start_date));
      }
    };
    window.addEventListener('fvf_reward_changed', handler);
    return () => window.removeEventListener('fvf_reward_changed', handler);
  }, [event?.week_start_date]);

  // Current day theme — calculated from event.week_start_date relative to
  // today's date in ET timezone, so it always matches the backend's logic
  // and never goes stale if the stored current_day_theme field isn't updated.
  const { currentDayTheme, currentDayIdx } = useMemo(() => {
    if (!event?.week_start_date) return { currentDayTheme: 'cooldown', currentDayIdx: -1 };
    const wsParts = event.week_start_date.split('-').map(Number);
    const weekStartMs = new Date(wsParts[0], wsParts[1] - 1, wsParts[2]).getTime();
    const etParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()).split('-').map(Number);
    const etDateMs = new Date(etParts[0], etParts[1] - 1, etParts[2]).getTime();
    const daysDiff = Math.round((etDateMs - weekStartMs) / (24 * 60 * 60 * 1000));
    if (daysDiff >= 0 && daysDiff < DAILY_THEMES.length) {
      return { currentDayTheme: DAILY_THEMES[daysDiff].key, currentDayIdx: daysDiff };
    }
    return { currentDayTheme: 'cooldown', currentDayIdx: -1 };
  }, [event?.week_start_date]);

  const currentTheme = DAILY_THEMES.find(t => t.key === currentDayTheme);
  const isCooldown = currentDayTheme === 'cooldown' || event?.status === 'cooldown';

  // Event is over — Sunday cooldown with final scores
  const eventOver = isCooldown && !!myAlliance && !!opponentAlliance && !!allianceScores;
  const playerWon = allianceScores ? allianceScores.myEventPts > allianceScores.oppEventPts : false;
  const canClaimFvfReward = eventOver && !fvfRewardClaimed;

  // Reveal phase: new week's event exists (Mon-Sat) but no scores earned yet.
  // Show "Your Next Opponent" instead of stale results or empty scorecard.
  const isRevealPhase = !isCooldown && !!myAlliance && !!opponentAlliance && scores.length === 0;

  const selectedTheme = selectedDay ? DAILY_THEMES.find(t => t.key === selectedDay) : null;

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060a12] text-white">
        <Trophy className="w-10 h-10 animate-pulse text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-24">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[118px] max-w-2xl mx-auto px-3">

        {/* Back button + Server Reset — same row */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(createPageUrl('EventsPage'))} className="flex items-center gap-1 text-slate-400 text-sm hover:text-white">
            <ChevronLeft className="w-4 h-4" /> Events
          </button>
          <FvFServerResetBar />
        </div>

        {/* Banner */}
        <div className="rounded-xl overflow-hidden mb-4 border border-yellow-900/30" style={{ aspectRatio: '1920/750' }}>
          <img src={FVF_BANNER} alt="Fund vs Fund Alliance War" className="w-full h-full object-cover" />
        </div>

        {/* Event Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs text-slate-400">Event Status</div>
            <div className={`font-bold text-sm ${isCooldown ? 'text-slate-400' : event?.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>
              {isCooldown ? '😴 Sunday Cooldown' : event?.status === 'active' ? '🟢 LIVE' : '⏳ Upcoming'}
            </div>
          </div>
          {event?.week_start_date && (
            <div className="text-right">
              <div className="text-xs text-slate-400">Week Start</div>
              <div className="text-sm font-bold text-slate-200">{new Date(event.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          )}
          {currentTheme && !isCooldown && (
            <div className="text-right">
              <div className="text-xs text-slate-400">Today</div>
              <div className="text-sm font-bold text-yellow-400">{currentTheme.icon} {currentTheme.label}</div>
            </div>
          )}
        </div>

        <Tabs defaultValue="tracker" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800 mb-4">
            <TabsTrigger value="tracker">⚔️ Battle</TabsTrigger>
            <TabsTrigger value="daily">📅 Daily Goals</TabsTrigger>
            <TabsTrigger value="rewards" className="relative">
              🏆 Rewards
              {canClaimFvfReward && (
                <span className="red-blink-dot absolute -top-1 -right-1 bg-red-500 rounded-full" style={{ width: 8, height: 8, zIndex: 10 }} />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── BATTLE TRACKER ── */}
          <TabsContent value="tracker">
            {!myAlliance ? (
              <Card className="bg-slate-900 border-slate-800 p-6 text-center">
                <Shield className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm">You are not in an alliance or have not been matched yet.</p>
                <p className="text-slate-500 text-xs mt-1">Join an alliance to participate in FvF events!</p>
              </Card>
            ) : !opponentAlliance ? (
              <Card className="bg-slate-900 border-slate-800 p-6 text-center">
                <Swords className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm">Matchmaking in progress...</p>
                <p className="text-slate-500 text-xs mt-1">Your alliance will be matched soon.</p>
              </Card>
            ) : eventOver ? (
              <Card className={`p-6 text-center border ${playerWon ? 'border-yellow-700/40 bg-slate-900' : 'border-red-800/40 bg-slate-900'}`}>
                {playerWon ? (
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                ) : (
                  <Shield className="w-12 h-12 mx-auto mb-3 text-red-400" />
                )}
                <div className={`text-lg font-bold mb-2 ${playerWon ? 'text-yellow-400' : 'text-red-400'}`}>
                  {playerWon ? '🏆 Your Alliance Won!' : '💀 Your Alliance Lost'}
                </div>
                <div className="text-sm text-slate-300 mb-1">
                  Final: <span className="text-blue-300 font-bold">{allianceScores?.myEventPts ?? 0}</span>
                  {" — "}
                  <span className="text-red-300 font-bold">{allianceScores?.oppEventPts ?? 0}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-3">
                  Next opponent revealed at server reset — see timer above.
                </div>
              </Card>
            ) : isRevealPhase ? (
              <Card className="bg-slate-900 border-emerald-700/40 p-6 text-center">
                <Swords className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Your Next Opponent</div>
                <div className="text-lg font-bold text-red-300 mb-1">{opponentAlliance.name}</div>
                <div className="text-sm text-slate-400 mb-3">[{opponentAlliance.tag}]</div>
                <div className="text-[10px] text-slate-500">Event begins at server reset — see timer above.</div>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Alliance vs Alliance Scorecard */}
                <div
                  className="relative rounded-xl overflow-hidden border border-slate-700"
                  style={{
                    backgroundImage: `url(${SCORECARD_BG})`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className="relative flex items-center justify-between px-4 py-4 min-h-[180px]">
                    {/* My Alliance (Blue side) */}
                    <div className="flex flex-col items-center gap-1 flex-1 z-10">
                      <img src={BLUESIDE} alt="Blue Alliance" className="w-12 h-12 object-contain" />
                      <div className="text-xs font-bold text-blue-200 text-center leading-tight">{myAlliance.name}</div>
                      <div className="text-[10px] text-slate-300">[{myAlliance.tag}]</div>
                      <div className="relative flex items-center justify-center" style={{ width: 90, height: 50 }}>
                        <img src={SCOREBOX_BLUE} alt="Score" className="absolute inset-0 w-full h-full object-contain" />
                        <div className="relative text-2xl font-black text-white drop-shadow">{allianceScores?.myEventPts ?? 0}</div>
                      </div>
                      <div className="text-[9px] text-slate-300 font-bold">Event PTS</div>
                    </div>

                    {/* VS splat + plaque */}
                    <div className="flex flex-col items-center gap-1 px-1 z-10">
                      <img src={VS_SPLAT} alt="VS" className="w-14 h-14 object-contain" />
                      <div className="bg-black/85 border border-slate-600 rounded px-2 py-1 text-center">
                        <div className="text-[8px] text-slate-300 leading-tight">Mon-Sat</div>
                        <div className="text-[8px] text-slate-300 leading-tight">2 pts/day</div>
                        <div className="text-[8px] text-slate-300 leading-tight">Sat = 4 pts</div>
                      </div>
                    </div>

                    {/* Opponent Alliance (Red side) */}
                    <div className="flex flex-col items-center gap-1 flex-1 z-10">
                      <img src={REDSIDE} alt="Red Alliance" className="w-12 h-12 object-contain" />
                      <div className="text-xs font-bold text-red-200 text-center leading-tight">{opponentAlliance.name}</div>
                      <div className="text-[10px] text-slate-300">[{opponentAlliance.tag}]</div>
                      <div className="relative flex items-center justify-center" style={{ width: 90, height: 50 }}>
                        <img src={SCOREBOX_RED} alt="Score" className="absolute inset-0 w-full h-full object-contain" />
                        <div className="relative text-2xl font-black text-white drop-shadow">{allianceScores?.oppEventPts ?? 0}</div>
                      </div>
                      <div className="text-[9px] text-slate-300 font-bold">Event PTS</div>
                    </div>
                  </div>

                  {/* Win/lead indicator */}
                  {allianceScores && (
                    <div className="relative pb-3 text-center z-10">
                      {eventOver ? (
                        playerWon ? (
                          <span className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold">🏆 Your Alliance Won!</span>
                        ) : (
                          <span className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-full font-bold">💀 Your Alliance Lost</span>
                        )
                      ) : (
                        allianceScores.myEventPts > allianceScores.oppEventPts ? (
                          <span className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold">🏆 Your Alliance is Leading!</span>
                        ) : allianceScores.oppEventPts > allianceScores.myEventPts ? (
                          <span className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-full font-bold">⚠️ Opponent is Leading</span>
                        ) : (
                          <span className="text-xs bg-yellow-500 text-white px-4 py-1.5 rounded-full font-bold">🤝 Tied!</span>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Day-by-day breakdown */}
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 px-1">Daily Breakdown</div>
                {DAILY_THEMES.map(theme => {
                  const c = THEME_COLOR_MAP[theme.color];
                  const res = allianceScores?.dayResults?.[theme.key];
                  const myRaw = res?.myPts ?? 0;
                  const oppRaw = res?.oppPts ?? 0;
                  const total = myRaw + oppRaw || 1;
                  const myPct = Math.round((myRaw / total) * 100);
                  const oppPct = 100 - myPct;
                  const myWon = res?.winner === myAlliance.id;
                  const oppWon = res?.winner === opponentAlliance.id;
                  const dayIdx = DAILY_THEMES.findIndex(t => t.key === theme.key);
                  const isDayClosed = isCooldown || (currentDayIdx >= 0 && dayIdx < currentDayIdx);
                  const winnerTag = res?.winner === myAlliance.id ? myAlliance.tag : opponentAlliance.tag;

                  return (
                    <Card key={theme.key} className={`border ${c.border} ${c.bg} p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{theme.icon}</span>
                          <div>
                            <div className={`text-xs font-bold ${c.text} flex items-center gap-1`}>
                              {theme.day} — {theme.label}
                              <button
                                onClick={(e) => { e.stopPropagation(); setGoalsPopupTheme(theme); }}
                                className="text-slate-500 hover:text-slate-200 transition-colors"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </div>
                            {theme.isDouble && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded">2× POINTS</span>}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400">+{res?.reward ?? DAY_POINTS[theme.key] ?? 2} pts to winner</div>
                      </div>
                      {/* Bar */}
                      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800 mb-1.5">
                        <div className="bg-blue-500 transition-all" style={{ width: `${myPct}%` }} />
                        <div className="bg-red-500 transition-all" style={{ width: `${oppPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className={`font-bold ${myWon ? 'text-blue-300' : 'text-slate-400'}`}>{myRaw} pts {myWon ? '✓' : ''}</span>
                        <span className={`font-bold ${oppWon ? 'text-red-300' : 'text-slate-400'}`}>{oppWon ? '✓' : ''} {oppRaw} pts</span>
                      </div>
                      {isDayClosed && res?.winner && (
                        <div className="flex justify-center mt-2">
                          <div className="flex items-center gap-1 bg-slate-600 border border-yellow-400 rounded-md px-3 py-1">
                            <span className="text-sm">🏆</span>
                            <span className="text-sm font-bold text-white">{winnerTag}</span>
                            <span className="text-sm">🏆</span>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── DAILY GOALS ── */}
          <TabsContent value="daily">
            <div className="space-y-2">
              {/* Weekly day strip */}
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {DAILY_THEMES.map(theme => {
                  const c = THEME_COLOR_MAP[theme.color];
                  const isToday = theme.key === currentDayTheme;
                  return (
                    <button
                      key={theme.key}
                      onClick={() => setSelectedDay(selectedDay === theme.key ? null : theme.key)}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-all
                        ${selectedDay === theme.key ? `${c.bg} ${c.border} ring-1 ring-offset-0` : isToday ? `${c.bg} ${c.border}` : 'bg-slate-900 border-slate-800'}
                        ${isToday ? 'ring-1 ring-yellow-500' : ''}`}
                    >
                      <span className="text-base">{theme.icon}</span>
                      <span className={`text-[9px] font-bold mt-0.5 ${isToday ? 'text-yellow-400' : c.text}`}>{theme.day}</span>
                      {theme.isDouble && <span className="text-[8px] text-yellow-400 font-bold">2×</span>}
                    </button>
                  );
                })}
              </div>

              {/* Selected day goals */}
              {selectedTheme ? (
                <Card className={`border ${THEME_COLOR_MAP[selectedTheme.color].border} ${THEME_COLOR_MAP[selectedTheme.color].bg} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{selectedTheme.icon}</span>
                    <div>
                      <div className={`font-bold ${THEME_COLOR_MAP[selectedTheme.color].text}`}>{selectedTheme.label}</div>
                      <div className="text-[11px] text-slate-400">{selectedTheme.description}</div>
                    </div>
                    {selectedTheme.isDouble && (
                      <Badge className="ml-auto bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-[10px]">2× SATURDAY</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedTheme.goals.map((goal, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900/60 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-300">{goal.label}</span>
                        <span className={`text-xs font-bold ml-2 shrink-0 ${THEME_COLOR_MAP[selectedTheme.color].text}`}>+{goal.points} pt{goal.points > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400">
                    Alliance contributions are pooled. Day winner earns <span className="text-yellow-400 font-bold">{DAY_POINTS[selectedTheme.key] ?? DAY_POINTS.default} event points</span> toward the weekly total.
                  </div>
                </Card>
              ) : (
                /* Show all days summary */
                <div className="space-y-2">
                  {DAILY_THEMES.map(theme => {
                    const c = THEME_COLOR_MAP[theme.color];
                    return (
                      <button key={theme.key} onClick={() => setSelectedDay(theme.key)} className={`w-full text-left border ${c.border} ${c.bg} rounded-xl p-3 flex items-center gap-3 hover:brightness-110 transition-all`}>
                        <span className="text-xl">{theme.icon}</span>
                        <div className="flex-1">
                          <div className={`text-xs font-bold ${c.text}`}>{theme.day} — {theme.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{theme.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-bold ${c.text}`}>{theme.isDouble ? '4' : '2'} pts</div>
                          {theme.isDouble && <div className="text-[9px] text-yellow-400">2× SAT</div>}
                        </div>
                      </button>
                    );
                  })}
                  <div className="text-[10px] text-slate-500 text-center mt-2">Tap a day to see individual goals</div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── REWARDS ── */}
          <TabsContent value="rewards">
            <div className="space-y-3">
              {/* FvF Reward Chest — only when event is over */}
              {eventOver && (
                <Card className="bg-slate-900 border-yellow-700/40 p-5 text-center">
                  <div className="flex flex-col items-center">
                    <FvFRewardChest
                      weekStartDate={event.week_start_date}
                      isWinner={playerWon}
                      size={120}
                      onClaimed={() => {
                        setFvfRewardClaimed(true);
                        setPlayerData(updateRegenStats());
                      }}
                    />
                    <span className="text-white text-xs font-bold mt-2 tracking-wide">
                      {fvfRewardClaimed
                        ? '✅ Rewards Claimed'
                        : playerWon
                          ? 'CLAIM YOUR VICTORY REWARDS!'
                          : 'CLAIM YOUR PARTICIPATION REWARDS!'}
                    </span>
                  </div>
                </Card>
              )}

              {/* Winning Alliance Rewards — collapsible */}
              <Card className="bg-slate-900 border-slate-800 p-4">
                <button
                  onClick={() => setShowWinningRewards(!showWinningRewards)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div className="text-left">
                      <div className="font-bold text-yellow-300 text-sm">Winning Alliance Rewards</div>
                      <div className="text-[10px] text-slate-400">6× Boosts + 2× Avatar Shards + 3× Gear Parts + $50,000 Cash</div>
                    </div>
                  </div>
                  {showWinningRewards ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {showWinningRewards && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-700">
                    {WINNING_REWARDS.map((r, i) => {
                      const imgUrl = getRewardImageUrl(r.id);
                      return (
                        <div key={i} className="flex items-center gap-3 bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2">
                          {imgUrl ? <img src={imgUrl} alt="" className="w-5 h-5 object-contain" /> : <span className="text-lg">{r.icon}</span>}
                          <span className="text-sm text-slate-200">{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Losing Alliance Rewards — collapsible */}
              <Card className="bg-slate-900 border-slate-800 p-4">
                <button
                  onClick={() => setShowLosingRewards(!showLosingRewards)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="text-left">
                      <div className="font-bold text-slate-300 text-sm">Losing Alliance Rewards</div>
                      <div className="text-[10px] text-slate-500">2× Boosts + 1× Gear Parts + $5,000 Cash</div>
                    </div>
                  </div>
                  {showLosingRewards ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {showLosingRewards && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-700">
                    {LOSING_REWARDS.map((r, i) => {
                      const imgUrl = getRewardImageUrl(r.id);
                      return (
                        <div key={i} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
                          {imgUrl ? <img src={imgUrl} alt="" className="w-5 h-5 object-contain" /> : <span className="text-lg">{r.icon}</span>}
                          <span className="text-sm text-slate-300">{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Info */}
              <Card className="bg-slate-900 border-slate-800 p-4">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>• Event runs <span className="text-slate-300">Monday reset → end of Saturday</span></p>
                  <p>• Sunday is a <span className="text-slate-300">Cooldown Day</span> — no scoring</p>
                  <p>• Each alliance is matched with <span className="text-slate-300">1 opponent</span> per week</p>
                  <p>• Winning alliance determined by total event points (Mon–Sat day wins)</p>
                  <p>• Saturday alliance points are <span className="text-yellow-400 font-bold">×2</span> — winner earns <span className="text-yellow-400 font-bold">4 pts</span> instead of 2</p>
                  <p>• Claim your rewards on Sunday once the event concludes!</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      {/* Daily Goals Popup — triggered by (i) icon on each day card */}
      <FvFDailyGoalsPopup
        theme={goalsPopupTheme}
        open={!!goalsPopupTheme}
        onClose={() => setGoalsPopupTheme(null)}
      />
    </div>
  );
}