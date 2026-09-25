import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

// ── Weapon catalog (minimal copy — only what's needed for upgrade bonus calc) ──
// We inline just the ATK/DEF for the 50 base weapons + featured items.
// Upgrade bonus: each completed sub-upgrade (out of star*5+subTier) = +0.4% of base weapon stat.
// Parts thresholds per sub-upgrade:
const PARTS_PER_SUB = [3,5,8,12,18,3,5,8,12,18,3,5,8,12,18,3,5,8,12,18,3,5,8,12,18];
function getWeaponStarProgress(spent) {
  const subCosts = PARTS_PER_SUB;
  let remaining = spent;
  let completedSubs = 0;
  for (let i = 0; i < subCosts.length * 10 && remaining > 0; i++) {
    const cost = subCosts[i % subCosts.length];
    if (remaining >= cost) { remaining -= cost; completedSubs++; } else break;
  }
  const star = Math.floor(completedSubs / 5);
  const subTier = completedSubs % 5;
  return { star, subTier, completedSubs };
}

// Gear base stats lookup — ATK and DEF only, keyed by item id.
// This mirrors the core computeCombatStats logic from botGenerator.
// We reproduce the lookup inline so we don't need to import catalogData.
// NOTE: This function mirrors computeCombatStats from botGenerator.js.
// It computes: base level stats + gear loadout (weapons/vehicle/power/pet).
// The exact per-item stats are in catalogData; here we replicate the formula
// by fetching the PlayerInventory loadout and applying stats from the catalog.

// Weapon ATK/DEF array: index = weapon index 0-49 in the catalog.
// Formula: atk = round((1.5 + i*0.5)*10)/10, def = round((0.25 + i*0.15)*10)/10
function weaponStats(index) {
  return {
    atk: Math.round((1.5 + index * 0.5) * 10) / 10,
    def: Math.round((0.25 + index * 0.15) * 10) / 10
  };
}
// Vehicle: atk = round((0.5+i*0.4)*10)/10, def = round((1.0+i*0.5)*10)/10
function vehicleStats(index) {
  return {
    atk: Math.round((0.5 + index * 0.4) * 10) / 10,
    def: Math.round((1.0 + index * 0.5) * 10) / 10
  };
}
// People of Power: atk = round((0.5+i*0.5)*10)/10, def = round((0.5+i*0.4)*10)/10
function popStats(index) {
  return {
    atk: Math.round((0.5 + index * 0.5) * 10) / 10,
    def: Math.round((0.5 + index * 0.4) * 10) / 10
  };
}
// Pet: atk = round((0.25+i*0.7)*10)/10, def = round((0.75+i*0.35)*10)/10
function petStats(index) {
  return {
    atk: Math.round((0.25 + index * 0.7) * 10) / 10,
    def: Math.round((0.75 + index * 0.35) * 10) / 10
  };
}

// Map item id to stats. IDs: W001-W050, V001-V050, P001-P050, T001-T050, plus featured.
function getItemStats(id) {
  if (!id || typeof id !== 'string') return { atk: 0, def: 0 };

  // Featured items (hardcoded)
  if (id === 'W_FEATURED_001') return { atk: 20, def: 8 };
  if (id === 'V_FEATURED_001') return { atk: 10, def: 28 };
  if (id === 'P_FEATURED_001') return { atk: 14, def: 12 };
  if (id === 'T_FEATURED_001') return { atk: 22, def: 14 };

  const match = id.match(/^([WVPT])(\d{3})$/);
  if (!match) return { atk: 0, def: 0 };
  const type = match[1];
  const idx = parseInt(match[2], 10) - 1; // 0-based
  if (type === 'W') return weaponStats(idx);
  if (type === 'V') return vehicleStats(idx);
  if (type === 'P') return popStats(idx);
  if (type === 'T') return petStats(idx);
  return { atk: 0, def: 0 };
}

/**
 * Compute full ATK/DEF for a player given their profile + inventory.
 * Mirrors computeFullPlayerStats from playerStatsHelper.js.
 * Research and development bonuses are stored on the profile.
 */
function computeRealStats(profile, inventory) {
  const level = profile.level || 1;
  const loadout = inventory?.loadout || {};
  const weaponUpgrades = inventory?.weaponUpgrades || {};

  // 1. Base level stats (from computeCombatStats in botGenerator)
  let baseAtk = 10 + level * 0.5;
  let baseDef = 10 + level * 0.5;

  // 2. Add gear stats from loadout
  ['weapon1', 'weapon2', 'weapon3'].forEach(slot => {
    const s = getItemStats(loadout[slot]);
    baseAtk += s.atk;
    baseDef += s.def;
  });
  const veh = getItemStats(loadout.vehicle);
  baseAtk += veh.atk; baseDef += veh.def;
  const pow = getItemStats(loadout.power);
  baseAtk += pow.atk; baseDef += pow.def;
  const pet = getItemStats(loadout.pet);
  baseAtk += pet.atk; baseDef += pet.def;

  // 3. Fund power
  const fundMembers = profile.fund_members_owned || 0;
  const fundPower = fundMembers * (0.20 + level * 0.02);

  // 4. Weapon upgrade flat bonuses
  let wAtkBonus = 0, wDefBonus = 0;
  ['weapon1', 'weapon2', 'weapon3'].forEach(slot => {
    const wId = loadout[slot];
    const spent = weaponUpgrades[wId] || 0;
    if (wId && spent > 0) {
      const base = getItemStats(wId);
      const { completedSubs } = getWeaponStarProgress(spent);
      const bonusPct = (completedSubs * 0.4) / 100;
      wAtkBonus += base.atk * bonusPct;
      wDefBonus += base.def * bonusPct;
    }
  });

  // 5. Research bonuses (stored on profile as research_data JSON string or object)
  let researchAtkBonus = 0, researchDefBonus = 0;
  try {
    const rd = typeof profile.research_data === 'string'
      ? JSON.parse(profile.research_data)
      : (profile.research_data || {});
    // Mirror getResearchBonuses: bonuses are keyed by node id with level values
    // We just read the total % bonuses if stored, otherwise 0
    researchAtkBonus = (rd.weaponAtk || 0) + (rd.combatAtk || 0);
    researchDefBonus = (rd.weaponDef || 0);
  } catch {}

  const finalAtk = Math.round(
    (baseAtk + wAtkBonus) * (1 + researchAtkBonus / 100) * 100
  ) / 100;
  const finalDef = Math.round(
    (baseDef + wDefBonus) * (1 + researchDefBonus / 100) * 100
  ) / 100;
  const pwr = Math.round((finalAtk + finalDef) * 100) / 100;

  return { atk: finalAtk, def: finalDef, fundPower, pwr };
}

// HP-based battle sim — tight ±5% variance so power gaps dominate
const simulateHPBattle = (aAtk, aDef, bAtk, bDef) => {
  let aHP = Math.max(5, Math.round(aDef * 2 + aAtk));
  let bHP = Math.max(5, Math.round(bDef * 2 + bAtk));
  for (let i = 0; i < 60; i++) {
    const aDmg = Math.max(0.5, aAtk * (0.95 + Math.random() * 0.10) - bDef * 0.40);
    bHP -= aDmg;
    if (bHP <= 0) return true;
    const bDmg = Math.max(0.5, bAtk * (0.95 + Math.random() * 0.10) - aDef * 0.40);
    aHP -= bDmg;
    if (aHP <= 0) return false;
  }
  return aHP > bHP;
};

const isBot = (userId) => userId && (userId.startsWith('bot_') || userId.startsWith('nemesis_'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { building_id, city, state, target_slot_number } = await req.json();
    if (!building_id || !city || !state) {
      return Response.json({ error: 'Missing building_id, city, or state' }, { status: 400 });
    }

    // Fetch challenger profile + inventory in parallel
    const [profilesRaw, inventoriesRaw] = await Promise.all([
      base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id }),
      base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id }),
    ]);
    const profile = profilesRaw[0];
    const inventory = inventoriesRaw[0] || null;
    if (!profile) return Response.json({ error: 'Player profile not found' }, { status: 404 });

    const allSlotsRaw = await base44.asServiceRole.entities.TerritorySlot.filter({ building_id, city, state });
    const allSlots = Array.isArray(allSlotsRaw) ? allSlotsRaw : [];

    // Deduplicate: if player has multiple slot records, keep the best (lowest slot number) and delete extras
    const mySlotRecords = allSlots.filter(s => s.user_id === user.id).sort((a, b) => a.slot_number - b.slot_number);
    if (mySlotRecords.length > 1) {
      for (let i = 1; i < mySlotRecords.length; i++) {
        await base44.asServiceRole.entities.TerritorySlot.delete(mySlotRecords[i].id).catch(() => {});
      }
    }
    const mySlotRecord = mySlotRecords[0] || null;
    const mySlotNumber = mySlotRecord ? mySlotRecord.slot_number : null;

    let targetSlotNumber;
    let defenderSlot = null;

    if (target_slot_number) {
      targetSlotNumber = target_slot_number;
      defenderSlot = allSlots.find(s => s.slot_number === targetSlotNumber) || null;
      if (mySlotNumber === 1) {
        if (targetSlotNumber < 2 || targetSlotNumber > 4) {
          return Response.json({ error: 'Slot #1 can only defend against slots #2–4' }, { status: 400 });
        }
      } else if (mySlotNumber !== null && targetSlotNumber >= mySlotNumber) {
        return Response.json({ error: 'Can only challenge slots above your position' }, { status: 400 });
      }
    } else if (mySlotNumber === null) {
      targetSlotNumber = 50;
      defenderSlot = allSlots.find(s => s.slot_number === 50) || allSlots.sort((a, b) => b.slot_number - a.slot_number)[0] || null;
    } else {
      targetSlotNumber = mySlotNumber - 1;
      defenderSlot = allSlots.find(s => s.slot_number === targetSlotNumber);
    }

    // Stamp last_fight_at
    if (mySlotRecord) {
      await base44.asServiceRole.entities.TerritorySlot.update(mySlotRecord.id, { last_fight_at: Date.now() });
    }

    // Compute REAL challenger stats from inventory
    const challengerStats = computeRealStats(profile, inventory);
    const challengerAtk = challengerStats.atk;
    const challengerDef = challengerStats.def;
    const challengerPower = challengerStats.pwr;

    // If target slot is empty, just claim it
    if (!defenderSlot) {
      if (mySlotRecord) {
        await base44.asServiceRole.entities.TerritorySlot.update(mySlotRecord.id, {
          slot_number: targetSlotNumber,
          player_level: profile.level || 1,
          player_power: challengerPower
        });
      } else {
        await base44.asServiceRole.entities.TerritorySlot.create({
          building_id, city, state,
          slot_number: targetSlotNumber,
          user_id: user.id,
          username: profile.username || user.email,
          profile_image_url: profile.profile_image_url || '',
          player_level: profile.level || 1,
          player_power: challengerPower
        });
      }
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        total_trade_war_wins: (profile.total_trade_war_wins || 0) + 1,
        trade_wars_won_today: (profile.trade_wars_won_today || 0) + 1,
        winstreak: (profile.winstreak || 0) + 1,
        losstreak: 0
      });
      await base44.asServiceRole.entities.TerritoryBattleLog.create({
        building_id, city, state,
        challenger_user_id: user.id,
        challenger_username: profile.username || user.email,
        challenger_slot: mySlotNumber,
        defender_username: 'Open Slot',
        defender_slot: targetSlotNumber,
        outcome: 'WIN',
        timestamp: Date.now()
      });
      return Response.json({
        outcome: 'WIN',
        slot: targetSlotNumber,
        payout: getSlotPayout(targetSlotNumber),
        message: `Claimed slot #${targetSlotNumber}! Earns $${getSlotPayout(targetSlotNumber) * 24}/day`
      });
    }

    const defenderIsBot = isBot(defenderSlot.user_id) || defenderSlot.is_nemesis === true;

    // Compute defender stats
    let defAtk, defDef, defenderPower;
    if (!defenderIsBot && defenderSlot.user_id) {
      // Fetch live defender profile + inventory
      const [defProfilesRaw, defInvsRaw] = await Promise.all([
        base44.asServiceRole.entities.PlayerProfile.filter({ user_id: defenderSlot.user_id }),
        base44.asServiceRole.entities.PlayerInventory.filter({ user_id: defenderSlot.user_id }),
      ]);
      const defProfile = defProfilesRaw[0];
      const defInv = defInvsRaw[0] || null;
      if (defProfile) {
        const defStats = computeRealStats(defProfile, defInv);
        defAtk = defStats.atk;
        defDef = defStats.def;
        defenderPower = defStats.pwr;
      } else {
        const pwr = defenderSlot.player_power || 20;
        defAtk = pwr * 0.55;
        defDef = pwr * 0.45;
        defenderPower = pwr;
      }
    } else {
      // Bot: use stored player_power to split ATK/DEF
      defenderPower = defenderSlot.player_power || 20;
      defAtk = defenderPower * 0.55;
      defDef = defenderPower * 0.45;
    }

    const won = simulateHPBattle(challengerAtk, challengerDef, defAtk, defDef);
    const isDefendingDown = mySlotNumber === 1 && targetSlotNumber > 1;

    if (won) {
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        total_trade_war_wins: (profile.total_trade_war_wins || 0) + 1,
        trade_wars_won_today: (profile.trade_wars_won_today || 0) + 1,
        winstreak: (profile.winstreak || 0) + 1,
        losstreak: 0
      });

      if (isDefendingDown) {
        await base44.asServiceRole.entities.TerritoryBattleLog.create({
          building_id, city, state,
          challenger_user_id: user.id,
          challenger_username: profile.username || user.email,
          challenger_profile_image_url: profile.profile_image_url || '',
          challenger_slot: mySlotNumber,
          defender_user_id: defenderIsBot ? null : defenderSlot.user_id,
          defender_username: defenderSlot.username,
          defender_slot: defenderSlot.slot_number,
          outcome: 'WIN',
          timestamp: Date.now()
        });
        return Response.json({
          outcome: 'WIN',
          slot: mySlotNumber,
          payout: getSlotPayout(mySlotNumber),
          message: `Defended! ${defenderSlot.username} couldn't take your throne.`,
          defender_name: defenderSlot.username
        });
      }

      // Push-off protocol: if challenger had no slot (new entrant), DELETE the defender
      // from the leaderboard instead of capping/pushing down (which created duplicates & orphans).
      // If challenger had a slot, swap positions (defender takes challenger's old slot).
      if (defenderIsBot) {
        if (mySlotRecord) {
          await base44.asServiceRole.entities.TerritorySlot.update(defenderSlot.id, {
            slot_number: mySlotRecord.slot_number,
            bot_losses: (defenderSlot.bot_losses || 0) + 1
          });
        } else {
          await base44.asServiceRole.entities.TerritorySlot.delete(defenderSlot.id);
        }
      } else {
        if (mySlotRecord) {
          await base44.asServiceRole.entities.TerritorySlot.update(defenderSlot.id, { slot_number: mySlotRecord.slot_number });
        } else {
          await base44.asServiceRole.entities.TerritorySlot.delete(defenderSlot.id);
        }
      }

      if (mySlotRecord) {
        await base44.asServiceRole.entities.TerritorySlot.update(mySlotRecord.id, {
          slot_number: targetSlotNumber,
          player_level: profile.level || 1,
          player_power: challengerPower,
          is_nemesis: false
        });
      } else {
        await base44.asServiceRole.entities.TerritorySlot.create({
          building_id, city, state,
          slot_number: targetSlotNumber,
          user_id: user.id,
          username: profile.username || user.email,
          profile_image_url: profile.profile_image_url || '',
          player_level: profile.level || 1,
          player_power: challengerPower,
          is_nemesis: false
        });
      }

      await base44.asServiceRole.entities.TerritoryBattleLog.create({
        building_id, city, state,
        challenger_user_id: user.id,
        challenger_username: profile.username || user.email,
        challenger_profile_image_url: profile.profile_image_url || '',
        challenger_slot: mySlotNumber,
        defender_user_id: defenderIsBot ? null : defenderSlot.user_id,
        defender_username: defenderSlot.username,
        defender_slot: defenderSlot.slot_number,
        outcome: 'WIN',
        timestamp: Date.now()
      });
      return Response.json({
        outcome: 'WIN',
        slot: targetSlotNumber,
        payout: getSlotPayout(targetSlotNumber),
        message: `Defeated ${defenderSlot.username}! Moved to slot #${targetSlotNumber} — earns $${getSlotPayout(targetSlotNumber) * 24}/day`,
        defender_name: defenderSlot.username
      });
    } else {
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, {
        total_trade_war_losses: (profile.total_trade_war_losses || 0) + 1,
        losstreak: (profile.losstreak || 0) + 1,
        winstreak: 0
      });

      if (defenderIsBot) {
        await base44.asServiceRole.entities.TerritorySlot.update(defenderSlot.id, {
          bot_wins: (defenderSlot.bot_wins || 0) + 1
        });
      }

      await base44.asServiceRole.entities.TerritoryBattleLog.create({
        building_id, city, state,
        challenger_user_id: user.id,
        challenger_username: profile.username || user.email,
        challenger_profile_image_url: profile.profile_image_url || '',
        challenger_slot: mySlotNumber,
        defender_user_id: defenderIsBot ? null : defenderSlot.user_id,
        defender_username: defenderSlot.username,
        defender_slot: defenderSlot.slot_number,
        outcome: 'LOSS',
        timestamp: Date.now()
      });
      return Response.json({
        outcome: 'LOSS',
        slot: mySlotNumber,
        message: `${defenderSlot.username} held their ground!`,
        defender_name: defenderSlot.username,
        defender_power: defenderPower,
        challenger_power: challengerPower
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});