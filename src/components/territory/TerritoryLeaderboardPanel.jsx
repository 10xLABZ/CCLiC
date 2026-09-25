import React, { useState, useEffect } from 'react';
import { X, Crown, Loader2, Swords, Trophy, Skull, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { savePlayerData } from '../utils/playerStorage';
import TerritoryBattleModal from './TerritoryBattleModal';
import TerritoryMatchHistoryModal from './TerritoryMatchHistoryModal';
import { computeCombatStats } from '../tradewars/botGenerator';
import { WEAPONS } from '../store/catalogData';
import { getWeaponStarProgress } from '../weapons/weaponUpgradeSystem';
import { computeFullPlayerStats } from '@/lib/playerStatsHelper';
import { getAvatarUrl } from '../profile/AvatarPicker';
import VipFrame from '../vip/VipFrame';
import { kvGet, kvSet, kvRemove } from '@/lib/playerMemory';


const MO_HISTORY_DOT_KEY = 'mo_history_new_activity';
export const markMoHistoryNew = () => kvSet(MO_HISTORY_DOT_KEY, '1');
export const clearMoHistoryNew = () => kvRemove(MO_HISTORY_DOT_KEY);
export const hasMoHistoryNew = () => !!kvGet(MO_HISTORY_DOT_KEY);

const getSlotPayout = (slot) => {
  if (slot === 1) return 10;
  if (slot === 2) return 8;
  if (slot === 3) return 6;
  if (slot <= 9) return 5;
  if (slot <= 19) return 4;
  if (slot <= 29) return 3;
  if (slot <= 39) return 2;
  return 1;
};

const getSlotDailyPayout = (slot) => getSlotPayout(slot) * 24;

const getSlotColor = (slot) => {
  if (slot === 1) return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20';
  if (slot <= 3) return 'text-orange-400 border-orange-500/30 bg-orange-950/20';
  if (slot <= 10) return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
  if (slot <= 19) return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
  if (slot <= 29) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  return 'text-slate-400 border-slate-700 bg-slate-900/30';
};

export default function TerritoryLeaderboardPanel({ open, onClose, city, state, playerData }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [humanEnrichment, setHumanEnrichment] = useState({});
  const [fighting, setFighting] = useState(false);
  const [battleResult, setBattleResult] = useState(null);
  const [showBattleModal, setShowBattleModal] = useState(false);
  const [battleTargetSlot, setBattleTargetSlot] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasNewHistory, setHasNewHistory] = useState(false);
  const [viewingSlot, setViewingSlot] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => u && setAuthUserId(u.id)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setHasNewHistory(hasMoHistoryNew());
  }, [open]);

  const enrichHumanSlots = async (fetchedSlots) => {
    const humanSlots = fetchedSlots.filter(s => s.user_id && !s.user_id.startsWith('bot_') && !s.user_id.startsWith('nemesis_'));
    if (humanSlots.length === 0) return;

    // Fetch BOTH profile (for name/level/image) AND inventory (for loadout/upgrades to compute real stats)
    // This is the same approach as TradeWars humanToBot — never trust stale DB attack_value/defense_value
    const results = await Promise.all(
      humanSlots.map(async (slot) => {
        const [profiles, inventories] = await Promise.all([
          base44.entities.PlayerProfile.filter({ user_id: slot.user_id }),
          base44.entities.PlayerInventory.filter({ user_id: slot.user_id }),
        ]);
        const profile = profiles[0] || null;
        // If tag not on profile, look it up live from AllianceMember → Alliance
        let liveAllianceTag = profile?.alliance_tag || null;
        if (!liveAllianceTag && profile) {
          try {
            const memberships = await base44.entities.AllianceMember.filter({ user_id: slot.user_id });
            if (memberships.length > 0) {
              const alliances = await base44.entities.Alliance.filter({ id: memberships[0].alliance_id });
              if (alliances.length > 0 && alliances[0].tag) liveAllianceTag = alliances[0].tag;
            }
          } catch {}
        }
        return { slot, profile: profile ? { ...profile, alliance_tag: liveAllianceTag } : null, inv: inventories[0] || null };
      })
    );

    const enrichment = {};
    results.forEach(({ slot, profile, inv }) => {
      if (!profile) return;

      // Compute stats from real loadout + weapon upgrade stars (same as humanToBot in TradeWars)
      const loadout = inv?.loadout || {};
      const weaponUpgrades = inv?.weaponUpgrades || {};
      const cs = computeCombatStats({
        level: profile.level || 1,
        fundMembers: profile.fund_members_owned || 0,
        equippedLoadout: loadout,
      });
      let wAtkBonus = 0, wDefBonus = 0;
      ['weapon1', 'weapon2', 'weapon3'].forEach(wSlot => {
        const wId = loadout[wSlot];
        if (wId && typeof wId === 'string') {
          const wData = WEAPONS.find(w => w.id === wId);
          const spent = weaponUpgrades[wId] || 0;
          if (wData && spent > 0) {
            const { star, subTier } = getWeaponStarProgress(spent);
            const completedSubs = star * 5 + subTier;
            const bonusPct = (completedSubs * 0.4) / 100;
            wAtkBonus += (wData.atk || 0) * bonusPct;
            wDefBonus += (wData.def || 0) * bonusPct;
          }
        }
      });
      const atk = Math.round((cs.atk + wAtkBonus) * 100) / 100;
      const def = Math.round((cs.def + wDefBonus) * 100) / 100;
      const pwr = Math.round((atk + def) * 100) / 100;
      const fundPower = Math.round((cs.fundPower || 0) * 100) / 100;

      enrichment[slot.user_id] = {
        username: profile.username || slot.username,
        alliance_tag: profile.alliance_tag || null,
        player_level: profile.level || slot.player_level || 1,
        profile_image_url: profile.profile_image_url || slot.profile_image_url,
        atk, def, pwr, fundPower,
        vipActiveUntil: profile.vip_active_until || 0,
      };

      // Always patch TerritorySlot with latest name/level/power
      base44.entities.TerritorySlot.update(slot.id, {
        username: profile.username || slot.username,
        player_level: profile.level || slot.player_level,
        player_power: pwr,
        profile_image_url: profile.profile_image_url || slot.profile_image_url,
      }).catch(() => {});
    });
    setHumanEnrichment(enrichment);
  };

  const fetchSlots = () => {
    if (!city || !state) return;
    setLoading(true);
    base44.entities.TerritorySlot.filter({ building_id: 'mayors_office', city, state })
      .then(data => {
        // Deduplicate by slot_number: prefer nemesis > human > most recently updated bot
        const slotMap = new Map();
        const slotPriority = (s) => s.user_id?.startsWith('nemesis_') ? 2 : (!s.user_id?.startsWith('bot_') ? 1 : 0);
        data.forEach(slot => {
          const existing = slotMap.get(slot.slot_number);
          if (!existing) { slotMap.set(slot.slot_number, slot); return; }
          const sp = slotPriority(slot), ep = slotPriority(existing);
          if (sp > ep || (sp === ep && (slot.updated_date || '') > (existing.updated_date || ''))) {
            slotMap.set(slot.slot_number, slot);
          }
        });
        const sorted = Array.from(slotMap.values()).sort((a, b) => a.slot_number - b.slot_number);
        setSlots(sorted);
        enrichHumanSlots(sorted);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) fetchSlots();
  }, [open, city, state]);

  if (!open) return null;

  const mySlot = authUserId ? slots.find(s => s.user_id === authUserId) : null;
  const mySlotNumber = mySlot?.slot_number ?? null;

  const handleFight = (targetSlot) => {
    setBattleTargetSlot(targetSlot);
    setShowBattleModal(true);
  };

  const handleBattleComplete = (result) => {
    fetchSlots();
    markMoHistoryNew();
    setHasNewHistory(true);
    if (result.outcome === 'WIN') {
      setBattleResult(result);
    } else if (result.outcome === 'LOSS') {
      setBattleResult(result);
    }
  };

  // Slot #1 can fight down 3 slots to defend; others fight up to 3 slots above
  const canChallenge = (slotNum) => {
    if (mySlotNumber === null) return slotNum >= 48; // enter via slots 48-50
    if (mySlotNumber === 1) return slotNum > 1 && slotNum <= 4; // defend down 3
    return slotNum < mySlotNumber && slotNum >= mySlotNumber - 3;
  };

  const displaySlots = Array.from({ length: 50 }, (_, i) => {
    const num = i + 1;
    return slots.find(s => s.slot_number === num) || { slot_number: num, _empty: true };
  });

  return (
    <div className="fixed left-0 top-[200px] w-72 bg-[#0a0f1a] border-r-2 border-purple-900/40 z-40 flex flex-col" style={{ bottom: '80px' }}>
      {/* Header */}
      <div className="bg-[#0a0f1a] border-b border-purple-900/40 px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
            🏛️ Mayor's Office
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400 h-6 w-6 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-slate-500">{city}, {state} • Territory Control</div>
          <button
            onClick={() => {
              setShowHistory(true);
              clearMoHistoryNew();
              setHasNewHistory(false);
            }}
            className="relative flex items-center gap-1 bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/50 rounded px-2 py-0.5 text-purple-300 transition-colors"
            title="My Defense History"
          >
            <ClipboardList className="w-3 h-3" />
            <span className="text-[9px] font-semibold">HISTORY</span>
            {hasNewHistory && (
              <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-red-300 shadow-lg shadow-red-500/50" />
            )}
          </button>
        </div>

        {/* YOUR POSITION */}
        <div className={`rounded-lg px-3 py-2 border ${mySlot ? 'bg-purple-950/40 border-purple-600/50' : 'bg-slate-900/60 border-slate-700'}`}>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5 font-semibold">Your Position</div>
          {mySlot ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mySlot.slot_number === 1
                  ? <><Crown className="w-4 h-4 text-yellow-400" /><span className="text-sm font-black text-yellow-400">#1 — Mayor!</span></>
                  : <span className="text-lg font-black text-purple-300">#{mySlot.slot_number}</span>
                }
              </div>
              <div className="text-xs font-bold text-green-400">+${getSlotDailyPayout(mySlot.slot_number)}/day</div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">Not ranked — challenge slot #50 to enter</div>
          )}
        </div>

        {/* Entry challenge button for unranked players */}
        {!mySlot && (
          <Button
            onClick={() => {
              const targetSlot = slots.find(s => s.slot_number === 50) || { slot_number: 50, username: 'Open Slot', player_level: 1 };
              setBattleTargetSlot(targetSlot);
              setShowBattleModal(true);
            }}
            className="w-full bg-red-700 hover:bg-red-600 text-xs font-bold gap-1 py-1.5 mt-1"
          >
            <Swords className="w-3 h-3" />
            Challenge for Entry (Slot #50)
          </Button>
        )}
        {/* Battle result toast */}
        {battleResult && (
          <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
            battleResult.outcome === 'WIN' ? 'bg-emerald-950/60 border border-emerald-600 text-emerald-300' :
            battleResult.outcome === 'LOSS' ? 'bg-red-950/60 border border-red-700 text-red-300' :
            'bg-slate-900 border border-slate-700 text-slate-400'
          }`}>
            {battleResult.outcome === 'WIN' ? <Trophy className="w-3.5 h-3.5 shrink-0" /> : <Skull className="w-3.5 h-3.5 shrink-0" />}
            <span>{battleResult.message}</span>
            <button onClick={() => setBattleResult(null)} className="ml-auto text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        ) : (
          displaySlots.map(({ slot_number, user_id, username, profile_image_url, player_level, player_power, bot_wins, bot_losses, _empty, is_nemesis }) => {
            const isMe = authUserId && user_id === authUserId;
            const isEmpty = !!_empty;
            const isBot = !isEmpty && (user_id?.startsWith('bot_') || user_id?.startsWith('nemesis_'));
            const color = getSlotColor(slot_number);
            const totalWars = (bot_wins || 0) + (bot_losses || 0);
            const winRate = totalWars > 0 ? Math.round(((bot_wins || 0) / totalWars) * 100) : null;
            const canFight = !isEmpty && !isMe && canChallenge(slot_number);

            // For current user: ALWAYS use live playerData prop (never trust stale DB or server enrichment for own slot)
            let displayUsername, displayLevel, displayImage, displayAtk, displayDef, displayPwr, displayFundPower;
            if (isMe && playerData) {
              const liveStats = computeFullPlayerStats(playerData);
              displayUsername = playerData.username;
              const myAllianceTag = playerData.allianceTag || null;
              displayLevel = playerData.level;
              displayImage = profile_image_url;
              displayAtk = liveStats.atk;
              displayDef = liveStats.def;
              displayPwr = liveStats.pwr;
              displayFundPower = liveStats.fundPower ?? null;
            } else {
              // For other humans: use enriched data (fetched live from PlayerProfile + PlayerInventory)
              const enrich = !isBot && !isEmpty ? humanEnrichment[user_id] : null;
              displayUsername = enrich?.username || username;
              displayLevel = enrich?.player_level || player_level;
              displayImage = enrich?.profile_image_url || profile_image_url;
              displayAtk = enrich?.atk ?? null;
              displayDef = enrich?.def ?? null;
              displayPwr = enrich?.pwr ?? player_power ?? null;
              displayFundPower = enrich?.fundPower ?? null;
            }

            const slotAllianceTag = isMe
              ? (playerData?.allianceTag || null)
              : (!isBot && !isEmpty ? humanEnrichment[user_id]?.alliance_tag || null : null);

            const slotViewData = isEmpty ? null : {
              username: displayUsername,
              alliance_tag: slotAllianceTag,
              level: displayLevel,
              image: displayImage,
              atk: displayAtk,
              def: displayDef,
              pwr: displayPwr,
              fundPower: displayFundPower,
              isBot,
              slot_number,
            };

              return (
              <div
                key={slot_number}
                className={`border ${
                  slot_number === 1
                    ? 'rounded-xl px-2 py-2.5 border-2 ring-2 ring-yellow-400/30 shadow-lg shadow-yellow-900/20'
                    : 'rounded-lg px-2 py-1.5'
                } ${color} ${isMe ? 'ring-1 ring-purple-400' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`font-bold text-center shrink-0 ${slot_number <= 3 ? 'w-7 text-sm' : 'w-5 text-[10px]'}`}>
                    {slot_number === 1 ? '👑' : slot_number === 2 ? '🥈' : slot_number === 3 ? '🥉' : `#${slot_number}`}
                  </div>

                  {isEmpty ? (
                    <div className="flex-1 text-[10px] text-slate-700 italic">— Open —</div>
                  ) : (
                    <>
                      {(() => {
                        const isNemesisSlot = !isEmpty && user_id?.startsWith('nemesis_');
                        const isBotSlot = !isEmpty && user_id?.startsWith('bot_');
                        const humanVipUntil = isMe
                          ? (playerData?.vipActiveUntil || playerData?.vip_active_until || 0)
                          : (humanEnrichment[user_id]?.vipActiveUntil || 0);
                        const isSlotVip = isNemesisSlot ||
                          (isBotSlot && (Math.abs((user_id||'').split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)) % 100 < 15)) ||
                          (!isBotSlot && !isNemesisSlot && !isEmpty && humanVipUntil > Date.now());
                        return (
                          <VipFrame active={isSlotVip} className="w-6 h-6 shrink-0">
                            <button
                              className="w-6 h-6 rounded overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer hover:ring-1 hover:ring-purple-400 transition-all"
                              onClick={() => slotViewData && setViewingSlot(slotViewData)}
                              title="View profile"
                            >
                              {displayImage
                                ? <img src={displayImage} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[8px]">👤</div>
                              }
                            </button>
                          </VipFrame>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-semibold truncate ${isMe ? 'text-purple-300' : 'text-slate-200'}`}>
                          {isMe && playerData?.allianceTag
                            ? <><span className="text-amber-400 font-bold">[{playerData.allianceTag}]</span> </>
                            : (!isMe && !isBot && !isEmpty && humanEnrichment[user_id]?.alliance_tag
                              ? <><span className="text-amber-400 font-bold">[{humanEnrichment[user_id].alliance_tag}]</span> </>
                              : null)
                          }
                          {isMe ? (playerData?.username || username) : (humanEnrichment[user_id]?.username || username)}{isMe ? ' (you)' : ''}
                        </div>
                        <div className="text-[8px] text-slate-600">
                          Lv{displayLevel}{winRate !== null ? ` • ${winRate}%W` : ''}
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-green-400 shrink-0">
                        +${getSlotDailyPayout(slot_number)}/day
                      </div>
                      {canFight && (
                        <button
                          onClick={() => handleFight({ slot_number, user_id, username: displayUsername, profile_image_url: displayImage, player_level: displayLevel, atk: displayAtk, def: displayDef, pwr: displayPwr })}
                          className="shrink-0 bg-red-700 hover:bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-0.5 ml-1"
                        >
                          <Swords className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {/* Combat stats row for human players */}
                {!isEmpty && !isBot && (displayAtk !== null || displayPwr !== null) && (
                  <div className="flex gap-x-2 mt-1 ml-7 text-[9px] flex-wrap">
                    {displayAtk !== null && <span className="text-red-400">⚔️{displayAtk.toFixed(1)}</span>}
                    {displayDef !== null && <span className="text-blue-400">🛡️{displayDef.toFixed(1)}</span>}
                    {displayPwr !== null && <span className="text-emerald-400">TP {displayPwr.toFixed(1)}</span>}
                  </div>
                )}
                {/* For bots, show simple power */}
                {!isEmpty && isBot && player_power != null && (
                  <div className="flex gap-x-2 mt-1 ml-7 text-[9px]">
                    <span className="text-emerald-400">TP {player_power.toFixed(1)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Profile Popout */}
      {viewingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setViewingSlot(null)}>
          <div
            className="bg-[#0a0f1a] border border-purple-700/60 rounded-xl p-4 w-64 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-purple-300">#{viewingSlot.slot_number} — Player Info</div>
              <button onClick={() => setViewingSlot(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                {viewingSlot.image
                  ? <img src={viewingSlot.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                }
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  {viewingSlot.alliance_tag && (
                    <span className="text-amber-400 font-bold">[{viewingSlot.alliance_tag}] </span>
                  )}
                  {viewingSlot.username}
                </div>
                <div className="text-xs text-slate-500">Level {viewingSlot.level}</div>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 space-y-1">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Combat Strength</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">⚔️ ATK</span>
                <span className="text-red-400 font-bold">{viewingSlot.atk?.toFixed(2) ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">🛡️ DEF</span>
                <span className="text-blue-400 font-bold">{viewingSlot.def?.toFixed(2) ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-slate-800 pt-1">
                <span className="text-slate-400">💥 TP</span>
                <span className="text-emerald-400 font-bold">{viewingSlot.pwr?.toFixed(2) ?? '—'}</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-600 text-center mt-2">
              💰 +${getSlotDailyPayout(viewingSlot.slot_number)}/day payout
            </div>
          </div>
        </div>
      )}

      {showBattleModal && battleTargetSlot && (
        <TerritoryBattleModal
          open={showBattleModal}
          onClose={() => { setShowBattleModal(false); setBattleTargetSlot(null); }}
          playerData={playerData}
          targetSlot={battleTargetSlot}
          mySlotNumber={mySlotNumber}
          buildingId="mayors_office"
          city={city}
          state={state}
          buildingName="Mayor's Office"
          onBattleComplete={handleBattleComplete}
        />
      )}

      <TerritoryMatchHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        city={city}
        state={state}
        buildingName="Mayor's Office"
        slots={slots}
        mySlotNumber={mySlotNumber}
      />
    </div>
  );
}