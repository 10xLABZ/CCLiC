import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computeCombatStats } from "@/components/tradewars/botGenerator";
import { getResearchBonuses } from "@/lib/researchHelper";
import { getDevelopmentBonuses } from "@/lib/developmentBonusHelper";
import { WEAPONS, FIREARMS, VEHICLES, PEOPLE, PETS } from "@/components/store/catalogData";
import { getWeaponStarProgress, getWeaponUpgradeBonus } from "@/components/weapons/weaponUpgradeSystem";
import { applyAvatarStatBonuses } from "@/components/avatar/avatarStatsHelper";
import { getFundData, getFundMilestoneBonusPct } from "@/components/utils/fundStorage";
import { getPlayerData } from "@/components/utils/playerStorage";
import { getUpgradeLevel, getUpgradeBonusPct } from "@/components/upgrades/simpleUpgradeSystem";
import { isVipActive, VIP_BUFF_PCT } from "@/lib/vipHelper";
import { getFullIgcBreakdown } from "@/lib/igcBonusHelper";

const Row = ({ label, atk, def, color = "text-slate-300", bold = false, indent = false }) => (
  <div className={`flex items-center justify-between py-0.5 border-b border-slate-800/30 text-[10px] ${bold ? "font-bold" : ""}`}>
    <span className={`${indent ? "pl-2 text-slate-500" : ""} ${bold ? "text-slate-200" : "text-slate-400"}`}>{label}</span>
    <div className="flex gap-3">
      {atk !== undefined && <span className={`w-14 text-right ${color}`}>{atk}</span>}
      {def !== undefined && <span className={`w-14 text-right ${color}`}>{def}</span>}
    </div>
  </div>
);

const SectionHeader = ({ label }) => (
  <div className="text-[9px] text-slate-600 uppercase tracking-widest mt-1.5 mb-0">{label}</div>
);

export default function StrengthBreakdownModal({ open, onClose }) {
  // Re-read data each time the modal opens so it always shows fresh stats
  const [canonical, setCanonical] = React.useState(() => getPlayerData());
  React.useEffect(() => {
    if (open) setCanonical(getPlayerData());
  }, [open]);

  const loadout = canonical.loadout || {};

  let fundMembers = canonical.fundMembersOwned || 0;
  try {
    const fd = getFundData();
    const stored = fd.playerFund?.fundMembers;
    if (typeof stored === 'number' && stored > fundMembers) fundMembers = stored;
  } catch {}

  // --- Base level only (no gear, no fund) ---
  const level = canonical.level || 1;
  const levelBaseAtk = Math.round((1 + level * 0.15) * 100) / 100;
  const levelBaseDef = Math.round((1 + level * 0.10) * 100) / 100;

  // --- Individual gear items ---
  const getCatalogItem = (cat, id) => {
    if (!id || typeof id !== 'string') return null;
    if (cat === 'weapon') {
      // weapon1/weapon2 = FIREARMS (F prefix), weapon3 = WEAPONS/accessories (W prefix)
      return id.startsWith('F')
        ? FIREARMS.find(i => i.id === id) || null
        : WEAPONS.find(i => i.id === id) || null;
    }
    const map = { vehicle: VEHICLES, power: PEOPLE, pet: PETS };
    return map[cat]?.find(i => i.id === id) || null;
  };

  const gearSlots = [
    { label: "Weapon 1 🔫", item: getCatalogItem('weapon', loadout.weapon1) },
    { label: "Weapon 2 🔫", item: getCatalogItem('weapon', loadout.weapon2) },
    { label: "Accessory 1 🗡️", item: getCatalogItem('weapon', loadout.weapon3) },
    { label: "Accessory 2 🗡️", item: getCatalogItem('weapon', loadout.weapon4) },
    { label: "Vehicle",  item: getCatalogItem('vehicle', loadout.vehicle) },
    { label: "PoP",      item: getCatalogItem('power', loadout.power) },
    { label: "Pet",      item: getCatalogItem('pet', loadout.pet) },
  ].filter(s => s.item !== null);

  const totalGearAtk = gearSlots.reduce((sum, s) => sum + (s.item?.atk || 0), 0);
  const totalGearDef = gearSlots.reduce((sum, s) => sum + (s.item?.def || 0), 0);
  const baseSubtotalAtk = Math.round((levelBaseAtk + totalGearAtk) * 100) / 100;
  const baseSubtotalDef = Math.round((levelBaseDef + totalGearDef) * 100) / 100;

  // --- Fund contribution ---
  const baseNoFund = computeCombatStats({ level, fundMembers: 0, equippedLoadout: loadout });
  const baseWithFund = computeCombatStats({ level, fundMembers, equippedLoadout: loadout });
  const fundAtk = Math.round((baseWithFund.atk - baseNoFund.atk) * 100) / 100;
  const fundDef = Math.round((baseWithFund.def - baseNoFund.def) * 100) / 100;
  const fundPower = Math.round(baseWithFund.fundPower * 100) / 100;

  // --- Avatar bonus ---
  const totalShards = (canonical.avatarUpgrades || {})[canonical.equippedAvatarId] || 0;
  const withAvatar = applyAvatarStatBonuses(baseWithFund, canonical.equippedAvatarId, totalShards);
  const avatarAtkBonus = Math.round((withAvatar.atk - baseWithFund.atk) * 100) / 100;
  const avatarDefBonus = Math.round((withAvatar.def - baseWithFund.def) * 100) / 100;

  // --- Weapon upgrade bonuses (rarity-scaled, matching playerStatsHelper) ---
  let wAtkBonus = 0, wDefBonus = 0;
  ['weapon1', 'weapon2', 'weapon3', 'weapon4'].forEach(slot => {
    const wId = loadout[slot];
    if (wId && typeof wId === 'string') {
      const wData = wId.startsWith('F') ? FIREARMS.find(f => f.id === wId) : WEAPONS.find(w => w.id === wId);
      const spent = (canonical.weaponUpgrades || {})[wId] || 0;
      if (wData && spent > 0) {
        const bonusPct = getWeaponUpgradeBonus(spent, wData.rarity) / 100;
        wAtkBonus += (wData.atk || 0) * bonusPct;
        wDefBonus += (wData.def || 0) * bonusPct;
      }
    }
  });
  wAtkBonus = Math.round(wAtkBonus * 100) / 100;
  wDefBonus = Math.round(wDefBonus * 100) / 100;

  // --- Simple upgrade bonuses for vehicle, pet, and power items ---
  let sAtkBonus = 0, sDefBonus = 0;
  const simpleSlots = { vehicle: 'vehicle', power: 'power', pet: 'pet' };
  const catalogMap = { vehicle: VEHICLES, power: PEOPLE, pet: PETS };
  for (const [loadoutKey, cat] of Object.entries(simpleSlots)) {
    const itemId = loadout[loadoutKey];
    if (itemId && typeof itemId === 'string') {
      const itemData = catalogMap[cat]?.find(it => it.id === itemId);
      if (itemData) {
        const upgradeLvl = getUpgradeLevel(canonical, itemId);
        if (upgradeLvl > 0) {
          const bonusPct = getUpgradeBonusPct(upgradeLvl) / 100;
          sAtkBonus += (itemData.atk || 0) * bonusPct;
          sDefBonus += (itemData.def || 0) * bonusPct;
        }
      }
    }
  }
  sAtkBonus = Math.round(sAtkBonus * 100) / 100;
  sDefBonus = Math.round(sDefBonus * 100) / 100;

  // --- IGC Cash Boost (accessories + avatar) ---
  const igcBreakdown = getFullIgcBreakdown(canonical);

  // --- Research & Development multipliers ---
  const rb = getResearchBonuses(canonical);
  const db = getDevelopmentBonuses(canonical);
  const totalAtkMult = rb.weaponAtk + rb.combatAtk + db.atk;
  const totalDefMult = rb.weaponDef + db.def;
  const preAtk = withAvatar.atk + wAtkBonus + sAtkBonus;
  const preDef = withAvatar.def + wDefBonus + sDefBonus;
  const researchAtkBonus = Math.round(preAtk * (totalAtkMult / 100) * 100) / 100;
  const researchDefBonus = Math.round(preDef * (totalDefMult / 100) * 100) / 100;

  // --- Fund milestone bonus ---
  const milestonePct = getFundMilestoneBonusPct(fundMembers);
  const postResearchAtk = Math.round((preAtk * (1 + totalAtkMult / 100)) * 100) / 100;
  const postResearchDef = Math.round((preDef * (1 + totalDefMult / 100)) * 100) / 100;
  const milestoneAtkBonus = milestonePct > 0 ? Math.round(postResearchAtk * (milestonePct / 100) * 100) / 100 : 0;
  const milestoneDefBonus = milestonePct > 0 ? Math.round(postResearchDef * (milestonePct / 100) * 100) / 100 : 0;

  // --- VIP buff (+5% ATK & DEF) ---
  const vipActive = isVipActive(canonical);
  const postMilestoneAtk = milestonePct > 0 ? Math.round(postResearchAtk * (1 + milestonePct / 100) * 100) / 100 : postResearchAtk;
  const postMilestoneDef = milestonePct > 0 ? Math.round(postResearchDef * (1 + milestonePct / 100) * 100) / 100 : postResearchDef;
  const vipAtkBonus = vipActive ? Math.round(postMilestoneAtk * (VIP_BUFF_PCT / 100) * 100) / 100 : 0;
  const vipDefBonus = vipActive ? Math.round(postMilestoneDef * (VIP_BUFF_PCT / 100) * 100) / 100 : 0;

  // --- Finals ---
  const finalAtk = vipActive ? Math.round(postMilestoneAtk * (1 + VIP_BUFF_PCT / 100) * 100) / 100 : postMilestoneAtk;
  const finalDef = vipActive ? Math.round(postMilestoneDef * (1 + VIP_BUFF_PCT / 100) * 100) / 100 : postMilestoneDef;
  const finalTp = Math.round((finalAtk + finalDef) * 100) / 100;

  const fmt = (n) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
  const fmtB = (n) => n.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm max-h-[82vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 text-sm flex items-center gap-2">💥 Strength Breakdown</DialogTitle>
        </DialogHeader>

        {/* Column headers */}
        <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-700 mb-0.5">
          <span>Source</span>
          <div className="flex gap-3">
            <span className="w-14 text-right text-red-400">⚔️ ATK</span>
            <span className="w-14 text-right text-blue-400">🛡️ DEF</span>
          </div>
        </div>

        {/* === BASE: Level + Gear === */}
        <SectionHeader label="Base (Level + Gear)" />
        <Row label={`Level ${level} base`} atk={fmtB(levelBaseAtk)} def={fmtB(levelBaseDef)} indent color="text-slate-300" />
        {gearSlots.map(({ label, item }) => (
          <Row
            key={label}
            label={`${label}: ${item.name}`}
            atk={fmtB(item.atk || 0)}
            def={fmtB(item.def || 0)}
            indent
            color="text-slate-300"
          />
        ))}
        {gearSlots.length === 0 && (
          <Row label="No gear equipped" atk={fmtB(0)} def={fmtB(0)} indent color="text-slate-600" />
        )}
        <Row label="Base Subtotal" atk={fmtB(baseSubtotalAtk)} def={fmtB(baseSubtotalDef)} color="text-white" bold />

        {/* === HQ === */}
        <div className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest mt-1.5 mb-0">HQ Power (Level {fundMembers})</div>
        <Row label={`HQ Power ${fundPower.toFixed(2)} → ATK×15% / DEF×10%`} atk={fmt(fundAtk)} def={fmt(fundDef)} color="text-cyan-400" />

        {/* === Avatar === */}
        {(avatarAtkBonus !== 0 || avatarDefBonus !== 0) && (
          <>
            <SectionHeader label="Avatar Abilities" />
            <Row label="Avatar bonus" atk={fmt(avatarAtkBonus)} def={fmt(avatarDefBonus)} color="text-purple-400" />
          </>
        )}

        {/* === IGC Cash Boost === */}
        {igcBreakdown.total > 0 && (
          <>
            <SectionHeader label={`IGC Cash Boost (+${igcBreakdown.total.toFixed(1)}%)`} />
            <div className="flex items-center justify-between py-0.5 border-b border-slate-800/30 text-[10px]">
              <span className="text-slate-400 pl-2">Accessories + Avatar</span>
              <span className="w-14 text-right text-cyan-400 font-semibold">+{igcBreakdown.total.toFixed(1)}%</span>
            </div>
          </>
        )}

        {/* === Weapon Upgrades === */}
        {(wAtkBonus > 0 || wDefBonus > 0) && (
          <>
            <SectionHeader label="Weapon Star Upgrades" />
            <Row label="Star upgrade bonus" atk={fmt(wAtkBonus)} def={fmt(wDefBonus)} color="text-orange-400" />
          </>
        )}

        {/* === Vehicle / PoP / Pet Upgrades === */}
        {(sAtkBonus > 0 || sDefBonus > 0) && (
          <>
            <SectionHeader label="Vehicle / PoP / Pet Upgrades" />
            <Row label="Upgrade bonus" atk={fmt(sAtkBonus)} def={fmt(sDefBonus)} color="text-orange-400" />
          </>
        )}

        {/* === Research & Development === */}
        {(totalAtkMult > 0 || totalDefMult > 0) && (
          <>
            <SectionHeader label={`Research / Dev (${totalAtkMult.toFixed(1)}% ATK · ${totalDefMult.toFixed(1)}% DEF)`} />
            <Row label="Multiplier bonus" atk={fmt(researchAtkBonus)} def={fmt(researchDefBonus)} color="text-emerald-400" />
          </>
        )}

        {/* === Fund Milestone === */}
        {milestonePct > 0 && (
        <>
          <SectionHeader label={`HQ Milestone (+${milestonePct.toFixed(2)}%)`} />
            <Row label="Milestone bonus" atk={fmt(milestoneAtkBonus)} def={fmt(milestoneDefBonus)} color="text-yellow-400" />
          </>
        )}

        {/* === VIP Buff === */}
        {vipActive && (
          <>
            <SectionHeader label={`VIP Buff (+${VIP_BUFF_PCT}%)`} />
            <Row label="VIP bonus" atk={fmt(vipAtkBonus)} def={fmt(vipDefBonus)} color="text-yellow-400" />
          </>
        )}

        {/* === Totals === */}
        <div className="mt-2 border-t border-slate-600 pt-1.5 space-y-0.5">
          <Row label="Total ATK" atk={finalAtk.toFixed(2)} def={undefined} color="text-red-400" bold />
          <Row label="Total DEF" atk={undefined} def={finalDef.toFixed(2)} color="text-blue-400" bold />
          <div className="flex items-center justify-between py-1 text-[12px] font-black text-emerald-400 border-t border-emerald-800/60 mt-0.5">
            <span>💥 Total Power (TP)</span>
            <span>{finalTp.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-[9px] text-slate-600 mt-1 leading-relaxed">
          TP = ATK + DEF. HQ Power contributes ATK/DEF directly and is also shown separately for ranking reference.
        </p>
      </DialogContent>
    </Dialog>
  );
}