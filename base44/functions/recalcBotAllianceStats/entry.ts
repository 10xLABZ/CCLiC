/**
 * recalcBotAllianceStats
 * Recalculates ATK/DEF/TP for all bot PlayerProfiles in a given alliance.
 * Mirrors playerStatsHelper.js exactly:
 *   base (gear flat add from loadout + fund) → weapon upgrade flat bonuses → research × multipliers
 *
 * POST body: { alliance_tag: "CKG" } or { alliance_tag: "REM" }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Catalog data (inline mirrors of catalogData.js) ─────────────────────────
// FIREARMS: id = F{index padded 3}, atk = 2.0 + i*0.65, def = 0.5 + i*0.18
function getFirearmStats(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId === 'F_FEATURED_001') return { atk: 26, def: 10 };
  const match = itemId.match(/^F(\d+)$/);
  if (!match) return null;
  const i = parseInt(match[1]);
  return {
    atk: Math.round((2.0 + i * 0.65) * 10) / 10,
    def: Math.round((0.5 + i * 0.18) * 10) / 10,
  };
}

// WEAPONS (Accessories): id = W{index+1 padded 3}, total = 1.75 + i*0.65, atkPct by i%3
function getWeaponStats(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId === 'W_FEATURED_001') return { atk: 8, def: 24 };
  const match = itemId.match(/^W(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]); // 1-based
  const i = idx - 1; // 0-based
  const total = Math.round((1.75 + i * 0.65) * 10) / 10;
  const atkPct = i % 3 === 0 ? 0.10 : i % 3 === 1 ? 0.18 : 0.25;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}

// VEHICLES: id = V{index+1 padded 3}, atk = 0.5 + i*0.4, def = 2.0 + i*1.0
function getVehicleStats(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId === 'V_FEATURED_001') return { atk: 10, def: 56 };
  const match = itemId.match(/^V(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]);
  const i = idx - 1;
  return {
    atk: Math.round((0.5 + i * 0.4) * 10) / 10,
    def: Math.round((2.0 + i * 1.0) * 10) / 10,
  };
}

// PEOPLE (PoP): id = P{index+1 padded 3}, total = 0.8 + i*0.8
function getPeopleStats(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId === 'P_FEATURED_001') return { atk: 7, def: 13 };
  const match = itemId.match(/^P(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]);
  const i = idx - 1;
  const total = Math.round((0.8 + i * 0.8) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}

// PETS: id = T{index+1 padded 3}, total = 0.7 + i*0.95
function getPetStats(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId === 'T_FEATURED_001') return { atk: 10, def: 17 };
  const match = itemId.match(/^T(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]);
  const i = idx - 1;
  const total = Math.round((0.7 + i * 0.95) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}

// ── Weapon upgrade star progress (mirrors weaponUpgradeSystem.js) ────────────
const WEAPON_STAR_COSTS = [15, 30, 60, 120, 240, 300, 360, 420, 480, 540];
const SUBS_PER_STAR = 5;

function getWeaponStarProgress(totalPartsSpent) {
  let remaining = totalPartsSpent || 0;
  let star = 0;
  for (let s = 1; s <= 10; s++) {
    const cost = WEAPON_STAR_COSTS[s - 1];
    if (remaining >= cost) {
      remaining -= cost;
      star = s;
    } else {
      const subCost = cost / SUBS_PER_STAR;
      const subTier = Math.floor(remaining / subCost);
      return { star, subTier };
    }
  }
  return { star: 10, subTier: 0 };
}

// ── Avatar shard bonus (mirrors avatarAbilities.js) ──────────────────────────
const AVATAR_STAR_COSTS = [25, 50, 125, 250, 500, 600, 700, 800, 900, 1000];

function getAvatarStarProgress(totalShardsSpent) {
  let remaining = totalShardsSpent || 0;
  for (let star = 0; star < 10; star++) {
    const required = AVATAR_STAR_COSTS[star];
    if (remaining >= required) {
      remaining -= required;
    } else {
      const subCost = required / 5;
      const subTier = Math.floor(remaining / subCost);
      return { star, subTier };
    }
  }
  return { star: 10, subTier: 0 };
}

// Combat-type avatar bonus (0.2% per completed sub tier)
function getAvatarBonusPct(avatarId, totalShardsSpent) {
  if (!avatarId || !totalShardsSpent) return 0;
  const { star, subTier } = getAvatarStarProgress(totalShardsSpent);
  const completedSubs = star * 5 + subTier;
  return (completedSubs * 0.2) / 100;
}

// ── computeCombatStats mirror (from botGenerator.js) ────────────────────────
// Returns { atk, def, fundPower } from gear loadout + fund members
function computeCombatStats({ level, fundMembers, loadout }) {
  const baseAtk = 1 + (level * 0.15);
  const baseDef = 1 + (level * 0.10);

  // Gear flat adds from loadout
  let gearAtk = 0, gearDef = 0;
  const w1 = getFirearmStats(loadout?.weapon1);
  const w2 = getFirearmStats(loadout?.weapon2);
  const w3 = getWeaponStats(loadout?.weapon3);
  const w4 = getWeaponStats(loadout?.weapon4);
  const veh = getVehicleStats(loadout?.vehicle);
  const pop = getPeopleStats(loadout?.power);
  const pet = getPetStats(loadout?.pet);
  [w1, w2, w3, w4, veh, pop, pet].forEach(item => {
    if (item) { gearAtk += item.atk || 0; gearDef += item.def || 0; }
  });

  // Fund contribution
  const memberPowerBase = 0.20 + (level * 0.02);
  const fundPower = (fundMembers || 0) * memberPowerBase;
  const fundAtk = fundPower * 0.15;
  const fundDef = fundPower * 0.10;

  return {
    atk: baseAtk + gearAtk + fundAtk,
    def: baseDef + gearDef + fundDef,
    fundPower,
  };
}

// ── Weapon upgrade FLAT bonus (mirrors playerStatsHelper.js exactly) ─────────
// For each weapon slot, bonus = itemBaseAtk * (completedSubs * 0.4 / 100)
function computeWeaponUpgradeFlatBonus(loadout, weaponUpgrades) {
  let wAtkBonus = 0, wDefBonus = 0;
  const slots = [
    { slot: loadout?.weapon1, getter: getFirearmStats },
    { slot: loadout?.weapon2, getter: getFirearmStats },
    { slot: loadout?.weapon3, getter: getWeaponStats },
    { slot: loadout?.weapon4, getter: getWeaponStats },
  ];
  for (const { slot, getter } of slots) {
    if (!slot) continue;
    const spent = (weaponUpgrades || {})[slot] || 0;
    if (spent <= 0) continue;
    const itemStats = getter(slot);
    if (!itemStats) continue;
    const { star, subTier } = getWeaponStarProgress(spent);
    const completedSubs = star * SUBS_PER_STAR + subTier;
    const bonusPct = (completedSubs * 0.4) / 100;
    wAtkBonus += (itemStats.atk || 0) * bonusPct;
    wDefBonus += (itemStats.def || 0) * bonusPct;
  }
  return { wAtkBonus, wDefBonus };
}

// Research lab bonus (3% per lab level, applied to both ATK and DEF)
function getResearchLabBonusPct(researchLabLevel) {
  return ((researchLabLevel || 0) * 3) / 100;
}

// ── Fund size assignment based on bot level ──────────────────────────────────
function getBotFundMembers(level, botIndex, totalBots) {
  const leaderMult = 2.5;
  const lowestMult = 1.1;
  const t = totalBots > 1 ? botIndex / (totalBots - 1) : 0;
  const mult = leaderMult - (leaderMult - lowestMult) * t;
  return Math.max(5, Math.round(level * mult));
}

// Research/development multiplier
function getResearchMult(botIndex, totalBots) {
  const t = totalBots > 1 ? botIndex / (totalBots - 1) : 0;
  if (t < 0.33) return 1.10 + (0.08 * (1 - t / 0.33));
  if (t < 0.66) return 1.06 + (0.04 * (0.66 - t) / 0.33);
  return 1.0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { alliance_tag } = body;
    if (!alliance_tag) {
      return Response.json({ error: 'alliance_tag required' }, { status: 400 });
    }

    // 1. Fetch alliance to get its ID
    const alliances = await base44.asServiceRole.entities.Alliance.filter({ tag: alliance_tag });
    if (alliances.length === 0) {
      return Response.json({ error: `Alliance [${alliance_tag}] not found` }, { status: 404 });
    }
    const allianceId = alliances[0].id;

    // 2. Fetch AllianceMembers as source of truth, filter bots only
    const allianceMembers = await base44.asServiceRole.entities.AllianceMember.filter({ alliance_id: allianceId });
    const botMemberUserIds = allianceMembers
      .map(m => m.user_id)
      .filter(uid => uid?.startsWith('bot_'));

    if (botMemberUserIds.length === 0) {
      return Response.json({ message: `No bot members found for alliance [${alliance_tag}]`, updated: 0 });
    }

    // 3. Fetch PlayerProfiles only for actual alliance members
    const allProfileResults = await Promise.all(
      botMemberUserIds.map(uid => base44.asServiceRole.entities.PlayerProfile.filter({ user_id: uid }))
    );
    const botProfiles = allProfileResults
      .flat()
      .filter(p => p && p.user_id)
      .sort((a, b) => (b.level || 1) - (a.level || 1));

    if (botProfiles.length === 0) {
      return Response.json({ message: `No bot profiles found for alliance ${alliance_tag}`, updated: 0 });
    }

    const totalBots = botProfiles.length;
    const results = [];

    for (let i = 0; i < totalBots; i++) {
      const profile = botProfiles[i];
      const userId = profile.user_id;
      const level = profile.level || 1;

      // 2. Assign fund members based on rank
      const fundMembers = getBotFundMembers(level, i, totalBots);

      // 3. Fetch inventory
      const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: userId });
      const inv = inventories.length > 0 ? inventories[0] : {};

      const loadout = inv.loadout || {};
      const weaponUpgrades = inv.weaponUpgrades || {};
      const avatarUpgrades = inv.avatarUpgrades || {};
      const researchLabLevel = inv.researchLabLevel || 0;
      const equippedAvatarId = profile.equipped_avatar_id;

      // 4. Base stats (gear + fund) — mirrors computeCombatStats
      const base = computeCombatStats({ level, fundMembers, loadout });

      // 5. Avatar flat % bonus on ATK+DEF
      const avatarShards = equippedAvatarId ? (avatarUpgrades[equippedAvatarId] || 0) : 0;
      const avatarBonusPct = getAvatarBonusPct(equippedAvatarId, avatarShards);

      // 6. Weapon upgrade FLAT bonuses (item.atk/def * bonusPct) — mirrors playerStatsHelper
      const { wAtkBonus, wDefBonus } = computeWeaponUpgradeFlatBonus(loadout, weaponUpgrades);

      // 7. Research lab % bonus
      const labBonusPct = getResearchLabBonusPct(researchLabLevel);

      // 8. Research/dev multiplier
      const researchMult = getResearchMult(i, totalBots);

      // 9. Final stats: (base + wUpgradeFlat) * (1 + avatarPct + labPct) * researchMult
      const preAtk = (base.atk + wAtkBonus) * (1 + avatarBonusPct + labBonusPct);
      const preDef = (base.def + wDefBonus) * (1 + avatarBonusPct + labBonusPct);
      const finalAtk = Math.round(preAtk * researchMult * 100) / 100;
      const finalDef = Math.round(preDef * researchMult * 100) / 100;
      const finalTP = Math.round((finalAtk + finalDef) * 100) / 100;

      // 10. Persist — fund contributions now integrated into finalAtk and finalDef
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        attack_value: finalAtk,
        defense_value: finalDef,
        fund_members_owned: fundMembers,
      });

      // 11. Update AllianceMember level only
      const members = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: userId });
      if (members.length > 0) {
        await base44.asServiceRole.entities.AllianceMember.update(members[0].id, {
          level: level,
        });
      }

      results.push({
        user_id: userId,
        username: profile.username,
        level,
        fund_members: fundMembers,
        atk: finalAtk,
        def: finalDef,
        tp: finalTP,
        debug: {
          baseAtk: Math.round(base.atk * 100) / 100,
          baseDef: Math.round(base.def * 100) / 100,
          wAtkBonus: Math.round(wAtkBonus * 100) / 100,
          wDefBonus: Math.round(wDefBonus * 100) / 100,
          avatarBonusPct: Math.round(avatarBonusPct * 10000) / 100 + '%',
          labBonusPct: Math.round(labBonusPct * 100) + '%',
          researchMult: Math.round(researchMult * 1000) / 1000,
        }
      });
    }

    // 12. Update Alliance total_power = sum of all member TPs
    const totalPower = Math.round(results.reduce((sum, r) => sum + r.tp, 0));
    await base44.asServiceRole.entities.Alliance.update(allianceId, { total_power: totalPower });

    return Response.json({
      message: `Updated ${results.length} bots in [${alliance_tag}]`,
      updated: results.length,
      total_power: totalPower,
      bots: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});