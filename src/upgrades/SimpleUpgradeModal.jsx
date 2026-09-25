import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getUpgradeLevel,
  getMaxUpgradeByPlayerLevel,
  getUpgradeCost,
  getUpgradeBonusPct,
  getNextUnlockLevel,
  validateUpgrade,
  MAX_UPGRADE_LEVEL,
  UPGRADE_CRYD_COSTS,
  UPGRADE_UNLOCK_LEVELS,
} from "./simpleUpgradeSystem";
import { getPlayerData, saveLoadoutSlot } from "../utils/playerStorage";
import { saveSimpleUpgrade, applyServerReward } from "@/lib/playerServerSync";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

const CATEGORY_LABELS = {
  vehicles: 'Vehicle',
  power: 'Person of Power',
  pets: 'Pet',
};

const CATEGORY_SLOT_MAP = {
  vehicles: 'vehicle',
  power: 'power',
  pets: 'pet',
};

const fireConfetti = () => {
  const count = 60;
  const defaults = { origin: { y: 0.5 }, zIndex: 9999 };
  confetti({ ...defaults, particleCount: count, spread: 70, colors: ['#22d3ee', '#a78bfa', '#fbbf24', '#34d399'] });
  setTimeout(() => confetti({ ...defaults, particleCount: 30, angle: 60, spread: 55, origin: { x: 0 } }), 150);
  setTimeout(() => confetti({ ...defaults, particleCount: 30, angle: 120, spread: 55, origin: { x: 1 } }), 150);
};

// Calculate the total CRYD cost and target level for a bulk upgrade
const calcBulkUpgrade = (playerData, itemId, targetLevel) => {
  const currentLevel = getUpgradeLevel(playerData, itemId);
  const playerLevel = playerData?.level || 1;
  const maxAllowed = getMaxUpgradeByPlayerLevel(playerLevel);
  const clampedTarget = Math.min(targetLevel, maxAllowed, MAX_UPGRADE_LEVEL);
  if (clampedTarget <= currentLevel) return null;

  let totalCost = 0;
  for (let lv = currentLevel; lv < clampedTarget; lv++) {
    totalCost += UPGRADE_CRYD_COSTS[lv] || 0;
  }
  return { fromLevel: currentLevel, toLevel: clampedTarget, totalCost };
};

// Returns target level for "1 star up" — the next upgrade level grouping (each level is 1 "star")
const calcOneStarTarget = (currentLevel) => Math.min(currentLevel + 1, MAX_UPGRADE_LEVEL);

// Calculate the maximum affordable upgrade using all available CRYD
const calcMaxAffordable = (playerData, itemId) => {
  const currentLevel = getUpgradeLevel(playerData, itemId);
  const playerLevel = playerData?.level || 1;
  const maxAllowed = getMaxUpgradeByPlayerLevel(playerLevel);
  const currentCryd = playerData?.crypto || 0;

  let totalCost = 0;
  let targetLevel = currentLevel;
  for (let lv = currentLevel; lv < maxAllowed && lv < MAX_UPGRADE_LEVEL; lv++) {
    const cost = UPGRADE_CRYD_COSTS[lv] || 0;
    if (totalCost + cost > currentCryd) break;
    totalCost += cost;
    targetLevel = lv + 1;
  }
  if (targetLevel <= currentLevel) return null;
  return { fromLevel: currentLevel, toLevel: targetLevel, totalCost };
};

// ─── Quick Upgrade Confirmation Modal ────────────────────────────────────────
function QuickUpgradeConfirmModal({ open, onClose, item, playerData, fromLevel, toLevel, totalCost, onConfirm, isSaving }) {
  if (!open || !item) return null;

  const currentCryd = playerData?.crypto || 0;
  const remaining = currentCryd - totalCost;
  const canAfford = currentCryd >= totalCost;

  const renderStars = (filled, total = MAX_UPGRADE_LEVEL) => (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`flex-1 h-2 rounded-sm ${i < filled ? 'bg-cyan-500' : 'bg-slate-800'}`} />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="bg-[#060d18] border border-cyan-700/50 text-white max-w-sm z-[200]">
        {isSaving && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-300">Upgrading…</span>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="text-cyan-300 text-sm">Confirm Upgrade — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* Current → Target */}
          <div className="space-y-1">
            <div className="text-slate-400 uppercase tracking-wider text-[10px]">Current — Lv. {fromLevel}</div>
            {renderStars(fromLevel)}
            <div className="text-slate-500 text-[10px]">Bonus: +{getUpgradeBonusPct(fromLevel)}% ATK & DEF</div>
          </div>

          <div className="text-cyan-400 text-center text-lg font-bold">↓</div>

          <div className="space-y-1">
            <div className="text-cyan-300 uppercase tracking-wider text-[10px] font-bold">After Upgrade — Lv. {toLevel}</div>
            {renderStars(toLevel)}
            <div className="text-cyan-400 text-[10px] font-semibold">Bonus: +{getUpgradeBonusPct(toLevel)}% ATK & DEF</div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">YOU HAVE</span>
              <span className="text-cyan-300 font-bold">{currentCryd} CRYD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">THIS UPGRADE</span>
              <span className="text-red-400 font-bold">−{totalCost} CRYD</span>
            </div>
            <div className="border-t border-slate-700/40 pt-1 flex justify-between">
              <span className="text-slate-400">REMAINING</span>
              <span className={canAfford ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>{remaining} CRYD</span>
            </div>
          </div>

          {!canAfford && (
            <div className="text-red-400 text-[10px] bg-red-900/20 border border-red-800/40 rounded p-2 text-center">
              Not enough CRYD for this upgrade.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs border-slate-600 text-black" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-xs"
              disabled={!canAfford || isSaving}
              onClick={onConfirm}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : `Confirm — ${totalCost} CRYD`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function SimpleUpgradeModal({ open, onClose, item, category, onUpgraded }) {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [msg, setMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  const [quickConfirm, setQuickConfirm] = useState(null); // { fromLevel, toLevel, totalCost }
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  if (!item) return null;

  const catLabel = CATEGORY_LABELS[category] || 'Item';
  const slot = CATEGORY_SLOT_MAP[category];
  const isEquipped = playerData.loadout?.[slot] === item.id;
  const isLevelLocked = item.requiredLevel && (playerData.level || 1) < item.requiredLevel;

  const currentLevel = getUpgradeLevel(playerData, item.id);
  const maxAllowed = getMaxUpgradeByPlayerLevel(playerData.level || 1);
  const bonusPct = getUpgradeBonusPct(currentLevel);
  const cost = getUpgradeCost(currentLevel);
  const nextUnlock = getNextUnlockLevel(currentLevel);
  const atMax = currentLevel >= MAX_UPGRADE_LEVEL;
  const lockedByLevel = currentLevel >= maxAllowed && !atMax;
  const canAfford = (playerData.crypto || 0) >= cost;

  const handleEquip = async () => {
    if (isEquipped) { toast.info("Already equipped!"); return; }
    if (isLevelLocked) { toast.error(`Requires Level ${item.requiredLevel} to equip!`); return; }
    setIsEquipping(true);
    try {
      await saveLoadoutSlot(slot, item.id);
      setPlayerData(getPlayerData());
      toast.success(`${item.name} equipped!`);
    } catch (err) {
      toast.error("Equip failed — try again");
    } finally {
      setIsEquipping(false);
    }
  };

  const doUpgradeLevels = async (fromLevel, toLevel, totalCost) => {
    await applyServerReward({ crypto_delta: -totalCost, reason: 'simple_upgrade' });
    await saveSimpleUpgrade(item.id, toLevel);
    setPlayerData(getPlayerData());
    fireConfetti();
    onUpgraded?.();
  };

  const handleUpgrade = async () => {
    setMsg("");
    const validation = validateUpgrade(playerData, item.id);
    if (!validation.canUpgrade) { setMsg(validation.reason); return; }
    setIsSaving(true);
    try {
      await doUpgradeLevels(currentLevel, validation.newLevel, validation.cost);
      setMsg(`Upgraded to Level ${validation.newLevel}!`);
    } catch (err) {
      setMsg("Upgrade failed — try again");
    } finally {
      setIsSaving(false);
    }
    setTimeout(() => setMsg(""), 2500);
  };

  const handleQuickUpgradeClick = (targetLevel) => {
    const info = calcBulkUpgrade(playerData, item.id, targetLevel);
    if (!info) return;
    setQuickConfirm(info);
  };

  const handleQuickConfirm = async () => {
    if (!quickConfirm) return;
    setIsQuickSaving(true);
    try {
      await doUpgradeLevels(quickConfirm.fromLevel, quickConfirm.toLevel, quickConfirm.totalCost);
      setQuickConfirm(null);
      setMsg(`Upgraded to Level ${quickConfirm.toLevel}!`);
    } catch (err) {
      setMsg("Upgrade failed — try again");
    } finally {
      setIsQuickSaving(false);
    }
    setTimeout(() => setMsg(""), 2500);
  };

  const oneStarInfo = !atMax && !lockedByLevel ? calcBulkUpgrade(playerData, item.id, calcOneStarTarget(currentLevel)) : null;
  const maxInfo = !atMax && !lockedByLevel ? calcMaxAffordable(playerData, item.id) : null;

  const isBlocked = isSaving || isEquipping;

  return (
    <>
      <Dialog open={open} onOpenChange={isBlocked ? undefined : onClose}>
        <DialogContent className="bg-[#0a0f1a] border border-cyan-800/40 text-white max-w-sm">
          {isBlocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-xs text-slate-300">{isSaving ? "Saving upgrade..." : "Equipping..."}</span>
              </div>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              ⬆ Upgrade {catLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-200">{item.name}</div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400">+{item.atk} ATK</span>
              <span className="text-emerald-400">+{item.def} DEF</span>
              {bonusPct > 0 && <span className="text-white font-bold">+{bonusPct}%</span>}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Upgrade Level</span>
              <span className="text-sm font-bold text-cyan-300">Lv. {currentLevel} / {MAX_UPGRADE_LEVEL}</span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-sm ${i < currentLevel ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              ))}
            </div>

            <div className="bg-cyan-900/20 border border-cyan-700/40 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Current Bonus</span>
              <span className="text-sm font-bold text-cyan-300">+{bonusPct}% ATK & DEF</span>
            </div>

            {!atMax && (
              <div className="bg-slate-900/50 border border-slate-700/40 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Next: Lv. {currentLevel + 1}</span>
                  <span className="text-sm font-bold text-white">+{getUpgradeBonusPct(currentLevel + 1)}%</span>
                </div>
              </div>
            )}

            {lockedByLevel && nextUnlock && (
              <div className="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-800/40 rounded p-2">
                🔒 Locked: Reach Lv. {nextUnlock} to upgrade further.
              </div>
            )}

            {atMax && (
              <div className="text-yellow-400 font-bold text-sm text-center">★ MAX LEVEL REACHED</div>
            )}

            {msg && (
              <div className={`text-xs rounded p-2 ${msg.includes('Upgraded') ? "text-green-400 bg-green-900/20 border border-green-800/40" : "text-red-400 bg-red-900/20 border border-red-800/40"}`}>
                {msg}
              </div>
            )}

            {!atMax && !lockedByLevel && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">CRYD:</span>
                <span className={canAfford ? "text-cyan-300 font-bold" : "text-red-400 font-bold"}>
                  {playerData.crypto || 0}
                </span>
              </div>
            )}

            {/* Main upgrade + equip */}
            <div className="flex gap-2 pt-1">
              {atMax ? (
                <Button className="flex-1 text-xs" disabled variant="outline">MAX</Button>
              ) : lockedByLevel ? (
                <Button className="flex-1 text-xs" disabled variant="outline">Locked — Level Up First</Button>
              ) : (
                <Button
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-xs"
                  disabled={!canAfford || isBlocked}
                  onClick={handleUpgrade}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : `⬆ Upgrade — ${cost} CRYD`}
                </Button>
              )}
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs"
                disabled={isEquipped || isLevelLocked || isBlocked}
                onClick={handleEquip}
              >
                {isEquipping ? <Loader2 className="w-3 h-3 animate-spin" /> : isEquipped ? "Equipped" : "Equip"}
              </Button>
            </div>

            {/* Quick-access upgrade buttons */}
            {!atMax && !lockedByLevel && (
              <div className="flex gap-2">
                {oneStarInfo && oneStarInfo.toLevel > currentLevel && (
                  <Button
                    size="sm"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 border border-cyan-700/40 text-[10px] text-cyan-300"
                    disabled={isBlocked}
                    onClick={() => handleQuickUpgradeClick(calcOneStarTarget(currentLevel))}
                  >
                    ⬆ +1 Level<br />
                    <span className="text-slate-400">{oneStarInfo.totalCost} CRYD</span>
                  </Button>
                )}
                {maxInfo && maxInfo.toLevel > currentLevel + 1 && (
                  <Button
                    size="sm"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 border border-yellow-600/40 text-[10px] text-yellow-300"
                    disabled={isBlocked}
                    onClick={() => setQuickConfirm(maxInfo)}
                  >
                    ★ MAX Upgrade<br />
                    <span className="text-slate-400">{maxInfo.totalCost} CRYD</span>
                  </Button>
                )}
              </div>
            )}

            {!atMax && !lockedByLevel && !canAfford && (
              <Link to={`${createPageUrl("ShopPage")}?tab=vip`}>
                <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-600 text-xs">
                  💎 Get CRYD
                </Button>
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <QuickUpgradeConfirmModal
        open={!!quickConfirm}
        onClose={() => setQuickConfirm(null)}
        item={item}
        playerData={playerData}
        fromLevel={quickConfirm?.fromLevel ?? 0}
        toLevel={quickConfirm?.toLevel ?? 0}
        totalCost={quickConfirm?.totalCost ?? 0}
        onConfirm={handleQuickConfirm}
        isSaving={isQuickSaving}
      />
    </>
  );
}