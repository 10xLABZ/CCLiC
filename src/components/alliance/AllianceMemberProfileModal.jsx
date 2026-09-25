// Read-only profile viewer for alliance members — reads ATK/DEF/TP directly from PlayerProfile (no recalc)
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, MessageCircle, Sword, TrendingUp, Shield, Skull } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { WEAPONS, VEHICLES, PEOPLE, PETS, FIREARMS } from "../store/catalogData";
import AvatarWithScene from "../avatar/AvatarWithScene";
import { getAvatarUrl } from "../profile/AvatarPicker";
import { getThemeById } from "../store/themesData";
import { getWeaponStarProgress } from "../weapons/weaponUpgradeSystem";
import { getAvatarStarProgress } from "../avatar/avatarAbilities";
import { getPlayerData, savePlayerData } from "../utils/playerStorage";
import LoadoutDisplay from "../profile/LoadoutDisplay";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import HQPreviewModal from "@/components/hq/HQPreviewModal";
import { FAST_FIVE_GOAL_ICONS } from "@/components/events/eventStorage";

const TRADES_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/3152921ec_tradeimage1.jpg";

export default function AllianceMemberProfileModal({ member, open, onClose, onDM, currentUserId, isOwnAlliance = true }) {
  const [profile, setProfile] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [travelConfirm, setTravelConfirm] = useState(null);
  const [hqPreviewOpen, setHqPreviewOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !member?.user_id) return;
    setLoading(true);
    setProfile(null);
    setInventory(null);
    Promise.all([
      base44.entities.PlayerProfile.filter({ user_id: member.user_id }),
      base44.entities.PlayerInventory.filter({ user_id: member.user_id }),
    ]).then(([profiles, inventories]) => {
      setProfile(profiles[0] || null);
      setInventory(inventories[0] || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, member?.user_id]);

  const handleConfirmTravel = () => {
    if (!travelConfirm) return;
    const pd = getPlayerData();
    if ((pd.cash || 0) < travelConfirm.cost) { toast.error("Not enough cash to travel!"); setTravelConfirm(null); return; }
    savePlayerData({ cash: Math.max(0, (pd.cash || 0) - travelConfirm.cost), locationCity: travelConfirm.city, locationState: travelConfirm.state });
    setTravelConfirm(null);
    onClose();
    navigate(createPageUrl("OpsPage"));
    toast.success(`Traveled to ${travelConfirm.city}, ${travelConfirm.state}!`);
  };

  if (!open || !member) return null;

  const getItemById = (category, itemId) => {
    if (!itemId || typeof itemId === 'object') return null;
    const catalogMap = { firearms: FIREARMS, weapons: WEAPONS, vehicles: VEHICLES, people: PEOPLE, pets: PETS };
    return catalogMap[category]?.find(item => item.id === itemId) || null;
  };
  const getLoadoutItem = (itemId) => {
    if (!itemId || typeof itemId !== 'string') return null;
    return itemId.startsWith('F') ? getItemById('firearms', itemId) : getItemById('weapons', itemId);
  };

  const equipped = inventory?.loadout || {};
  const weaponUpgrades = inventory?.weaponUpgrades || {};
  const avatarUpgrades = inventory?.avatarUpgrades || {};

  const weapon1 = getLoadoutItem(equipped.weapon1);
  const weapon2 = getLoadoutItem(equipped.weapon2);
  const weapon3 = getLoadoutItem(equipped.weapon3);
  const weapon4 = getLoadoutItem(equipped.weapon4);
  const vehicle = getItemById('vehicles', equipped.vehicle);
  const power = getItemById('people', equipped.power);
  const pet = getItemById('pets', equipped.pet);

  // ── READ stats directly from PlayerProfile — same as trade wars reads bot.atk / bot.def ──
  // No recalculation. These are the authoritative server-saved values.
  // Fund contributions are now integrated directly into ATK and DEF.
  const atkVal = profile?.attack_value || 0;
  const defVal = profile?.defense_value || 0;
  const tpVal = atkVal + defVal;

  const hqMembers = profile?.fund_members_owned || 0;

  const lifetimeStats = {
    jobs: profile?.total_jobs_completed || 0,
    assists: profile?.total_assists || 0,
    sabotages: profile?.total_sabotages || 0,
    trades: profile?.total_trades_completed || 0,
    wins: profile?.total_trade_war_wins || 0,
    losses: profile?.total_trade_war_losses || 0,
  };
  const totalWars = lifetimeStats.wins + lifetimeStats.losses;
  const warWinRate = totalWars > 0 ? ((lifetimeStats.wins / totalWars) * 100).toFixed(1) : "0.0";

  const equippedAvatarId = profile?.equipped_avatar_id;
  const avatarSrc = equippedAvatarId ? getAvatarUrl(equippedAvatarId)
    : (profile?.profile_image_url || member.profile_image_url || null);
  const sceneId = profile?.equipped_scene_id || null;
  const themeId = profile?.equipped_theme_id || 'theme_001_rusty_hotness';
  const botTheme = getThemeById(themeId);

  const avatarShards = equippedAvatarId ? (avatarUpgrades[equippedAvatarId] || 0) : 0;
  const { star: avatarStar } = getAvatarStarProgress(avatarShards);

  const displayLevel = profile?.level || member.level || 1;
  const displayUsername = profile?.username || member.username || 'Unknown';
  const displayRole = member.role || 'member';
  const isMe = member.user_id === currentUserId;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative bg-[#0a0f1a] border border-emerald-900/40 text-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl z-10 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header bar — always visible */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-[#0a0f1a] border-b border-slate-800 shrink-0">
          <span className="text-sm font-bold text-amber-400 truncate">{member.username}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1.5 transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Loading profile...</div>
        ) : (
          <div className="p-4">
            {/* Theme username box + HQ plate */}
            <div className="mb-4 rounded-xl overflow-hidden flex" style={{ minHeight: '60px' }}>
              <div style={{
                width: '74%',
                backgroundImage: `url(${botTheme?.usernameImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/1cb4bea85_Theme_001_UsernameBox-RustyHotness.jpg'})`,
                backgroundSize: '100% 100%', backgroundPosition: 'center',
              }}>
                <div className="text-center py-3 px-4">
                  <div className="font-bold text-slate-200 flex items-center justify-center gap-2 flex-wrap" style={{ fontSize: 'clamp(11px, 3vw, 18px)' }}>
                    {displayUsername}
                    {isMe && <span className="text-[10px] text-amber-500">(You)</span>}
                  </div>
                  <div className="text-xs text-amber-400 capitalize">{displayRole}</div>
                </div>
              </div>
              <button
                onClick={() => setHqPreviewOpen(true)}
                className="flex items-end justify-center shrink-0 cursor-pointer hover:brightness-110 transition-all"
                style={{
                  width: '26%',
                  backgroundImage: `url(https://media.base44.com/images/public/699169456a354d6cb7082777/d4aa11341_hq-pf-plate1.png)`,
                  backgroundSize: '100% 100%', backgroundPosition: 'center', paddingBottom: '6px',
                }}
              >
                <div className="text-center w-full" style={{ fontSize: '15px', fontWeight: 'bold', color: '#c084fc', textShadow: '0 0 8px #a855f7, 0 0 18px #7c3aed', lineHeight: 1 }}>
                  {hqMembers}
                </div>
              </button>
            </div>

            <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
              {/* LEFT COLUMN */}
              <div className="space-y-2">
                {/* Strength — values read directly from PlayerProfile, no recalc */}
                <div className="border border-emerald-900/30 rounded-xl p-2.5 relative overflow-hidden" style={{
                  backgroundImage: `url(${botTheme?.strengthImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/604225359_Theme_001_StrengthBox_RustyHotness.jpg'})`,
                  backgroundSize: '100% 100%', backgroundPosition: 'center'
                }}>
                  <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10">
                    <Sword className="w-3 h-3" /> Strength
                  </h3>
                  <div className="space-y-1 relative z-10">
                    <StatRow label="ATK" value={atkVal.toFixed(2)} icon="⚔️" large />
                    <StatRow label="DEF" value={defVal.toFixed(2)} icon="🛡️" large />
                    <div className="border-b border-slate-600/60 mx-4 my-1" />
                    <StatRow label="TP" value={tpVal.toFixed(2)} icon="💥" large highlight />
                  </div>
                </div>

                {/* Performance */}
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
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1"><span>⚔️</span> Trade Wars</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600">W/L:</span>
                          <span className="text-slate-300 font-semibold">{lifetimeStats.wins}/{lifetimeStats.losses}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600">W%:</span>
                          <span className="text-slate-300 font-semibold">{warWinRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {!isMe && onDM && (
                    <Button size="sm" onClick={() => { onClose(); onDM(member); }} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold text-xs h-8">
                      <MessageCircle className="w-4 h-4 mr-2" /> Send DM
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose} className="w-full border-slate-800 text-slate-400 hover:bg-slate-900/50 text-xs h-8">
                    Close
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN - Avatar */}
              <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-2">
                <div className="w-full rounded-xl overflow-hidden" style={{ height: 'clamp(320px, 65vh, 500px)' }}>
                  <AvatarWithScene avatarSrc={avatarSrc} sceneId={sceneId} className="w-full h-full" />
                </div>
                {avatarStar > 0 && (
                  <div className="flex gap-[2px] justify-center mt-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className={`text-[10px] leading-none ${i < avatarStar ? 'text-yellow-400' : 'text-slate-700'}`}>{i < avatarStar ? '★' : '☆'}</span>
                    ))}
                  </div>
                )}
                <div className="text-center mt-1">
                  <div className="text-[10px] text-slate-600">Level {displayLevel}</div>
                </div>
              </div>
            </div>

            {/* Loadout */}
            <div className="rounded-xl overflow-hidden border-2 border-slate-500/50">
              <LoadoutDisplay
                playerData={{ weaponUpgrades, _resolvedLoadout: { weapon1, weapon2, weapon3, weapon4, power: power, pet, vehicle } }}
                loadout={equipped}
              />
            </div>
          </div>
        )}

        <HQPreviewModal
          open={hqPreviewOpen}
          onClose={() => setHqPreviewOpen(false)}
          level={hqMembers}
          username={displayUsername}
        />

        {travelConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="bg-[#0a0f1a] border border-amber-700/40 rounded-2xl p-5 max-w-xs w-full shadow-2xl">
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">✈️</div>
                <div className="text-sm font-bold text-amber-400">Confirm Travel</div>
                <div className="text-xs text-slate-400 mt-1">Travel to {travelConfirm.city}, {travelConfirm.state}?</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-4 text-center">
                <div className="text-xs text-slate-500">Travel Fee</div>
                <div className="text-base font-bold text-amber-400">💵 ${travelConfirm.cost.toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTravelConfirm(null)} className="flex-1 border-slate-700 text-slate-400 text-xs h-8">Cancel</Button>
                <Button onClick={handleConfirmTravel} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs h-8">CONFIRM</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, icon, iconUrl, useSkullIcon, large, highlight }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-900/50">
      <span className={`${large ? 'text-[12px]' : 'text-[10px]'} font-bold ${highlight ? 'text-emerald-400' : 'text-slate-400'} uppercase tracking-wider flex items-center gap-1`}>
        {iconUrl ? <img src={iconUrl} alt="" className="w-4 h-4 object-cover rounded-sm" /> : useSkullIcon ? <Skull className="w-3 h-3 text-red-500" /> : icon && <span className={large ? 'text-sm' : 'text-xs'}>{icon}</span>}
        {label}
      </span>
      <span className={`${large ? 'text-sm' : 'text-xs'} font-bold ${highlight ? 'text-emerald-300' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}