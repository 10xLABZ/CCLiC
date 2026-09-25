/**
 * playerStatsHelper.js
 * Single source of truth for a player's full combat stats.
 * Used by: ProfilePage, BattleEngine, TradeWars "Your Stats" panel.
 *
 * Formula: base (gear+fund) → avatar abilities → weapon upgrades → research × dev multipliers
 */

import { computeCombatStats } from '../components/tradewars/botGenerator';
import { getResearchBonuses } from './researchHelper';
import { getDevelopmentBonuses } from './developmentBonusHelper';
import { WEAPONS, FIREARMS, VEHICLES, PEOPLE, PETS } from '../components/store/catalogData';
import { getWeaponStarProgress, getWeaponUpgradeBonus } from '../components/weapons/weaponUpgradeSystem';
import { applyAvatarStatBonuses } from '../components/avatar/avatarStatsHelper';
import { getFundData, getFundMilestoneBonusPct } from '../components/utils/fundStorage';
import { getPlayerData } from '../components/utils/playerStorage';
import { getUpgradeLevel, getUpgradeBonusPct } from '../components/upgrades/simpleUpgradeSystem';
import { isVipActive, VIP_BUFF_PCT } from './vipHelper';

/**
 * Returns the player's real ATK, DEF, fundPower, and TP (pwr = ATK+DEF).
 * This is the ONLY place this math should live.
 */
export const computeFullPlayerStats = (player) => {
  // Always read from authoritative localStorage to prevent any fluctuation
  // from stale/partial player objects being passed in
  const canonical = getPlayerData();

  // Resolve fund members: use the HIGHER of the two sources to prevent
  // a race where one source hasn't yet been synced from the server.
  // fundMembersOwned on the player record is updated by PlayerProfile sync.
  // playerFund.fundMembers is updated by PlayerFund sync (happens after).
  // Taking the max ensures we never show a lower value due to a partial sync.
  let fundMembers = canonical.fundMembersOwned || 0;
  try {
    const fd = getFundData();
    const stored = fd.playerFund?.fundMembers;
    if (typeof stored === 'number' && stored > fundMembers) fundMembers = stored;
  } catch {}

  // 1. Base stats: gear + fund
  const base = computeCombatStats({
    level: canonical.level || 1,
    fundMembers,
    equippedLoadout: canonical.loadout || {}
  });

  // 2. Avatar ability bonuses — read shards from canonical inventory
  const totalShards = (canonical.avatarUpgrades || {})[canonical.equippedAvatarId] || 0;
  const withAvatar = applyAvatarStatBonuses(base, canonical.equippedAvatarId, totalShards);

  // 3. Weapon upgrade flat bonuses — read upgrades from canonical data
  let wAtkBonus = 0, wDefBonus = 0;
  ['weapon1', 'weapon2', 'weapon3', 'weapon4'].forEach(slot => {
    const wId = canonical.loadout?.[slot];
    if (wId && typeof wId === 'string') {
      // weapon1/weapon2 are FIREARMS (F prefix), weapon3 is WEAPONS/accessories (W prefix)
      const wData = wId.startsWith('F') 
        ? FIREARMS.find(f => f.id === wId) 
        : WEAPONS.find(w => w.id === wId);
      const spent = (canonical.weaponUpgrades || {})[wId] || 0;
      if (wData && spent > 0) {
        const bonusPct = getWeaponUpgradeBonus(spent, wData.rarity) / 100;
        wAtkBonus += (wData.atk || 0) * bonusPct;
        wDefBonus += (wData.def || 0) * bonusPct;
      }
    }
  });

  // 4. Simple upgrade bonuses for vehicle, pet, and power items
  let sAtkBonus = 0, sDefBonus = 0;
  const simpleSlots = { vehicle: 'vehicle', power: 'power', pet: 'pet' };
  const catalogMap = { vehicle: VEHICLES, power: PEOPLE, pet: PETS };
  for (const [loadoutKey, cat] of Object.entries(simpleSlots)) {
    const itemId = canonical.loadout?.[loadoutKey];
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

  // 5. Research + development % multipliers — always use canonical
  const rb = getResearchBonuses(canonical);
  const db = getDevelopmentBonuses(canonical);

  const preAtk = Math.round(
    (withAvatar.atk + wAtkBonus + sAtkBonus) * (1 + (rb.weaponAtk + rb.combatAtk + db.atk) / 100) * 100
  ) / 100;
  const preDef = Math.round(
    (withAvatar.def + wDefBonus + sDefBonus) * (1 + (rb.weaponDef + db.def) / 100) * 100
  ) / 100;

  // 5. Fund milestone bonus (+0.25% ATK & DEF per 50 members)
  const milestonePct = getFundMilestoneBonusPct(fundMembers);
  const postMilestoneAtk = milestonePct > 0 ? Math.round(preAtk * (1 + milestonePct / 100) * 100) / 100 : preAtk;
  const postMilestoneDef = milestonePct > 0 ? Math.round(preDef * (1 + milestonePct / 100) * 100) / 100 : preDef;

  // 6. VIP buff — +5% ATK & DEF when VIP is active
  const vipActive = isVipActive(canonical);
  const finalAtk = vipActive ? Math.round(postMilestoneAtk * (1 + VIP_BUFF_PCT / 100) * 100) / 100 : postMilestoneAtk;
  const finalDef = vipActive ? Math.round(postMilestoneDef * (1 + VIP_BUFF_PCT / 100) * 100) / 100 : postMilestoneDef;
  const finalTp = Math.round((finalAtk + finalDef) * 100) / 100;

  return { atk: finalAtk, def: finalDef, pwr: finalTp, fundMembers, vipBuffActive: vipActive };
};