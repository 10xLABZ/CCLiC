import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getWeaponStarProgress,
  getWeaponMaxStarByPlayerLevel,
  getWeaponUpgradeBonus,
  getPartsOwned,
  getWeaponPartsSpent,
  spendPartsOnWeapon,
  WEAPON_STAR_UNLOCK_LEVELS,
  SUBS_PER_STAR,
  getSubCost,
  ARCHETYPE_CONFIG,
  RARITY_UPGRADE_BONUS_PER_SUB,
  WEAPON_STAR_COSTS,
} from "./weaponUpgradeSystem";
import { getPlayerData, updateLoadout } from "../utils/playerStorage";
import { saveWeaponUpgrade, applyServerReward } from "@/lib/playerServerSync";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";
import { GEAR_PART_ICON_URL } from "@/components/shared/shardIcons";

// ─── Quick Upgrade Confirmation Modal ────────────────────────────────────────
function WeaponQuickConfirmModal({ open, onClose, weapon, playerData, fromStar, toStar, fromSubTier, toSubTier, totalCost, isShards, onConfirm, isSaving }) {
  if (!open || !weapon) return null;

  const owned = isShards
    ? (playerData?.consumables?.GEAR_SHARD || 0)
    : getPartsOwned(playerData);
  const remaining = owned - totalCost;
  const canAfford = owned >= totalCost;
  const currencyLabel = isShards ? 'Shards' : 'Parts';

  const renderStars = (filled) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < filled ? "text-yellow-400" : "text-slate-700"}`}>
          {i < filled ? "★" : "☆"}
        </span>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="bg-[#060d18] border border-orange-700/50 text-white max-w-sm z-[200]">
        {isSaving && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
              <span className="text-xs text-slate-300">Upgrading…</span>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="text-orange-300 text-sm">Confirm Upgrade — {weapon.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* Current */}
          <div className="space-y-1">
            <div className="text-slate-400 uppercase tracking-wider text-[10px]">Current — ★{fromStar} (Sub {fromSubTier}/{SUBS_PER_STAR})</div>
            {renderStars(fromStar)}
            <div className="text-slate-500 text-[10px]">Bonus: +{getWeaponUpgradeBonus(getWeaponPartsSpent(playerData, weapon.id), weapon.rarity)}%</div>
          </div>

          <div className="text-orange-400 text-center text-lg font-bold">↓</div>

          {/* Target */}
          <div className="space-y-1">
            <div className="text-orange-300 uppercase tracking-wider text-[10px] font-bold">After Upgrade — ★{toStar} (Sub {toSubTier}/{SUBS_PER_STAR})</div>
            {renderStars(toStar)}
          </div>

          {/* Cost breakdown */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">YOU HAVE</span>
              <span className="text-orange-300 font-bold">{owned} {currencyLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">THIS UPGRADE</span>
              <span className="text-red-400 font-bold">−{totalCost} {currencyLabel}</span>
            </div>
            <div className="border-t border-slate-700/40 pt-1 flex justify-between">
              <span className="text-slate-400">REMAINING</span>
              <span className={canAfford ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>{remaining} {currencyLabel}</span>
            </div>
          </div>

          {!canAfford && (
            <div className="text-red-400 text-[10px] bg-red-900/20 border border-red-800/40 rounded p-2 text-center">
              Not enough {currencyLabel} for this upgrade.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs border-slate-600 text-black" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-xs"
              disabled={!canAfford || isSaving}
              onClick={onConfirm}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : `Confirm — ${totalCost} ${currencyLabel}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function WeaponUpgradeModal({ open, onClose, weapon, onUpgraded }) {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [msg, setMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [quickConfirm, setQuickConfirm] = useState(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  if (!weapon) return null;

  const isFirearm = weapon.id?.startsWith('F');
  const weaponSlots = isFirearm ? ['weapon1', 'weapon2'] : ['weapon3', 'weapon4'];
  const equippedInSlot = weaponSlots.find(s => playerData.loadout?.[s] === weapon.id);
  const firstEmptySlot = weaponSlots.find(s => !playerData.loadout?.[s]);
  const isLevelLocked = weapon.equipLevel && (playerData.level || 1) < weapon.equipLevel;

  const handleEquip = () => {
    if (equippedInSlot) { toast.info("Already equipped!"); return; }
    if (isLevelLocked) { toast.error(`Requires Level ${weapon.equipLevel} to equip!`); return; }
    if (!firstEmptySlot) { toast.error("All slots occupied. Unequip a weapon first."); return; }
    updateLoadout(firstEmptySlot, weapon.id);
    setPlayerData(getPlayerData());
    toast.success(`${weapon.name} equipped!`);
  };

  const totalSpent = getWeaponPartsSpent(playerData, weapon.id);
  const { star, subTier, starProgress, starPartsNeeded } = getWeaponStarProgress(totalSpent);
  const partsOwned = getPartsOwned(playerData);
  const playerMaxStar = getWeaponMaxStarByPlayerLevel(playerData.level || 1);
  const rarityPerSub = RARITY_UPGRADE_BONUS_PER_SUB[weapon.rarity] || RARITY_UPGRADE_BONUS_PER_SUB.common;
  const bonusPct = getWeaponUpgradeBonus(totalSpent, weapon.rarity);
  const maxParts = WEAPON_STAR_COSTS.reduce((a, b) => a + b, 0);
  const maxBonusPct = getWeaponUpgradeBonus(maxParts, weapon.rarity);
  const barPct = starPartsNeeded > 0 ? Math.min(100, (starProgress / starPartsNeeded) * 100) : 0;

  const atCapOrMax = star >= playerMaxStar && star < 10;
  const subCost = star < 10 ? getSubCost(star + 1) : 0;

  const doSpendParts = async (extraParts) => {
    // Simulate spending extraParts by calling spendPartsOnWeapon repeatedly
    let currentPlayer = getPlayerData();
    let lastResult = null;
    let partsLeft = extraParts;

    while (partsLeft > 0 && currentPlayer) {
      const nextSubCost = (() => {
        const spent = getWeaponPartsSpent(currentPlayer, weapon.id);
        const { star: s } = getWeaponStarProgress(spent);
        return s < 10 ? getSubCost(s + 1) : 0;
      })();
      if (!nextSubCost || nextSubCost > partsLeft) break;
      const r = spendPartsOnWeapon(currentPlayer, weapon.id, nextSubCost);
      if (!r.success) break;
      lastResult = r;
      currentPlayer = r.updatedPlayer;
      partsLeft -= nextSubCost;
    }

    if (!lastResult) return false;
    await saveWeaponUpgrade(weapon.id, lastResult.updatedPlayer.weaponUpgrades[weapon.id], lastResult.updatedPlayer.consumables.GEAR_SHARD || 0);
    // FvF tracking — each parts shard spent counts toward the day's goal
    const fvfType = weapon.id?.startsWith('F') ? 'firearm_shard' : 'accessory_shard';
    const totalSpent = extraParts - partsLeft;
    if (totalSpent > 0) {
      applyServerReward({ fvf_actions: [{ type: fvfType, count: totalSpent }] }).catch(() => {});
    }
    setPlayerData(getPlayerData());
    onUpgraded?.();
    return true;
  };

  const handleSpend = async () => {
    setMsg("");
    const result = spendPartsOnWeapon(playerData, weapon.id, subCost);
    if (!result.success) { setMsg(result.message); return; }
    setIsSaving(true);
    try {
      await saveWeaponUpgrade(weapon.id, result.updatedPlayer.weaponUpgrades[weapon.id], result.updatedPlayer.consumables.GEAR_SHARD || 0);
      // FvF tracking
      const fvfType = weapon.id?.startsWith('F') ? 'firearm_shard' : 'accessory_shard';
      applyServerReward({ fvf_actions: [{ type: fvfType, count: subCost }] }).catch(() => {});
      setPlayerData(getPlayerData());
      setMsg("Upgraded!");
      onUpgraded?.();
    } catch (err) {
      setMsg("Save failed — try again");
    } finally {
      setIsSaving(false);
    }
    setTimeout(() => setMsg(""), 2000);
  };

  // Calculate cost for upgrading exactly 1 sub-tier
  const oneSubInfo = (() => {
    if (star >= 10 || atCapOrMax) return null;
    return { cost: subCost, fromStar: star, toStar: star, fromSub: subTier, toSub: subTier + 1 <= SUBS_PER_STAR ? subTier + 1 : 1, toStarFinal: subTier + 1 > SUBS_PER_STAR ? star + 1 : star };
  })();

  // Calculate max affordable upgrade using all available parts
  const maxStarInfo = (() => {
    if (star >= 10 || atCapOrMax) return null;
    const partsAvail = getPartsOwned(playerData);
    let s = star;
    let sub = subTier;
    let totalCost = 0;
    while (s < playerMaxStar && s < 10) {
      const cost = getSubCost(s + 1);
      if (totalCost + cost > partsAvail) break;
      totalCost += cost;
      sub++;
      if (sub >= SUBS_PER_STAR) { sub = 0; s++; }
    }
    if (totalCost === 0) return null;
    return { totalCost, toStar: s, toSubTier: sub, fromStar: star, fromSubTier: subTier };
  })();

  const nextStarLevel = WEAPON_STAR_UNLOCK_LEVELS[star] || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#0a0f1a] border border-orange-800/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-2">
              <img src={GEAR_PART_ICON_URL} alt="" className="w-5 h-5 object-contain inline-block" /> Upgrade Weapon
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-semibold text-slate-200">{weapon.name}</div>
              {weapon.rarityLabel && (
                <span className={`text-[9px] font-bold ${weapon.rarityColor}`}>[{weapon.rarityLabel}]</span>
              )}
              {weapon.weaponArchetype && ARCHETYPE_CONFIG[weapon.weaponArchetype] && (
                <span className={`text-[9px] font-semibold ${ARCHETYPE_CONFIG[weapon.weaponArchetype].color}`}>
                  {ARCHETYPE_CONFIG[weapon.weaponArchetype].icon} {weapon.weaponArchetype}
                </span>
              )}
            </div>
            {weapon.weaponArchetype && ARCHETYPE_CONFIG[weapon.weaponArchetype] && (
              <div className={`text-[10px] px-2 py-1 rounded border ${ARCHETYPE_CONFIG[weapon.weaponArchetype].bg} ${ARCHETYPE_CONFIG[weapon.weaponArchetype].border} ${ARCHETYPE_CONFIG[weapon.weaponArchetype].color}`}>
                {ARCHETYPE_CONFIG[weapon.weaponArchetype].description}
              </div>
            )}

            {/* Stars */}
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`text-base ${i < star ? "text-yellow-400" : "text-slate-700"}`}>
                  {i < star ? "★" : "☆"}
                </span>
              ))}
            </div>

            {star < 10 && (
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Star {star + 1} progress: {subTier}/{SUBS_PER_STAR} upgrades</span>
                  <span>{starProgress}/{starPartsNeeded} parts</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-orange-500 transition-all" style={{ width: `${barPct}%` }} />
                </div>
              </div>
            )}
            {star >= 10 && (
              <div className="text-yellow-400 font-bold text-sm">★ MAX STAR REACHED</div>
            )}

            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1"><img src={GEAR_PART_ICON_URL} alt="" className="w-3.5 h-3.5 object-contain inline-block" /> Parts owned:</span>
              <span className={partsOwned >= subCost ? "text-orange-300 font-bold" : "text-red-400 font-bold"}>
                {partsOwned}
              </span>
            </div>

            {!atCapOrMax && star < 10 && (
              <div className="text-xs text-slate-500">
                Cost per upgrade: <span className="text-orange-400 font-semibold">{subCost} parts</span>
              </div>
            )}

            <div className="text-xs text-emerald-400">
              Upgrade Bonus: +{bonusPct}%
            </div>

            {/* Max stats preview */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 space-y-1">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Max Stats (★10 — {maxParts} Parts)</div>
              <div className="flex justify-between text-xs">
                <span className="text-red-400">ATK</span>
                <span className="text-slate-300">
                  <span className="text-slate-500">{(weapon.atk || 0).toFixed(1)}</span>
                  {' → '}
                  <span className="text-yellow-400 font-bold">{((weapon.atk || 0) * (1 + maxBonusPct / 100)).toFixed(1)}</span>
                  <span className="text-emerald-400 text-[9px]"> (+{maxBonusPct}%)</span>
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">DEF</span>
                <span className="text-slate-300">
                  <span className="text-slate-500">{(weapon.def || 0).toFixed(1)}</span>
                  {' → '}
                  <span className="text-yellow-400 font-bold">{((weapon.def || 0) * (1 + maxBonusPct / 100)).toFixed(1)}</span>
                  <span className="text-emerald-400 text-[9px]"> (+{maxBonusPct}%)</span>
                </span>
              </div>
              {weapon.igcBonus && (
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-400">IGC</span>
                  <span className="text-slate-300">
                    <span className="text-slate-500">{weapon.igcBonus}%</span>
                    {' → '}
                    <span className="text-yellow-400 font-bold">{(weapon.igcBonus * (1 + maxBonusPct / 100)).toFixed(1)}%</span>
                    <span className="text-emerald-400 text-[9px]"> (+{maxBonusPct}%)</span>
                  </span>
                </div>
              )}
            </div>
            {star < 10 && !atCapOrMax && (
              <div className="bg-orange-900/20 border border-orange-700/40 rounded-lg px-3 py-2 text-center">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Next Sub-Tier Upgrade</div>
                <div className="text-sm font-bold text-orange-300 mt-0.5">
                  {((star * 5 + subTier + 1) * rarityPerSub).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">bonus after next upgrade</div>
              </div>
            )}

            {atCapOrMax && nextStarLevel && (
              <div className="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-800/40 rounded p-2">
                🔒 Locked: Reach Lv. {nextStarLevel} to unlock next star.
              </div>
            )}

            {msg && (
              <div className={`text-xs rounded p-2 ${msg === "Upgraded!" ? "text-green-400 bg-green-900/20 border border-green-800/40" : "text-red-400 bg-red-900/20 border border-red-800/40"}`}>
                {msg}
              </div>
            )}

            {/* Main upgrade + equip */}
            <div className="flex gap-2 pt-1">
              {star >= 10 ? (
                <Button className="flex-1 text-xs" disabled variant="outline">MAX</Button>
              ) : atCapOrMax ? (
                <Button className="flex-1 text-xs" disabled variant="outline">Locked — Level Up First</Button>
              ) : (
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-xs"
                  disabled={partsOwned < subCost || isSaving}
                  onClick={handleSpend}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="flex items-center gap-1"><img src={GEAR_PART_ICON_URL} alt="" className="w-3.5 h-3.5 object-contain inline-block" /> Spend {subCost} Parts</span>}
                </Button>
              )}
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs"
                disabled={!!equippedInSlot || isLevelLocked || (!firstEmptySlot && !equippedInSlot)}
                onClick={handleEquip}
              >
                <Shield className="w-3 h-3" />
                {equippedInSlot ? "Equipped" : "Equip"}
              </Button>
            </div>

            {/* Quick-access upgrade buttons */}
            {!atCapOrMax && star < 10 && (
              <div className="flex gap-2">
                {oneSubInfo && (
                  <Button
                    size="sm"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 border border-orange-700/40 text-[10px] text-orange-300"
                    disabled={isSaving || partsOwned < oneSubInfo.cost}
                    onClick={() => setQuickConfirm({
                      fromStar: star, toStar: oneSubInfo.toStarFinal,
                      fromSubTier: subTier,
                      toSubTier: oneSubInfo.toStarFinal > star ? 1 : subTier + 1,
                      totalCost: oneSubInfo.cost,
                    })}
                  >
                    ⬆ +1 Sub-Tier<br />
                    <span className="text-slate-400">{oneSubInfo.cost} Parts</span>
                  </Button>
                )}
                {maxStarInfo && maxStarInfo.totalCost > subCost && (
                  <Button
                    size="sm"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 border border-yellow-600/40 text-[10px] text-yellow-300"
                    disabled={isSaving || partsOwned < maxStarInfo.totalCost}
                    onClick={() => setQuickConfirm(maxStarInfo)}
                  >
                    ★ Max Upgrade<br />
                    <span className="text-slate-400">{maxStarInfo.totalCost} Parts</span>
                  </Button>
                )}
              </div>
            )}

            {partsOwned < subCost && !atCapOrMax && (
              <Link to={`${createPageUrl("ShopPage")}?tab=consumables&sub=parts`}>
                <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-600 text-xs flex items-center justify-center gap-1.5">
                  <img src={GEAR_PART_ICON_URL} alt="" className="w-4 h-4 object-contain inline-block" /> Get Parts
                </Button>
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {quickConfirm && (
        <WeaponQuickConfirmModal
          open={!!quickConfirm}
          onClose={() => setQuickConfirm(null)}
          weapon={weapon}
          playerData={playerData}
          fromStar={quickConfirm.fromStar}
          toStar={quickConfirm.toStar}
          fromSubTier={quickConfirm.fromSubTier}
          toSubTier={quickConfirm.toSubTier}
          totalCost={quickConfirm.totalCost}
          isShards={false}
          onConfirm={async () => {
            setIsQuickSaving(true);
            try {
              await doSpendParts(quickConfirm.totalCost);
              setQuickConfirm(null);
              setMsg("Upgraded!");
            } catch (err) {
              setMsg("Upgrade failed — try again");
            } finally {
              setIsQuickSaving(false);
            }
            setTimeout(() => setMsg(""), 2000);
          }}
          isSaving={isQuickSaving}
        />
      )}
    </>
  );
}