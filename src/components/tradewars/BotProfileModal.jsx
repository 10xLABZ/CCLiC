import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VipFrame from "../vip/VipFrame";
import { isVipActive } from "@/lib/vipHelper";
import { Button } from "@/components/ui/button";
import { Swords, Sword, TrendingUp, Users, Skull, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AllianceViewModal from "../alliance/AllianceViewModal";
import { WEAPONS, VEHICLES, PEOPLE, PETS, FIREARMS } from "../store/catalogData";
import AvatarWithScene from "../avatar/AvatarWithScene";
import { getAvatarUrl } from "../profile/AvatarPicker";
import { getThemeById } from "../store/themesData";
import LoadoutDisplay from "../profile/LoadoutDisplay";
import { getAvatarStarProgress } from "../avatar/avatarAbilities";
import { FAST_FIVE_GOAL_ICONS } from "@/components/events/eventStorage";

const TRADES_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/3152921ec_tradeimage1.jpg";

// Bot stats are now generated in botGenerator.jsx and stored on the bot object
// This function is no longer needed but kept for compatibility

export default function BotProfileModal({ bot, open, onClose, onFight }) {
  const [alliancePreview, setAlliancePreview] = useState(null);
  const [loadingAlliance, setLoadingAlliance] = useState(false);

  const handleViewAlliance = async () => {
    const tag = bot.alliance_tag || bot.allianceTag;
    if (!tag) return;
    setLoadingAlliance(true);
    try {
      const alliances = await base44.entities.Alliance.filter({ tag });
      if (alliances.length > 0) setAlliancePreview(alliances[0]);
    } catch {}
    setLoadingAlliance(false);
  };

  if (!bot) return null;
  
  // Use pre-generated stats from bot object — support both bot fields and human player fields
  const lifetimeStats = {
    jobs: bot.lifetimeJobs || bot.totalJobsCompleted || 0,
    assists: bot.lifetimeAssists || bot.totalAssists || Math.floor((bot.lifetimeJobs || 0) * (0.5 + Math.random() * 0.8)),
    sabotages: bot.lifetimeSabotages || bot.totalSabotages || Math.floor((bot.lifetimeJobs || 0) * (0.1 + Math.random() * 0.3)),
    trades: bot.lifetimeTrades || bot.totalTradesCompleted || 0,
    wins: bot.tradeWarsWins || bot.totalTradeWarWins || 0,
    losses: bot.tradeWarsLosses || bot.totalTradeWarLosses || 0
  };

  const getItemById = (category, itemId) => {
    if (!itemId) return null;
    if (typeof itemId === 'object' && itemId.locked) return null;
    const catalogMap = { firearms: FIREARMS, weapons: WEAPONS, vehicles: VEHICLES, people: PEOPLE, pets: PETS };
    const catalog = catalogMap[category];
    return catalog?.find(item => item.id === itemId) || null;
  };

  // weapon1/2 are Firearms (F-prefix), weapon3 is Accessory (W-prefix)
  const getLoadoutItem = (slot, itemId) => {
    if (!itemId) return null;
    if (typeof itemId === 'string' && itemId.startsWith('F')) return getItemById('firearms', itemId);
    return getItemById('weapons', itemId);
  };

  const equipped = bot.equipped || bot.loadout || {};
  const weapon1 = getLoadoutItem('weapon1', equipped.weapon1);
  const weapon2 = getLoadoutItem('weapon2', equipped.weapon2);
  const weapon3 = getLoadoutItem('weapon3', equipped.weapon3);
  const weapon4 = getLoadoutItem('weapon4', equipped.weapon4);
  const vehicle = getItemById('vehicles', equipped.vehicle);
  const power = getItemById('people', equipped.power);
  const pet = getItemById('pets', equipped.pet);

  const totalWars = lifetimeStats.wins + lifetimeStats.losses;
  const warWinRate = totalWars > 0 
    ? ((lifetimeStats.wins / totalWars) * 100).toFixed(1)
    : "0.0";

  // For human players use their equipped avatar; for bots use botAvatar (profile image)
  const avatarSrc = bot.botAvatarId ? getAvatarUrl(bot.botAvatarId) : (bot.botAvatar || null);
  const showVipFrame = (bot.isHuman && bot.vipActiveUntil && bot.vipActiveUntil > Date.now()) || (!bot.isHuman && bot.hasVipFrame);
  const botTheme = getThemeById(bot.botThemeId || 'theme_001_rusty_hotness');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Sticky header — always visible */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-[#0a0f1a] border-b border-slate-800">
          <span className="text-sm font-bold text-amber-400 truncate">{bot.name}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1.5 transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {/* Old header removed - replaced by themed username box below */}

          {/* MAIN BODY: Two 50/50 Columns */}
          {/* Theme-styled username box + HQ plate */}
          {(() => {
            const theme = getThemeById(bot.botThemeId || 'theme_001_rusty_hotness');
            const hqLevel = bot.fundMembers || bot.fund_members_owned || bot.fundMembersOwned || 0;
            return (
              <div className="mb-4 rounded-xl overflow-hidden flex" style={{ minHeight: '60px' }}>
                {/* Username box — 74% width */}
                <div style={{
                  width: '74%',
                  backgroundImage: `url(${theme?.usernameImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/1cb4bea85_Theme_001_UsernameBox-RustyHotness.jpg'})`,
                  backgroundSize: '100% 100%', backgroundPosition: 'center',
                }}>
                  <div className="text-center py-3 px-4">
                    <div className="font-bold text-slate-200 flex items-center justify-center gap-2 flex-wrap" style={{ fontSize: 'clamp(11px, 3vw, 18px)' }}>
                      <span>{bot.botGenderEmoji === 'M' ? '🚹' : bot.botGenderEmoji === 'F' ? '🚺' : '🚹'}</span>
                      {(bot.alliance_tag || bot.allianceTag) && (
                        <button
                          onClick={handleViewAlliance}
                          className="text-amber-400 font-bold hover:text-amber-300 transition-colors"
                          title="View Alliance"
                        >
                          [{bot.alliance_tag || bot.allianceTag}]
                        </button>
                      )}
                      {bot.name}
                    </div>
                    <div className="text-xs text-amber-400">{bot.reputationTitle}</div>
                  </div>
                </div>
                {/* HQ Plate — 26% width */}
                <div className="flex items-end justify-center shrink-0"
                  style={{
                    width: '26%',
                    backgroundImage: `url(https://media.base44.com/images/public/699169456a354d6cb7082777/d4aa11341_hq-pf-plate1.png)`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    paddingBottom: '6px',
                  }}>
                  <div className="text-center w-full"
                    style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: '#c084fc',
                      textShadow: '0 0 8px #a855f7, 0 0 18px #7c3aed',
                      lineHeight: 1,
                    }}>
                    {hqLevel}
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
            {/* LEFT COLUMN - STATS + BUTTONS */}
            <div className="space-y-2">
              {/* Strength Stats */}
              <div className="border border-emerald-900/30 rounded-xl p-2.5 relative overflow-hidden" style={{
                backgroundImage: `url(${botTheme?.strengthImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/604225359_Theme_001_StrengthBox_RustyHotness.jpg'})`,
                backgroundSize: '100% 100%', backgroundPosition: 'center'
              }}>
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10">
                  <Sword className="w-3 h-3" /> Strength
                </h3>
                <div className="space-y-1 relative z-10">
                   <StatRow label="ATK" value={bot.atk?.toFixed(2)} icon="⚔️" />
                   <StatRow label="DEF" value={bot.def?.toFixed(2)} icon="🛡️" />
                   <div className="border-b border-slate-600/60 mx-4 my-1" />
                   <StatRow label="TP" value={((bot.atk || 0) + (bot.def || 0)).toFixed(2)} icon="💥" highlight large />
                 </div>
              </div>

              {/* Performance Stats */}
              <div className="border border-emerald-900/30 rounded-xl p-2.5 relative overflow-hidden" style={{
                backgroundImage: `url(${botTheme?.performanceImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/913a43062_Theme_001_PerformanceBox_RustyHotness.jpg'})`,
                backgroundSize: '100% 100%', backgroundPosition: 'center'
              }}>
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10">
                  <TrendingUp className="w-3 h-3" /> Performance
                </h3>
                <div className="space-y-1 relative z-10">
                  <StatRow label="Jobs" value={lifetimeStats.jobs.toLocaleString()} iconUrl={FAST_FIVE_GOAL_ICONS.jobs} />
                  <StatRow label="Assists" value={lifetimeStats.assists.toLocaleString()} iconUrl={FAST_FIVE_GOAL_ICONS.assists} />
                  <StatRow label="Sabotages" value={lifetimeStats.sabotages.toLocaleString()} iconUrl={FAST_FIVE_GOAL_ICONS.sabotages} />
                  <StatRow label="Trades" value={lifetimeStats.trades.toLocaleString()} iconUrl={TRADES_ICON_URL} />
                  <div className="pt-1 border-t border-slate-900/50 mt-1">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span>⚔️</span>
                      Trade Wars
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">W/L:</span>
                        <span className="text-slate-300 font-semibold">
                          {lifetimeStats.wins}/{lifetimeStats.losses}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">W%:</span>
                        <span className="text-slate-300 font-semibold">{warWinRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button Stack */}
              <div className="space-y-1.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onFight();
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-8"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  FIGHT NOW
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="w-full border-slate-800 text-slate-400 hover:bg-slate-900/50 text-xs h-8"
                >
                  Sneak Away
                </Button>
                {(bot.alliance_tag || bot.allianceTag) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewAlliance}
                    disabled={loadingAlliance}
                    className="w-full border-amber-800/50 text-amber-400 hover:bg-amber-950/40 text-xs h-8"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    {loadingAlliance ? 'Loading...' : `[${bot.alliance_tag || bot.allianceTag}] Alliance`}
                  </Button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - AVATAR (scene + avatar only, no theme background) */}
            <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-2">
              <div
                className="w-full rounded-xl overflow-hidden relative"
                style={{ height: 'clamp(320px, 65vh, 500px)' }}
              >
                <VipFrame active={false} className="w-full h-full absolute inset-0">
                <AvatarWithScene
                  avatarSrc={avatarSrc}
                  sceneId={bot.botSceneId}
                  className="w-full h-full"
                />
              </VipFrame>
              </div>
              {/* Avatar stars */}
              {(() => {
                const { star } = getAvatarStarProgress(bot.avatarShards || 0);
                if (star === 0) return null;
                return (
                  <div className="flex gap-[2px] justify-center mt-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className={`text-[10px] leading-none ${i < star ? 'text-yellow-400' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
                    ))}
                  </div>
                );
              })()}
              <div className="text-center mt-1">
                <div className="text-[10px] text-slate-600">
                  Level {bot.level} • {bot.type}
                </div>
              </div>
            </div>
          </div>

          {/* EQUIPPED LOADOUT - Full Width Below */}
          <div className="rounded-xl overflow-hidden border-2 border-slate-500/50">
            <LoadoutDisplay
              playerData={{ weaponUpgrades: bot.weaponUpgrades || {}, simpleUpgrades: bot.simpleUpgrades || {}, _resolvedLoadout: { weapon1, weapon2, weapon3, weapon4, power: power, pet, vehicle } }}
              loadout={equipped}
            />
          </div>
        </div>
      </DialogContent>
      {alliancePreview && (
        <AllianceViewModal
          alliance={alliancePreview}
          onClose={() => setAlliancePreview(null)}
          isInAlliance={false}
          onJoin={() => {}}
          joining={false}
        />
      )}
    </Dialog>
  );
}

function StatRow({ label, value, icon, iconUrl, useSkullIcon, large, highlight }) {
  const isSabotage = useSkullIcon;
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-900/50">
      <span className={`${isSabotage ? 'text-[9px]' : large ? 'text-[12px]' : 'text-[10px]'} font-bold ${highlight ? 'text-emerald-400' : 'text-slate-400'} uppercase tracking-wider flex items-center gap-1`}>
        {iconUrl ? <img src={iconUrl} alt="" className="w-4 h-4 object-cover rounded-sm" /> : useSkullIcon ? <Skull className="w-3 h-3 text-red-500" /> : icon && <span className={large ? 'text-sm' : 'text-xs'}>{icon}</span>}
        {label}
      </span>
      <span className={`${isSabotage ? 'text-[9px]' : large ? 'text-sm' : 'text-xs'} font-bold ${highlight ? 'text-emerald-300' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}