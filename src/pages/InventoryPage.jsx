import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData, savePlayerData, consumeRegenResource, getInventoryQty, getEquippedCount, canEquipItem, updateLoadout, saveLoadoutSlot, equipAvatar, equipScene, equipTheme } from "../components/utils/playerStorage";
import { getCategoryData, AVATARS, FIREARMS } from "@/components/store/catalogData";
import { applyServerReward, consumeConsumable } from "@/lib/playerServerSync";
import { AVATAR_ABILITIES, getAvatarStarProgress, SUBS_PER_STAR } from "@/components/avatar/avatarAbilities";

const DEFAULT_AVATAR_NAMES = {
  avatar_male_01: 'Marcus Vaughn',
  avatar_male_02: 'Ethan Caldwell',
  avatar_male_03: 'Kenji Nakamura',
  avatar_male_04: 'Alejandro Reyes',
  avatar_female_01: 'Imani Brooks',
  avatar_female_02: 'Isabella Cruz',
  avatar_female_03: 'Mei Lin Chen',
  avatar_female_04: 'Claire Bennett',
};

const resolveAvatarName = (id) => {
  if (DEFAULT_AVATAR_NAMES[id]) return DEFAULT_AVATAR_NAMES[id];
  const catalogMatch = AVATARS.find(a => a.id === id);
  return catalogMatch?.name || id;
};
import { ALL_SCENES } from "@/components/store/scenesData";
import { ALL_THEMES, getEligibleThemes } from "@/components/store/themesData";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sword, Car, Crown, PawPrint, UserCircle2, CheckCircle2, Activity, RectangleVertical, ShoppingBag, Link2 } from "lucide-react";
import ConsumablesTab from "@/components/inventory/ConsumablesTab";
import WeaponUpgradeModal from "@/components/weapons/WeaponUpgradeModal";
import SimpleUpgradeModal from "@/components/upgrades/SimpleUpgradeModal";
import { getWeaponStarProgress, getWeaponUpgradeBonus, getWeaponPartsSpent, ARCHETYPE_CONFIG, COLLECTION_MILESTONES, getNextCollectionMilestone } from "@/components/weapons/weaponUpgradeSystem";
import { getUpgradeLevel, getUpgradeBonusPct, MAX_UPGRADE_LEVEL } from "@/components/upgrades/simpleUpgradeSystem";
import { toast } from "sonner";

const ThemesIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);

const CATEGORY_CONFIG = {
  weapons: { label: "Weapons", icon: Sword, dataKey: "weapons" },
  vehicles: { label: "Vehicles", icon: Car, dataKey: "vehicles" },
  power: { label: "People of Power", icon: Crown, dataKey: "people" },
  pets: { label: "Pets", icon: PawPrint, dataKey: "pets" },
  avatars: { label: "Avatars", icon: UserCircle2, dataKey: "avatars" },
  scenes: { label: "Scenes", icon: RectangleVertical, dataKey: "scenes" },
  themes: { label: "Themes", icon: ThemesIcon, dataKey: "themes" },
  consumables: { label: "Consumables", icon: Activity, dataKey: "consumables" }
};

const AVATAR_MAP = {
  avatar_male_01: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/292b1e86a_avatar-man-DEFAULT-01.png",
  avatar_male_02: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a4f286089_avatar-man-DEFAULT-02.png",
  avatar_male_03: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7d438f21a_avatar-man-DEFAULT-03.png",
  avatar_male_04: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/30c442480_avatar-man-DEFAULT-04.png",
  avatar_female_01: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fbf8a974f_avatar-female-DEFAULT-01.png",
  avatar_female_02: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/37fa65815_avatar-female-DEFAULT-02.png",
  avatar_female_03: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0a91424b9_avatar-female-DEFAULT-03.png",
  avatar_female_04: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/84e49abef_avatar-female-DEFAULT-04.png"
};

export default function InventoryPage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [activeTab, setActiveTab] = useState("weapons");
  const [weaponSubTab, setWeaponSubTab] = useState("firearms"); // 'firearms' | 'accessories'

  // Re-read player data after server sync completes (fires from initializeFromServer)
  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    // Also re-read on storage changes from other tabs
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('player_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);
  const [slotModal, setSlotModal] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(null); // { item }
  const [simpleUpgradeModal, setSimpleUpgradeModal] = useState(null); // { item, category }
  const [scenePreviewModal, setScenePreviewModal] = useState(null);
  const [avatarPreviewModal, setAvatarPreviewModal] = useState(null);

  const handleUseConsumable = (itemId) => {
    // Always re-read fresh from storage to get the full, current consumables map
    const player = getPlayerData();
    const consumables = player.consumables || {};

    if (!consumables[itemId] || consumables[itemId] <= 0) {
      toast.error("You don't have this item");
      return;
    }

    // Helper: decrement item qty — merges into FULL consumables map to prevent data loss
    const decremented = { ...consumables, [itemId]: consumables[itemId] - 1 };
    if (decremented[itemId] <= 0) delete decremented[itemId];

    if (itemId.startsWith('ENERGY_')) {
      const amount = parseInt(itemId.split('_')[1]);
      const newEnergy = Math.min(100, (player.energy || 0) + amount);
      savePlayerData({ consumables: decremented });
      consumeRegenResource('energy', newEnergy);
      toast.success(`Energy restored by ${amount}!`);
    } else if (itemId.startsWith('STAMINA_')) {
      const amount = parseInt(itemId.split('_')[1]);
      const newStamina = Math.min(100, (player.stamina || 0) + amount);
      savePlayerData({ consumables: decremented });
      consumeRegenResource('stamina', newStamina);
      toast.success(`Stamina restored by ${amount}!`);
    } else if (itemId.startsWith('OPCOVER_')) {
      const amount = parseInt(itemId.split('_')[1]);
      const newCover = Math.min(100, (player.opCover ?? 100) + amount);
      savePlayerData({ consumables: decremented });
      consumeRegenResource('opCover', newCover);
      toast.success(`Op Cover restored by ${amount}!`);
    } else if (itemId.startsWith('CASH_')) {
      const amountMap = { 'CASH_50K': 50000, 'CASH_100K': 100000, 'CASH_250K': 250000, 'CASH_500K': 500000, 'CASH_1M': 1000000 };
      const amount = amountMap[itemId];
      if (!amount) { toast.error("Unknown cash pack"); return; }
      (async () => {
        try {
          await consumeConsumable(itemId);
          await applyServerReward({ cash_delta: amount, reason: 'consumable_cash_pack' });
          setPlayerData(getPlayerData());
          toast.success(`Received $${amount.toLocaleString()}!`);
        } catch (e) {
          toast.error("Failed to use cash pack");
          setPlayerData(getPlayerData());
        }
      })();
      return;
    } else if (itemId.startsWith('CRYD_')) {
      const amountMap = { 'CRYD_50': 50, 'CRYD_200': 200, 'CRYD_500': 500, 'CRYD_1000': 1000, 'CRYD_2500': 2500, 'CRYD_5000': 5000 };
      const amount = amountMap[itemId];
      if (!amount) { toast.error("Unknown CRYD pack"); return; }
      (async () => {
        try {
          await consumeConsumable(itemId);
          await applyServerReward({ crypto_delta: amount, reason: 'consumable_cryd_pack' });
          setPlayerData(getPlayerData());
          toast.success(`Received ${amount} CRYD!`);
        } catch (e) {
          toast.error("Failed to use CRYD pack");
          setPlayerData(getPlayerData());
        }
      })();
      return;
    } else if (itemId.startsWith('SABOTAGE_')) {
      const amount = parseInt(itemId.split('_')[1]);
      const newSab = Math.min(20, (player.sabotagesRemaining || 0) + amount);
      savePlayerData({ sabotagesRemaining: newSab, consumables: decremented });
      toast.success(`+${amount} sabotages!`);
    } else if (itemId.startsWith('SHIELD_')) {
      const shieldDurations = {
        'SHIELD_12H': 12 * 60 * 60 * 1000,
        'SHIELD_1D': 24 * 60 * 60 * 1000,
        'SHIELD_3D': 72 * 60 * 60 * 1000
      };
      const duration = shieldDurations[itemId];
      const durationHours = duration / (1000 * 60 * 60);
      
      const now = Date.now();
      const currentShieldEnd = player.shieldActiveUntil || 0;
      const newShieldEnd = Math.max(now, currentShieldEnd) + duration;
      const endDate = new Date(newShieldEnd).toLocaleString();
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        `🛡️ SHIELD ACTIVATED\n\nShield will be active until: ${endDate}\n\nDuration: ${durationHours}h\n\n⚠️ WARNING: Attacking any player will BREAK your shield!\n\nProceed?`
      );
      
      if (!confirmed) return;
      
      savePlayerData({
        shieldActiveUntil: newShieldEnd,
        shieldType: itemId,
        consumables: decremented
      });
      
      toast.success(`Shield Active Until: ${endDate}`);
    }

    setPlayerData(getPlayerData());
  };

  const handleEquipWeapon = (item, slot) => {
    // Block equip if under level requirement
    if (item.equipLevel && item.equipLevel > playerData.level) {
      toast.error(`Cannot equip — requires Level ${item.equipLevel}`);
      return;
    }
    // Determine the correct inventory category
    const invCat = item.isFirearm ? 'firearms' : 'weapons';
    if (!canEquipItem(invCat, item.id)) {
      const ownedQty = getInventoryQty(invCat, item.id);
      toast.error(`You only own ${ownedQty}. Already equipped in a slot.`);
      return;
    }
    updateLoadout(slot, item.id);
    setPlayerData(getPlayerData());
    setSlotModal(null);
    toast.success(`Equipped ${item.name}!`);
  };

  const handleUnequipWeapon = (slot) => {
    updateLoadout(slot, null);
    setPlayerData(getPlayerData());
    setSlotModal(null);
    toast.success(`Slot cleared!`);
  };

  const handleEquipGear = async (category, item) => {
    const slotMap = { vehicles: 'vehicle', power: 'power', pets: 'pet' };
    const slot = slotMap[category];

    if (!canEquipItem(category, item.id)) {
      const ownedQty = getInventoryQty(category, item.id);
      toast.error(`You only own ${ownedQty}. Already equipped.`);
      return;
    }

    try {
      // Direct awaited server save — guarantees persistence before navigation
      await saveLoadoutSlot(slot, item.id);
      setPlayerData(getPlayerData());
      toast.success(`Equipped ${item.name}!`);
    } catch (err) {
      console.error('[InventoryPage] equip failed:', err);
      toast.error("Equip failed — try again");
    }
  };

  const handleEquipAvatar = (avatarId) => {
    const result = equipAvatar(avatarId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setPlayerData(getPlayerData());
    toast.success("Avatar equipped!");
  };

  const handleEquipScene = (sceneId) => {
    const result = equipScene(sceneId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setPlayerData(getPlayerData());
    toast.success("Scene equipped!");
  };

  const handleEquipTheme = (themeId) => {
    const result = equipTheme(themeId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setPlayerData(getPlayerData());
    toast.success("Theme equipped!");
  };

  const getOwnedItems = (category) => {
    // 'firearms' is not in CATEGORY_CONFIG so handle it separately
    const inventory = playerData.inventory?.[category] || {};
    let catalogItems;
    if (category === 'firearms') {
      catalogItems = getCategoryData('firearms');
    } else {
      catalogItems = getCategoryData(CATEGORY_CONFIG[category]?.dataKey || category);
    }
    
    return catalogItems.filter(item => inventory[item.id] > 0)
      .map(item => ({
        ...item,
        ownedQty: inventory[item.id],
        equippedCount: category === 'avatars' ? 0 : getEquippedCount(category, item.id)
      }));
  };

  const getOwnedAvatars = () => {
    const inventory = playerData.inventory?.avatars || {};
    return Object.keys(inventory).filter(id => inventory[id] > 0).map(id => ({
      id,
      name: resolveAvatarName(id),
      ownedQty: inventory[id],
      isEquipped: playerData.equippedAvatarId === id
    }));
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD />
      
      <div className="pt-[148px] max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 mb-1">INVENTORY</h1>
            <p className="text-xs text-slate-600">Your owned items and gear</p>
          </div>
          <Link to={`/ShopPage?tab=weapons&weaponSub=${activeTab === 'weapons' && weaponSubTab === 'accessories' ? 'accessories' : 'firearms'}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex gap-1 bg-[#0d1520] border border-slate-700 rounded-xl p-1.5 mx-auto w-fit">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="rounded-lg px-2.5 py-2 text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=inactive]:bg-[#0a0f1a] data-[state=inactive]:border data-[state=inactive]:border-slate-700 data-[state=inactive]:text-white hover:bg-slate-700 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Weapons */}
          <TabsContent value="weapons" className="space-y-2 mt-4">
            {/* WEAPONS / ACCESSORIES sub-tabs */}
            <div className="grid grid-cols-2 gap-0 mb-3 rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => setWeaponSubTab('firearms')}
                className={`py-2.5 text-sm font-black tracking-widest uppercase transition-colors ${weaponSubTab === 'firearms' ? 'bg-yellow-600 text-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                🔫 WEAPONS
              </button>
              <button
                onClick={() => setWeaponSubTab('accessories')}
                className={`py-2.5 text-sm font-black tracking-widest uppercase transition-colors flex items-center justify-center gap-1.5 ${weaponSubTab === 'accessories' ? 'bg-yellow-600 text-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <Link2 className="w-4 h-4" /> ACCESSORIES
              </button>
            </div>

            {/* Collection panel */}
            {(() => {
              const inventoryCat = weaponSubTab === 'firearms' ? 'firearms' : 'weapons';
              const ownedItems = getOwnedItems(inventoryCat);
              const total = weaponSubTab === 'firearms' ? 41 : 50;
              const nextMilestone = weaponSubTab === 'accessories' ? getNextCollectionMilestone(ownedItems.length) : null;
              return (
                <div className="bg-[#0d1420] border border-orange-900/30 rounded-lg p-2.5 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{weaponSubTab === 'firearms' ? 'Weapons' : 'Accessories'} Collection</div>
                      <div className="text-sm font-bold text-orange-400">{ownedItems.length} / {total} Owned</div>
                    </div>
                    {nextMilestone && (
                      <div className="text-right">
                        <div className="text-[9px] text-slate-600">Next Reward:</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">{nextMilestone.count} → {nextMilestone.bonus}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {getOwnedItems(weaponSubTab === 'firearms' ? 'firearms' : 'weapons').map((item) => {
              const totalSpent = getWeaponPartsSpent(playerData, item.id);
              const { star, subTier, starProgress, starPartsNeeded } = getWeaponStarProgress(totalSpent);
              const bonusPct = getWeaponUpgradeBonus(totalSpent);
              const barPct = starPartsNeeded > 0 ? Math.min(100, (starProgress / starPartsNeeded) * 100) : 0;
              const archCfg = item.weaponArchetype ? ARCHETYPE_CONFIG[item.weaponArchetype] : null;
              const loadout = playerData.loadout || {};
              const equippedSlots = ['weapon1','weapon2','weapon3','weapon4'].filter(s => loadout[s] === item.id);
              const hasEquippedSlots = equippedSlots.length > 0;
              const isFullyEquipped = item.equippedCount >= item.ownedQty;
              return (
                <div key={item.id} className={`border rounded-lg p-3 transition-opacity ${item.borderColor || 'border-slate-800'} ${hasEquippedSlots ? 'bg-slate-900/60 opacity-60' : 'bg-[#0a0f1a]'}`}>
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-200">{item.name}</h3>
                        {item.rarityLabel && (
                          <span className={`text-[9px] font-bold ${item.rarityColor}`}>[{item.rarityLabel}]</span>
                        )}
                        {archCfg && (
                          <span className={`text-[9px] font-semibold ${archCfg.color}`}>{archCfg.icon} {archCfg.label}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        +{item.atk} ATK • +{item.def} DEF{item.igcBonus > 0 ? ` • +${item.igcBonus}% IGC` : ''}
                      </div>
                      {equippedSlots.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {equippedSlots.map(s => (
                          <span key={s} className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-1.5 py-0.5 rounded-full">
                            ✅ {s === 'weapon3' ? 'Equipped — Accessory Slot 1 🗡️' : s === 'weapon4' ? 'Equipped — Accessory Slot 2 🗡️' : `Equipped — Weapon Slot #${s === 'weapon1' ? 1 : 2} 🔫`}
                          </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">Owned: {item.ownedQty} • Equipped: {item.equippedCount}</div>
                      <div className="mt-2 pt-2 border-t border-slate-800/60">
                        <div className="flex gap-0.5 mb-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className={`text-[10px] ${i < star ? 'text-yellow-400' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
                          ))}
                        </div>
                        {star < 10 && (
                          <div className="mb-1">
                            <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full bg-orange-500 transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                            <div className="text-[8px] text-slate-600 mt-0.5">{starProgress}/{starPartsNeeded} parts ({subTier}/5)</div>
                          </div>
                        )}
                        {star >= 10 && <div className="text-[9px] text-yellow-400 font-bold mb-1">★ MAX</div>}
                        <div className="text-[9px] text-emerald-400">Upgrade Bonus: +{bonusPct}%</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setUpgradeModal({ item })}
                        className="bg-orange-700 hover:bg-orange-600 text-xs"
                      >
                        ⚙ Upgrade
                      </Button>
                      {item.equipLevel && item.equipLevel > playerData.level ? (
                        <Button size="sm" variant="outline" disabled className="text-xs border-amber-700 text-amber-500">
                          Equip Lv{item.equipLevel}
                        </Button>
                      ) : (
                      <Button
                        size="sm"
                        onClick={() => setSlotModal({ item, category: 'weapons', isFirearm: !!item.isFirearm })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                      >
                        {hasEquippedSlots ? 'Change' : 'Equip'}
                      </Button>
                      )}
                      {hasEquippedSlots && equippedSlots.map(s => (
                        <Button
                          key={s}
                          size="sm"
                          onClick={() => handleUnequipWeapon(s)}
                          className="bg-red-900 hover:bg-red-800 text-xs"
                        >
                          Unequip
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {getOwnedItems(weaponSubTab === 'firearms' ? 'firearms' : 'weapons').length === 0 && (
              <div className="text-center text-slate-600 py-8">
                {weaponSubTab === 'firearms' ? 'No weapons owned yet' : 'No accessories owned yet'}
              </div>
            )}
          </TabsContent>

          {/* Vehicles */}
          <TabsContent value="vehicles" className="space-y-2 mt-4">
            {getOwnedItems('vehicles').map((item) => {
              const underLevel = item.requiredLevel && item.requiredLevel > playerData.level;
              const upgradeLvl = getUpgradeLevel(playerData, item.id);
              const bonusPct = getUpgradeBonusPct(upgradeLvl);
              return (
              <div key={item.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-semibold text-slate-200">{item.name}</h3>
                      {item.equippedCount > 0 && <span className="text-base leading-none">✅</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      +{item.atk} ATK • +{item.def} DEF
                      {bonusPct > 0 && <span className="text-white font-bold ml-1">(+{bonusPct}%)</span>}
                    </div>
                    {upgradeLvl > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-sm ${i < upgradeLvl ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                        ))}
                        <span className="text-[9px] text-cyan-400 ml-1">Lv.{upgradeLvl}</span>
                      </div>
                    )}
                    <div className="text-xs text-emerald-500 mt-1">
                      Owned: {item.ownedQty} • Equipped: {item.equippedCount}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setSimpleUpgradeModal({ item, category: 'vehicles' })}
                      className="bg-cyan-700 hover:bg-cyan-600 text-xs"
                    >
                      ⬆ Upgrade
                    </Button>
                    {underLevel ? (
                      <Button size="sm" variant="outline" disabled className="text-xs border-amber-700 text-amber-500">
                        Equip Lv{item.requiredLevel}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEquipGear('vehicles', item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                      >
                        {item.equippedCount > 0 ? 'Change' : 'Equip'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            {getOwnedItems('vehicles').length === 0 && (
              <div className="text-center text-slate-600 py-8">No vehicles owned yet</div>
            )}
          </TabsContent>

          {/* Power */}
          <TabsContent value="power" className="space-y-2 mt-4">
            {getOwnedItems('power').map((item) => {
              const underLevel = item.requiredLevel && item.requiredLevel > playerData.level;
              const upgradeLvl = getUpgradeLevel(playerData, item.id);
              const bonusPct = getUpgradeBonusPct(upgradeLvl);
              return (
              <div key={item.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-semibold text-slate-200">{item.name}</h3>
                      {item.equippedCount > 0 && <span className="text-base leading-none">✅</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      +{item.atk} ATK • +{item.def} DEF
                      {bonusPct > 0 && <span className="text-white font-bold ml-1">(+{bonusPct}%)</span>}
                    </div>
                    {upgradeLvl > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-sm ${i < upgradeLvl ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                        ))}
                        <span className="text-[9px] text-cyan-400 ml-1">Lv.{upgradeLvl}</span>
                      </div>
                    )}
                    <div className="text-xs text-emerald-500 mt-1">
                      Owned: {item.ownedQty} • Equipped: {item.equippedCount}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setSimpleUpgradeModal({ item, category: 'power' })}
                      className="bg-cyan-700 hover:bg-cyan-600 text-xs"
                    >
                      ⬆ Upgrade
                    </Button>
                    {underLevel ? (
                      <Button size="sm" variant="outline" disabled className="text-xs border-amber-700 text-amber-500">
                        Equip Lv{item.requiredLevel}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEquipGear('power', item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                      >
                        {item.equippedCount > 0 ? 'Change' : 'Equip'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            {getOwnedItems('power').length === 0 && (
              <div className="text-center text-slate-600 py-8">No people of power owned yet</div>
            )}
          </TabsContent>

          {/* Pets */}
          <TabsContent value="pets" className="space-y-2 mt-4">
            {getOwnedItems('pets').map((item) => {
              const underLevel = item.requiredLevel && item.requiredLevel > playerData.level;
              const upgradeLvl = getUpgradeLevel(playerData, item.id);
              const bonusPct = getUpgradeBonusPct(upgradeLvl);
              return (
              <div key={item.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-semibold text-slate-200">{item.name}</h3>
                      {item.equippedCount > 0 && <span className="text-base leading-none">✅</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      +{item.atk} ATK • +{item.def} DEF
                      {bonusPct > 0 && <span className="text-white font-bold ml-1">(+{bonusPct}%)</span>}
                    </div>
                    {upgradeLvl > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-sm ${i < upgradeLvl ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                        ))}
                        <span className="text-[9px] text-cyan-400 ml-1">Lv.{upgradeLvl}</span>
                      </div>
                    )}
                    <div className="text-xs text-emerald-500 mt-1">
                      Owned: {item.ownedQty} • Equipped: {item.equippedCount}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setSimpleUpgradeModal({ item, category: 'pets' })}
                      className="bg-cyan-700 hover:bg-cyan-600 text-xs"
                    >
                      ⬆ Upgrade
                    </Button>
                    {underLevel ? (
                      <Button size="sm" variant="outline" disabled className="text-xs border-amber-700 text-amber-500">
                        Equip Lv{item.requiredLevel}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEquipGear('pets', item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                      >
                        {item.equippedCount > 0 ? 'Change' : 'Equip'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            {getOwnedItems('pets').length === 0 && (
              <div className="text-center text-slate-600 py-8">No pets owned yet</div>
            )}
          </TabsContent>

          {/* Consumables */}
          <TabsContent value="consumables" className="mt-4">
            <ConsumablesTab
              playerData={playerData}
              onUse={handleUseConsumable}
            />
          </TabsContent>

          {/* Themes */}
          <TabsContent value="themes" className="space-y-2 mt-4">
            {(() => {
              const defaultThemes = ['theme_001_rusty_hotness'];
              const themeInventory = playerData.inventory?.themes || {};
              
              const eligibleThemes = getEligibleThemes(ALL_THEMES, playerData.gender);
              const allThemesToShow = eligibleThemes.filter(theme => 
                defaultThemes.includes(theme.id) || themeInventory[theme.id] > 0
              );
              
              if (allThemesToShow.length === 0) {
                return (
                  <div className="text-center text-slate-600 py-8">No themes owned yet</div>
                );
              }
              
              return (
                <div className="grid grid-cols-2 gap-3">
                  {allThemesToShow.map((theme) => {
                    const isEquipped = playerData.equippedThemeId === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className={`bg-[#0a0f1a] border rounded-lg p-2 ${isEquipped ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800'}`}
                      >
                        <div className="bg-slate-900 rounded-lg overflow-hidden mb-2" style={{ height: '200px' }}>
                          <img src={theme.previewImage} alt={theme.name} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-200 mb-1">{theme.name}</h3>
                        {isEquipped ? (
                          <Button size="sm" variant="outline" disabled className="w-full text-xs border-emerald-600 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Equipped
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleEquipTheme(theme.id)}
                            className="w-full text-xs bg-emerald-600 hover:bg-emerald-500"
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Scenes */}
          <TabsContent value="scenes" className="space-y-2 mt-4">
            {(() => {
              const defaultScenes = ['scene_default_01', 'scene_default_02', 'scene_default_03'];
              const sceneInventory = playerData.inventory?.scenes || {};
              
              const allScenesToShow = ALL_SCENES.filter(scene => 
                defaultScenes.includes(scene.id) || sceneInventory[scene.id] > 0
              );
              
              if (allScenesToShow.length === 0) {
                return (
                  <div className="text-center text-slate-600 py-8">No scenes owned yet</div>
                );
              }
              
              return (
                <div className="grid grid-cols-2 gap-3">
                  {allScenesToShow.map((scene) => {
                    const isEquipped = playerData.equippedSceneId === scene.id;
                    return (
                      <div
                        key={scene.id}
                        className={`bg-[#0a0f1a] border rounded-lg p-2 ${isEquipped ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800'}`}
                      >
                        <div
                          className="bg-slate-900 rounded-lg overflow-hidden mb-2 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                          style={{ aspectRatio: '9/16' }}
                          onClick={() => setScenePreviewModal(scene)}
                        >
                          <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-contain" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-200 mb-1">{scene.name}</h3>
                        {isEquipped ? (
                          <Button size="sm" variant="outline" disabled className="w-full text-xs border-emerald-600 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Equipped
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleEquipScene(scene.id)}
                            className="w-full text-xs bg-emerald-600 hover:bg-emerald-500"
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Avatars */}
          <TabsContent value="avatars" className="space-y-2 mt-4">
            {(() => {
              const defaultAvatarIds = [
                'avatar_male_01', 'avatar_male_02', 'avatar_male_03', 'avatar_male_04',
                'avatar_female_01', 'avatar_female_02', 'avatar_female_03', 'avatar_female_04'
              ];
              
              const allAvatarsToShow = [
                ...defaultAvatarIds.map(id => ({
                  id,
                  name: resolveAvatarName(id),
                  ownedQty: 1,
                  isEquipped: playerData.equippedAvatarId === id
                })),
                ...getOwnedAvatars().filter(a => !defaultAvatarIds.includes(a.id))
              ];
              
              return allAvatarsToShow.map((avatar) => {
                const ab = AVATAR_ABILITIES[avatar.id];
                const totalSpent = (playerData.avatarUpgrades || {})[avatar.id] || 0;
                const { star, subTier, starProgress, starShardsNeeded } = getAvatarStarProgress(totalSpent);
                const completedSubs = star * SUBS_PER_STAR + subTier;
                const bonusPct = (completedSubs * 0.2).toFixed(1);
                const barPct = starShardsNeeded > 0 ? Math.min(100, (starProgress / starShardsNeeded) * 100) : 0;
                const avatarImg = AVATAR_MAP[avatar.id] || AVATARS.find(a => a.id === avatar.id)?.imageUrl || null;
                return (
                  <div key={avatar.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="bg-slate-900/50 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                        style={{ width: '72px', aspectRatio: '9/16' }}
                        onClick={() => avatarImg && setAvatarPreviewModal({ id: avatar.id, name: resolveAvatarName(avatar.id), imageUrl: avatarImg })}
                      >
                        {avatarImg ? (
                          <img src={avatarImg} alt={avatar.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🧑‍💼</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm font-semibold text-slate-200 truncate">{resolveAvatarName(avatar.id)}</h3>
                          {avatar.isEquipped && (
                            <div className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Equipped
                            </div>
                          )}
                        </div>
                        {ab && (
                          <div className="mt-1">
                            <div className="text-[10px] text-slate-400 font-semibold">{ab.icon} {ab.label}</div>
                            <div className="text-[9px] text-emerald-400">{ab.stats.join(' • ')}{bonusPct > 0 ? ` (${bonusPct}%)` : ''}</div>
                          </div>
                        )}
                        {/* Stars */}
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className={`text-[10px] ${i < star ? 'text-yellow-400' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
                          ))}
                        </div>
                        {/* Progress bar */}
                        {star < 10 && (
                          <div className="mt-1">
                            <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full bg-yellow-500" style={{ width: `${barPct}%` }} />
                            </div>
                            <div className="text-[8px] text-slate-600 mt-0.5">{starProgress}/{starShardsNeeded} shards ({subTier}/{SUBS_PER_STAR})</div>
                          </div>
                        )}
                        {star >= 10 && <div className="text-[9px] text-yellow-400 font-bold mt-1">★ MAX</div>}
                        {!avatar.isEquipped && (
                          <Button
                            size="sm"
                            onClick={() => handleEquipAvatar(avatar.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs mt-1.5 h-6"
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Scene Preview Modal */}
      {scenePreviewModal && (
        <Dialog open={!!scenePreviewModal} onOpenChange={() => setScenePreviewModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">{scenePreviewModal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg overflow-hidden mx-auto" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
                <img src={scenePreviewModal.imageUrl} alt={scenePreviewModal.name} className="w-full h-full object-contain" />
              </div>
              <Button onClick={() => setScenePreviewModal(null)} variant="outline" className="w-full border-slate-700 text-slate-400">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Avatar Preview Modal */}
      {avatarPreviewModal && (
        <Dialog open={!!avatarPreviewModal} onOpenChange={() => setAvatarPreviewModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">{avatarPreviewModal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg overflow-hidden mx-auto" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
                <img src={avatarPreviewModal.imageUrl} alt={avatarPreviewModal.name} className="w-full h-full object-contain" />
              </div>
              <Button onClick={() => setAvatarPreviewModal(null)} variant="outline" className="w-full border-slate-700 text-slate-400">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Weapon Upgrade Modal */}
      <WeaponUpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        weapon={upgradeModal?.item}
        onUpgraded={() => setPlayerData(getPlayerData())}
      />

      {/* Simple Upgrade Modal (Vehicles, Pets, Power) */}
      <SimpleUpgradeModal
        open={!!simpleUpgradeModal}
        onClose={() => setSimpleUpgradeModal(null)}
        item={simpleUpgradeModal?.item}
        category={simpleUpgradeModal?.category}
        onUpgraded={() => setPlayerData(getPlayerData())}
      />

      {/* Weapon Slot Modal */}
      {slotModal && slotModal.category === 'weapons' && (
        <Dialog open={!!slotModal} onOpenChange={() => setSlotModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">
                {slotModal.item?.isFirearm ? 'Select Weapon Slot' : 'Select Accessory Slot'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {(slotModal.item?.isFirearm ? ["weapon1", "weapon2"] : ["weapon3", "weapon4"]).map((slot) => {
                const slotNum = slot === "weapon1" ? 1 : slot === "weapon2" ? 2 : slot === "weapon3" ? 1 : 2;
                const slotLabel = slot === "weapon3" ? "Accessory Slot 1 🗡️" : slot === "weapon4" ? "Accessory Slot 2 🗡️" : `Weapon Slot #${slotNum} 🔫`;
                const currentId = playerData.loadout?.[slot];
                const allItems = [...getCategoryData('firearms'), ...getCategoryData('weapons')];
                const currentItem = currentId ? allItems.find(w => w.id === currentId) : null;
                const isThisItemHere = currentId === slotModal.item.id;
                return (
                  <div key={slot} className={`rounded-lg border px-3 py-2.5 transition-colors ${isThisItemHere ? 'border-emerald-600/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/60'}`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{slotLabel}</div>
                    {currentItem ? (
                      <div className="flex items-center gap-2">
                        {currentItem.imageUrl && (
                          <img src={currentItem.imageUrl} alt={currentItem.name} className="w-8 h-8 object-contain rounded bg-slate-800 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold ${isThisItemHere ? 'text-emerald-300' : 'text-slate-300'}`}>{currentItem.name}</div>
                          <div className="text-[9px] text-slate-500">+{currentItem.atk} ATK • +{currentItem.def} DEF{currentItem.igcBonus > 0 ? ` • +${currentItem.igcBonus}% IGC` : ''}</div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {!isThisItemHere && (
                            <button
                              onClick={() => handleEquipWeapon(slotModal.item, slot)}
                              className="text-[9px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded-full hover:bg-emerald-900"
                            >
                              Equip Here
                            </button>
                          )}
                          {isThisItemHere && (
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 border border-emerald-700 px-1.5 py-0.5 rounded-full">✅ HERE</span>
                          )}
                          <button
                            onClick={() => handleUnequipWeapon(slot)}
                            className="text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded-full hover:bg-red-900/40"
                          >
                            Unequip
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEquipWeapon(slotModal.item, slot)}
                        className="w-full text-left text-xs text-emerald-400 italic hover:text-emerald-300"
                      >
                        Empty — tap to equip
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Divider */}
              <div className="pt-2 pb-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Weapons</div>
              </div>

              {/* List all owned weapons/firearms of the same type, grey out ones already in any slot */}
              {getOwnedItems(slotModal.item?.isFirearm ? 'firearms' : 'weapons').map((item) => {
                const loadout = playerData.loadout || {};
                const equippedInSlot = ['weapon1','weapon2','weapon3','weapon4'].find(s => loadout[s] === item.id);
                const slotLabel = equippedInSlot === 'weapon1' ? 'SLOT #1' : equippedInSlot === 'weapon2' ? 'SLOT #2' : equippedInSlot === 'weapon3' ? 'ACC SLOT 1' : equippedInSlot === 'weapon4' ? 'ACC SLOT 2' : null;
                const isCurrentItem = item.id === slotModal.item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!equippedInSlot) {
                        setSlotModal({ item, category: 'weapons' });
                      }
                    }}
                    className={`relative rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      equippedInSlot
                        ? 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                        : isCurrentItem
                        ? 'border-emerald-600 bg-emerald-950/20 cursor-pointer'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 cursor-pointer'
                    }`}
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain rounded bg-slate-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                      {item.rarityLabel && <div className={`text-[9px] font-bold ${item.rarityColor}`}>[{item.rarityLabel}]</div>}
                      <div className="text-[9px] text-slate-500">+{item.atk} ATK • +{item.def} DEF{item.igcBonus > 0 ? ` • +${item.igcBonus}% IGC` : ''}</div>
                      <div className="text-[9px] text-slate-600">Owned: {item.ownedQty}</div>
                    </div>
                    {slotLabel && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                        <span className="text-[11px] font-black text-red-400 tracking-widest">EQUIPPED {slotLabel}</span>
                      </div>
                    )}
                    {isCurrentItem && !equippedInSlot && (
                      <span className="text-[9px] font-bold text-emerald-400 border border-emerald-600 px-1.5 py-0.5 rounded-full shrink-0">Selecting</span>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNav />
    </div>
  );
}