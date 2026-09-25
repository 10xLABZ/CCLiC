import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, FileText, Dices, Swords, FastForward } from "lucide-react";
import { createPageUrl } from "@/utils";
import { savePlayerData, addXP, getPlayerData } from "../utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import { WEAPONS, FIREARMS, VEHICLES, PEOPLE, PETS } from "../store/catalogData";
import { computeCombatStats } from "./botGenerator";
import { getResearchBonuses, applyBonus } from "@/lib/researchHelper";
import { getDevelopmentBonuses } from "@/lib/developmentBonusHelper";
import LevelUpModal from "../dashboard/LevelUpModal";
import { getAvatarUrl } from "../profile/AvatarPicker";
import { base44 } from "@/api/base44Client";
import AvatarWithScene from "../avatar/AvatarWithScene";
import { getWeaponStarProgress, getWeaponPartsSpent } from "../weapons/weaponUpgradeSystem";
import { getUpgradeLevel as getSimpleUpgradeLevel } from "../upgrades/simpleUpgradeSystem";
import { getAvatarStarProgress } from "../avatar/avatarAbilities";
import { getPlayerType, PLAYER_TYPE_COLORS } from "../utils/playerTypeHelper";
import { applyAvatarStatBonuses, getCashBonusMultiplier } from "../avatar/avatarStatsHelper";
import { getAccessoryIgcMultiplier } from "@/lib/igcBonusHelper";
import { logWorldTourCityAction } from "../events/worldTourStorage";
import FirstHitReel from "./FirstHitReel";
import { HitOverlay, HpFloater, getAttackType, SHAKE_STYLE } from "./BattleAnimations";

const VICTORY_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/91fcd2ec0_postbattle-victory1.jpg";
const DEFEATED_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/e93ae4051_postbattle-defeated1.jpg";
const ADVISOR_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/df0b8df75_advisor1.png";
const STAMP_VICTORY = "https://media.base44.com/images/public/699169456a354d6cb7082777/2f178992a_postbattle-avatarstamp-victory.png";
const STAMP_DEFEATED = "https://media.base44.com/images/public/699169456a354d6cb7082777/5e3b79325_postbattle-avatarstamp-defeated.png";
const STAMP_VICTORY_CHECKMARK = "https://media.base44.com/images/public/699169456a354d6cb7082777/aa67591fb_postbattle-avatarstamp-victory-checkmark.png";
const CRIME_TAPE = "https://media.base44.com/images/public/699169456a354d6cb7082777/327ac7b77_crimetape-x1.png";

const ADVISOR_WINS = [
  "Solid win. Keep building your fund and upgrading your loadout. The top of the market is yours for the taking.",
  "Clean victory. Your opponents are watching. Stay hungry and keep stacking wins.",
  "Impressive. Your strength is growing — now lock in that streak and cash out big.",
  "That's how it's done. Reinvest those earnings into upgrades before your next fight.",
  "Dominant performance. The bigger the fund, the bigger the returns — keep pushing.",
];
const ADVISOR_LOSSES = [
  "Tough loss. Hit the shop, upgrade your gear, and come back swinging. This city respects hustle.",
  "Setback happens. Focus on your fund and loadout — your next fight is your redemption.",
  "Don't dwell on it. Get back out there, upgrade, and show them who owns these streets.",
  "They got lucky. Shore up your defense and pick your next opponent more carefully.",
  "Every loss is a lesson. Check their loadout — find the gap and exploit it next time.",
];

const ALL_WEAPONS = [...FIREARMS, ...WEAPONS];

const calculateDamage = (attackerAtk, defenderDef, attackerForm, extraCritChance = 0) => {
  const variance = 0.85 + (Math.random() * 0.30);
  let baseDamage = (attackerAtk * variance) - (defenderDef * 0.35);
  if (baseDamage < 1) baseDamage = 1;
  let damage = baseDamage * attackerForm;
  const roll = Math.random();
  let hitType = 'normal';
  const critThreshold = Math.min(0.30, 0.10 + extraCritChance / 100);
  if (roll < critThreshold) { damage *= 1.7; hitType = 'crit'; }
  else if (roll < critThreshold + 0.10) { damage *= 0.6; hitType = 'glance'; }
  return { damage: Math.round(damage * 10) / 10, hitType };
};

const getItemById = (category, itemId) => {
  if (!itemId) return null;
  const catalogMap = { weapons: WEAPONS, vehicles: VEHICLES, people: PEOPLE, pets: PETS };
  return catalogMap[category]?.find(item => item.id === itemId) || null;
};

const getAnyWeaponItem = (itemId) => {
  if (!itemId) return null;
  return FIREARMS.find(w => w.id === itemId) || WEAPONS.find(w => w.id === itemId) || null;
};

const fmtStat = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toFixed(2);
};

const getReputationTitle = (respect) => {
  if (respect >= 6000) return "Capital King";
  if (respect >= 3000) return "Fund Manager";
  if (respect >= 1500) return "Elite Trader";
  if (respect >= 700) return "Market Operator";
  if (respect >= 300) return "Dirty Trader";
  if (respect >= 100) return "Street Broker";
  return "Small Time";
};

// Pre-compute all battle turns
function simulateBattle(playerAtk, playerDef, botAtk, botDef, playerForm, botForm, firstHitWinner) {
  let playerHP = Math.max(5, Math.round(playerDef * 2 + playerAtk));
  let botHP = Math.max(5, Math.round(botDef * 2 + botAtk));
  const turns = [];
  // Determine attacker order: if bot wins first hit, bot goes first
  let nextAttacker = firstHitWinner === 'bot' ? 'bot' : 'player';

  while (playerHP > 0 && botHP > 0 && turns.length < 60) {
    if (nextAttacker === 'player') {
      const hit = calculateDamage(playerAtk, botDef, playerForm);
      botHP = Math.max(0, botHP - hit.damage);
      turns.push({ attacker: 'player', damage: hit.damage, hitType: hit.hitType, playerHP, botHP });
      if (botHP <= 0) break;
      nextAttacker = 'bot';
    } else {
      const hit = calculateDamage(botAtk, playerDef, botForm);
      playerHP = Math.max(0, playerHP - hit.damage);
      turns.push({ attacker: 'bot', damage: hit.damage, hitType: hit.hitType, playerHP, botHP });
      if (playerHP <= 0) break;
      nextAttacker = 'player';
    }
  }

  const win = botHP <= 0;
  return { turns, win };
}

export default function BattleEngine({ player, bot, onComplete, locationCity }) {
  const avatarCashMult = getCashBonusMultiplier(player.equippedAvatarId, bot.isHuman ? (bot.avatarShards || 0) : ((player.avatarUpgrades || {})[player.equippedAvatarId] || 0), 'fight');
  const researchBonuses = getResearchBonuses(player);

  const playerFullStats = computeFullPlayerStats(player);
  const playerAtk = playerFullStats.atk;
  const playerDef = playerFullStats.def;
  const playerFundMembers = playerFullStats.fundMembers || player.fundMembersOwned || 0;
  const playerFundPower = playerFullStats.fundPower;
  const playerRepTitle = getReputationTitle(player.respect);
  const botAtk = bot.atk || 1;
  const botDef = bot.def || 1;

  const playerMaxBattleHealth = Math.max(5, Math.round(playerDef * 2 + playerAtk));
  const botMaxBattleHealth = Math.max(5, Math.round(botDef * 2 + botAtk));

  const [playerForm] = useState(() => 0.95 + (Math.random() * 0.10));
  const [botForm] = useState(() => 0.95 + (Math.random() * 0.10));
  const [playerBattleHealth, setPlayerBattleHealth] = useState(playerMaxBattleHealth);
  const [botBattleHealth, setBotBattleHealth] = useState(botMaxBattleHealth);
  const [battleLog, setBattleLog] = useState([]);
  const [battleOver, setBattleOver] = useState(false);
  const [result, setResult] = useState(null);
  const [showPostBattle, setShowPostBattle] = useState(false);
  const [showBattleLogModal, setShowBattleLogModal] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState({ open: false, level: null });
  const [secondAttackRollResult, setSecondAttackRollResult] = useState(null);
  const [firstHitWinner] = useState(() => Math.random() < 0.5 ? 'player' : 'bot');
  const [showFirstHitReel, setShowFirstHitReel] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [frozenAdvisorMsg, setFrozenAdvisorMsg] = useState(null);

  // Animation state
  const [battleRound, setBattleRound] = useState(0); // increments each time a new battle round starts (for 2nd attack)
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [animTurns, setAnimTurns] = useState(null); // pre-computed turns
  const [animWho, setAnimWho] = useState(null); // 'player' or 'bot' — who is being hit
  const [animType, setAnimType] = useState(null);
  const [animActive, setAnimActive] = useState(false);
  const [hpFloater, setHpFloater] = useState({ who: null, damage: 0, key: 0 });
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeBot, setShakeBot] = useState(false);
  const battleLogRef = useRef(null);
  const animRunning = useRef(false);

  // Determine attack types — player alternates between weapon1 and weapon2 each turn
  const playerLoadout = player.loadout || {};
  const botLoadout = bot.equipped || {};
  const playerAttackType1 = getAttackType({ weapon1: playerLoadout.weapon1 }, ALL_WEAPONS);
  const playerAttackType2 = playerLoadout.weapon2 ? getAttackType({ weapon1: playerLoadout.weapon2 }, ALL_WEAPONS) : playerAttackType1;
  const botAttackType1 = getAttackType({ weapon1: botLoadout.weapon1 }, ALL_WEAPONS);
  const botAttackType2 = botLoadout.weapon2 ? getAttackType({ weapon1: botLoadout.weapon2 }, ALL_WEAPONS) : botAttackType1;

  useEffect(() => {
    if (result) {
      setFrozenAdvisorMsg(result.win
        ? ADVISOR_WINS[Math.floor(Math.random() * ADVISOR_WINS.length)]
        : ADVISOR_LOSSES[Math.floor(Math.random() * ADVISOR_LOSSES.length)]);
    }
  }, [result]);

  useEffect(() => {
    if (battleLogRef.current) battleLogRef.current.scrollTop = 0;
  }, [battleLog]);

  // Countdown when FirstHitReel finishes
  useEffect(() => {
    if (showFirstHitReel) return;
    if (countdown !== null) return;
    setCountdown(3);
  }, [showFirstHitReel]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Initialize turns when countdown hits 0 OR when a new battle round starts (2nd attack)
  useEffect(() => {
    if (showFirstHitReel) return;
    if (animTurns !== null) return;
    // Only start after countdown is done (0) or if battleRound > 0 (2nd attack, skip countdown)
    if (battleRound === 0 && countdown !== 0) return;
    const sim = simulateBattle(playerAtk, playerDef, botAtk, botDef, playerForm, botForm, firstHitWinner);
    setAnimTurns(sim.turns);
  }, [countdown, showFirstHitReel, battleRound]);

  // Commit result to game after all turns
  const commitResult = (win, turns) => {
    const log = turns.map(t => {
      const name = t.attacker === 'player' ? 'You' : bot.name;
      const target = t.attacker === 'player' ? bot.name : 'You';
      const prefix = t.hitType === 'crit' ? 'CRITICAL HIT! ' : t.hitType === 'glance' ? 'GLANCING BLOW! ' : '';
      return `${prefix}${name} dealt ${t.damage} dmg`;
    });
    setBattleLog(log);

    if (win) {
      const newWinstreak = (player.winstreak || 0) + 1;
      const streakBonus = Math.min(10, newWinstreak);
      const streakMult = 1 + (streakBonus / 100);
      const respectGain = Math.round(bot.level * 3 * streakMult);
      const baseCashGain = applyBonus(Math.round((100 + bot.level * 25) * (bot.rewardMult || 1) * streakMult * avatarCashMult), researchBonuses.battleCash);
      const igcMult = getAccessoryIgcMultiplier(player);
      const igcBoostAmount = Math.round(baseCashGain * (igcMult - 1));
      const cashGain = baseCashGain + igcBoostAmount;
      const xpGain = Math.round(20 * streakMult);
      const attackCoverCost = bot.battleContext !== 'defense' ? 2 : 0;
      const humanLossShield = bot.isHuman ? { hidden_until: Date.now() + 15 * 60 * 1000 } : {};

      // Apply win rewards server-side atomically
      applyServerReward({
        cash_delta: cashGain,
        respect_delta: respectGain,
        xp_delta: xpGain,
        op_cover_delta: -attackCoverCost,
        reason: 'battle_win',
        fvf_actions: [{ type: 'battle_member_defeat', count: 1 }],
        stat_fields: {
          winstreak: newWinstreak,
          losstreak: 0,
          trade_wars_won_today: 1,
          total_trade_war_wins: 1,
          ...humanLossShield,
        }
      }).then(data => {
        if (data?.new_level > (player.level || 1)) {
          setLevelUpModal({ open: true, level: data.new_level });
        }
      });

      // Stats are patched from server response in applyServerReward — no optimistic update needed
      logWorldTourCityAction(locationCity || player.locationCity, 'attacks');
      if (bot.isHuman && bot.humanUserId) { (async () => { const profiles = await base44.entities.PlayerProfile.filter({ user_id: bot.humanUserId }); if (profiles && profiles[0]) { await base44.entities.PlayerProfile.update(profiles[0].id, { hidden_until: Date.now() + 15 * 60 * 1000, last_attacked_by: JSON.stringify({ attackerUsername: player.username || 'Unknown', attackerLevel: player.level || 1, attackerAvatar: player.profileImageDataUrl || null, timestamp: Date.now() }) }); } })(); }
      if (bot.battleContext === 'defense') { const dl = player.defenceLog || []; dl.push({ bot, outcome: 'WIN', timestamp: Date.now(), revengeAvailable: true, revengeAttempts: 0, index: dl.length }); savePlayerData({ defenceLog: dl.slice(-10) }); }
      if (bot.battleContext === 'revenge' && bot.defenceLogIndex !== undefined) { const dl = player.defenceLog || []; savePlayerData({ defenceLog: dl.map((e, i) => i === bot.defenceLogIndex ? { ...e, revengeSettled: true } : e) }); }
      setResult({ win: true, respectChange: respectGain, cashChange: cashGain, baseCashGain, igcBoostAmount, xpGain, leveledUp: false, streakBonus });
    } else {
      const newLosstreak = (player.losstreak || 0) + 1;
      const streakPenalty = Math.min(10, newLosstreak);
      const streakMult = 1 + (streakPenalty / 100);
      const respectLoss = Math.round(bot.level * 2 * streakMult);
      const rawLoss = Math.min(Math.round((50 + bot.level * 15) * streakMult), Math.round(player.cash * 0.05));
      const cashLoss = researchBonuses.lossProtection > 0 ? Math.round(rawLoss * (1 - researchBonuses.lossProtection / 100)) : rawLoss;
      const lossCoverCost = bot.battleContext !== 'defense' ? 2 : 0;
      const humanLossShield = bot.isHuman ? { hidden_until: Date.now() + 15 * 60 * 1000 } : {};

      // Apply loss penalties server-side atomically
      applyServerReward({
        cash_delta: -cashLoss,
        respect_delta: -respectLoss,
        op_cover_delta: -lossCoverCost,
        reason: 'battle_loss',
        stat_fields: {
          winstreak: 0,
          losstreak: newLosstreak,
          total_trade_war_losses: 1,
          ...humanLossShield,
        }
      });

      // Stats are patched from server response in applyServerReward — no optimistic update needed
      if (bot.battleContext === 'defense') { const dl = player.defenceLog || []; dl.push({ bot, outcome: 'LOSS', timestamp: Date.now(), revengeAvailable: true, revengeAttempts: 0, index: dl.length }); savePlayerData({ defenceLog: dl.slice(-10) }); }
      setResult({ win: false, respectChange: -respectLoss, cashChange: -rawLoss, streakPenalty, humanLoss: !!bot.isHuman });
    }
    setBattleOver(true);
    setShowPostBattle(true);
  };

  // Skip battle button
  const handleSkip = () => {
    if (!animTurns) return;
    const lastTurn = animTurns[animTurns.length - 1];
    const win = lastTurn.botHP <= 0;
    setPlayerBattleHealth(lastTurn.playerHP);
    setBotBattleHealth(lastTurn.botHP);
    animRunning.current = false;
    commitResult(win, animTurns);
  };

  // Animated turn runner
  useEffect(() => {
    if (!animTurns || battleOver || currentTurnIndex >= animTurns.length) return;
    if (animRunning.current) return;
    animRunning.current = true;

    const turn = animTurns[currentTurnIndex];
    // Alternate attack animations: even turns use weapon1, odd use weapon2 — for both player and bot
    const playerTurnsBefore = animTurns.slice(0, currentTurnIndex).filter(t => t.attacker === 'player').length;
    const botTurnsBefore = animTurns.slice(0, currentTurnIndex).filter(t => t.attacker === 'bot').length;
    const activePlayerType = playerTurnsBefore % 2 === 0 ? playerAttackType1 : playerAttackType2;
    const activeBotType = botTurnsBefore % 2 === 0 ? botAttackType1 : botAttackType2;
    const attackerType = turn.attacker === 'player' ? activePlayerType : activeBotType;
    const longAnimTypes = ['nuke', 'beam_of_death', 'poison_gas', 'emp', 'killer_ray_gun', 'kamikaze_drone', 'cryo_cannon', 'napalm_x'];
    const turnDuration = attackerType === 'nuke' ? 4000 : attackerType === 'beam_of_death' ? 3500 : attackerType === 'poison_gas' ? 3200 : attackerType === 'emp' ? 3000 : attackerType === 'killer_ray_gun' ? 3500 : attackerType === 'kamikaze_drone' ? 3500 : attackerType === 'cryo_cannon' ? 2500 : attackerType === 'napalm_x' ? 2500 : 2000;

    // Who gets hit
    const hitWho = turn.attacker === 'player' ? 'bot' : 'player';
    setAnimWho(hitWho);
    setAnimType(attackerType);
    setAnimActive(true);

    // Shake the hit avatar
    if (hitWho === 'player') {
      setShakePlayer(true);
      setTimeout(() => setShakePlayer(false), turnDuration - 200);
    } else {
      setShakeBot(true);
      setTimeout(() => setShakeBot(false), turnDuration - 200);
    }

    // HP floater after short delay
    const floaterDelay = attackerType === 'nuke' ? 2500 : 800;
    const floaterKey = currentTurnIndex;
    setTimeout(() => {
      setHpFloater({ who: hitWho, damage: turn.damage, key: floaterKey });
      if (hitWho === 'player') setPlayerBattleHealth(turn.playerHP);
      else setBotBattleHealth(turn.botHP);
    }, floaterDelay);

    // Log entry
    setBattleLog(prev => {
      const name = turn.attacker === 'player' ? 'You' : bot.name;
      if (turn.hitType === 'crit') {
        return [`CRIT|${name} CRIT|-${turn.damage} hp`, ...prev.slice(0, 5)];
      } else if (turn.hitType === 'glance') {
        return [`GLANCE|${name} GLANCING|-${turn.damage} hp`, ...prev.slice(0, 5)];
      }
      return [`${name} dealt ${turn.damage} dmg`, ...prev.slice(0, 5)];
    });

    // Advance to next turn
    setTimeout(() => {
      setAnimActive(false);
      setAnimWho(null);
      animRunning.current = false;

      const nextIdx = currentTurnIndex + 1;
      if (nextIdx >= animTurns.length) {
        const lastTurn = animTurns[animTurns.length - 1];
        const win = lastTurn.botHP <= 0;
        setTimeout(() => commitResult(win, animTurns), 300);
      } else {
        setCurrentTurnIndex(nextIdx);
      }
    }, turnDuration);
  }, [currentTurnIndex, animTurns, battleOver]);

  return (
    <>
      <style>{SHAKE_STYLE}</style>
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="bg-[#0a0f1a] border border-red-900/40 text-white max-w-xl p-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 88px)', marginBottom: '8px' }}>
          {result && (
            <button onClick={() => onComplete(result.win)} className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* BATTLE SCREEN */}
          {!showPostBattle && (
            <>
              {/* Player Names Header */}
              <div className="grid grid-cols-2 gap-0">
                <div className="bg-emerald-950/40 border-b border-r border-emerald-700/30 px-3 py-2">
                  <div className="font-bold text-emerald-400 truncate text-sm">{player.username || "You"}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{playerRepTitle}</div>
                </div>
                <div className="bg-red-950/40 border-b border-red-700/30 px-3 py-2 text-right">
                  <div className="font-bold text-red-400 truncate text-sm">{bot.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{bot.reputationTitle || bot.type}</div>
                </div>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 rounded-lg">
                  <div className="text-8xl font-black text-yellow-400 animate-pulse">{countdown}</div>
                </div>
              )}

              {/* Battle layout */}
              <div className="flex gap-0 p-2 items-start">

                {/* Player avatar */}
                <div className="flex flex-col gap-1" style={{ width: '90px', flexShrink: 0 }}>
                  <div className="bg-emerald-950/40 rounded-lg p-1.5 border border-emerald-600/50">
                    <div className="text-[9px] text-emerald-400 font-bold truncate">Lv {player.level}</div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500">HP</span>
                      <span className="text-emerald-400 text-[8px]">{parseFloat(playerBattleHealth.toFixed(0))}/{playerMaxBattleHealth}</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-900">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(playerBattleHealth / playerMaxBattleHealth) * 100}%` }} />
                    </div>
                  </div>

                  {/* Avatar with animations */}
                  <div
                    className={`relative rounded-lg overflow-hidden border border-emerald-700/50 bg-slate-900/50 ${shakePlayer ? (animWho === 'player' && ['nuke','beam_of_death','emp','killer_ray_gun','poison_gas','kamikaze_drone','cryo_cannon','napalm_x'].includes(animType) ? 'shake-hard' : 'shake-normal') : ''}`}
                    style={{ height: '184px' }}
                  >
                    <AvatarWithScene avatarSrc={getAvatarUrl(player.equippedAvatarId)} sceneId={player.equippedSceneId} className="w-full h-full" />
                    {animWho === 'player' && (
                      <HitOverlay attackType={animType} active={animActive} onDone={() => {}} onShake={() => { setShakePlayer(false); setTimeout(() => setShakePlayer(true), 10); }} />
                    )}
                    <HpFloater damage={hpFloater.who === 'player' ? hpFloater.damage : 0} triggerKey={hpFloater.who === 'player' ? hpFloater.key : null} />
                  </div>

                  {(() => { const { star } = getAvatarStarProgress((player.avatarUpgrades || {})[player.equippedAvatarId] || 0); return (
                    <div className="flex gap-[1px] justify-center overflow-hidden">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-[8px] leading-none ${i < star ? 'text-yellow-400' : 'text-slate-600'}`}
                          style={i < star ? { filter: 'drop-shadow(0 0 2px rgba(250,204,21,0.7))' } : {}}
                        >{i < star ? '★' : '☆'}</span>
                      ))}
                    </div>
                  ); })()}

                  <div className="bg-emerald-950/30 rounded-lg p-1 border border-emerald-700/40 flex flex-col gap-0.5">
                    <BattleWeaponItem item={getAnyWeaponItem(player.loadout?.weapon1)} partsSpent={getWeaponPartsSpent(player, player.loadout?.weapon1)} />
                    <BattleWeaponItem item={getAnyWeaponItem(player.loadout?.weapon2)} partsSpent={getWeaponPartsSpent(player, player.loadout?.weapon2)} />
                    <BattleWeaponItem item={getAnyWeaponItem(player.loadout?.weapon3)} partsSpent={getWeaponPartsSpent(player, player.loadout?.weapon3)} />
                    <BattleWeaponItem item={getAnyWeaponItem(player.loadout?.weapon4)} partsSpent={getWeaponPartsSpent(player, player.loadout?.weapon4)} />
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <BattleSmallItem item={getItemById('vehicles', player.loadout?.vehicle)} upgradeLevel={getSimpleUpgradeLevel(player, player.loadout?.vehicle)} />
                      <BattleSmallItem item={getItemById('people', player.loadout?.power)} upgradeLevel={getSimpleUpgradeLevel(player, player.loadout?.power)} />
                      <BattleSmallItem item={getItemById('pets', player.loadout?.pet)} upgradeLevel={getSimpleUpgradeLevel(player, player.loadout?.pet)} />
                    </div>
                  </div>
                </div>

                {/* Center stats */}
                <div className="flex flex-col gap-1.5 flex-1 px-2">
                  <div className="bg-slate-900/50 rounded-lg p-1.5 border border-slate-800 space-y-0.5 text-[9px]">
                    <StatCompare emoji="⚔️" playerVal={fmtStat(playerAtk)} botVal={fmtStat(botAtk)} />
                    <StatCompare emoji="🛡️" playerVal={fmtStat(playerDef)} botVal={fmtStat(botDef)} />
                    <StatCompare label={<span className="font-bold text-orange-400 text-[10px]">HQ</span>} playerVal={playerFundMembers} botVal={bot.fundMembers} />
                    <StatCompare label="TP" emoji="💥" playerVal={fmtStat(playerAtk + playerDef)} botVal={fmtStat(bot.atk + bot.def)} />
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 border border-amber-900/40">
                    <div className="text-[8px] font-semibold text-amber-500 uppercase mb-0.5">Market Volatility</div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500">You</span>
                      <span className="text-emerald-400 font-bold">x{playerForm.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500">Opp</span>
                      <span className="text-red-400 font-bold">x{botForm.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 border border-slate-800 flex-1">
                    <div className="text-[8px] font-semibold text-slate-500 uppercase mb-0.5">Live Feed</div>
                    <div ref={battleLogRef} className="space-y-0.5 max-h-24 overflow-y-auto text-[9px]">
                      {battleLog.map((log, i) => {
                        if (log.startsWith('CRIT|')) {
                          const [, name, dmg] = log.split('|');
                          return <div key={i}><span className="text-red-500 font-black">CRIT</span><br/><span className="text-red-400 font-bold">{dmg}</span></div>;
                        }
                        if (log.startsWith('GLANCE|')) {
                          const [, name, dmg] = log.split('|');
                          return <div key={i}><span className="text-orange-400 font-black">GLANCING</span><br/><span className="text-orange-300 font-bold">{dmg}</span></div>;
                        }
                        return <div key={i} className="text-slate-400">{log}</div>;
                      })}
                    </div>
                  </div>

                  {/* Skip button */}
                  {animTurns && !battleOver && (
                    <Button
                      onClick={handleSkip}
                      size="sm"
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[10px] h-7"
                    >
                      <FastForward className="w-3 h-3 mr-1" /> Skip Battle <FastForward className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Bot avatar */}
                <div className="flex flex-col gap-1" style={{ width: '90px', flexShrink: 0 }}>
                  <div className="bg-red-950/40 rounded-lg p-1.5 border border-red-600/50">
                    <div className="text-[9px] text-red-400 font-bold truncate">Lv {bot.level}</div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500">HP</span>
                      <span className="text-red-400 text-[8px]">{parseFloat(Math.max(0, botBattleHealth).toFixed(0))}/{botMaxBattleHealth}</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-red-900">
                      <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(botBattleHealth / botMaxBattleHealth) * 100}%` }} />
                    </div>
                  </div>

                  {/* Bot avatar with animations */}
                  <div
                    className={`relative rounded-lg overflow-hidden border border-red-700/50 bg-slate-900/50 ${shakeBot ? (animWho === 'bot' && ['nuke','beam_of_death','emp','killer_ray_gun','poison_gas','kamikaze_drone','cryo_cannon','napalm_x'].includes(animType) ? 'shake-hard' : 'shake-normal') : ''}`}
                    style={{ height: '184px' }}
                  >
                    <AvatarWithScene avatarSrc={bot.botAvatarId ? getAvatarUrl(bot.botAvatarId) : bot.botAvatar} sceneId={bot.botSceneId} className="w-full h-full" />
                    {animWho === 'bot' && (
                      <HitOverlay attackType={animType} active={animActive} onDone={() => {}} onShake={() => { setShakeBot(false); setTimeout(() => setShakeBot(true), 10); }} />
                    )}
                    <HpFloater damage={hpFloater.who === 'bot' ? hpFloater.damage : 0} triggerKey={hpFloater.who === 'bot' ? hpFloater.key : null} />
                  </div>

                  {(() => { const { star } = getAvatarStarProgress(bot.avatarShards || 0); return (
                    <div className="flex gap-[1px] justify-center overflow-hidden">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-[8px] leading-none ${i < star ? 'text-yellow-400' : 'text-slate-600'}`}
                          style={i < star ? { filter: 'drop-shadow(0 0 2px rgba(250,204,21,0.7))' } : {}}
                        >{i < star ? '★' : '☆'}</span>
                      ))}
                    </div>
                  ); })()}

                  <div className="bg-red-950/30 rounded-lg p-1 border border-red-700/40 flex flex-col gap-0.5">
                    <BattleWeaponItem item={getAnyWeaponItem(bot.equipped?.weapon1)} partsSpent={(bot.weaponUpgrades || {})[bot.equipped?.weapon1] || 0} />
                    <BattleWeaponItem item={getAnyWeaponItem(bot.equipped?.weapon2)} partsSpent={(bot.weaponUpgrades || {})[bot.equipped?.weapon2] || 0} />
                    <BattleWeaponItem item={getAnyWeaponItem(bot.equipped?.weapon3)} partsSpent={(bot.weaponUpgrades || {})[bot.equipped?.weapon3] || 0} />
                    <BattleWeaponItem item={getAnyWeaponItem(bot.equipped?.weapon4)} partsSpent={(bot.weaponUpgrades || {})[bot.equipped?.weapon4] || 0} />
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <BattleSmallItem item={getItemById('vehicles', bot.equipped?.vehicle)} upgradeLevel={(bot.simpleUpgrades || {})[bot.equipped?.vehicle] || 0} />
                      <BattleSmallItem item={getItemById('people', bot.equipped?.power)} upgradeLevel={(bot.simpleUpgrades || {})[bot.equipped?.power] || 0} />
                      <BattleSmallItem item={getItemById('pets', bot.equipped?.pet)} upgradeLevel={(bot.simpleUpgrades || {})[bot.equipped?.pet] || 0} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-3 mb-3 bg-amber-950/20 border border-amber-800/40 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[9px] text-amber-400">⚡ Luck Factor: Battles include random rolls (12% crit chance), so upsets can happen.</div>
              </div>
            </>
          )}

          {/* POST-BATTLE SCREEN */}
          {showPostBattle && result && (
            <PostBattleScreen
              result={result}
              player={player}
              bot={bot}
              battleLog={battleLog}
              playerForm={playerForm}
              botForm={botForm}
              firstHitWinner={firstHitWinner}
              avatarCashMult={avatarCashMult}
              advisorMsg={frozenAdvisorMsg}
              secondAttackRollResult={secondAttackRollResult}
              setSecondAttackRollResult={setSecondAttackRollResult}
              playerMaxBattleHealth={playerMaxBattleHealth}
              botMaxBattleHealth={botMaxBattleHealth}
              setPlayerBattleHealth={setPlayerBattleHealth}
              setBotBattleHealth={setBotBattleHealth}
              setBattleOver={setBattleOver}
              setCurrentTurnIndex={setCurrentTurnIndex}
              setAnimTurns={setAnimTurns}
              setAnimActive={setAnimActive}
              setAnimWho={setAnimWho}
              setShakePlayer={setShakePlayer}
              setShakeBot={setShakeBot}
              setHpFloater={setHpFloater}
              setBattleRound={setBattleRound}
              animRunning={animRunning}
              setResult={setResult}
              setBattleLog={setBattleLog}
              setShowPostBattle={setShowPostBattle}
              onComplete={onComplete}
              onShowBattleLog={() => setShowBattleLogModal(true)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Battle Log Modal */}
      {showBattleLogModal && (
        <Dialog open={showBattleLogModal} onOpenChange={setShowBattleLogModal}>
          <DialogContent className="bg-[#0a0f1a] border border-slate-800 text-white max-w-lg max-h-[80vh]">
            <div className="text-lg font-bold text-slate-200 mb-4">Battle Log</div>
            <div className="space-y-1 max-h-96 overflow-y-auto text-sm text-slate-400">
              {[...battleLog].reverse().map((log, i) => (
                <div key={i} className={log.includes('CRITICAL') ? 'text-red-400 font-semibold' : log.includes('Glancing') ? 'text-yellow-400' : ''}>{log}</div>
              ))}
            </div>
            <Button onClick={() => setShowBattleLogModal(false)} className="w-full mt-4 bg-slate-800 hover:bg-slate-700">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      <LevelUpModal level={levelUpModal.level} open={levelUpModal.open} onClose={() => setLevelUpModal({ open: false, level: null })} />

      {showFirstHitReel && (
        <FirstHitReel
          playerName={player.username || 'You'}
          playerImage={player.profileImageDataUrl || null}
          botName={bot.name}
          botImage={bot.botProfileImage || null}
          winner={firstHitWinner}
          onComplete={() => setShowFirstHitReel(false)}
        />
      )}
    </>
  );
}

function PostBattleScreen({ result, player, bot, battleLog, playerForm, botForm, firstHitWinner, avatarCashMult, advisorMsg, secondAttackRollResult, setSecondAttackRollResult, playerMaxBattleHealth, botMaxBattleHealth, setPlayerBattleHealth, setBotBattleHealth, setBattleOver, setCurrentTurnIndex, setAnimTurns, setAnimActive, setAnimWho, setShakePlayer, setShakeBot, setHpFloater, setBattleRound, animRunning, setResult, setBattleLog, setShowPostBattle, onComplete, onShowBattleLog }) {
  const playerWon = result.win;

  // Auto-roll revenge strike on mount
  useEffect(() => {
    if (secondAttackRollResult === null) {
      const won = Math.random() < 0.33;
      setSecondAttackRollResult(won ? 'win' : 'lose');
    }
  }, []);
  const postBattleImg = playerWon ? VICTORY_IMG : DEFEATED_IMG;
  const playerDefeated = !playerWon;
  const botDefeated = playerWon;

  const highlights = [];
  highlights.push({ label: 'First Strike', value: firstHitWinner === 'player' ? 'YOU' : bot.name });
  const crits = battleLog.filter(l => l.includes('CRITICAL')).length;
  const glances = battleLog.filter(l => l.includes('Glancing')).length;
  if (crits > 0) highlights.push({ label: 'Critical Hits', value: crits });
  if (glances > 0) highlights.push({ label: 'Glancing Blows', value: glances });
  highlights.push({ label: 'Mkt Vol (You)', value: `x${playerForm.toFixed(2)}` });
  highlights.push({ label: 'Mkt Vol (Opp)', value: `x${botForm.toFixed(2)}` });
  if (result.cashChange) highlights.push({ label: result.cashChange > 0 ? 'Cash Stolen' : 'Cash Lost', value: `$${Math.abs(result.cashChange).toLocaleString()}` });
  if (result.igcBoostAmount > 0) highlights.push({ label: 'IGC Boost', value: `+$${result.igcBoostAmount.toLocaleString()}` });

  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes winGlow { 0%,100%{text-shadow:0 0 8px #facc15,0 0 20px #facc15,0 0 4px #fff;opacity:1;} 50%{text-shadow:0 0 24px #facc15,0 0 60px #facc15,0 0 10px #fff;opacity:0.85;} }
        @keyframes loseGlow { 0%,100%{text-shadow:0 0 8px #f87171,0 0 20px #f87171;opacity:1;} 50%{text-shadow:0 0 24px #f87171,0 0 60px #ef4444;opacity:0.8;} }
        .post-battle-win-header { animation: winGlow 1.2s ease-in-out infinite; }
        .post-battle-lose-header { animation: loseGlow 1.4s ease-in-out infinite; }
      `}</style>
      <div className={`text-center py-2 font-black text-xl tracking-widest ${playerWon ? 'bg-emerald-900/50 text-yellow-400 post-battle-win-header' : 'bg-red-950/60 text-red-400 post-battle-lose-header'}`}>
        {playerWon ? 'YOU WON' : 'YOU LOST'}
      </div>

      <div className="flex" style={{ height: 'clamp(216px, 43vw, 288px)' }}>
        <div className="relative overflow-hidden bg-slate-900 flex-shrink-0" style={{ width: '90px' }}>
          {playerDefeated && <div className="absolute inset-0 z-10" style={{ background: 'rgba(0,0,0,0.55)', mixBlendMode: 'color' }} />}
          <div style={playerDefeated ? { filter: 'grayscale(1) brightness(0.6)', width: '100%', height: '100%' } : { width: '100%', height: '100%' }}>
            <AvatarWithScene avatarSrc={getAvatarUrl(player.equippedAvatarId)} sceneId={player.equippedSceneId} className="w-full h-full" />
          </div>
          {playerDefeated && <img src={CRIME_TAPE} alt="Crime Tape" className="absolute left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%', bottom: 'calc(36% + 4px)' }} />}
          {!playerDefeated && <img src={STAMP_VICTORY_CHECKMARK} alt="Victory Checkmark" className="absolute left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%', bottom: 'calc(36% + 4px)' }} />}
          <img src={playerDefeated ? STAMP_DEFEATED : STAMP_VICTORY} alt={playerDefeated ? "Defeated" : "Victor"} className="absolute bottom-1 left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%' }} />
        </div>

        <div className="flex-1 overflow-hidden">
          <img src={postBattleImg} alt="Battle Result" className="w-full h-full object-cover object-center" />
        </div>

        <div className="relative overflow-hidden bg-slate-900 flex-shrink-0" style={{ width: '90px' }}>
          {botDefeated && <div className="absolute inset-0 z-10" style={{ background: 'rgba(0,0,0,0.55)', mixBlendMode: 'color' }} />}
          <div style={botDefeated ? { filter: 'grayscale(1) brightness(0.6)', width: '100%', height: '100%' } : { width: '100%', height: '100%' }}>
            <AvatarWithScene avatarSrc={bot.botAvatarId ? getAvatarUrl(bot.botAvatarId) : bot.botAvatar} sceneId={bot.botSceneId} className="w-full h-full" />
          </div>
          {botDefeated && <img src={CRIME_TAPE} alt="Crime Tape" className="absolute left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%', bottom: 'calc(36% + 4px)' }} />}
          {!botDefeated && <img src={STAMP_VICTORY_CHECKMARK} alt="Victory Checkmark" className="absolute left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%', bottom: 'calc(36% + 4px)' }} />}
          <img src={botDefeated ? STAMP_DEFEATED : STAMP_VICTORY} alt={botDefeated ? "Defeated" : "Victor"} className="absolute bottom-1 left-0 w-full px-1 z-20" style={{ objectFit: 'contain', maxHeight: '36%' }} />
        </div>
      </div>

      <div className="flex gap-2 px-3 pt-3">
        <div className={`bg-slate-900/70 rounded-lg p-2.5 flex-1 flex flex-col justify-center border ${playerWon ? 'border-green-600' : 'border-red-600'}`}>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Respect</div>
          <div className={`text-lg font-black ${result.respectChange >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            {result.respectChange >= 0 ? '+' : ''}{result.respectChange}
          </div>
          {result.xpGain != null && (
            <>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 mt-1">XP</div>
              <div className="text-lg font-black text-blue-400">+{result.xpGain}</div>
            </>
          )}
        </div>
        <div className={`bg-slate-900/70 rounded-lg p-2 flex-1 flex flex-col justify-center border ${playerWon ? 'border-green-600' : 'border-red-600'}`}>
          {playerWon ? (
            <>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">Cash Won:</div>
              <div className="text-xs font-bold text-emerald-400">💵{Math.abs(result.baseCashGain || result.cashChange).toLocaleString()}</div>
              {result.igcBoostAmount > 0 && (
                <>
                  <div className="text-[8px] text-cyan-400 uppercase tracking-wider mt-0.5">IGC Boost:</div>
                  <div className="text-xs font-bold text-cyan-400">+💵{result.igcBoostAmount.toLocaleString()}</div>
                </>
              )}
              <div className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">TTL CASH:</div>
              <div className="text-sm font-black text-emerald-400">+💵{Math.abs(result.cashChange).toLocaleString()}</div>
              {avatarCashMult > 1 && (
                <div className="text-[7px] text-blue-400 mt-0.5">+{((avatarCashMult - 1) * 100).toFixed(1)}% Avatar</div>
              )}
            </>
          ) : (
            <>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Cash Lost</div>
              <div className="text-base font-black text-red-400">-💵{Math.abs(result.cashChange).toLocaleString()}</div>
            </>
          )}
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-2 flex flex-col flex-[1.2]" style={{ minHeight: 0 }}>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Battle Log</div>
          <div className="overflow-y-auto flex-1 space-y-0.5" style={{ maxHeight: '70px' }}>
            {battleLog.map((log, i) => {
              if (log.startsWith('CRIT|')) {
                const [, , dmg] = log.split('|');
                return <div key={i} className="text-[8px] leading-tight"><span className="text-red-500 font-black">CRIT</span> <span className="text-red-400 font-bold">{dmg}</span></div>;
              }
              if (log.startsWith('GLANCE|')) {
                const [, , dmg] = log.split('|');
                return <div key={i} className="text-[8px] leading-tight"><span className="text-orange-400 font-black">GLANCING</span> <span className="text-orange-300 font-bold">{dmg}</span></div>;
              }
              return <div key={i} className="text-[8px] leading-tight text-slate-400">{log}</div>;
            })}
          </div>
        </div>
      </div>

      <div className="px-3 pt-2 flex gap-2">
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Battle Highlights</div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 space-y-1 flex-1">
            {highlights.map((h, i) => (
              <div key={i} className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500">{h.label}</span>
                <span className="text-slate-200 font-semibold">{h.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">Advisor Tip</div>
          <div className="bg-purple-950/60 border border-purple-700/60 rounded-lg p-2 flex gap-2 flex-1">
            <img src={ADVISOR_IMG} alt="Advisor" className="w-14 h-14 rounded-lg object-cover object-top shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-slate-300 leading-snug">{advisorMsg || (playerWon ? ADVISOR_WINS[0] : ADVISOR_LOSSES[0])}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2 flex gap-2">
        <Button variant="outline" onClick={onShowBattleLog} className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-[10px] h-8 px-2 flex-1">
          <FileText className="w-3 h-3 mr-1" /> View Battle Log
        </Button>
        <Button onClick={() => onComplete(result.win)} className="bg-emerald-700 hover:bg-emerald-600 text-[10px] h-8 px-2 flex-1">
          Find New Opponents
        </Button>
      </div>

      <div className="px-3 pt-2 pb-3">
        {secondAttackRollResult === 'win' && (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center justify-center bg-emerald-950/40 border border-emerald-700 rounded-md text-xs text-emerald-400 font-bold px-2 h-9">
              ✅ 2nd Attack Unlocked!
            </div>
            <Button
              onClick={() => {
                // Reset all battle state for 2nd attack round
                animRunning.current = false;
                setShowPostBattle(false);
                setSecondAttackRollResult('used');
                setResult(null);
                setBattleLog([]);
                setPlayerBattleHealth(playerMaxBattleHealth);
                setBotBattleHealth(botMaxBattleHealth);
                setCurrentTurnIndex(0);
                setAnimTurns(null);
                setAnimActive(false);
                setAnimWho(null);
                setShakePlayer(false);
                setShakeBot(false);
                setHpFloater({ who: null, damage: 0, key: 0 });
                setBattleOver(false);
                // Increment battleRound AFTER clearing animTurns so the effect fires
                setBattleRound(r => r + 1);
              }}
              className="flex-1 bg-red-700 hover:bg-red-600 text-xs"
            >
              <Swords className="w-4 h-4 mr-1.5" /> Attack Again!
            </Button>
          </div>
        )}
        {secondAttackRollResult === 'lose' && (
          <div className="flex items-center justify-center bg-slate-900/50 border border-slate-700 rounded-md text-xs text-slate-500 h-9">
            ❌ No Luck — No 2nd Attack
          </div>
        )}
        {secondAttackRollResult === 'used' && (
          <div className="flex items-center justify-center bg-slate-900/50 border border-slate-700 rounded-md text-xs text-slate-500 h-9">
            2nd attack used
          </div>
        )}
      </div>
    </div>
  );
}

function StatCompare({ emoji, label, playerVal, botVal }) {
  return (
    <div className="grid grid-cols-3 items-center gap-1 py-0.5 border-b border-slate-900/50">
      <span className="text-emerald-400 font-semibold text-right text-[9px]">{playerVal}</span>
      <span className="text-center text-[10px]">{label || emoji}</span>
      <span className="text-red-400 font-semibold text-left text-[9px]">{botVal}</span>
    </div>
  );
}

function BattleWeaponItem({ item, partsSpent = 0 }) {
  const { star } = getWeaponStarProgress(partsSpent);
  if (!item) return (
    <div className="rounded px-1 py-0.5 border border-slate-800/40 bg-slate-900/20 text-slate-700 italic text-[8px]">Empty</div>
  );
  return (
    <div className={`rounded px-1 py-0.5 border ${item.borderColor || 'border-slate-800'} bg-slate-900/40`}>
      <div className="text-slate-300 text-[8px] leading-tight truncate">{item.name}</div>
      <div className="flex gap-[1px] overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`text-[7px] leading-none shrink-0 ${i < star ? 'text-yellow-400' : 'text-slate-600'}`}
            style={i < star ? { filter: 'drop-shadow(0 0 2px rgba(250,204,21,0.7))' } : {}}
          >{i < star ? '★' : '☆'}</span>
        ))}
      </div>
    </div>
  );
}

function BattleSmallItem({ item, upgradeLevel = 0 }) {
  return (
    <div className="rounded px-1 py-0.5 border border-slate-800/50 bg-slate-900/30">
      {item ? (
        <>
          <span className="text-slate-300 text-[8px] leading-tight truncate block">{item.name}</span>
          {upgradeLevel > 0 && (
            <div className="flex gap-[1px] overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`text-[7px] leading-none shrink-0 ${i < upgradeLevel ? 'text-cyan-400' : 'text-slate-600'}`}>{i < upgradeLevel ? '★' : '☆'}</span>
              ))}
            </div>
          )}
        </>
      ) : (
        <span className="text-slate-700 italic text-[8px]">Empty</span>
      )}
    </div>
  );
}