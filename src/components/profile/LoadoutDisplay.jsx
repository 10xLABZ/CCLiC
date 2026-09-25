/**
 * LoadoutDisplay — redesigned loadout section with image-based slot backgrounds.
 *
 * Layout per slot:
 *   [cat1 image — title text at 15% left, vertically centered]
 *   [cat2 image — gear item image centered]
 *   [cat3 image — name / stars / stats]
 *
 * The three sections are placed side-by-side inside a relative container
 * that uses the square template image as background.
 */
import React from "react";
import { getWeaponPartsSpent, getWeaponStarProgress, getWeaponUpgradeBonus, ARCHETYPE_CONFIG } from "@/components/weapons/weaponUpgradeSystem";
import { getUpgradeLevel, getUpgradeBonusPct } from "@/components/upgrades/simpleUpgradeSystem";

// ── IMAGE URLS ──────────────────────────────────────────────────────────────
const IMGS = {
  topHeader:   "https://media.base44.com/images/public/699169456a354d6cb7082777/97d6ec9de_z-topheader.jpg",

  firearm1:    "https://media.base44.com/images/public/699169456a354d6cb7082777/711b8fee2_firearm1.jpg",
  firearm2:    "https://media.base44.com/images/public/699169456a354d6cb7082777/086a9b2aa_firearm2.jpg",
  firearm3:    "https://media.base44.com/images/public/699169456a354d6cb7082777/3e9940b7b_firearm3.jpg",

  accessory1:  "https://media.base44.com/images/public/699169456a354d6cb7082777/f534c2fd3_accessoy1.jpg",
  accessory2:  "https://media.base44.com/images/public/699169456a354d6cb7082777/a0ffae952_accessoy2.jpg",
  accessory3:  "https://media.base44.com/images/public/699169456a354d6cb7082777/c783df519_accessoy3.jpg",

  pet1:        "https://media.base44.com/images/public/699169456a354d6cb7082777/5ca92ad72_pet1a.jpg",
  pet2:        "https://media.base44.com/images/public/699169456a354d6cb7082777/06382f3f3_pet2a.jpg",
  pet3:        "https://media.base44.com/images/public/699169456a354d6cb7082777/ec79c46e1_pet3a.jpg",

  pop1:        "https://media.base44.com/images/public/699169456a354d6cb7082777/5ee754651_pop1.jpg",
  pop2:        "https://media.base44.com/images/public/699169456a354d6cb7082777/158db9237_pop2.jpg",
  pop3:        "https://media.base44.com/images/public/699169456a354d6cb7082777/189eacb41_pop3.jpg",

  vehicle1:    "https://media.base44.com/images/public/699169456a354d6cb7082777/bcaba5642_vehicle1.jpg",
  vehicle2:    "https://media.base44.com/images/public/699169456a354d6cb7082777/1bd1c52cf_vehicle2.jpg",
  vehicle3:    "https://media.base44.com/images/public/699169456a354d6cb7082777/10ac10d2c_vehicle3.jpg",
};

// ── SLOT CONFIG ─────────────────────────────────────────────────────────────
const SLOT_CONFIG = {
  weapon1:     { label: "Weapon Slot 1",   img1: IMGS.firearm1,   img2: IMGS.firearm2,   img3: IMGS.firearm3,   isWeapon: true },
  weapon2:     { label: "Weapon Slot 2",   img1: IMGS.firearm1,   img2: IMGS.firearm2,   img3: IMGS.firearm3,   isWeapon: true },
  weapon3:     { label: "Accessory Slot 1",img1: IMGS.accessory1, img2: IMGS.accessory2, img3: IMGS.accessory3, isWeapon: true },
  weapon4:     { label: "Accessory Slot 2",img1: IMGS.accessory1, img2: IMGS.accessory2, img3: IMGS.accessory3, isWeapon: true },
  personPower: { label: "Person of Power", img1: IMGS.pop1,       img2: IMGS.pop2,       img3: IMGS.pop3,       isWeapon: false },
  pet:         { label: "Pet",             img1: IMGS.pet1,       img2: IMGS.pet2,       img3: IMGS.pet3,       isWeapon: false },
  vehicle:     { label: "Vehicle",         img1: IMGS.vehicle1,   img2: IMGS.vehicle2,   img3: IMGS.vehicle3,   isWeapon: false, isWide: true },
};

// ── SINGLE SLOT CARD ────────────────────────────────────────────────────────
function SlotCard({ slotKey, equipped, onClick, playerData, isWide = false }) {
  const cfg = SLOT_CONFIG[slotKey];
  if (!cfg) return null;

  let star = 0, bonusPct = 0;
  let archCfg = null;
  let simpleUpgradeLvl = 0;
  let simpleBonusPct = 0;
  if (cfg.isWeapon && equipped && playerData) {
    const totalSpent = getWeaponPartsSpent(playerData, equipped.id);
    const prog = getWeaponStarProgress(totalSpent);
    star = prog.star;
    bonusPct = getWeaponUpgradeBonus(totalSpent);
    archCfg = equipped.weaponArchetype ? ARCHETYPE_CONFIG[equipped.weaponArchetype] : null;
  }
  if (!cfg.isWeapon && equipped && playerData) {
    simpleUpgradeLvl = getUpgradeLevel(playerData, equipped.id);
    simpleBonusPct = getUpgradeBonusPct(simpleUpgradeLvl);
  }

  // Stats parts — rendered as separate spans so the +% upgrade bonus
  // can be styled white+bold while ATK/DEF stay emerald.
  const statParts = equipped
    ? [
        equipped.atk > 0 ? { text: `+${equipped.atk} ATK`, highlight: false } : null,
        equipped.def > 0 ? { text: `+${equipped.def} DEF`, highlight: false } : null,
        equipped.igcBonus > 0 ? { text: `+${equipped.igcBonus}% IGC`, highlight: false, color: 'text-cyan-400' } : null,
        cfg.isWeapon && bonusPct > 0 ? { text: `+${bonusPct}%`, highlight: true } : null,
        !cfg.isWeapon && simpleBonusPct > 0 ? { text: `+${simpleBonusPct}%`, highlight: true } : null,
      ].filter(Boolean)
    : [];

  return (
    <button
      onClick={onClick}
      className="w-full hover:brightness-110 transition-all text-left overflow-hidden focus:outline-none"
      style={{ display: 'block' }}
    >
      {/* Three VERTICAL rows stacked: title → item image → name/stars/stats */}

      {/* ── ROW 1: title ── */}
      <div
        className="relative w-full flex items-center overflow-hidden"
        style={{
          height: isWide ? '36px' : '22px',
          backgroundImage: `url(${cfg.img1})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <span
          className="text-white font-bold leading-tight w-full text-center"
          style={{
            fontSize: '9px',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* ── ROW 2: gear item image ── */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{
          height: isWide ? '75px' : '60px',
          backgroundImage: `url(${cfg.img2})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {equipped?.imageUrl ? (
          <img
            src={equipped.imageUrl}
            alt={equipped.name}
            className="object-contain"
            style={{ width: '90%', height: '90%' }}
          />
        ) : (
          <span className="text-slate-500 text-[10px]">empty</span>
        )}
      </div>

      {/* ── ROW 3: name / stars / stats ── */}
      <div
        className="relative w-full flex flex-col justify-center overflow-hidden"
        style={{
          height: isWide ? '36px' : '44px',
          backgroundImage: `url(${cfg.img3})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          paddingTop: '3px',
          paddingBottom: '3px',
          paddingLeft: '10%',
          paddingRight: '6px',
        }}
      >
        {equipped ? (
          <>
            <div
              className="font-bold text-white truncate"
              style={{ fontSize: '9px', textShadow: '0 1px 3px rgba(0,0,0,0.9)', lineHeight: 1.3 }}
            >
              {equipped.name}{archCfg ? ` ${archCfg.icon}` : ""}
            </div>

            {cfg.isWeapon && (
              <div className="flex gap-[1px]" style={{ fontSize: '8px', lineHeight: 1 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={i < star ? 'text-yellow-400' : 'text-slate-600'}>
                    {i < star ? '★' : '☆'}
                  </span>
                ))}
              </div>
            )}

            {statParts.length > 0 ? (
              <div className="flex gap-2" style={{ fontSize: '7px', lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                {statParts.map((part, i) => (
                  <span key={i} className={part.highlight ? 'text-white font-bold' : (part.color || 'text-emerald-400')}>
                    {part.text}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <span className="text-slate-500 text-[8px]">Empty</span>
        )}
      </div>

    </button>
  );
}

// ── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function LoadoutDisplay({ playerData, loadout, onSlotClick, presetControls }) {
  const getItem = (key) => {
    if (!loadout) return null;
    const id = loadout[key];
    if (!id) return null;
    return playerData?._resolvedLoadout?.[key] || null;
  };

  return (
    <div className="w-full">
      {/* ── HEADER IMAGE + PRESET ROW ── */}
      <div className="relative w-full mb-1" style={{ height: '44px' }}>
        <img
          src={IMGS.topHeader}
          alt="Equipped Loadout"
          className="w-full h-full object-cover object-center rounded-t-xl"
        />
        {/* Preset controls overlaid on the right */}
        {presetControls && (
          <div className="absolute inset-0 flex items-center justify-end pr-3">
            {presetControls}
          </div>
        )}
      </div>

      {/* ── SLOT ROWS ── */}
      <div className="space-y-[3px]">
        {/* Firearms row */}
        <div className="grid grid-cols-2 gap-[3px]">
          <SlotCard slotKey="weapon1"     equipped={getItem('weapon1')}     onClick={() => onSlotClick?.('weapon1')}     playerData={playerData} />
          <SlotCard slotKey="weapon2"     equipped={getItem('weapon2')}     onClick={() => onSlotClick?.('weapon2')}     playerData={playerData} />
        </div>

        {/* Accessories row */}
        <div className="grid grid-cols-2 gap-[3px]">
          <SlotCard slotKey="weapon3"     equipped={getItem('weapon3')}     onClick={() => onSlotClick?.('weapon3')}     playerData={playerData} />
          <SlotCard slotKey="weapon4"     equipped={getItem('weapon4')}     onClick={() => onSlotClick?.('weapon4')}     playerData={playerData} />
        </div>

        {/* Person of Power + Pet */}
        <div className="grid grid-cols-2 gap-[3px]">
          <SlotCard slotKey="personPower" equipped={getItem('power')}       onClick={() => onSlotClick?.('personPower')} playerData={playerData} />
          <SlotCard slotKey="pet"         equipped={getItem('pet')}         onClick={() => onSlotClick?.('pet')}         playerData={playerData} />
        </div>

        {/* Vehicle — full width */}
        <SlotCard slotKey="vehicle"       equipped={getItem('vehicle')}     onClick={() => onSlotClick?.('vehicle')}     playerData={playerData} isWide />
      </div>
    </div>
  );
}