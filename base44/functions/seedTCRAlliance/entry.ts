/**
 * seedTCRAlliance
 * Creates The China Republic (TCR) alliance with Jimmy金鱼 as leader + 9 average bot members.
 * - Jimmy: level 203, HQ 1809, Illuminati Master avatar 8-star, Nuke+BeamOfDeath, Sovereign Market Blade+Gamma Pressure Tool, Shadow Council Director, Apex Shadow Dragon, Executive Phantom One
 * - Other bots: average levels 10-25, standard gear
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Weapon upgrade parts needed for star levels
const WEAPON_STAR_COSTS = [15, 30, 60, 120, 240, 300, 360, 420, 480, 540];
function partsForStars(stars) {
  return WEAPON_STAR_COSTS.slice(0, stars).reduce((a, b) => a + b, 0);
}

// Avatar shard costs
const AVATAR_STAR_COSTS = [25, 50, 125, 250, 500, 600, 700, 800, 900, 1000];
function shardsForStars(stars) {
  return AVATAR_STAR_COSTS.slice(0, stars).reduce((a, b) => a + b, 0);
}

// Stat helpers (inline mirrors)
function getFirearmStats(id) {
  if (id === 'F_FEATURED_001') return { atk: 26, def: 10 };
  const m = id.match(/^F(\d+)$/);
  if (!m) return { atk: 0, def: 0 };
  const i = parseInt(m[1]);
  // Special overrides
  if (i === 40) return { atk: 50, def: 1.0 };   // Nuke
  if (i === 39) return { atk: 35, def: 15 };     // Beam of Death
  if (i === 38) return { atk: 25, def: 20 };     // EMP
  return { atk: Math.round((2.0 + i * 0.65) * 10) / 10, def: Math.round((0.5 + i * 0.18) * 10) / 10 };
}
function getWeaponStats(id) {
  if (id === 'W_FEATURED_001') return { atk: 8, def: 24 };
  const m = id.match(/^W(\d+)$/);
  if (!m) return { atk: 0, def: 0 };
  const i = parseInt(m[1]) - 1;
  const total = Math.round((1.75 + i * 0.65) * 10) / 10;
  const atkPct = i % 3 === 0 ? 0.10 : i % 3 === 1 ? 0.18 : 0.25;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}
function getVehicleStats(id) {
  if (id === 'V_FEATURED_001') return { atk: 10, def: 56 };
  const m = id.match(/^V(\d+)$/);
  if (!m) return { atk: 0, def: 0 };
  const i = parseInt(m[1]) - 1;
  return { atk: Math.round((0.5 + i * 0.4) * 10) / 10, def: Math.round((2.0 + i * 1.0) * 10) / 10 };
}
function getPeopleStats(id) {
  if (id === 'P_FEATURED_001') return { atk: 7, def: 13 };
  const m = id.match(/^P(\d+)$/);
  if (!m) return { atk: 0, def: 0 };
  const i = parseInt(m[1]) - 1;
  const total = Math.round((0.8 + i * 0.8) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}
function getPetStats(id) {
  if (id === 'T_FEATURED_001') return { atk: 10, def: 17 };
  const m = id.match(/^T(\d+)$/);
  if (!m) return { atk: 0, def: 0 };
  const i = parseInt(m[1]) - 1;
  const total = Math.round((0.7 + i * 0.95) * 10) / 10;
  const atkPct = i % 4 === 0 ? 0.25 : i % 4 === 1 ? 0.35 : i % 4 === 2 ? 0.45 : 0.50;
  const atk = Math.max(0.1, Math.round(total * atkPct * 10) / 10);
  const def = Math.max(0.1, Math.round((total - atk) * 10) / 10);
  return { atk, def };
}

function computeStats({ level, fundMembers, loadout, weaponUpgrades, avatarId, avatarShards, researchMult }) {
  const baseAtk = 1 + (level * 0.15);
  const baseDef = 1 + (level * 0.10);

  let gearAtk = 0, gearDef = 0;
  const items = [
    getFirearmStats(loadout.weapon1 || ''), getFirearmStats(loadout.weapon2 || ''),
    getWeaponStats(loadout.weapon3 || ''), getWeaponStats(loadout.weapon4 || ''),
    getVehicleStats(loadout.vehicle || ''), getPeopleStats(loadout.power || ''), getPetStats(loadout.pet || '')
  ];
  items.forEach(it => { gearAtk += it.atk || 0; gearDef += it.def || 0; });

  // Weapon upgrade flat bonus
  const SUBS_PER_STAR = 5;
  const WEAPON_STAR_COSTS_LOCAL = [15, 30, 60, 120, 240, 300, 360, 420, 480, 540];
  function getStarProgress(spent) {
    let rem = spent || 0, star = 0;
    for (let s = 1; s <= 10; s++) {
      const cost = WEAPON_STAR_COSTS_LOCAL[s - 1];
      if (rem >= cost) { rem -= cost; star = s; } else { return { star, subTier: Math.floor(rem / (cost / SUBS_PER_STAR)) }; }
    }
    return { star: 10, subTier: 0 };
  }
  let wAtkBonus = 0, wDefBonus = 0;
  const wSlots = [
    { id: loadout.weapon1, getter: getFirearmStats }, { id: loadout.weapon2, getter: getFirearmStats },
    { id: loadout.weapon3, getter: getWeaponStats }, { id: loadout.weapon4, getter: getWeaponStats },
  ];
  for (const { id, getter } of wSlots) {
    if (!id) continue;
    const spent = (weaponUpgrades || {})[id] || 0;
    if (spent <= 0) continue;
    const stats = getter(id);
    const { star, subTier } = getStarProgress(spent);
    const completedSubs = star * SUBS_PER_STAR + subTier;
    wAtkBonus += (stats.atk || 0) * (completedSubs * 0.4) / 100;
    wDefBonus += (stats.def || 0) * (completedSubs * 0.4) / 100;
  }

  // Avatar bonus (0.2% per completed sub)
  let avatarBonusPct = 0;
  if (avatarId && avatarShards > 0) {
    function getAvatarStars(shards) {
      const COSTS = [25, 50, 125, 250, 500, 600, 700, 800, 900, 1000];
      let rem = shards, star = 0;
      for (let s = 0; s < 10; s++) {
        if (rem >= COSTS[s]) { rem -= COSTS[s]; star = s + 1; } else { const sub = Math.floor(rem / (COSTS[s] / 5)); return { star, subTier: sub }; }
      }
      return { star: 10, subTier: 0 };
    }
    const { star, subTier } = getAvatarStars(avatarShards);
    avatarBonusPct = ((star * 5 + subTier) * 0.2) / 100;
  }

  const fundPower = (fundMembers || 0) * (0.20 + (level * 0.02));
  const fundAtk = fundPower * 0.15;
  const fundDef = fundPower * 0.10;

  const preAtk = (baseAtk + gearAtk + fundAtk + wAtkBonus) * (1 + avatarBonusPct);
  const preDef = (baseDef + gearDef + fundDef + wDefBonus) * (1 + avatarBonusPct);
  const mult = researchMult || 1.0;
  return {
    atk: Math.round(preAtk * mult * 100) / 100,
    def: Math.round(preDef * mult * 100) / 100,
    fundPower: Math.round(fundPower * 100) / 100,
  };
}

// Average bot profile images
const BOT_IMAGES_M = [
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png',
];
const BOT_IMAGES_F = [
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png',
];

const avgBots = [
  { id: 'bot_tcr_002', username: '龙飞扬', gender: 'M', level: 18, role: 'vp',          avatarId: 'A_M_mo_money',        w1: 'F020', w2: 'F017', w3: 'W022', w4: 'W019', vehicle: 'V014', power: 'P010', pet: 'T008', w1stars: 4, w2stars: 3, w3stars: 4, w4stars: 3, avatarStars: 3, imgIdx: 0 },
  { id: 'bot_tcr_003', username: '虎啸天', gender: 'M', level: 16, role: 'war_general', avatarId: 'A_M_darius_dzul_v2',  w1: 'F018', w2: 'F015', w3: 'W020', w4: 'W017', vehicle: 'V012', power: 'P009', pet: 'T007', w1stars: 3, w2stars: 3, w3stars: 3, w4stars: 2, avatarStars: 2, imgIdx: 1 },
  { id: 'bot_tcr_004', username: '凤舞九天', gender: 'F', level: 15, role: 'strategist',  avatarId: 'A_F_smoken_sherry',   w1: 'F017', w2: 'F013', w3: 'W019', w4: 'W016', vehicle: 'V011', power: 'P008', pet: 'T007', w1stars: 3, w2stars: 2, w3stars: 3, w4stars: 2, avatarStars: 2, imgIdx: 0 },
  { id: 'bot_tcr_005', username: '雷霆一击', gender: 'M', level: 14, role: 'diplomat',   avatarId: 'A_M_jardon_wolfe',    w1: 'F015', w2: 'F012', w3: 'W017', w4: 'W014', vehicle: 'V010', power: 'P007', pet: 'T006', w1stars: 3, w2stars: 2, w3stars: 3, w4stars: 2, avatarStars: 2, imgIdx: 2 },
  { id: 'bot_tcr_006', username: '影武者',   gender: 'M', level: 13, role: 'officer',    avatarId: 'A_M_cool_clay',       w1: 'F014', w2: 'F011', w3: 'W016', w4: 'W013', vehicle: 'V009', power: 'P006', pet: 'T005', w1stars: 2, w2stars: 2, w3stars: 2, w4stars: 2, avatarStars: 1, imgIdx: 3 },
  { id: 'bot_tcr_007', username: '金刀战士', gender: 'M', level: 12, role: 'member',     avatarId: 'A_M_machinegun_lou',  w1: 'F013', w2: 'F010', w3: 'W015', w4: 'W012', vehicle: 'V008', power: 'P005', pet: 'T005', w1stars: 2, w2stars: 2, w3stars: 2, w4stars: 1, avatarStars: 1, imgIdx: 4 },
  { id: 'bot_tcr_008', username: '玉龙公主', gender: 'F', level: 11, role: 'member',     avatarId: 'A_F_selena_sanchez',  w1: 'F012', w2: 'F009', w3: 'W013', w4: 'W011', vehicle: 'V007', power: 'P004', pet: 'T004', w1stars: 2, w2stars: 1, w3stars: 2, w4stars: 1, avatarStars: 1, imgIdx: 1 },
  { id: 'bot_tcr_009', username: '神剑无双', gender: 'M', level: 10, role: 'member',     avatarId: 'A_M_carlos_mucho_mula', w1: 'F011', w2: 'F008', w3: 'W012', w4: 'W010', vehicle: 'V006', power: 'P003', pet: 'T003', w1stars: 1, w2stars: 1, w3stars: 2, w4stars: 1, avatarStars: 1, imgIdx: 0 },
  { id: 'bot_tcr_010', username: '锦绣山河', gender: 'F', level: 9,  role: 'member',     avatarId: 'A_F_maria_maria',     w1: 'F010', w2: 'F007', w3: 'W011', w4: 'W009', vehicle: 'V005', power: 'P002', pet: 'T003', w1stars: 1, w2stars: 1, w3stars: 1, w4stars: 1, avatarStars: 0, imgIdx: 2 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const results = [];

    // ─── 1. Clean up any existing TCR data (idempotent) ──────────────────
    const tcrBotIds = ['bot_tcr_001','bot_tcr_002','bot_tcr_003','bot_tcr_004','bot_tcr_005','bot_tcr_006','bot_tcr_007','bot_tcr_008','bot_tcr_009','bot_tcr_010'];

    // Delete existing alliances with tag TCR
    const existingAlliances = await base44.asServiceRole.entities.Alliance.filter({ tag: 'TCR' });
    for (const a of existingAlliances) {
      const existingMembers = await base44.asServiceRole.entities.AllianceMember.filter({ alliance_id: a.id });
      for (const m of existingMembers) { try { await base44.asServiceRole.entities.AllianceMember.delete(m.id); } catch(_) {} }
      try { await base44.asServiceRole.entities.Alliance.delete(a.id); } catch(_) {}
    }

    // Delete existing bot profiles by user_id
    for (const uid of tcrBotIds) {
      const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: uid });
      for (const p of profiles) { try { await base44.asServiceRole.entities.PlayerProfile.delete(p.id); } catch(_) {} }
      const invs = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: uid });
      for (const inv of invs) { try { await base44.asServiceRole.entities.PlayerInventory.delete(inv.id); } catch(_) {} }
    }

    let allianceId;

    // ─── 2. Create Alliance ────────────────────────────────────────────────
    const alliance = await base44.asServiceRole.entities.Alliance.create({
      name: 'The China Republic',
      tag: 'TCR',
      description: 'The China Republic — forged in discipline, strength, and ancient war strategy. Fear the dragon.',
      leader_user_id: 'bot_tcr_001',
      leader_username: 'Jimmy金鱼',
      member_count: 10,
      total_power: 0,
      hq_state: 'New York',
      hq_city: 'New York City',
      emblem: 'alliance_08',
      is_open: false,
      min_level: 999,
    });
    allianceId = alliance.id;

    // ─── 3. Create Jimmy金鱼 (leader) ──────────────────────────────────────
    // Jimmy: Nuke(F040) + Beam of Death(F039), Sovereign Market Blade(W_FEATURED_001) + Gamma Pressure Tool(W033)
    // Vehicle: Executive Phantom One (V_FEATURED_001), PoP: Shadow Council Director (P_FEATURED_001), Pet: Apex Shadow Dragon (T_FEATURED_001)
    // Avatar: Illuminati Master (A_M_illuminati) 8 stars
    // Firearms: 7-9 stars (different) - F040=8stars, F039=9stars
    // Accessories: 7-9 stars (different) - W_FEATURED_001=7stars, W033=8stars
    const jimmyLoadout = { weapon1: 'F040', weapon2: 'F039', weapon3: 'W_FEATURED_001', weapon4: 'W033', vehicle: 'V_FEATURED_001', power: 'P_FEATURED_001', pet: 'T_FEATURED_001' };
    const jimmyAvatarShards = shardsForStars(8);
    const jimmyWeaponUpgrades = {
      'F040': partsForStars(8),
      'F039': partsForStars(9),
      'W_FEATURED_001': partsForStars(7),
      'W033': partsForStars(8),
    };
    const jimmyFundMembers = 1809;
    const jimmyStats = computeStats({ level: 203, fundMembers: jimmyFundMembers, loadout: jimmyLoadout, weaponUpgrades: jimmyWeaponUpgrades, avatarId: 'A_M_illuminati', avatarShards: jimmyAvatarShards, researchMult: 1.18 });

    // IMPORTANT: profile_image_url must be a real bot PHOTO — NOT an avatar render URL
    const jimmyImgUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png';
    // Use asServiceRole for all creates to bypass RLS
    await base44.asServiceRole.entities.PlayerProfile.create({
      user_id: 'bot_tcr_001',
      username: 'Jimmy金鱼',
      gender: 'M',
      level: 203,
      xp: 15000000,
      respect: 210000,
      cash: 50000000,
      crypto: 9999,
      heat: 100,
      energy: 100,
      stamina: 100,
      attack_value: jimmyStats.atk,
      defense_value: jimmyStats.def,
      fund_power: jimmyStats.fundPower,
      fund_members_owned: jimmyFundMembers,
      total_jobs_completed: 9878,
      total_assists: 8461,
      total_sabotages: 4297,
      total_trades_completed: 13469,
      total_trade_war_wins: 9104,
      total_trade_war_losses: 171,
      winstreak: 78,
      equipped_avatar_id: 'A_M_illuminati',
      equipped_scene_id: 'scene_illuminati',
      equipped_theme_id: 'theme_012_illuminati',
      profile_image_url: jimmyImgUrl,
      alliance_tag: 'TCR',
      location_state: 'New York',
      location_city: 'New York City',
      has_completed_onboarding: true,
      vip_active_until: 9999999999000,
      sabotages_remaining: 3,
    });
    await base44.asServiceRole.entities.PlayerInventory.create({
      user_id: 'bot_tcr_001',
      loadout: jimmyLoadout,
      weaponUpgrades: jimmyWeaponUpgrades,
      avatarUpgrades: { 'A_M_illuminati': jimmyAvatarShards },
      firearms: { 'F040': 1, 'F039': 1 },
      weapons: { 'W_FEATURED_001': 1, 'W033': 1 },
      vehicles: { 'V_FEATURED_001': 1 },
      power: { 'P_FEATURED_001': 1 },
      pets: { 'T_FEATURED_001': 1 },
      avatars: { 'A_M_illuminati': 1 },
      researchLabLevel: 5,
    });
    await base44.asServiceRole.entities.AllianceMember.create({
      alliance_id: allianceId,
      user_id: 'bot_tcr_001',
      username: 'Jimmy金鱼',
      profile_image_url: jimmyImgUrl,
      level: 203,
      role: 'leader',
      fund_power: jimmyStats.atk + jimmyStats.def + jimmyStats.fundPower,
      joined_at: Date.now(),
    });
    results.push({ user_id: 'bot_tcr_001', username: 'Jimmy金鱼', atk: jimmyStats.atk, def: jimmyStats.def, fundPower: jimmyStats.fundPower, tp: jimmyStats.atk + jimmyStats.def + jimmyStats.fundPower });

    // ─── 4. Create average bot members ────────────────────────────────────
    for (const bot of avgBots) {
      const imgPool = bot.gender === 'F' ? BOT_IMAGES_F : BOT_IMAGES_M;
      const imgUrl = imgPool[bot.imgIdx % imgPool.length];
      const loadout = { weapon1: bot.w1, weapon2: bot.w2, weapon3: bot.w3, weapon4: bot.w4, vehicle: bot.vehicle, power: bot.power, pet: bot.pet };
      const weaponUpgrades = {
        [bot.w1]: partsForStars(bot.w1stars),
        [bot.w2]: partsForStars(bot.w2stars),
        [bot.w3]: partsForStars(bot.w3stars),
        [bot.w4]: partsForStars(bot.w4stars),
      };
      const avatarShards = shardsForStars(bot.avatarStars);
      const fundMembers = Math.max(5, Math.round(bot.level * 1.8));
      const researchMult = bot.role === 'vp' ? 1.10 : bot.role === 'war_general' || bot.role === 'strategist' ? 1.08 : 1.04;
      const stats = computeStats({ level: bot.level, fundMembers, loadout, weaponUpgrades, avatarId: bot.avatarId, avatarShards, researchMult });

      const wins = Math.floor(200 + Math.random() * 400);
      const losses = Math.floor(150 + Math.random() * 300);
      await base44.asServiceRole.entities.PlayerProfile.create({
        user_id: bot.id,
        username: bot.username,
        gender: bot.gender,
        level: bot.level,
        xp: bot.level * 8000,
        respect: bot.level * 200,
        cash: bot.level * 5000,
        crypto: Math.floor(bot.level * 1.5),
        heat: 80,
        energy: 80,
        stamina: 80,
        attack_value: stats.atk,
        defense_value: stats.def,
        fund_power: stats.fundPower,
        fund_members_owned: fundMembers,
        total_jobs_completed: Math.floor(bot.level * 15),
        total_assists: Math.floor(bot.level * 10),
        total_sabotages: Math.floor(bot.level * 4),
        total_trades_completed: Math.floor(bot.level * 60),
        total_trade_war_wins: wins,
        total_trade_war_losses: losses,
        winstreak: Math.floor(Math.random() * 8),
        equipped_avatar_id: bot.avatarId,
        equipped_scene_id: bot.level >= 20 ? 'scene_high_rise' : 'scene_trade_floor',
        equipped_theme_id: bot.gender === 'F' ? 'theme_002_pink_empire' : 'theme_001_rusty_hotness',
        profile_image_url: imgUrl,
        alliance_tag: 'TCR',
        location_state: 'New York',
        location_city: 'New York City',
        has_completed_onboarding: true,
        vip_active_until: 9999999999000,
        sabotages_remaining: 3,
      });
      await base44.asServiceRole.entities.PlayerInventory.create({
        user_id: bot.id,
        loadout,
        weaponUpgrades,
        avatarUpgrades: { [bot.avatarId]: avatarShards },
        firearms: { [bot.w1]: 1, [bot.w2]: 1 },
        weapons: { [bot.w3]: 1, [bot.w4]: 1 },
        vehicles: { [bot.vehicle]: 1 },
        power: { [bot.power]: 1 },
        pets: { [bot.pet]: 1 },
        researchLabLevel: Math.min(3, Math.floor(bot.level / 8)),
      });
      await base44.asServiceRole.entities.AllianceMember.create({
        alliance_id: allianceId,
        user_id: bot.id,
        username: bot.username,
        profile_image_url: imgUrl,
        level: bot.level,
        role: bot.role,
        fund_power: stats.atk + stats.def + stats.fundPower,
        joined_at: Date.now(),
      });
      results.push({ user_id: bot.id, username: bot.username, atk: stats.atk, def: stats.def, fundPower: stats.fundPower, tp: stats.atk + stats.def + stats.fundPower });
    }

    // Update alliance total_power
    const totalPower = results.reduce((sum, r) => sum + r.tp, 0);
    await base44.asServiceRole.entities.Alliance.update(allianceId, { total_power: Math.round(totalPower) });

    return Response.json({ success: true, alliance_id: allianceId, members: results.length, total_power: Math.round(totalPower), bots: results });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});