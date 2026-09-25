import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { savePlayerData } from "../utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import {
  AVATAR_ABILITIES,
  STAR_SHARD_REQUIREMENTS,
  SUBS_PER_STAR,
  getShardPerSub,
  getAvatarStarProgress,
  getMaxStarForLevel,
  getLevelRequiredForStar,
} from "./avatarAbilities";
import { AVATAR_SHARD_ICON_URL } from "@/components/shared/shardIcons";

function StarRow({ star, maxStar }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {Array.from({ length: 10 }).map((_, i) => {
        const filled = i < star;
        const locked = i >= maxStar;
        return (
          <span
            key={i}
            className={`text-[16px] ${filled ? "text-yellow-400" : locked ? "text-slate-800" : "text-slate-600"}`}
            title={locked ? `Locked (need Lv${getLevelRequiredForStar(i)})` : undefined}
          >
            {filled ? "★" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

export default function AvatarUpgradeModule({ avatarId, playerData, onUpdate }) {
  const [modalOpen, setModalOpen] = useState(false);

  const ability = AVATAR_ABILITIES[avatarId];
  const avatarUpgrades = playerData.avatarUpgrades || {};
  const totalShardsSpent = avatarUpgrades[avatarId] || 0;
  const { star, subTier, subProgress, subShardsNeeded, starProgress, starShardsNeeded } = getAvatarStarProgress(totalShardsSpent);
  const ownedShards = (playerData.consumables || {})["AVATAR_SHARD"] || 0;
  const maxStar = getMaxStarForLevel(playerData.level || 1);

  const completedSubs = star * SUBS_PER_STAR + subTier;
  const bonusPct = (completedSubs * 0.2).toFixed(1);

  const isMaxed = star >= 10;
  const isCapLocked = star >= maxStar && !isMaxed;
  const nextStarLevelRequired = getLevelRequiredForStar(maxStar + 1);

  const handleUpgrade = async (shardsToSpend) => {
    // Calculate what star we'd reach after spending
    const newTotal = totalShardsSpent + shardsToSpend;
    const newProgress = getAvatarStarProgress(newTotal);
    if (newProgress.star > maxStar) {
      toast.error(`Reach Level ${nextStarLevelRequired} to unlock ⭐${maxStar + 1}!`);
      return;
    }
    if (ownedShards < shardsToSpend) {
      toast.error("Not enough shards!");
      return;
    }
    const newConsumables = { ...(playerData.consumables || {}), AVATAR_SHARD: ownedShards - shardsToSpend };
    const newAvatarUpgrades = { ...avatarUpgrades, [avatarId]: newTotal };
    const updated = savePlayerData({ consumables: newConsumables, avatarUpgrades: newAvatarUpgrades });
    onUpdate?.(updated);
    toast.success(`Avatar upgraded! +${shardsToSpend} shards spent`);
    setModalOpen(false);
    // FvF tracking — avatar shards spent count toward the day's goal
    applyServerReward({ fvf_actions: [{ type: 'avatar_shard', count: shardsToSpend }] }).catch(() => {});
  };

  if (!ability) return null;

  // Progress bar: shards into current star / total needed for that star
  const barPct = starShardsNeeded > 0 ? Math.min(100, (starProgress / starShardsNeeded) * 100) : 0;

  return (
    <div className="mt-1.5 space-y-1">
      {/* Stars */}
      <StarRow star={star} maxStar={maxStar} />

      {/* Progress bar + Upgrade button */}
      {!isMaxed && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] text-white flex items-center gap-0.5"><img src={AVATAR_SHARD_ICON_URL} alt="" className="w-3 h-3 object-contain inline-block" /> {starProgress}/{starShardsNeeded} <span className="text-slate-400">shards</span></span>
              <span className="text-[8px] text-white">{subTier}/{SUBS_PER_STAR} <span className="text-slate-400">tiers</span></span>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="shrink-0 bg-yellow-500/10 border border-yellow-600/50 text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-yellow-500/20 transition-colors uppercase tracking-wider"
          >
            UPGRADE
          </button>
        </div>
      )}

      {isMaxed && (
        <div className="text-center text-[9px] text-yellow-400 font-bold">★ MAX LEVEL ★</div>
      )}

      {/* Ability stats - no label, just stats */}
      <div className="text-center">
        <div className="flex justify-center gap-2 text-[10px] font-bold text-white">
          {ability.stats.map((s, i) => (
            <span key={i}>{s}{bonusPct > 0 ? ` (${bonusPct}%)` : ""}</span>
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0a0f1a] border border-yellow-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-1.5"><img src={AVATAR_SHARD_ICON_URL} alt="" className="w-5 h-5 object-contain inline-block" /> Avatar Upgrade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current status */}
            <div className="bg-slate-900/60 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Shards owned:</span>
                <span className="text-yellow-400 font-bold">{ownedShards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Star level:</span>
                <span className="text-slate-200 font-bold">{star} / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max star (your level):</span>
                <span className="text-emerald-400 font-bold">⭐{maxStar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-tier:</span>
                <span className="text-slate-200">{subTier} / {SUBS_PER_STAR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost per sub-upgrade:</span>
                <span className="text-yellow-300 font-bold">{subShardsNeeded} shards</span>
              </div>
            </div>

            {/* Next sub-tier bonus preview */}
            {!isMaxed && !isCapLocked && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-center">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Next Sub-Tier Upgrade</div>
                <div className="text-sm font-bold text-yellow-300 mt-0.5">
                  {((completedSubs + 1) * 0.2).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">bonus after next upgrade</div>
              </div>
            )}

            {/* Cap lock warning */}
            {isCapLocked && (
              <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-400 font-bold">⭐{maxStar} is your current max!</div>
                <div className="text-[10px] text-slate-400 mt-1">Reach Level {nextStarLevelRequired} to unlock ⭐{maxStar + 1}</div>
              </div>
            )}

            {/* Spend increments */}
            {!isCapLocked && ownedShards >= subShardsNeeded ? (
              <>
                <div className="text-xs text-slate-500 text-center">Select how many sub-upgrades to perform:</div>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((mult) => {
                    const cost = subShardsNeeded * mult;
                    const canAfford = ownedShards >= cost;
                    // Check if spending this would exceed the star cap
                    const newTotalCheck = totalShardsSpent + cost;
                    const projectedStar = getAvatarStarProgress(newTotalCheck).star;
                    const wouldExceedCap = projectedStar > maxStar;
                    const disabled = !canAfford || wouldExceedCap;
                    return (
                      <button
                        key={mult}
                        disabled={disabled}
                        onClick={() => handleUpgrade(cost)}
                        title={wouldExceedCap ? `Would exceed ⭐${maxStar} cap` : undefined}
                        className={`py-2 rounded-lg border text-[10px] font-bold transition-colors
                          ${!disabled
                            ? "border-yellow-600/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                            : "border-slate-800 bg-slate-900/50 text-slate-700 cursor-not-allowed"
                          }`}
                      >
                        x{mult}
                        <div className="text-[8px] font-normal opacity-70 flex items-center justify-center gap-0.5">{cost}<img src={AVATAR_SHARD_ICON_URL} alt="" className="w-3 h-3 object-contain inline-block" /></div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : !isCapLocked ? (
              <div className="text-center space-y-3">
                <div className="text-xs text-red-400">Not enough shards. Need {subShardsNeeded}, have {ownedShards}.</div>
                <Link to={`${createPageUrl("ShopPage")}?tab=consumables&sub=shards`}>
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-1.5">
                    <img src={AVATAR_SHARD_ICON_URL} alt="" className="w-4 h-4 object-contain inline-block" /> Get More Shards
                  </Button>
                </Link>
              </div>
            ) : null}

            <Button variant="outline" onClick={() => setModalOpen(false)} className="w-full border-slate-700 text-slate-400">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}