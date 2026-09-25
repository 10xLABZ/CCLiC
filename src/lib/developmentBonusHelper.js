/**
 * developmentBonusHelper.js
 * Computes active development set bonuses from the player's owned items.
 * Returns numeric bonus percentages for ATK, DEF, and income.
 */
import { getCategoryData } from '../components/store/catalogData';

// Weapon set bonuses (ordered by set index, groups of 3 items)
const WEAPON_SET_BONUS_LIST = [
  { atk: 2 }, { def: 2 }, { jobCash: 3 }, { tradeCash: 3 },
  { atk: 3 }, { def: 3 }, { jobCash: 3 }, { tradeCash: 3 },
  { atk: 4 }, { def: 4 }, { jobCash: 5 }, { tradeCash: 5 },
  { atk: 5 }, { def: 5 }, { jobCash: 5 }, { atk: 6, def: 3 },
  { atk: 8, def: 4 },
];

const VEHICLE_SET_BONUS_LIST = [
  { def: 2 }, { atk: 2 }, { def: 3 }, { def: 3 },
  { def: 4 }, { atk: 3, def: 2 }, { def: 5 }, { atk: 4 },
  { atk: 5, def: 2 }, { def: 6 }, { atk: 5, def: 3 }, { def: 7 },
  { atk: 6, def: 3 }, { def: 8 }, { atk: 7 }, { atk: 8, def: 4 },
  { atk: 10, def: 5 },
];

const PEOPLE_SET_BONUS_LIST = [
  { jobCash: 3 }, { tradeCash: 3 }, { jobCash: 4 }, { tradeCash: 4 },
  { jobCash: 5 }, { atk: 4, tradeCash: 3 }, { atk: 5 }, { tradeCash: 5, jobCash: 3 },
  { atk: 6 }, { tradeCash: 6 }, { jobCash: 7 }, { atk: 6, def: 4 },
  { tradeCash: 7 }, { atk: 8 }, { def: 8 }, { atk: 9, def: 5 },
  { allCash: 10 },
];

const PET_SET_BONUS_LIST = [
  { atk: 2 }, { def: 2 }, { atk: 3 }, { def: 3 },
  { atk: 4 }, { def: 4 }, { atk: 5, def: 2 }, { def: 5 },
  { atk: 6 }, { def: 6 }, { atk: 7, def: 3 }, { def: 7 },
  { atk: 8 }, { def: 8 }, { atk: 9, def: 4 }, { def: 10 },
  { atk: 10, def: 5 },
];

// All-set completion bonuses
const ALL_SET_BONUS = {
  weapons:  { atk: 5, def: 5, allCash: 5 },
  vehicles: { def: 5, allCash: 3 },
  people:   { allCash: 8, atk: 4 },
  pets:     { atk: 6, def: 6 },
};

function addBonus(result, bonus) {
  if (!bonus) return;
  result.atk       += bonus.atk       || 0;
  result.def       += bonus.def       || 0;
  result.jobCash   += bonus.jobCash   || 0;
  result.tradeCash += bonus.tradeCash || 0;
  result.allCash   += bonus.allCash   || 0;
}

/**
 * Returns development set bonus totals from completed item sets.
 * @param {object} playerData - Player data with inventory
 * @returns {{ atk, def, jobCash, tradeCash, allCash }} percentages
 */
export function getDevelopmentBonuses(playerData) {
  const inventory = playerData?.inventory || {};
  const result = { atk: 0, def: 0, jobCash: 0, tradeCash: 0, allCash: 0 };

  const isOwned = (cat, id) => (inventory[cat]?.[id] || 0) > 0;

  // ── Weapons ────────────────────────────────────────────────────────────────
  const weapons = getCategoryData('weapons');
  const numWeaponSets = Math.ceil(weapons.length / 3);
  let allWeaponComplete = true;
  for (let i = 0; i < numWeaponSets; i++) {
    const items = weapons.slice(i * 3, i * 3 + 3);
    const complete = items.length > 0 && items.every(item => isOwned('weapons', item.id));
    if (complete) addBonus(result, WEAPON_SET_BONUS_LIST[i]);
    else allWeaponComplete = false;
  }
  if (allWeaponComplete && numWeaponSets > 0) addBonus(result, ALL_SET_BONUS.weapons);

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const vehicles = getCategoryData('vehicles');
  const numVehicleSets = Math.ceil(vehicles.length / 3);
  let allVehicleComplete = true;
  for (let i = 0; i < numVehicleSets; i++) {
    const items = vehicles.slice(i * 3, i * 3 + 3);
    const complete = items.length > 0 && items.every(item => isOwned('vehicles', item.id));
    if (complete) addBonus(result, VEHICLE_SET_BONUS_LIST[i]);
    else allVehicleComplete = false;
  }
  if (allVehicleComplete && numVehicleSets > 0) addBonus(result, ALL_SET_BONUS.vehicles);

  // ── People of Power ────────────────────────────────────────────────────────
  const people = getCategoryData('people');
  const numPeopleSets = Math.ceil(people.length / 3);
  let allPeopleComplete = true;
  for (let i = 0; i < numPeopleSets; i++) {
    const items = people.slice(i * 3, i * 3 + 3);
    const complete = items.length > 0 && items.every(item => isOwned('power', item.id));
    if (complete) addBonus(result, PEOPLE_SET_BONUS_LIST[i]);
    else allPeopleComplete = false;
  }
  if (allPeopleComplete && numPeopleSets > 0) addBonus(result, ALL_SET_BONUS.people);

  // ── Pets ───────────────────────────────────────────────────────────────────
  const pets = getCategoryData('pets');
  const numPetSets = Math.ceil(pets.length / 3);
  let allPetComplete = true;
  for (let i = 0; i < numPetSets; i++) {
    const items = pets.slice(i * 3, i * 3 + 3);
    const complete = items.length > 0 && items.every(item => isOwned('pets', item.id));
    if (complete) addBonus(result, PET_SET_BONUS_LIST[i]);
    else allPetComplete = false;
  }
  if (allPetComplete && numPetSets > 0) addBonus(result, ALL_SET_BONUS.pets);

  return result;
}