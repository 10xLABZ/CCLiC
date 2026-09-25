import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Swords, Crown, Loader2, ClipboardList } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import BuildingProfileModal from './BuildingProfileModal';
import VipFrame from '../vip/VipFrame';
import TerritoryBattleModal from './TerritoryBattleModal';
import TerritoryMatchHistoryModal from './TerritoryMatchHistoryModal';
import { computeCombatStats } from '../tradewars/botGenerator';
import { WEAPONS } from '../store/catalogData';
import { getWeaponStarProgress } from '../weapons/weaponUpgradeSystem';
import { computeFullPlayerStats } from '@/lib/playerStatsHelper';

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

const getSlotColor = (slot) => {
  if (slot === 1) return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20';
  if (slot <= 3) return 'text-orange-400 border-orange-500/30 bg-orange-950/20';
  if (slot <= 10) return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
  if (slot <= 19) return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
  if (slot <= 29) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  return 'text-slate-400 border-slate-700 bg-slate-900/30';
};

export default function BuildingModal({ building, buildingImage, city, state, isUSA, open, onClose, playerData, onOpenTerritoryControl }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [viewingSlot, setViewingSlot] = useState(null);
  const [showBattle, setShowBattle] = useState(false);
  const [overrideTargetSlot, setOverrideTargetSlot] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [humanEnrichment, setHumanEnrichment] = useState({});

  // Fetch live PlayerProfile + PlayerInventory for all human slots sequentially to avoid rate limits
  const enrichHumanSlots = useCallback(async (fetchedSlots) => {
    const humanSlots = fetchedSlots.filter(s => s.user_id && !s.user_id.startsWith('bot_') && !s.user_id.startsWith('nemesis_') && !s.user_id.startsWith('gen_'));
    if (humanSlots.length === 0) return;

    const enrichment = {};
    for (const slot of humanSlots) {
      const [profiles, inventories] = await Promise.all([
        base44.entities.PlayerProfile.filter({ user_id: slot.user_id }),
        base44.entities.PlayerInventory.filter({ user_id: slot.user_id }),
      ]);
      const profile = profiles[0] || null;
      const inv = inventories[0] || null;
      if (!profile) continue;

      let atk, def;
      const hasRealStats = profile.attack_value > 10 || profile.defense_value > 10;
      if (hasRealStats) {
        atk = Math.round(profile.attack_value * 100) / 100;
        def = Math.round(profile.defense_value * 100) / 100;
      } else {
        const loadout = inv?.loadout || {};
        const weaponUpgrades = inv?.weaponUpgrades || {};
        const cs = computeCombatStats({ level: profile.level || 1, fundMembers: profile.fund_members_owned || 0, equippedLoadout: loadout });
        let wAtkBonus = 0, wDefBonus = 0;
        ['weapon1', 'weapon2', 'weapon3'].forEach(wSlot => {
          const wId = loadout[wSlot];
          if (wId && typeof wId === 'string') {
            const wData = WEAPONS.find(w => w.id === wId);
            const spent = weaponUpgrades[wId] || 0;
            if (wData && spent > 0) {
              const { star, subTier } = getWeaponStarProgress(spent);
              const bonusPct = ((star * 5 + subTier) * 0.4) / 100;
              wAtkBonus += (wData.atk || 0) * bonusPct;
              wDefBonus += (wData.def || 0) * bonusPct;
            }
          }
        });
        atk = Math.round((cs.atk + wAtkBonus) * 100) / 100;
        def = Math.round((cs.def + wDefBonus) * 100) / 100;
      }

      const pwr = Math.round((atk + def) * 100) / 100;
      const fundMembers = profile.fund_members_owned || 0;
      const fundPower = Math.round((fundMembers * (0.20 + (profile.level || 1) * 0.02)) * 100) / 100;
      enrichment[slot.user_id] = {
        username: profile.username || slot.username,
        player_level: profile.level || slot.player_level || 1,
        profile_image_url: profile.profile_image_url || slot.profile_image_url,
        atk, def, pwr, fundPower,
        vipActiveUntil: profile.vip_active_until || 0,
      };
      base44.entities.TerritorySlot.update(slot.id, {
        username: profile.username || slot.username,
        player_level: profile.level || slot.player_level,
        player_power: pwr,
        profile_image_url: profile.profile_image_url || slot.profile_image_url,
      }).catch(() => {});

      await new Promise(r => setTimeout(r, 150));
    }
    setHumanEnrichment(enrichment);
  }, []);

  // Get authenticated user ID once on open
  useEffect(() => {
    if (open && !authUserId) {
      base44.auth.me().then(u => u && setAuthUserId(u.id)).catch(() => {});
    }
    if (!open) {
      setViewingSlot(null);
      setShowBattle(false);
    }
  }, [open]);

  const fetchSlots = useCallback(async () => {
    if (!building?.id || !city || !state) return;
    setLoading(true);
    try {
      const data = await base44.entities.TerritorySlot.filter({ building_id: building.id, city, state });
      // Deduplicate by slot_number: prefer human > nemesis > most recently updated bot
      // Human players must always take priority so they appear on their own leaderboard
      const slotMap = new Map();
      const slotPriority = (s) => (!s.user_id?.startsWith('bot_') && !s.user_id?.startsWith('nemesis_') ? 2 : s.user_id?.startsWith('nemesis_') ? 1 : 0);
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
    } catch {
      toast.error('Failed to load leaderboard');
    }
    setLoading(false);
  }, [building?.id, city, state, enrichHumanSlots]);

  useEffect(() => {
    if (open) fetchSlots();
  }, [open, fetchSlots]);

  const mySlot = authUserId ? slots.find(s => s.user_id === authUserId) : null;
  const mySlotNumber = mySlot?.slot_number ?? null;

  // Attackable range: up to 3 slots above, or slots 48-50 if not in building
  const isAttackable = (slotNum) => {
    if (mySlotNumber === 1) return false;
    if (mySlotNumber === null) return slotNum >= 48;
    return slotNum < mySlotNumber && slotNum >= mySlotNumber - 3;
  };

  // Primary challenge button still targets the slot directly above (or 50 if new)
  const targetSlotNumber = mySlotNumber === null ? 50 : mySlotNumber - 1;
  const targetSlot = slots.find(s => s.slot_number === targetSlotNumber) || null;

  const mayorImg = isUSA
    ? 'https://media.base44.com/images/public/699169456a354d6cb7082777/657118277_MayorsOfficeUSA.png'
    : 'https://media.base44.com/images/public/699169456a354d6cb7082777/81ab163d0_MayorsOfficeGlobal.png';
  const headerImage = building?.id === 'mayors_office' ? mayorImg : buildingImage;

  const challengeButtonLabel = () => {
    if (mySlotNumber === 1) return '👑 Defending #1 — Uncontested';
    if (!targetSlot) return 'Challenge for Entry';
    if (mySlotNumber === null) return `Challenge ${targetSlot.username} for Entry`;
    return `⚔️ Challenge ${targetSlot.username} for Slot #${targetSlotNumber}`;
  };

  const handleBattleComplete = async (result) => {
    await fetchSlots();
    if (result.outcome === 'WIN') {
      toast.success(`Moved to Slot #${result.slot}!`);
    }
  };

  // Build display: all 50 slots, fill with data or "empty" placeholder
  const displaySlots = Array.from({ length: 50 }, (_, i) => {
    const num = i + 1;
    return slots.find(s => s.slot_number === num) || { slot_number: num, _empty: true };
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#060a12] border border-emerald-900/40 text-white max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <img src={headerImage} alt={building?.name} className="w-14 h-14 object-contain" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-emerald-400 text-lg">{building?.name}</DialogTitle>
                  <div className="flex items-center gap-1.5 mr-6">
                    {onOpenTerritoryControl && (
                      <button
                        onClick={onOpenTerritoryControl}
                        className="flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-700/50 rounded px-2 py-0.5 text-emerald-300 transition-colors"
                      >
                        <span className="text-[9px] font-semibold">🏛️ TERRITORY CTRL</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowHistory(true)}
                      className="flex items-center gap-1 bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/50 rounded px-2 py-0.5 text-purple-300 transition-colors"
                    >
                      <ClipboardList className="w-3 h-3" />
                      <span className="text-[9px] font-semibold">HISTORY</span>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{city}, {state} • 50 Control Slots</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" style={{boxShadow:'0 0 6px rgba(34,197,94,0.8)'}} />
                  <span className="text-[10px] font-bold text-green-400">LIVE</span>
                </div>
              </div>
            </div>

            {/* My position banner */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Your position:{' '}
                <span className={mySlotNumber ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                  {mySlotNumber ? `Slot #${mySlotNumber}` : 'Not in building'}
                </span>
              </div>
              {mySlotNumber && (
                <div className="text-xs text-green-400 font-semibold">
                  💵 +${getSlotPayout(mySlotNumber) * 24}/Day
                </div>
              )}
            </div>

            {/* Challenge button */}
            <Button
              onClick={() => { if (mySlotNumber !== 1) setShowBattle(true); }}
              disabled={mySlotNumber === 1 || !targetSlot}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-bold gap-1 text-xs py-2"
            >
              <Swords className="w-3 h-3 shrink-0" />
              <span className="truncate">{challengeButtonLabel()}</span>
              {mySlotNumber !== 1 && <span className="opacity-70 shrink-0">⚡5</span>}
            </Button>

          </DialogHeader>

          {/* Leaderboard */}
          <div className="overflow-y-auto flex-1 mt-2 space-y-1 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : (
              displaySlots.map(({ slot_number, user_id, username, profile_image_url, player_level, player_power, atk, def, bot_wins, bot_losses, _empty, is_nemesis, id: slotId }) => {
                const isMe = authUserId && user_id === authUserId;
                const isEmpty = !!_empty;
                const isBot = !isEmpty && (user_id?.startsWith('bot_') || user_id?.startsWith('nemesis_'));
                const color = getSlotColor(slot_number);
                const totalWars = (bot_wins || 0) + (bot_losses || 0);
                const winRate = totalWars > 0 ? Math.round(((bot_wins || 0) / totalWars) * 100) : null;

                // Resolve display data: own slot uses live playerData, others use enrichment from PlayerProfile
                let displayUsername, displayLevel, displayImage, displayAtk, displayDef, displayPwr, displayFundPower;
                if (isMe && playerData) {
                  const liveStats = computeFullPlayerStats(playerData);
                  displayUsername = playerData.username;
                  displayLevel = playerData.level;
                  displayImage = profile_image_url;
                  displayAtk = liveStats.atk;
                  displayDef = liveStats.def;
                  displayPwr = liveStats.pwr;
                  displayFundPower = liveStats.fundPower ?? null;
                } else if (!isBot && !isEmpty) {
                  const enrich = humanEnrichment[user_id];
                  displayUsername = enrich?.username || username;
                  displayLevel = enrich?.player_level || player_level;
                  displayImage = enrich?.profile_image_url || profile_image_url;
                  displayAtk = enrich?.atk ?? atk ?? null;
                  displayDef = enrich?.def ?? def ?? null;
                  displayPwr = enrich?.pwr ?? player_power ?? null;
                  displayFundPower = enrich?.fundPower ?? null;
                } else {
                  displayUsername = username;
                  displayLevel = player_level;
                  displayImage = profile_image_url;
                  // Use stored atk/def from seeding; fall back to deriving from player_power
                  displayAtk = (typeof atk === 'number' && atk > 0) ? atk : null;
                  displayDef = (typeof def === 'number' && def > 0) ? def : null;
                  displayPwr = player_power;
                }

                return (
                  <div
                    key={slot_number}
                    className={`w-full border rounded-lg ${color} ${isMe ? 'ring-1 ring-emerald-400' : ''}`}
                  >
                    {isMe && (
                      <div className="text-[9px] text-red-400 font-bold text-center py-0.5 border-b border-red-700/30 tracking-wide">
                        ⚠️ YOUR CURRENT SLOT ⚠️
                      </div>
                    )}
                    {slot_number === 1 && !isMe && (
                      <div className="text-[9px] text-yellow-400 font-bold text-center py-0.5 border-b border-yellow-700/30 tracking-wide">
                        👑 TERRITORY LEADER 👑
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-2 py-1.5">
                    {isEmpty ? (
                      <div className="flex-1 text-[10px] text-slate-700 italic">— Open —</div>
                    ) : (
                      <>
                        <div className="text-[10px] font-bold shrink-0 w-7 text-center">
                          {slot_number === 1 ? '👑' : slot_number === 2 ? '🥈' : slot_number === 3 ? '🥉' : `#${slot_number}`}
                        </div>
                        {(() => {
                          const isNemesisSlot = !isEmpty && user_id?.startsWith('nemesis_');
                          const isBotRegularSlot = !isEmpty && user_id?.startsWith('bot_');
                          const humanVipUntil = isMe
                            ? (playerData?.vipActiveUntil || 0)
                            : (humanEnrichment[user_id]?.vipActiveUntil || 0);
                          const isSlotVip = isNemesisSlot ||
                            (isBotRegularSlot && (Math.abs((user_id||'').split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)) % 100 < 15)) ||
                            (!isBot && humanVipUntil > Date.now());
                          return (
                            <VipFrame active={isSlotVip} className="w-6 h-6 shrink-0">
                              <button
                                onClick={() => setViewingSlot({ slot_number, user_id, is_nemesis, username: displayUsername, profile_image_url: displayImage, player_level: displayLevel, player_power: displayPwr, atk: displayAtk, def: displayDef, pwr: displayPwr, fundPower: displayFundPower, bot_wins, bot_losses, vipActiveUntil: isMe ? (playerData?.vipActiveUntil || 0) : (humanEnrichment[user_id]?.vipActiveUntil || 0) })}
                                className="w-6 h-6 rounded overflow-hidden bg-slate-800 border border-slate-700 hover:brightness-110"
                              >
                                {displayImage ? (
                                  <img src={displayImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px]">👤</div>
                                )}
                              </button>
                            </VipFrame>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-semibold truncate ${isMe ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {displayUsername}{isMe && ' (you)'}
                          </div>
                          {(() => {
                            const showAtk = displayAtk ?? (displayPwr != null ? Math.round(displayPwr * 0.55 * 10) / 10 : null);
                            const showDef = displayDef ?? (displayPwr != null ? Math.round(displayPwr * 0.45 * 10) / 10 : null);
                            return (
                              <div className="flex items-center gap-1.5 text-[9px] mt-0.5 flex-wrap">
                                <span className="text-slate-500">Lv{displayLevel}</span>
                                {showAtk != null && <span className="text-red-400">⚔️{showAtk.toFixed(1)}</span>}
                                {showDef != null && <span className="text-blue-400">🛡️{showDef.toFixed(1)}</span>}
                                {displayPwr != null && <span className="text-emerald-400">TP {displayPwr.toFixed(1)}</span>}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="text-[9px] font-bold text-green-400 shrink-0">
                          +${getSlotPayout(slot_number) * 24}/Day
                        </div>
                        {isAttackable(slot_number) && !isMe && (
                          <button
                            onClick={() => {
                              setShowBattle(true);
                              setOverrideTargetSlot({ slot_number, user_id, username: displayUsername, profile_image_url: displayImage, player_level: displayLevel, player_power: displayPwr, atk: displayAtk, def: displayDef, pwr: displayPwr });
                            }}
                            className="shrink-0 bg-red-700 hover:bg-red-600 rounded px-1.5 py-0.5"
                            title={`Attack slot #${slot_number}`}
                          >
                            <Swords className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </>
                    )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile viewer (no fight button) */}
      <BuildingProfileModal
        slot={viewingSlot}
        open={!!viewingSlot}
        onClose={() => setViewingSlot(null)}
        buildingName={building?.name}
      />

      <TerritoryMatchHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        city={city}
        state={state}
        buildingName={building?.name}
        buildingId={building?.id}
      />

      {/* Territory battle modal */}
      {showBattle && (
        <TerritoryBattleModal
          open={showBattle}
          onClose={() => { setShowBattle(false); setOverrideTargetSlot(null); }}
          playerData={playerData}
          targetSlot={overrideTargetSlot || targetSlot}
          mySlotNumber={mySlotNumber}
          buildingId={building?.id}
          city={city}
          state={state}
          buildingName={building?.name}
          onBattleComplete={handleBattleComplete}
        />
      )}
    </>
  );
}