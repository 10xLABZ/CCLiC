/**
 * repairBotAllianceProfiles
 * Fixes all bot PlayerProfiles in non-CKG alliances:
 * - Assigns appropriate equipped_scene_id based on gender + level
 * - Assigns equipped_theme_id = 'theme_001_rusty_hotness' (default)
 * - Recalculates attack_value / defense_value from inventory loadout + fund
 * - Updates AllianceMember fund_power
 * 
 * Admin only. POST body: { alliance_tag: "REM" } or { all: true }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Inline catalog stat helpers ───────────────────────────────────────────────
function getFirearmStats(id) {
  if (!id || typeof id !== 'string') return null;
  if (id === 'F_FEATURED_001') return { atk: 26, def: 10 };
  const m = id.match(/^F(\d+)$/);
  if (!m) return null;
  const i = parseInt(m[1]);
  return { atk: Math.round((2.0 + i * 0.65) * 10) / 10, def: Math.round((0.5 + i * 0.18) * 10) / 10 };
}
function getWeaponStats(id) {
  if (!id || typeof id !== 'string') return null;
  if (id === 'W_FEATURED_001') return { atk: 8, def: 24 };
  const m = id.match(/^W(\d+)$/);
  if (!m) return null;
  const i = parseInt(m[1]) - 1;
  const total = Math.round((1.75 + i * 0.65) * 10) / 10;
  const atkPct = i % 3 === 0 ? 0.10 : i % 3 === 1 ? 0.18 : 0.25;
  return { atk: Math.max(0.1, Math.round(total * atkPct * 10) / 10), def: Math.max(0.1, Math.round((total - Math.max(0.1, Math.round(total * atkPct * 10) / 10)) * 10) / 10) };
}
function getVehicleStats(id) {
  if (!id || typeof id !== 'string') return null;
  if (id === 'V_FEATURED_001') return { atk: 10, def: 56 };
  const m = id.match(/^V(\d+)$/);
  if (!m) return null;
  const i = parseInt(m[1]) - 1;
  return { atk: Math.round((0.5 + i * 0.4) * 10) / 10, def: Math.round((2.0 + i * 1.0) * 10) / 10 };
}
function getPeopleStats(id) {
  if (!id || typeof id !== 'string') return null;
  if (id === 'P_FEATURED_001') return { atk: 7, def: 13 };
  const m = id.match(/^P(\d+)$/);
  if (!m) return null;
  const i = parseInt(m[1]) - 1;
  const total = Math.round((0.8 + i * 0.8) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  return { atk: Math.max(0.1, Math.round(total * atkPct * 10) / 10), def: Math.max(0.1, Math.round((total - Math.max(0.1, Math.round(total * atkPct * 10) / 10)) * 10) / 10) };
}
function getPetStats(id) {
  if (!id || typeof id !== 'string') return null;
  if (id === 'T_FEATURED_001') return { atk: 10, def: 17 };
  const m = id.match(/^T(\d+)$/);
  if (!m) return null;
  const i = parseInt(m[1]) - 1;
  const total = Math.round((0.7 + i * 0.95) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  return { atk: Math.max(0.1, Math.round(total * atkPct * 10) / 10), def: Math.max(0.1, Math.round((total - Math.max(0.1, Math.round(total * atkPct * 10) / 10)) * 10) / 10) };
}

// ── Weapon upgrade star progress ──────────────────────────────────────────────
const WEAPON_STAR_COSTS = [15, 30, 60, 120, 240, 300, 360, 420, 480, 540];
const SUBS_PER_STAR = 5;
function getWeaponStarProgress(spent) {
  let remaining = spent || 0;
  let star = 0;
  for (let s = 1; s <= 10; s++) {
    const cost = WEAPON_STAR_COSTS[s - 1];
    if (remaining >= cost) { remaining -= cost; star = s; }
    else { return { star, subTier: Math.floor(remaining / (cost / SUBS_PER_STAR)) }; }
  }
  return { star: 10, subTier: 0 };
}

// ── Combat stats computation ──────────────────────────────────────────────────
function computeStats(level, fundMembers, loadout, weaponUpgrades) {
  const baseAtk = 1 + (level * 0.15);
  const baseDef = 1 + (level * 0.10);
  let gearAtk = 0, gearDef = 0;
  const items = [
    getFirearmStats(loadout?.weapon1), getFirearmStats(loadout?.weapon2),
    getWeaponStats(loadout?.weapon3), getWeaponStats(loadout?.weapon4),
    getVehicleStats(loadout?.vehicle), getPeopleStats(loadout?.power), getPetStats(loadout?.pet)
  ];
  items.forEach(it => { if (it) { gearAtk += it.atk || 0; gearDef += it.def || 0; } });

  // Weapon upgrade flat bonus
  const wSlots = [
    { id: loadout?.weapon1, getter: getFirearmStats },
    { id: loadout?.weapon2, getter: getFirearmStats },
    { id: loadout?.weapon3, getter: getWeaponStats },
    { id: loadout?.weapon4, getter: getWeaponStats },
  ];
  let wAtkBonus = 0, wDefBonus = 0;
  for (const { id, getter } of wSlots) {
    if (!id) continue;
    const spent = (weaponUpgrades || {})[id] || 0;
    if (spent <= 0) continue;
    const stats = getter(id);
    if (!stats) continue;
    const { star, subTier } = getWeaponStarProgress(spent);
    const completedSubs = star * SUBS_PER_STAR + subTier;
    const bonusPct = (completedSubs * 0.4) / 100;
    wAtkBonus += (stats.atk || 0) * bonusPct;
    wDefBonus += (stats.def || 0) * bonusPct;
  }

  const fundPower = (fundMembers || 0) * (0.20 + (level * 0.02));
  const fundAtk = fundPower * 0.15;
  const fundDef = fundPower * 0.10;

  // Research multiplier: top-ranked bots get 1.18x, bottom get 1.0x (will be applied at call site)
  const atk = baseAtk + gearAtk + fundAtk + wAtkBonus;
  const def = baseDef + gearDef + fundDef + wDefBonus;
  return { atk, def, fundPower };
}

// ── Scene assignment based on gender + level ─────────────────────────────────
function assignScene(gender, level, userId) {
  // Deterministic pick based on userId hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const h = Math.abs(hash);

  const UNIVERSAL = ['scene_default_01', 'scene_default_02', 'scene_default_03', 'scene_neon_cyan_zone', 'scene_neon_pink_zone'];
  const MID_UNIVERSAL = ['scene_trade_desk', 'scene_trade_floor', 'scene_wall_street'];
  const HIGH_UNIVERSAL = ['scene_mounds_of_money', 'scene_high_rise', 'scene_evil_lair', 'scene_futuristic_battle_pad'];
  const TOP_UNIVERSAL = ['scene_mansion'];
  const MALE_SCENES = ['scene_sportscar_garage', 'scene_gaming_room', 'scene_tool_shop'];
  const FEMALE_SCENES = ['scene_cute_n_pink', 'scene_dance_studio', 'scene_girl_power', 'scene_pretty_game_station'];

  let pool = [...UNIVERSAL];
  if (level >= 10) pool.push(...MID_UNIVERSAL);
  if (level >= 12) {
    if (gender === 'M') pool.push(...MALE_SCENES.filter(s => ['scene_tool_shop', 'scene_gaming_room', 'scene_sportscar_garage'].includes(s) && level >= (s === 'scene_sportscar_garage' ? 22 : s === 'scene_gaming_room' ? 18 : 12)));
    if (gender === 'F') pool.push(...FEMALE_SCENES.filter(s => level >= (s === 'scene_cute_n_pink' ? 14 : s === 'scene_dance_studio' ? 17 : s === 'scene_girl_power' ? 21 : 19)));
  }
  if (level >= 25) pool.push(...HIGH_UNIVERSAL);
  if (level >= 50) pool.push(...TOP_UNIVERSAL);

  return pool[h % pool.length];
}

// ── Theme assignment based on gender + level (default theme for most) ─────────
function assignTheme(gender, level) {
  if (gender === 'F' && level >= 10) return 'theme_002_pink_empire';
  return 'theme_001_rusty_hotness';
}

// ── Build default loadout from level ──────────────────────────────────────────
function buildDefaultLoadout(level) {
  // Pick reasonable items based on level tier
  const w1Idx = Math.min(Math.max(1, Math.floor(level * 0.4)), 30);
  const w2Idx = Math.max(1, w1Idx - 3);
  const w3Idx = Math.min(Math.max(1, Math.floor(level * 0.35)), 28);
  const w4Idx = Math.max(1, w3Idx - 2);
  const vIdx = Math.min(Math.max(1, Math.floor(level * 0.3)), 20);
  const pIdx = Math.min(Math.max(1, Math.floor(level * 0.25)), 15);
  const tIdx = Math.min(Math.max(1, Math.floor(level * 0.25)), 15);
  const pad = (n) => String(n).padStart(3, '0');
  return {
    weapon1: `F${pad(w1Idx)}`, weapon2: `F${pad(w2Idx)}`,
    weapon3: `W${pad(w3Idx)}`, weapon4: `W${pad(w4Idx)}`,
    vehicle: `V${pad(vIdx)}`, power: `P${pad(pIdx)}`, pet: `T${pad(tIdx)}`
  };
}

const TARGET_ALLIANCES = ['REM', 'SHC', 'ISY', 'EMT', 'RKR'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const alliancesToFix = body.alliance_tag ? [body.alliance_tag] : TARGET_ALLIANCES;

    const allResults = [];

    for (const tag of alliancesToFix) {
      const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ alliance_tag: tag });
      const botProfiles = profiles
        .filter(p => p.user_id?.startsWith('bot_'))
        .sort((a, b) => (b.level || 1) - (a.level || 1));

      if (botProfiles.length === 0) {
        allResults.push({ tag, message: 'No bots found', updated: 0 });
        continue;
      }

      const total = botProfiles.length;
      const tagResults = [];

      for (let i = 0; i < total; i++) {
        const p = botProfiles[i];
        const level = p.level || 1;
        const gender = p.gender || 'M';
        const userId = p.user_id;

        // Research multiplier: top bots get more
        const t = total > 1 ? i / (total - 1) : 0;
        const researchMult = t < 0.33 ? 1.15 : t < 0.66 ? 1.08 : 1.02;

        // Fetch or build inventory
        const invs = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: userId });
        let inv = invs.length > 0 ? invs[0] : null;
        let loadout = inv?.loadout;
        let weaponUpgrades = inv?.weaponUpgrades || {};

        // If no inventory or empty loadout, create/update with a default
        if (!loadout || Object.keys(loadout).length === 0) {
          loadout = buildDefaultLoadout(level);
          // Build basic weapon upgrades (1-3 stars for most weapons based on level)
          const starCostPerLevel = Math.min(9, Math.floor(level / 15));
          const totalParts = [15, 30, 60, 120, 240, 300, 360, 420, 480, 540].slice(0, starCostPerLevel).reduce((a, b) => a + b, 0);
          ['weapon1','weapon2','weapon3','weapon4'].forEach(slot => {
            if (loadout[slot]) weaponUpgrades[loadout[slot]] = totalParts;
          });

          const newInvData = { user_id: userId, loadout, weaponUpgrades,
            firearms: { [loadout.weapon1]: 1, [loadout.weapon2]: 1 },
            weapons: { [loadout.weapon3]: 1, [loadout.weapon4]: 1 },
            vehicles: { [loadout.vehicle]: 1 }, power: { [loadout.power]: 1 }, pets: { [loadout.pet]: 1 },
            researchLabLevel: Math.min(5, Math.floor(level / 20)),
          };

          if (inv) {
            await base44.asServiceRole.entities.PlayerInventory.update(inv.id, newInvData);
          } else {
            await base44.asServiceRole.entities.PlayerInventory.create(newInvData);
          }
        }

        // Compute stats
        const stats = computeStats(level, p.fund_members_owned || Math.max(3, Math.floor(level * 1.5)), loadout, weaponUpgrades);
        const finalAtk = Math.round(stats.atk * researchMult * 100) / 100;
        const finalDef = Math.round(stats.def * researchMult * 100) / 100;
        const finalTP = Math.round((finalAtk + finalDef) * 100) / 100;
        const fundMembers = p.fund_members_owned || Math.max(3, Math.floor(level * 1.5));

        // Assign scene and theme if missing
        const sceneId = p.equipped_scene_id || assignScene(gender, level, userId);
        const themeId = p.equipped_theme_id || assignTheme(gender, level);

        await base44.asServiceRole.entities.PlayerProfile.update(p.id, {
          attack_value: finalAtk,
          defense_value: finalDef,
          fund_members_owned: fundMembers,
          equipped_scene_id: sceneId,
          equipped_theme_id: themeId,
        });

        // Update AllianceMember fund_power
        const members = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: userId });
        if (members.length > 0) {
          await base44.asServiceRole.entities.AllianceMember.update(members[0].id, {
            fund_power: finalTP,
            level,
          });
        }

        tagResults.push({ user_id: userId, username: p.username, level, atk: finalAtk, def: finalDef, tp: finalTP, scene: sceneId, theme: themeId });
      }

      allResults.push({ tag, updated: tagResults.length, bots: tagResults });
    }

    return Response.json({ success: true, alliances: allResults });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});