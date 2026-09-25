import React, { useState, useEffect } from "react";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import GlobalChatBar from "@/components/chat/GlobalChatBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCategoryDataShopOnly as getCategoryData, getCategoryData as getCategoryDataFull, FEATURED_ITEMS_BY_CATEGORY, FEATURED_FIREARM } from "@/components/store/catalogData";
import { AVATAR_ABILITIES, getAvatarStarProgress, SUBS_PER_STAR, getAvatarStatBonus, STAR_SHARD_REQUIREMENTS } from "@/components/avatar/avatarAbilities";
import { getWeaponUpgradeBonus, WEAPON_STAR_COSTS, getRarityUpgradeMaxPct } from "@/components/weapons/weaponUpgradeSystem";
import { PREMIUM_SCENES, getSceneById } from "@/components/store/scenesData";
import { ALL_THEMES } from "@/components/store/themesData";
import { getPlayerData, savePlayerData, updateEquipped, addToInventory, getInventoryQty, canEquipItem, updateLoadout, equipAvatar, equipScene, equipTheme } from "../components/utils/playerStorage";
import PurchaseOverlay from "@/components/shared/PurchaseOverlay";
import { equipCosmetic, clearPendingFlush, applyServerReward, consumeConsumable } from "@/lib/playerServerSync";
import { kvGet, kvSet } from "@/lib/playerMemory";


import { uploadToCloud } from "../components/utils/cloudSaveHelper";
import { ENABLE_CLOUD_SAVE } from "@/lib/constants";
import { refreshFromServer } from "@/lib/playerServerSync";
import { getOwnedItems, addOwnedItem, isItemOwned } from "../components/utils/storeStorage";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sword, Car, Crown, PawPrint, Lock, CheckCircle2, Octagon, DollarSign, UserCircle2, AlertCircle, Zap, BatteryFull, Activity, RectangleVertical, Settings, Skull, Link2, Shield, ShieldAlert, Puzzle, Info, PartyPopper, Globe } from "lucide-react";
import CrydIcon from "@/components/shared/CrydIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ItemImagePreviewModal from "@/components/shared/ItemImagePreviewModal";
import ShopBannerCarousel from "@/components/shop/ShopBannerCarousel";
import ShopVipTab from "@/components/shop/ShopVipTab";

const AVATAR_SHARD_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c5ea853fc_avatarshard1.png";
const GEAR_PART_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c2b4a0d83_gearparts1.png";

const writeSystemMessage = async (title, body, extra = {}) => {
  try {
    const user = await base44.auth.me();
    if (!user) return;
    await base44.entities.SystemMessage.create({
      user_id: user.id,
      type: extra.is_consumable ? 'purchase_consumable' : 'purchase_nonconsumable',
      title,
      body,
      item_id: extra.item_id || '',
      item_name: extra.item_name || title,
      currency: extra.currency || 'cryd',
      amount_paid: extra.amount_paid || 0,
      quantity: extra.quantity || 1,
      category: extra.category || '',
      is_consumable: extra.is_consumable || false,
      restored: false,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error('SystemMessage write failed:', e);
  }
};

const ThemesIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);

const CATEGORY_CONFIG = {
  weapons: { label: "Weapons", icon: Sword, color: "emerald" },
  vehicles: { label: "Vehicles", icon: Car, color: "blue" },
  people: { label: "People of Power", icon: Crown, color: "purple" },
  pets: { label: "Pets", icon: PawPrint, color: "amber" },
  avatars: { label: "Avatars", icon: UserCircle2, color: "cyan" },
  scenes: { label: "Scenes", icon: RectangleVertical, color: "pink" },
  themes: { label: "Themes", icon: ThemesIcon, color: "violet" },
  consumables: { label: "Consumables", icon: Activity, color: "green" }
};

const SIDEBAR_ITEMS = [
  { key: "holiday", label: "EVENT", icon: PartyPopper },
  { key: "consumables", label: "SUPPLY", icon: Activity },
  { key: "themes", label: "THEMES", icon: ThemesIcon },
  { key: "scenes", label: "SCENES", icon: RectangleVertical },
  { key: "avatars", label: "AVATARS", icon: UserCircle2 },
  { key: "pets", label: "PETS", icon: PawPrint },
  { key: "people", label: "POWER", icon: Crown },
  { key: "vehicles", label: "RIDES", icon: Car },
  { key: "weapons", label: "ARMS", icon: Sword },
];

const RESOURCE_PACKAGES = {
  cash: [
    { id: "C1", amount: 100000, price: 2.99 },
    { id: "C2", amount: 250000, price: 4.99 },
    { id: "C3", amount: 750000, price: 9.99 },
    { id: "C4", amount: 2500000, price: 24.99 },
    { id: "C5", amount: 5000000, price: 49.99 },
    { id: "C6", amount: 10000000, price: 99.99 }
  ],
  cryd: [
    { id: "CR1", amount: 50, price: 0.99 },
    { id: "CR2", amount: 200, price: 4.99 },
    { id: "CR3", amount: 500, price: 9.99 },
    { id: "CR4", amount: 2000, price: 24.99 },
    { id: "CR5", amount: 5000, price: 89.99 },
    { id: "CR6", amount: 10000, price: 99.99 }
  ]
};

// Economy: 1 USD = 10,000 IGC | 1 CRYD = $0.02 USD (500 CRYD = $9.99)
// IGC cash packs: 10,000 IGC = $1 so 100K IGC = $10 = 500 CRYD
// Energy/Stamina refill 100: ~$0.50 = 25 CRYD | Heat reducer 100: ~$0.60 = 30 CRYD
const CONSUMABLES = {
  cash: [
    { id: "CASH_50K", name: "💵 50,000 IGC", amount: 50000, priceCash: 0, priceCrypto: 300 },
    { id: "CASH_100K", name: "💵 100,000 IGC", amount: 100000, priceCash: 0, priceCrypto: 500 },
    { id: "CASH_250K", name: "💵 250,000 IGC", amount: 250000, priceCash: 0, priceCrypto: 1100 },
    { id: "CASH_500K", name: "💵 500,000 IGC", amount: 500000, priceCash: 0, priceCrypto: 2000 },
    { id: "CASH_1M", name: "💵 1,000,000 IGC", amount: 1000000, priceCash: 0, priceCrypto: 3500 }
  ],
  cryd: [
    { id: "CRYD_50", name: "50 CRYD", amount: 50, priceCash: 0, priceCrypto: 0, priceUSD: 0.99 },
    { id: "CRYD_200", name: "200 CRYD", amount: 200, priceCash: 0, priceCrypto: 0, priceUSD: 3.99 },
    { id: "CRYD_500", name: "500 CRYD", amount: 500, priceCash: 0, priceCrypto: 0, priceUSD: 9.99 },
    { id: "CRYD_1000", name: "1,000 CRYD", amount: 1000, priceCash: 0, priceCrypto: 0, priceUSD: 14.99, originalPriceUSD: 19.99, valueLabel: "133% VALUE", dailyLimit: true },
    { id: "CRYD_2500", name: "2,500 CRYD", amount: 2500, priceCash: 0, priceCrypto: 0, priceUSD: 49.99 },
    { id: "CRYD_5000", name: "5,000 CRYD", amount: 5000, priceCash: 0, priceCrypto: 0, priceUSD: 89.99, originalPriceUSD: 99.99, valueLabel: "111% VALUE" }
  ],
  opcover: [
    { id: "OPCOVER_25", name: "🛡️ Cover Booster (+25)", amount: 25, priceCash: 6000, priceCrypto: 8 },
    { id: "OPCOVER_50", name: "🛡️ Cover Booster (+50)", amount: 50, priceCash: 11000, priceCrypto: 15 },
    { id: "OPCOVER_75", name: "🛡️ Cover Booster (+75)", amount: 75, priceCash: 16000, priceCrypto: 22 },
    { id: "OPCOVER_100", name: "🛡️ Cover Refill (+100)", amount: 100, priceCash: 20000, priceCrypto: 30 }
  ],
  energy: [
    { id: "ENERGY_25", name: "Energy Boost (25)", amount: 25, priceCash: 3500, priceCrypto: 5 },
    { id: "ENERGY_50", name: "Energy Boost (50)", amount: 50, priceCash: 6500, priceCrypto: 10 },
    { id: "ENERGY_75", name: "Energy Boost (75)", amount: 75, priceCash: 9500, priceCrypto: 15 },
    { id: "ENERGY_100", name: "Energy Refill (100)", amount: 100, priceCash: 14000, priceCrypto: 25 }
  ],
  stamina: [
    { id: "STAMINA_25", name: "Stamina Boost (25)", amount: 25, priceCash: 3500, priceCrypto: 5 },
    { id: "STAMINA_50", name: "Stamina Boost (50)", amount: 50, priceCash: 6500, priceCrypto: 10 },
    { id: "STAMINA_75", name: "Stamina Boost (75)", amount: 75, priceCash: 9500, priceCrypto: 15 },
    { id: "STAMINA_100", name: "Stamina Refill (100)", amount: 100, priceCash: 14000, priceCrypto: 25 }
  ],
  sabotage: [
    { id: "SABOTAGE_3", name: "Sabotage Boost (+3)", amount: 3, priceCash: 0, priceCrypto: 10 },
    { id: "SABOTAGE_10", name: "Sabotage Refill (10)", amount: 10, priceCash: 0, priceCrypto: 25 }
  ],
  shards: [
    { id: "AVATAR_SHARD_10", name: "Avatar Shard (x10)", amount: 10, priceCash: 0, priceCrypto: 315 },
    { id: "AVATAR_SHARD_20", name: "Avatar Shard (x20)", amount: 20, priceCash: 0, priceCrypto: 625 },
    { id: "AVATAR_SHARD_50", name: "Avatar Shard (x50)", amount: 50, priceCash: 0, priceCrypto: 1250 },
    { id: "AVATAR_SHARD_100", name: "Avatar Shard (x100)", amount: 100, priceCash: 0, priceCrypto: 2500 },
    { id: "AVATAR_SHARD_200", name: "Avatar Shard (x200)", amount: 200, priceCash: 0, priceCrypto: 5000 }
  ],
  shields: [
    { id: "SHIELD_12H", name: "🌐 Shield: 12 Hours", duration: 12 * 60 * 60 * 1000, priceCash: 0, priceCrypto: 5 },
    { id: "SHIELD_1D", name: "🌐 Shield: 1 Day", duration: 24 * 60 * 60 * 1000, priceCash: 0, priceCrypto: 15 },
    { id: "SHIELD_3D", name: "🌐 Shield: 3 Days", duration: 72 * 60 * 60 * 1000, priceCash: 0, priceCrypto: 50 }
  ],
  parts: [
    { id: "GEAR_SHARD_10", name: "Gear Part (x10)", amount: 10, priceCash: 0, priceCrypto: 315 },
    { id: "GEAR_SHARD_20", name: "Gear Part (x20)", amount: 20, priceCash: 0, priceCrypto: 625 },
    { id: "GEAR_SHARD_50", name: "Gear Part (x50)", amount: 50, priceCash: 0, priceCrypto: 1250 },
    { id: "GEAR_SHARD_100", name: "Gear Part (x100)", amount: 100, priceCash: 0, priceCrypto: 2500 },
    { id: "GEAR_SHARD_200", name: "Gear Part (x200)", amount: 200, priceCash: 0, priceCrypto: 5000 }
  ]
};

export default function ShopPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(() => urlParams.get('tab') || 'weapons');
  const [weaponSubTab, setWeaponSubTab] = useState(() => urlParams.get('weaponSub') || 'firearms'); // 'firearms' or 'accessories'
  const [consumableSubTab, setConsumableSubTab] = useState(() => urlParams.get('sub') || 'cash');

  // Re-apply URL params if navigation updates (e.g. from heat-reducer deep link)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab')) setActiveTab(p.get('tab'));
    if (p.get('sub')) setConsumableSubTab(p.get('sub'));
    if (p.get('weaponSub')) setWeaponSubTab(p.get('weaponSub'));
  }, [window.location.search]);
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [ownedItems, setOwnedItems] = useState(getOwnedItems());
  const [equipSlotModal, setEquipSlotModal] = useState(null);
  const [insufficientFundsModal, setInsufficientFundsModal] = useState(null);
  const [confirmEquipModal, setConfirmEquipModal] = useState(null);
  const [currencyChoiceModal, setCurrencyChoiceModal] = useState(null);
  const [scenePreviewModal, setScenePreviewModal] = useState(null);
  const [themePreviewModal, setThemePreviewModal] = useState(null);
  const [vehiclePreviewModal, setVehiclePreviewModal] = useState(null);
  const [itemImagePreview, setItemImagePreview] = useState(null);
  const [purchaseOverlay, setPurchaseOverlay] = useState(null); // { status, item, error }
  const [page, setPage] = useState(1);
  const [underLevelWarning, setUnderLevelWarning] = useState(null); // { category, item }
  const [avatarPreviewModal, setAvatarPreviewModal] = useState(null);
  const [abilityPreview, setAbilityPreview] = useState(null);
  const [activeHolidays, setActiveHolidays] = useState([]);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    const handleSync = () => {
      setPlayerData(getPlayerData());
      setOwnedItems(getOwnedItems());
    };
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  // Listen for banner clicks — switch tab if already on ShopPage
  useEffect(() => {
    const handleBannerClick = (e) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        setPage(1);
      }
    };
    window.addEventListener('shop_banner_click', handleBannerClick);
    return () => window.removeEventListener('shop_banner_click', handleBannerClick);
  }, []);

  useEffect(() => {
    base44.entities.HolidayEvent.filter({ is_active: true })
      .then(setActiveHolidays)
      .catch(() => {});
  }, []);

  const handlePurchase = (category, item) => {
    if (item.level && item.level > playerData.level) {
      toast.error(`Locked! Requires Level ${item.level}`);
      return;
    }
    // For weapons/firearms: allow purchase even if under equip level, but warn
    if ((category === 'weapons' || category === 'firearms') && item.equipLevel && item.equipLevel > playerData.level) {
      setUnderLevelWarning({ category, item });
      return;
    }
    if (category !== 'weapons' && category !== 'firearms' && item.requiredLevel > playerData.level) {
      toast.error(`Locked! Requires Level ${item.requiredLevel}`);
      return;
    }

    // If item has both cash and crypto pricing, show choice modal
    if (item.priceCash > 0 && item.priceCrypto > 0) {
      setCurrencyChoiceModal({ category, item });
      return;
    }

    // Single currency purchase
    if (item.priceCash > 0 && playerData.cash < item.priceCash) {
      setInsufficientFundsModal({ type: 'cash', needed: item.priceCash, have: playerData.cash });
      return;
    }

    if (item.priceCrypto > 0 && playerData.crypto < item.priceCrypto) {
      setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
      return;
    }

    completePurchase(category, item, item.priceCash > 0 ? 'cash' : 'cryd');
  };

  const completePurchase = async (category, item, currency) => {
    if (purchaseOverlay) return; // Lock — prevent double-clicks
    const amountPaid = currency === 'cash' ? item.priceCash : item.priceCrypto;

    // NO optimistic local update — server is the ONLY authority.
    // Show blocking transaction overlay immediately.
    // Cancel any stale pending flush so it doesn't overwrite the server's
    // authoritative inventory write after processPurchase completes.
    clearPendingFlush();
    setPurchaseOverlay({ status: 'processing', item });

    try {
      const result = await base44.functions.invoke('processPurchase', {
        category: category === 'people' ? 'power' : category,
        item_id: item.id,
        item_name: item.name,
        currency,
        amount: amountPaid,
        quantity: 1,
        is_consumable: false,
      });

      if (result?.data?.success) {
        // Pull authoritative state from server — inventory + balances guaranteed correct
        const fresh = await refreshFromServer();
        if (fresh) setPlayerData(fresh);
        setOwnedItems(getOwnedItems());
        setPurchaseOverlay({ status: 'success', item });
      } else {
        setPurchaseOverlay({ status: 'error', item, error: result?.data?.error || 'Purchase failed — no charge was made.' });
      }
    } catch (err) {
      setPurchaseOverlay({ status: 'error', item, error: err?.message || 'Network error — no charge was made.' });
    }
  };

  const getDailyConsumablePurchased = (itemId) => {
    const key = `dailyConsumable_${itemId}_${new Date().toDateString()}`;
    return JSON.parse(kvGet(key) || 'false');
  };

  const setDailyConsumablePurchased = (itemId) => {
    const key = `dailyConsumable_${itemId}_${new Date().toDateString()}`;
    kvSet(key, JSON.stringify(true));
  };

  const CONSUMABLE_LIMIT_CATEGORIES = ['opcover', 'energy', 'stamina'];

  const handleConsumableBuy = (consumableSubTab, item) => {
    // Check if can afford
    if (consumableSubTab === 'cash' && playerData.crypto < item.priceCrypto) {
      setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
      return;
    }
    if (consumableSubTab === 'cryd') {
      if (item.dailyLimit && getDailyConsumablePurchased(item.id)) {
        toast.error("Daily limit reached for this pack! Come back tomorrow.");
        return;
      }
      if (item.priceUSD) {
        toast.info("Real money purchases not yet implemented");
        return;
      }
    }
    if (consumableSubTab === 'shards') {
      // Shards: for now 1 CRYD (real money will be added later)
      if (playerData.crypto < item.priceCrypto) {
        setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
        return;
      }
      completeConsumablePurchase(consumableSubTab, item, 'cryd');
      return;
    }
    if (consumableSubTab === 'parts') {
      if (playerData.crypto < item.priceCrypto) {
        setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
        return;
      }
      completeConsumablePurchase(consumableSubTab, item, 'cryd');
      return;
    }
    if (consumableSubTab === 'sabotage') {
      // Sabotage items: CRYD only
      if (playerData.crypto < item.priceCrypto) {
        setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
        return;
      }
      completeConsumablePurchase(consumableSubTab, item, 'cryd');
      return;
    }
    if ((consumableSubTab === 'opcover' || consumableSubTab === 'energy' || consumableSubTab === 'stamina')) {
      const igcLimitHit = getDailyConsumablePurchased(item.id);
      const hasCash = playerData.cash >= item.priceCash && !igcLimitHit;
      const hasCryd = playerData.crypto >= item.priceCrypto;
      // Only block if BOTH options are unavailable
      if (!hasCash && !hasCryd) {
        if (igcLimitHit) {
          setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
        } else {
          setInsufficientFundsModal({ type: 'cash', needed: item.priceCash, have: playerData.cash });
        }
        return;
      }
      // Show currency choice modal — CRYD always available if player can afford it
      setCurrencyChoiceModal({ category: 'consumable', item, subTab: consumableSubTab });
      return;
    }

    completeConsumablePurchase(consumableSubTab, item, 'cash');
  };

  const completeConsumablePurchase = async (consumableSubTab, item, currency) => {
    if (purchaseOverlay) return; // Lock — prevent double-clicks
    const isCryd = consumableSubTab === 'cash' || currency === 'cryd';
    const amountPaid = isCryd ? item.priceCrypto : item.priceCash;
    const currencyLabel = isCryd ? 'cryd' : 'cash';

    // Compute the consumable key and grant amount for server-side inventory write
    const consumableKey = consumableSubTab === 'shards' ? 'AVATAR_SHARD'
      : consumableSubTab === 'parts' ? 'GEAR_SHARD'
      : item.id;
    const consumableAmount = (consumableSubTab === 'shards' || consumableSubTab === 'parts') ? (item.amount || 1) : 1;

    // NO optimistic local update — server is the ONLY authority.
    // Cancel any stale pending flush so it doesn't overwrite the server's
    // authoritative inventory write after processPurchase completes.
    clearPendingFlush();
    setPurchaseOverlay({ status: 'processing', item });

    try {
      const result = await base44.functions.invoke('processPurchase', {
        category: 'consumable',
        item_id: item.id,
        item_name: item.name,
        currency: currencyLabel,
        amount: amountPaid,
        quantity: 1,
        is_consumable: true,
        consumable_key: consumableKey,
        consumable_amount: consumableAmount,
      });

      if (result?.data?.success) {
        if (!isCryd) setDailyConsumablePurchased(item.id);
        const fresh = await refreshFromServer();
        if (fresh) setPlayerData(fresh);
        setPurchaseOverlay({ status: 'success', item });
      } else {
        setPurchaseOverlay({ status: 'error', item, error: result?.data?.error || 'Purchase failed — no charge was made.' });
      }
    } catch (err) {
      setPurchaseOverlay({ status: 'error', item, error: err?.message || 'Network error — no charge was made.' });
    }
  };

  const handleConsumableUse = async (item) => {
    const currentInventory = playerData.consumables || {};
    const ownedQty = currentInventory[item.id] || 0;
    
    if (ownedQty < 1) {
      toast.error("You don't own this item!");
      return;
    }

    // Shield use requires confirmation modal
    if (item.id.startsWith('SHIELD_')) {
      const now = Date.now();
      const currentShieldEnd = playerData.shieldActiveUntil || 0;
      const newShieldEnd = Math.max(now, currentShieldEnd) + item.duration;
      const endDate = new Date(newShieldEnd).toLocaleString();
      const durationHours = item.duration / (1000 * 60 * 60);
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        `🌐 SHIELD ACTIVATED\n\nShield will be active until: ${endDate}\n\nDuration: ${durationHours}h\n\n⚠️ WARNING: Attacking any player will BREAK your shield!\n\nProceed?`
      );
      
      if (!confirmed) return;
      
      const newInventory = { ...currentInventory };
      newInventory[item.id] = ownedQty - 1;
      if (newInventory[item.id] <= 0) delete newInventory[item.id];
      
      savePlayerData({
        shieldActiveUntil: newShieldEnd,
        shieldType: item.id,
        consumables: newInventory
      });
      
      setPlayerData(getPlayerData());
      return;
    }

    // Cash and CRYD packs — server-authoritative via applyServerReward
    if (consumableSubTab === 'cash' || consumableSubTab === 'cryd') {
      try {
        await consumeConsumable(item.id);
        if (consumableSubTab === 'cash') {
          await applyServerReward({ cash_delta: item.amount, reason: 'consumable_cash_pack' });
          toast.success(`Received $${item.amount.toLocaleString()}!`);
        } else {
          await applyServerReward({ crypto_delta: item.amount, reason: 'consumable_cryd_pack' });
          toast.success(`Received ${item.amount} CRYD!`);
        }
        setPlayerData(getPlayerData());
      } catch (e) {
        toast.error("Failed to use item — please try again");
        setPlayerData(getPlayerData());
      }
      return;
    }

    // Apply effect
    let update = {};
    
    if (consumableSubTab === 'opcover') {
      update.opCover = Math.min(100, (playerData.opCover ?? 100) + item.amount);
    } else if (consumableSubTab === 'energy') {
      update.energy = Math.min(100, (playerData.energy || 0) + item.amount);
    } else if (consumableSubTab === 'stamina') {
      update.stamina = Math.min(100, (playerData.stamina || 0) + item.amount);
    } else if (consumableSubTab === 'sabotage') {
      update.sabotagesRemaining = Math.min(20, (playerData.sabotagesRemaining || 0) + item.amount);
    }
    
    // Remove from inventory
    const newInventory = { ...currentInventory };
    newInventory[item.id] = ownedQty - 1;
    if (newInventory[item.id] <= 0) delete newInventory[item.id];
    update.consumables = newInventory;
    
    const updated = savePlayerData(update);
    setPlayerData(updated);
    
    const effectText = item.amount > 0 ? `+${item.amount}` : `${item.amount}`;
    toast.success(`Used ${item.name}!`);
  };

  const handleEquipClick = async (category, item) => {
    if (category === "weapons" || category === "firearms") {
      // Block equip if under level requirement
      if (item.equipLevel && item.equipLevel > playerData.level) {
        toast.error(`Cannot equip — requires Level ${item.equipLevel}`);
        return;
      }
      setEquipSlotModal({ category, item, isFirearm: category === 'firearms' || item.isFirearm });
    } else if (category === "avatars") {
      const result = await equipAvatar(item.id);
      if (result && !result.success) { toast.error(result.message); return; }
      setPlayerData(getPlayerData());
      toast.success(`Equipped ${item.name}!`);
    } else if (category === "scenes") {
      const result = await equipScene(item.id);
      if (result && !result.success) { toast.error(result.message); return; }
      setPlayerData(getPlayerData());
      toast.success(`Equipped ${item.name}!`);
    } else if (category === "themes") {
      const result = await equipTheme(item.id);
      if (result && !result.success) { toast.error(result.message); return; }
      setPlayerData(getPlayerData());
      toast.success(`Equipped ${item.name}!`);
    } else {
      const slotMap = { vehicles: "vehicle", people: "power", pets: "pet" };
      const catMap = { vehicles: "vehicles", people: "power", pets: "pets" };
      
      if (!canEquipItem(catMap[category], item.id)) {
        const ownedQty = getInventoryQty(catMap[category], item.id);
        toast.error(`You only own ${ownedQty}. Already equipped.`);
        return;
      }

      const currentItem = playerData.loadout?.[slotMap[category]];
      if (currentItem) {
        setConfirmEquipModal({ slot: slotMap[category], item, currentItemId: currentItem, replace: true, category });
      } else {
        setConfirmEquipModal({ slot: slotMap[category], item, replace: false, category });
      }
    }
  };

  const handleConfirmGearEquip = () => {
    if (confirmEquipModal) {
      updateLoadout(confirmEquipModal.slot, confirmEquipModal.item.id);
      setPlayerData(getPlayerData());
      setConfirmEquipModal(null);
      toast.success(`Equipped ${confirmEquipModal.item.name}!`);
    }
  };

  const handleWeaponSlotClick = (slot) => {
    if (equipSlotModal) {
      const item = equipSlotModal.item;
      const invCat = equipSlotModal.isFirearm ? 'firearms' : 'weapons';
      
      if (!canEquipItem(invCat, item.id)) {
        toast.error(`You already have this item equipped in another slot.`);
        return;
      }

      const currentItem = playerData.loadout?.[slot];
      if (currentItem) {
        // Slot has item, show replace confirmation
        setConfirmEquipModal({ slot, item, currentItemId: currentItem, replace: true });
      } else {
        // Slot is empty, show equip confirmation
        setConfirmEquipModal({ slot, item, replace: false });
      }
    }
  };

  const handleConfirmWeaponEquip = () => {
    if (confirmEquipModal) {
      updateLoadout(confirmEquipModal.slot, confirmEquipModal.item.id);
      setPlayerData(getPlayerData());
      setConfirmEquipModal(null);
      setEquipSlotModal(null);
      toast.success(`Equipped ${confirmEquipModal.item.name}!`);
    }
  };

  // For weapons tab: show firearms or accessories based on sub-tab
  const effectiveCategory = activeTab === 'weapons' ? (weaponSubTab === 'firearms' ? 'firearms' : 'weapons') : activeTab;
  const items = getCategoryData(effectiveCategory);
  // Avatars: show ALL, no pagination; others: paginate
  const paginatedItems = activeTab === 'avatars'
    ? items
    : items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD />
      
      <div className="fixed top-[114px] left-0 right-0 bottom-[96px] max-w-4xl mx-auto px-2 py-2 flex flex-col gap-px overflow-hidden">
        <div className="shrink-0"><ShopBannerCarousel /></div>
        <div className="flex gap-px flex-1 min-h-0">
        {/* Left Sidebar */}
        <div className="w-[54px] shrink-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
            <TabsList className="flex-col gap-0.5 bg-[#0d1520] border border-slate-700 rounded-xl p-0.5 w-full">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isEvent = item.key === "holiday";
                return (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className={`w-full flex-col gap-0.5 rounded-md px-0.5 py-1 text-[7px] font-semibold leading-none text-white data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=inactive]:bg-[#0a0f1a] data-[state=inactive]:text-slate-400 hover:bg-slate-700 transition-all border ${
                      isEvent
                        ? "border-yellow-500 data-[state=active]:bg-yellow-600 data-[state=active]:text-black"
                        : "border-slate-600"
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate text-center w-full">{item.label}</span>
                  </TabsTrigger>
                );
              })}
              {/* VIP Button — last sidebar item */}
              <TabsTrigger
                value="vip"
                className={`w-full flex-col gap-0.5 rounded-md px-0.5 py-1 text-[7px] font-semibold leading-none text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-[#0a0f1a] data-[state=inactive]:text-slate-400 hover:bg-slate-700 transition-all border border-purple-500`}
              >
                <Crown className="w-3 h-3 text-purple-400 shrink-0" />
                <span>VIP</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="flex-1 min-w-0 overflow-y-auto">
          {/* Holiday Event Tab */}
          <TabsContent value="holiday" className="space-y-3 mt-2">
            {activeHolidays.length === 0 ? (
              <div className="text-center py-12">
                <PartyPopper className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No active holiday events.</p>
                <p className="text-slate-600 text-xs mt-1">Check back soon for seasonal sales!</p>
              </div>
            ) : (
              activeHolidays.map((holiday) => (
                <div key={holiday.id} className="border-2 rounded-xl p-3 mb-3" style={{ borderColor: holiday.theme_color }}>
                  {holiday.poster_image_url && (
                    <img src={holiday.poster_image_url} alt={holiday.display_name} className="w-full rounded-lg mb-2" />
                  )}
                  <h3 className="text-base font-bold" style={{ color: holiday.theme_color }}>{holiday.display_name}</h3>
                  {holiday.tagline && <p className="text-xs text-slate-400 mt-0.5">{holiday.tagline}</p>}
                  <div className="text-[10px] text-slate-500 mt-1">{holiday.start_date} → {holiday.end_date}</div>
                  {holiday.pack_name && (
                    <div className="mt-2 bg-slate-900 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{holiday.pack_name}</div>
                      {holiday.pack_description && <p className="text-[10px] text-slate-400 mt-0.5">{holiday.pack_description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {holiday.pack_price_cryd > 0 && (
                          <span className="text-purple-300 font-bold text-sm flex items-center gap-0.5">{holiday.pack_price_cryd}<CrydIcon size={12} /></span>
                        )}
                        {holiday.pack_price_usd > 0 && (
                          <span className="text-green-500 font-bold text-sm">${holiday.pack_price_usd}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {Object.keys(CATEGORY_CONFIG).filter(cat => cat !== 'resources' && cat !== 'consumables' && cat !== 'scenes' && cat !== 'themes').map((category) => (
            <TabsContent key={category} value={category} className="space-y-2 mt-4">
              {/* Weapons: WEAPONS / ACCESSORIES sub-tabs */}
              {category === 'weapons' && (
                <div className="grid grid-cols-2 gap-0 mb-3 rounded-lg overflow-hidden border border-slate-700">
                  <button
                    onClick={() => setWeaponSubTab('firearms')}
                    className={`py-1 text-xs font-bold tracking-wide uppercase transition-colors ${weaponSubTab === 'firearms' ? 'bg-yellow-600 text-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                  >
                    🔫 WEAPONS
                  </button>
                  <button
                    onClick={() => setWeaponSubTab('accessories')}
                    className={`py-1 text-xs font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-1 ${weaponSubTab === 'accessories' ? 'bg-yellow-600 text-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                  >
                    <Link2 className="w-3 h-3" /> ACCESSORIES
                  </button>
                </div>
              )}
              {/* Featured Item Banner */}
              {category === 'weapons' && weaponSubTab === 'firearms' && (() => {
                const fi = FEATURED_FIREARM;
                const ownedQty = getInventoryQty('firearms', fi.id);
                const locked = fi.requiredLevel > playerData.level;
                return (
                  <div className="border-2 border-yellow-400 rounded-xl p-3 bg-yellow-950/20 mb-4" style={{ boxShadow: '0 0 16px rgba(250,204,21,0.2)' }}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">✦ Featured Premium Firearm</span>
                      <span className="ml-auto text-[9px] text-yellow-600">Lv{fi.requiredLevel} Required</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      {fi.imageUrl && <img src={fi.imageUrl} alt={fi.name} className="w-12 h-12 object-contain rounded-lg border border-yellow-600/40 bg-slate-900 cursor-pointer hover:border-yellow-400 transition-colors shrink-0" onClick={() => setItemImagePreview(fi)} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-yellow-200">{fi.name}</div>
                        {fi.description && <div className="text-[10px] text-slate-400 mt-0.5">{fi.description}</div>}
                        <div className="flex gap-2 text-xs text-slate-400 mt-1">
                          <span className="text-red-400">+{fi.atk} ATK</span>
                          <span className="text-blue-400">+{fi.def} DEF</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-purple-300 font-bold text-sm">
                          {fi.priceCrypto} <CrydIcon size={13} /> <span className="text-[10px] text-yellow-600 font-normal ml-1">≈ ${(fi.priceCrypto * 0.02).toFixed(2)} USD</span>
                        </div>
                        <div className="mt-1.5">
                          {locked ? (
                            <Button size="sm" disabled variant="outline" className="border-yellow-700 text-yellow-600 text-[10px] h-7">🔒 Lv{fi.requiredLevel}</Button>
                          ) : ownedQty > 0 ? (
                            <Button size="sm" onClick={() => handleEquipClick('firearms', fi)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] h-7">Equip</Button>
                          ) : (
                            <Button size="sm" onClick={() => handlePurchase('firearms', fi)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[10px] h-7">Buy Now</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {category !== 'weapons' && FEATURED_ITEMS_BY_CATEGORY[category] && (() => {
                const fi = FEATURED_ITEMS_BY_CATEGORY[category];
                const ownedQty = getInventoryQty(category === 'people' ? 'power' : category, fi.id);
                const locked = fi.requiredLevel > playerData.level;
                return (
                  <div className="border-2 border-yellow-400 rounded-xl p-3 bg-yellow-950/20 mb-4" style={{ boxShadow: '0 0 16px rgba(250,204,21,0.2)' }}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">✦ Featured Premium Item</span>
                      <span className="ml-auto text-[9px] text-yellow-600">Lv{fi.requiredLevel} Required</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      {fi.imageUrl && <img src={fi.imageUrl} alt={fi.name} className="w-12 h-12 object-contain rounded-lg border border-yellow-600/40 bg-slate-900 cursor-pointer hover:border-yellow-400 transition-colors shrink-0" onClick={() => setItemImagePreview(fi)} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-yellow-200">{fi.name}</div>
                        {fi.description && <div className="text-[10px] text-slate-400 mt-0.5">{fi.description}</div>}
                        <div className="flex gap-2 text-xs text-slate-400 mt-1">
                          <span className="text-red-400">+{fi.atk} ATK</span>
                          <span className="text-blue-400">+{fi.def} DEF</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-purple-300 font-bold text-sm">
                          {fi.priceCrypto} <CrydIcon size={13} /> <span className="text-[10px] text-yellow-600 font-normal ml-1">≈ ${(fi.priceCrypto * 0.02).toFixed(2)} USD</span>
                        </div>
                        <div className="mt-1.5">
                          {locked ? (
                            <Button size="sm" disabled variant="outline" className="border-yellow-700 text-yellow-600 text-[10px] h-7">🔒 Lv{fi.requiredLevel}</Button>
                          ) : ownedQty > 0 ? (
                            <Button size="sm" onClick={() => handleEquipClick(category, fi)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] h-7">Equip</Button>
                          ) : (
                            <Button size="sm" onClick={() => handlePurchase(category, fi)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[10px] h-7">Buy Now</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Avatars: show grid with images */}
              {category === 'avatars' ? (
                (() => {
                  const renderAvatarCard = (item, fullWidth = false) => {
                    const ownedQty = getInventoryQty('avatars', item.id);
                    const locked = item.requiredLevel > playerData.level;
                    const isEquipped = playerData.equippedAvatarId === item.id;
                    const isGold = item.specialTier === 'gold';
                    const hasDualCurrency = item.priceCash > 0 && item.priceCrypto > 0;
                    return (
                      <div key={item.id} className={`border rounded-lg overflow-hidden ${isEquipped ? 'border-emerald-500' : isGold ? 'border-yellow-400' : 'border-slate-800'} ${locked ? 'opacity-70' : ''} ${isGold ? 'bg-yellow-950/20' : 'bg-[#0a0f1a]'}`}
                        style={isGold ? { boxShadow: '0 0 12px rgba(250,204,21,0.15)' } : {}}>
                        <div className={`relative ${fullWidth ? 'flex gap-3 p-3' : ''}`}>
                          <div
                            className={`relative overflow-hidden rounded-lg ${fullWidth ? 'w-32 shrink-0' : ''}`}
                            style={fullWidth ? { aspectRatio: '9/16', height: '160px' } : { aspectRatio: '9/16' }}
                            onClick={!ownedQty ? () => setAvatarPreviewModal(item) : undefined}
                          >
                            <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-contain bg-slate-900/50 ${!ownedQty ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} />
                            {locked && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Lock className="w-8 h-8 text-slate-400" /></div>}
                          </div>
                          {fullWidth && (
                            <div className="flex-1 flex flex-col justify-between py-1">
                              {(() => {
                                const ab = AVATAR_ABILITIES[item.id];
                                return (
                                  <>
                                    <div>
                                      {isGold && <div className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest mb-0.5">✦ Special Avatar</div>}
                                      <div className="text-sm font-bold text-yellow-200">{item.name}{ab ? ` — ${ab.icon}` : ''}</div>
                                      {ab && (
                                        <div className="mt-1 space-y-0.5">
                                          {ab.stats.map((s, i) => (
                                            <div key={i} className="text-[9px] text-emerald-400 leading-tight">{s}</div>
                                          ))}
                                          <button onClick={() => setAbilityPreview({ type: 'avatar', item })} className="flex items-center gap-0.5 text-slate-500 hover:text-slate-300 mt-0.5">
                                            <Info className="w-2.5 h-2.5" /> <span className="text-[8px]">Preview</span>
                                          </button>
                                        </div>
                                      )}
                                      <div className="text-[8px] text-yellow-600 mt-1">Lv{item.requiredLevel} Required</div>
                                    </div>
                                    <div className="mt-2">
                                      <div className="text-[9px] mb-1 space-y-0.5">
                                                {item.priceCash > 0 && <div className="text-green-500">💵 {item.priceCash.toLocaleString()} IGC</div>}
                                                {item.priceCrypto > 0 && <div className="text-purple-300 flex items-center gap-0.5">{item.priceCrypto}<CrydIcon size={10} /> CRYD</div>}
                                              </div>
                                      {isEquipped ? (
                                        <Button size="sm" variant="outline" disabled className="w-full text-[9px] border-emerald-600 text-emerald-400 h-6">
                                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Equipped
                                        </Button>
                                      ) : ownedQty > 0 ? (
                                        <Button size="sm" onClick={() => handleEquipClick(category, item)} className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-500 h-6">Equip</Button>
                                      ) : locked ? (
                                        <Button size="sm" disabled className="w-full text-[9px] h-6 border-yellow-700 text-yellow-600" variant="outline">🔒 Lv{item.requiredLevel}</Button>
                                      ) : (
                                        <Button size="sm" onClick={() => handlePurchase(category, item)} className="w-full text-[9px] bg-yellow-600 hover:bg-yellow-500 text-black font-bold h-6">Buy</Button>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        {!fullWidth && (
                          <div className="p-2">
                            {(() => {
                              const ab = AVATAR_ABILITIES[item.id];
                              return (
                                <>
                                  <div className="text-[10px] font-semibold text-slate-200 truncate">
                                    {item.name}{ab ? ` — ${ab.icon}` : ''}
                                  </div>
                                  {ab && (
                                    <div className="text-[8px] text-emerald-400 mt-0.5 leading-tight flex items-center gap-0.5">
                                      <span>{ab.stats.slice(0, ab.baseBonus ? 3 : 2).join(' • ')}</span>
                                      <button onClick={() => setAbilityPreview({ type: 'avatar', item })} className="text-slate-500 hover:text-slate-300 shrink-0">
                                        <Info className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="text-[8px] text-slate-600 mt-0.5">Lv{item.requiredLevel}</div>
                                </>
                              );
                            })()}
                            <div className="text-[9px] mt-0.5 space-y-0.5">
                              {item.priceCash > 0 && <div className="text-green-500">💵 {item.priceCash.toLocaleString()}</div>}
                              {item.priceCrypto > 0 && <div className="text-purple-300 flex items-center gap-0.5">{item.priceCrypto}<CrydIcon size={10} /></div>}
                            </div>
                            <div className="mt-1.5">
                              {isEquipped ? (
                                <Button size="sm" variant="outline" disabled className="w-full text-[9px] border-emerald-600 text-emerald-400 h-6">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Equipped
                                </Button>
                              ) : ownedQty > 0 ? (
                                <Button size="sm" onClick={() => handleEquipClick(category, item)} className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-500 h-6">Equip</Button>
                              ) : locked ? (
                                <Button size="sm" disabled className="w-full text-[9px] h-6 border-slate-700 text-slate-500" variant="outline">🔒 Lv{item.requiredLevel}</Button>
                              ) : (item.priceCash > 0 && item.priceCrypto > 0) ? (
                                <Button size="sm" onClick={() => setCurrencyChoiceModal({ category, item })} className="w-full text-[9px] bg-blue-600 hover:bg-blue-500 h-6">Buy</Button>
                              ) : (
                                <Button size="sm" onClick={() => handlePurchase(category, item)} className="w-full text-[9px] bg-blue-600 hover:bg-blue-500 h-6">Buy</Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  // Sort all by level
                  const allSorted = [...paginatedItems].sort((a, b) => a.requiredLevel - b.requiredLevel);
                  const specials = allSorted.filter(it => it.special);
                  const regulars = allSorted.filter(it => !it.special);

                  // Pair by level: same-level M+F always appear together
                  const levelMap = {};
                  regulars.forEach(it => {
                    const lv = it.requiredLevel;
                    if (!levelMap[lv]) levelMap[lv] = { males: [], females: [] };
                    if (it.gender === 'male') levelMap[lv].males.push(it);
                    else levelMap[lv].females.push(it);
                  });
                  const rows = [];
                  Object.keys(levelMap).sort((a, b) => Number(a) - Number(b)).forEach(lv => {
                    const { males, females } = levelMap[lv];
                    const maxPairs = Math.max(males.length, females.length);
                    for (let i = 0; i < maxPairs; i++) {
                      rows.push({ male: males[i] || null, female: females[i] || null });
                    }
                  });

                  return (
                    <div className="space-y-2">
                      {specials.map(item => (
                        <div key={item.id}>{renderAvatarCard(item, true)}</div>
                      ))}
                      <div className="grid grid-cols-2 gap-3">
                        {rows.map((row, idx) => (
                          <React.Fragment key={idx}>
                            {row.male ? renderAvatarCard(row.male, false) : <div />}
                            {row.female ? renderAvatarCard(row.female, false) : <div />}
                          </React.Fragment>
                        ))}
                      </div>
                      {/* Avatar Preview Modal */}
                      {avatarPreviewModal && (
                        <Dialog open={!!avatarPreviewModal} onOpenChange={() => setAvatarPreviewModal(null)}>
                          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm">
                            <DialogHeader>
                              <DialogTitle className="text-emerald-400">{avatarPreviewModal.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-slate-900 rounded-lg overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
                                <img src={avatarPreviewModal.imageUrl} alt={avatarPreviewModal.name} className="w-full h-full object-contain" />
                              </div>
                              <div className="text-xs text-slate-400 text-center">
                                {avatarPreviewModal.priceCash > 0 && <div className="text-green-400">💵 {avatarPreviewModal.priceCash.toLocaleString()} IGC</div>}
                                {avatarPreviewModal.priceCrypto > 0 && <div className="text-blue-400">{avatarPreviewModal.priceCrypto} CRYD</div>}
                                <div className="text-slate-500">Lv{avatarPreviewModal.requiredLevel} Required</div>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => { handlePurchase(category, avatarPreviewModal); setAvatarPreviewModal(null); }} className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold">Buy</Button>
                                <Button onClick={() => setAvatarPreviewModal(null)} variant="outline" className="border-slate-700 text-slate-400">Close</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  );
                })()
              ) : (
              paginatedItems.map((item) => {
                // For weapons tab: effective rendering category
                const renderCat = category === 'weapons' ? effectiveCategory : category;
                const catMap = { firearms: 'firearms', weapons: 'weapons', vehicles: 'vehicles', people: 'power', pets: 'pets', avatars: 'avatars' };
                const inventoryCat = catMap[renderCat] || renderCat;
                const ownedQty = getInventoryQty(inventoryCat, item.id);
                const maxQty = 1;
                const soldOut = ownedQty >= maxQty;
                const locked = renderCat !== 'firearms' && renderCat !== 'weapons' && item.requiredLevel > playerData.level;
                const underEquipLevel = (renderCat === 'firearms' || renderCat === 'weapons') && item.equipLevel && item.equipLevel > playerData.level;
                const borderClass = (renderCat === 'firearms' || renderCat === 'weapons') && item.borderColor ? item.borderColor : 'border-slate-800';
                return (
                  <div
                  key={item.id}
                    className={`bg-[#0a0f1a] border ${borderClass} rounded-lg p-2.5 overflow-hidden`}
                  >
                    <div className="flex items-start gap-2.5">
                    {/* Image column */}
                    {item.imageUrl && (
                      <div className="shrink-0">
                        <div
                          className={`overflow-hidden rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors ${renderCat === 'vehicles' ? 'w-16 h-12' : 'w-12 h-12'}`}
                          onClick={() => setItemImagePreview(item)}
                        >
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-semibold text-slate-200">
                          {item.name}{(renderCat === 'firearms' || renderCat === 'weapons') && item.weaponArchetype ? ` ${item.weaponArchetype === 'Assault' ? '⚔️' : item.weaponArchetype === 'Defense' ? '🛡️' : '🎯'}` : ''}
                        </h3>
                        {(renderCat === 'firearms' || renderCat === 'weapons') && item.rarityLabel && (
                          <span className={`text-[9px] font-bold ${item.rarityColor}`}>[{item.rarityLabel}]</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-slate-600 items-center">
                        <span>+{item.atk} ATK</span>
                        <span>+{item.def} DEF</span>
                        {item.igcBonus > 0 && <span className="text-cyan-400">+{item.igcBonus}% IGC</span>}
                        {(renderCat === 'firearms' || renderCat === 'weapons') ? (
                          <>
                            <span className={underEquipLevel ? 'text-amber-500' : 'text-slate-600'}>Equip Lv{item.equipLevel}</span>
                            <button onClick={() => setAbilityPreview({ type: 'weapon', item })} className="text-slate-500 hover:text-slate-300">
                              <Info className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <span>Lv{item.requiredLevel}</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] items-center">
                        {item.priceCash > 0 && <span className="text-green-500">💵 {item.priceCash.toLocaleString()}</span>}
                        {item.priceCrypto > 0 && <span className="flex items-center gap-0.5 text-purple-300">{item.priceCrypto}<CrydIcon size={10} /></span>}
                      </div>
                      {/* Action buttons inside details column to prevent overflow */}
                      <div className="flex gap-1.5 mt-1.5">
                        {locked ? (
                          <Button size="sm" variant="outline" disabled className="text-[10px] h-7 px-2 border-slate-700 text-slate-400">
                            <Lock className="w-3 h-3 mr-1 text-slate-500" />
                            <span className="text-slate-300">Lv{item.requiredLevel}</span>
                          </Button>
                        ) : soldOut ? (
                          <>
                            {underEquipLevel ? (
                              <Button size="sm" variant="outline" disabled className="text-[10px] h-7 px-2 border-amber-700 text-amber-500">
                                Equip Lv{item.equipLevel}
                              </Button>
                            ) : (
                              <Button size="sm" variant="default" onClick={() => handleEquipClick(renderCat, item)} className="text-[10px] h-7 px-2 bg-emerald-600 hover:bg-emerald-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Equip
                              </Button>
                            )}
                            <Link to="/InventoryPage">
                              <Button size="sm" variant="default" className="text-[10px] h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white">
                                My Inventory
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <Button size="sm" variant="default" onClick={() => handlePurchase(renderCat, item)} className="text-[10px] h-7 px-3 bg-blue-600 hover:bg-blue-500">Buy</Button>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                );
              }))}

              {/* Pagination - only for non-avatar tabs */}
              {category !== 'avatars' && totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-slate-400 px-3 py-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}

          {/* Themes Tab */}
          <TabsContent value="themes" className="space-y-2 mt-4">
            <div className="grid grid-cols-3 gap-2">
              {ALL_THEMES.filter(t => !t.isDefault).map((theme) => {
                const ownedQty = getInventoryQty('themes', theme.id);
                const isEquipped = playerData.equippedThemeId === theme.id;
                const isLocked = theme.level > playerData.level;

                return (
                  <div
                    key={theme.id}
                    className={`bg-[#0a0f1a] border rounded-lg p-1.5 ${
                      isEquipped ? 'border-emerald-500 ring-2 ring-emerald-500/30' :
                      theme.isIlluminati ? 'border-yellow-400 ring-1 ring-yellow-400/30' :
                      'border-slate-800'
                    } ${isLocked ? 'opacity-60' : ''}`}
                    style={theme.isIlluminati ? { boxShadow: '0 0 10px rgba(250,204,21,0.25)' } : {}}
                  >
                    <div 
                      className="bg-slate-900 rounded-lg overflow-hidden mb-1 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                      style={{ aspectRatio: '16/9' }}
                      onClick={() => setThemePreviewModal(theme)}
                    >
                      <img src={theme.previewImage} alt={theme.name} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-[10px] font-semibold text-slate-200 mb-0.5 truncate">{theme.name}</h3>
                    {isLocked && (
                      <div className="text-[8px] text-red-400 mb-1">🔒 Lv.{theme.level}</div>
                    )}
                    {theme.priceCrypto > 0 && (
                    <div className="flex items-center gap-0.5 text-purple-300 font-semibold text-[10px] mb-1">
                      {theme.priceCrypto}<CrydIcon size={10} />
                    </div>
                    )}
                    <div className="flex gap-1">
                      {isEquipped ? (
                        <Button size="sm" variant="outline" disabled className="text-[9px] flex-1 border-emerald-600 text-emerald-400 h-6 px-1">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Equipped
                        </Button>
                      ) : ownedQty > 0 ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleEquipClick('themes', theme)}
                          className="text-[9px] flex-1 bg-emerald-600 hover:bg-emerald-500 h-6 px-1"
                        >
                          Equip
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handlePurchase('themes', theme)}
                          disabled={isLocked}
                          className="text-[9px] flex-1 bg-blue-600 hover:bg-blue-500 h-6 px-1 disabled:opacity-50"
                        >
                          Buy
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Scenes Tab */}
          <TabsContent value="scenes" className="space-y-2 mt-4">
            <div className="grid grid-cols-3 gap-2">
                  {PREMIUM_SCENES.map((scene) => {
                const ownedQty = getInventoryQty('scenes', scene.id);
                const isEquipped = playerData.equippedSceneId === scene.id;
                const isLocked = scene.level > playerData.level;

                return (
                  <div
                    key={scene.id}
                    className={`bg-[#0a0f1a] border rounded-lg p-1.5 ${isEquipped ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800'} ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div 
                      className="bg-slate-900 rounded-lg overflow-hidden mb-1 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                      style={{ aspectRatio: '9/16' }}
                      onClick={() => setScenePreviewModal(scene)}
                    >
                      <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-[10px] font-semibold text-slate-200 mb-0.5 truncate">{scene.name}</h3>
                    {isLocked && (
                      <div className="text-[8px] text-red-400 mb-1">🔒 Lv.{scene.level}</div>
                    )}
                    {scene.priceCrypto > 0 && (
                    <div className="flex items-center gap-0.5 text-purple-300 font-semibold text-[10px] mb-1">
                      {scene.priceCrypto}<CrydIcon size={10} />
                    </div>
                    )}
                    <div className="flex gap-1">
                      {isEquipped ? (
                        <Button size="sm" variant="outline" disabled className="text-[9px] flex-1 border-emerald-600 text-emerald-400 h-6 px-1">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Equipped
                        </Button>
                      ) : ownedQty > 0 ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleEquipClick('scenes', scene)}
                          className="text-[9px] flex-1 bg-emerald-600 hover:bg-emerald-500 h-6 px-1"
                        >
                          Equip
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handlePurchase('scenes', scene)}
                          disabled={isLocked}
                          className="text-[9px] flex-1 bg-blue-600 hover:bg-blue-500 h-6 px-1 disabled:opacity-50"
                        >
                          Buy
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Consumables Tab */}
          <TabsContent value="consumables" className="space-y-1 mt-2">
            {/* Sub-category tabs - 6 buttons in one row */}
            <div className="grid grid-cols-6 gap-1.5 mb-0.5 sticky top-0 z-10 bg-[#060a12] pt-0.5 pb-0.5">
              <Button
                variant={consumableSubTab === "cash" ? "default" : "outline"}
                size="sm"
                onClick={() => setConsumableSubTab("cash")}
                className={`px-1 ${consumableSubTab === "cash" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <DollarSign className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={consumableSubTab === "opcover" ? "default" : "outline"}
                size="sm"
                onClick={() => setConsumableSubTab("opcover")}
                className={`px-1 ${consumableSubTab === "opcover" ? "bg-orange-600 hover:bg-orange-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={consumableSubTab === "sabotage" ? "default" : "outline"}
                size="sm"
                onClick={() => setConsumableSubTab("sabotage")}
                className={`px-1 ${consumableSubTab === "sabotage" ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <Skull className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={consumableSubTab === "energy" ? "default" : "outline"}
                size="sm"
                onClick={() => setConsumableSubTab("energy")}
                className={`px-1 ${consumableSubTab === "energy" ? "bg-yellow-600 hover:bg-yellow-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <BatteryFull className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={consumableSubTab === "stamina" ? "default" : "outline"}
                size="sm"
                onClick={() => setConsumableSubTab("stamina")}
                className={`px-1 ${consumableSubTab === "stamina" ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => setConsumableSubTab("cryd")}
                className={`px-1 font-bold ${
                  consumableSubTab === "cryd"
                    ? "bg-purple-700 hover:bg-purple-600 text-white border-purple-600"
                    : "bg-[#0d1520] border border-slate-700 text-white hover:bg-slate-800"
                }`}
              >
                <CrydIcon size={14} />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sticky top-0 z-10 bg-[#060a12] pt-0.5 pb-0.5">
              <Button
                variant={consumableSubTab === "shields" ? "default" : "outline"}
                onClick={() => setConsumableSubTab("shields")}
                className={`text-[8px] py-0.5 ${consumableSubTab === "shields" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-[#0d1520] border-slate-700 text-white hover:bg-slate-800"}`}
              >
                <Globe className="w-3 h-3 mr-0.5" /> SHIELDS
              </Button>
              <Button
                variant={consumableSubTab === "parts" ? "default" : "outline"}
                onClick={() => setConsumableSubTab("parts")}
                className={`text-[8px] py-1 px-1 ${consumableSubTab === "parts" ? "bg-orange-600 hover:bg-orange-500 text-white border-2 border-blue-500" : "bg-[#0d1520] border-2 border-blue-600 text-white hover:bg-slate-800"}`}
              >
                <img src={GEAR_PART_ICON_URL} alt="Parts" className="w-5 h-5 object-contain inline-block" /> PARTS
              </Button>
              <Button
                variant={consumableSubTab === "shards" ? "default" : "outline"}
                onClick={() => setConsumableSubTab("shards")}
                className={`text-[8px] py-1 px-1 ${consumableSubTab === "shards" ? "bg-yellow-600 hover:bg-yellow-500 text-black border-2 border-yellow-400" : "bg-[#0d1520] border-2 border-yellow-500 text-white hover:bg-slate-800"}`}
              >
                <img src={AVATAR_SHARD_ICON_URL} alt="Shards" className="w-5 h-5 object-contain inline-block" /> SHARDS
              </Button>
            </div>

            {/* Owned count header for shards */}
            {consumableSubTab === 'shards' && (
              <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg px-3 py-2 flex items-center gap-2 mb-2">
                <img src={AVATAR_SHARD_ICON_URL} alt="Avatar Shard" className="w-5 h-5 object-contain" />
                <span className="text-sm text-yellow-300 font-semibold">Owned: <span className="text-white font-bold">{(playerData.consumables || {})['AVATAR_SHARD'] || 0} shards</span></span>
              </div>
            )}
            {/* Owned count header for parts */}
            {consumableSubTab === 'parts' && (
              <div className="bg-orange-950/30 border border-orange-800/40 rounded-lg px-3 py-2 flex items-center gap-2 mb-2">
                <img src={GEAR_PART_ICON_URL} alt="Gear Part" className="w-5 h-5 object-contain" />
                <span className="text-sm text-orange-300 font-semibold">Owned: <span className="text-white font-bold">{(playerData.consumables || {})['GEAR_SHARD'] || 0} parts</span></span>
              </div>
            )}

            <div className="space-y-2">
               {(CONSUMABLES[consumableSubTab] || []).map((item) => {
                 const ownedQty = consumableSubTab === 'parts'
                   ? (playerData.consumables || {})['GEAR_SHARD'] || 0
                   : (playerData.consumables || {})[item.id] || 0;
                 const dailyCashPurchased = CONSUMABLE_LIMIT_CATEGORIES.includes(consumableSubTab) && getDailyConsumablePurchased(item.id);
                 const crydDailyPurchased = item.dailyLimit && getDailyConsumablePurchased(item.id);

                 return (
                   <div key={item.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                     <div className="flex-1">
                       <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                         {consumableSubTab === 'shards' && <img src={AVATAR_SHARD_ICON_URL} alt="" className="w-4 h-4 object-contain inline-block" />}
                         {consumableSubTab === 'parts' && <img src={GEAR_PART_ICON_URL} alt="" className="w-4 h-4 object-contain inline-block" />}
                         {item.name}
                       </h3>
                       <div className="flex gap-2 mt-1 text-[10px] items-center flex-wrap">
                         {(consumableSubTab === 'shards' || consumableSubTab === 'parts') ? (
                           <span className="text-purple-300 font-bold flex items-center gap-0.5">{item.priceCrypto}<CrydIcon size={11} /> CRYD &nbsp;<span className="text-emerald-400 font-semibold">Owned: {consumableSubTab === 'shards' ? ((playerData.consumables || {})['AVATAR_SHARD'] || 0) : ((playerData.consumables || {})['GEAR_SHARD'] || 0)}</span></span>
                         ) : (
                           <>
                             {item.priceCash > 0 && (
                                   <span className={`${dailyCashPurchased ? 'text-slate-400 line-through' : 'text-green-500'}`}>
                                     💵 {item.priceCash.toLocaleString()} {dailyCashPurchased ? '(used)' : '(1/day)'}
                                   </span>
                                 )}
                             {item.priceCrypto > 0 && (
                               <span className="flex items-center gap-0.5 text-purple-300">
                                 {item.priceCrypto}<CrydIcon size={11} /> ∞
                               </span>
                             )}
                             {item.priceUSD && (
                               <span className="flex items-baseline gap-1.5">
                                 {item.originalPriceUSD && (
                                   <span className="text-slate-500 line-through text-[10px]">${item.originalPriceUSD}</span>
                                 )}
                                 <span className="text-green-500 text-base font-bold">${item.priceUSD}</span>
                               </span>
                             )}
                             {item.valueLabel && (
                               <span className="text-yellow-400 font-bold text-[9px] bg-yellow-900/30 border border-yellow-700/40 px-1.5 py-0.5 rounded-full">{item.valueLabel}</span>
                             )}
                             {item.dailyLimit && (
                               <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded-full border ${crydDailyPurchased ? 'text-slate-500 bg-slate-800 border-slate-700' : 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40'}`}>{crydDailyPurchased ? 'USED' : '1/DAY'}</span>
                             )}
                           </>
                         )}
                         {consumableSubTab === 'parts' && (
                           <span className="text-emerald-400">Owned: {(playerData.consumables || {})['GEAR_SHARD'] || 0} parts</span>
                         )}
                         {consumableSubTab !== 'parts' && ownedQty > 0 && (
                           <span className="text-emerald-400">Owned: {ownedQty}</span>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <Button
                         size="sm"
                         variant="default"
                         onClick={() => handleConsumableBuy(consumableSubTab, item)}
                         disabled={(dailyCashPurchased && item.priceCash > 0 && !item.priceCrypto) || crydDailyPurchased}
                         className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                       >
                         Buy
                       </Button>
                       {ownedQty > 0 && consumableSubTab !== 'shards' && consumableSubTab !== 'parts' && (
                         <Button
                           size="sm"
                           variant="default"
                           onClick={() => handleConsumableUse(item)}
                           className="text-xs bg-blue-600 hover:bg-blue-500"
                         >
                           Use
                         </Button>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
              </TabsContent>

              {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-bold text-green-400 mb-2">CASH PACKAGES</h3>
              <div className="space-y-2">
                {RESOURCE_PACKAGES.cash.map((pkg) => (
                  <div key={pkg.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-200">${pkg.amount.toLocaleString()} Cash</h3>
                      <div className="text-xs text-green-500 mt-0.5">${pkg.price}</div>
                    </div>
                    <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-500">
                      Purchase
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-1">
                <CrydIcon size={13} /> CRYD PACKAGES
              </h3>
              <div className="space-y-2">
                {RESOURCE_PACKAGES.cryd.map((pkg) => (
                  <div key={pkg.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                        {pkg.amount.toLocaleString()} <CrydIcon size={13} /> CRYD
                      </h3>
                      <div className="text-xs text-green-500 mt-0.5">${pkg.price}</div>
                    </div>
                    <Button size="sm" variant="default" className="text-xs bg-blue-600 hover:bg-blue-500">
                      Purchase
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* VIP Tab */}
          <TabsContent value="vip" className="mt-4">
            <ShopVipTab playerData={playerData} onPlayerUpdate={(updated) => { setPlayerData(updated); }} />
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Weapon Slot Selector */}
      {equipSlotModal && (
        <Dialog open={!!equipSlotModal} onOpenChange={() => setEquipSlotModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">
                {equipSlotModal.isFirearm ? 'Select Weapon Slot' : 'Select Accessory Slot'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {(equipSlotModal.isFirearm ? ["weapon1", "weapon2"] : ["weapon3", "weapon4"]).map((slot) => {
                const freshPlayer = getPlayerData();
                const currentItemId = freshPlayer.loadout?.[slot];
                const allItems = [...getCategoryDataFull('firearms'), ...getCategoryDataFull('weapons')];
                const currentItem = currentItemId ? allItems.find(w => w.id === currentItemId) : null;
                const slotLabel = slot === "weapon1" ? "Weapon Slot 1 🔫" : slot === "weapon2" ? "Weapon Slot 2 🔫" : slot === "weapon3" ? "Accessory Slot 1 🗡️" : "Accessory Slot 2 🗡️";
                const isAlreadyHere = currentItemId === equipSlotModal.item?.id;
                return (
                  <div key={slot} className={`border rounded-lg p-3 transition-colors ${isAlreadyHere ? 'border-emerald-600 bg-emerald-950/20' : 'border-slate-800 bg-slate-900'}`}>
                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{slotLabel}</div>
                    {currentItem ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-slate-300 truncate flex-1">
                          {isAlreadyHere ? <span className="text-emerald-400 font-bold">✅ {currentItem.name}</span> : currentItem.name}
                        </div>
                        {!isAlreadyHere && (
                          <Button size="sm" onClick={() => handleWeaponSlotClick(slot)} className="bg-emerald-600 hover:bg-emerald-500 text-xs shrink-0">
                            Equip Here
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500 italic flex-1">Empty slot</div>
                        <Button size="sm" onClick={() => handleWeaponSlotClick(slot)} className="bg-emerald-600 hover:bg-emerald-500 text-xs shrink-0">
                          Equip Here
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Equip Confirmation Modal */}
      {confirmEquipModal && (
        <Dialog open={!!confirmEquipModal} onOpenChange={() => setConfirmEquipModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">
                {confirmEquipModal.replace ? "Replace Item?" : "Confirm Equip"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {confirmEquipModal.replace ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-amber-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>This will send your current item back to inventory and equip the new one.</p>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p className="mb-2">Equip <span className="text-emerald-400 font-semibold">{confirmEquipModal.item.name}</span>?</p>
                    <div className="text-xs text-slate-600">
                      {confirmEquipModal.item.atk > 0 && `+${confirmEquipModal.item.atk} ATK `}
                      {confirmEquipModal.item.def > 0 && `+${confirmEquipModal.item.def} DEF`}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-300">
                  <p className="mb-2">Equip <span className="text-emerald-400 font-semibold">{confirmEquipModal.item.name}</span>?</p>
                  <div className="text-xs text-slate-600">
                    {confirmEquipModal.item.atk > 0 && `+${confirmEquipModal.item.atk} ATK `}
                    {confirmEquipModal.item.def > 0 && `+${confirmEquipModal.item.def} DEF`}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={confirmEquipModal.category ? handleConfirmGearEquip : handleConfirmWeaponEquip}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => setConfirmEquipModal(null)}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Theme Preview Modal */}
      {themePreviewModal && (
        <Dialog open={!!themePreviewModal} onOpenChange={() => setThemePreviewModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">{themePreviewModal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg overflow-hidden max-h-[60vh]">
                <img src={themePreviewModal.previewImage} alt={themePreviewModal.name} className="w-full h-auto object-cover" />
              </div>
              <div className="flex items-center justify-between text-sm">
                {themePreviewModal.priceCrypto > 0 && (
                  <span className="flex items-center gap-1 text-purple-300 font-semibold">
                    {themePreviewModal.priceCrypto}<CrydIcon size={14} />
                  </span>
                )}
                {themePreviewModal.level > 1 && (
                  <div className={`text-xs ${themePreviewModal.level > playerData.level ? 'text-red-400' : 'text-slate-400'}`}>
                    {themePreviewModal.level > playerData.level ? '🔒' : ''} Level {themePreviewModal.level}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {getInventoryQty('themes', themePreviewModal.id) > 0 ? (
                  <Button
                    onClick={() => {
                      handleEquipClick('themes', themePreviewModal);
                      setThemePreviewModal(null);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    Equip
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      handlePurchase('themes', themePreviewModal);
                      setThemePreviewModal(null);
                    }}
                    disabled={themePreviewModal.level > playerData.level}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                  >
                    {themePreviewModal.level > playerData.level ? `Locked (Lv.${themePreviewModal.level})` : 'Purchase'}
                  </Button>
                )}
                <Button
                  onClick={() => setThemePreviewModal(null)}
                  variant="outline"
                  className="border-slate-700 text-slate-400"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Vehicle Preview Modal */}
      {vehiclePreviewModal && (
        <Dialog open={!!vehiclePreviewModal} onOpenChange={() => setVehiclePreviewModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-blue-900/40 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-400">{vehiclePreviewModal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg overflow-hidden">
                <img src={vehiclePreviewModal.imageUrl} alt={vehiclePreviewModal.name} className="w-full h-auto object-cover" />
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>+{vehiclePreviewModal.atk} ATK • +{vehiclePreviewModal.def} DEF</span>
                <span>Lv{vehiclePreviewModal.requiredLevel}</span>
              </div>
              <Button onClick={() => setVehiclePreviewModal(null)} variant="outline" className="w-full border-slate-700 text-slate-400">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Scene Preview Modal */}
      {scenePreviewModal && (
        <Dialog open={!!scenePreviewModal} onOpenChange={() => setScenePreviewModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">{scenePreviewModal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg overflow-hidden mx-auto" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
                <img src={scenePreviewModal.imageUrl} alt={scenePreviewModal.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center justify-between text-sm">
                {scenePreviewModal.priceCrypto > 0 && (
                  <span className="flex items-center gap-1 text-purple-300 font-semibold">
                   {scenePreviewModal.priceCrypto}<CrydIcon size={14} />
                  </span>
                )}
                {scenePreviewModal.level > 1 && (
                  <div className={`text-xs ${scenePreviewModal.level > playerData.level ? 'text-red-400' : 'text-slate-400'}`}>
                    {scenePreviewModal.level > playerData.level ? '🔒' : ''} Level {scenePreviewModal.level}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {getInventoryQty('scenes', scenePreviewModal.id) > 0 ? (
                  <Button onClick={() => { handleEquipClick('scenes', scenePreviewModal); setScenePreviewModal(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500">Equip</Button>
                ) : (
                  <Button onClick={() => { handlePurchase('scenes', scenePreviewModal); setScenePreviewModal(null); }} disabled={scenePreviewModal.level > playerData.level} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                    {scenePreviewModal.level > playerData.level ? `Locked (Lv.${scenePreviewModal.level})` : 'Purchase'}
                  </Button>
                )}
                <Button onClick={() => setScenePreviewModal(null)} variant="outline" className="border-slate-700 text-slate-400">Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Currency Choice Modal */}
      {currencyChoiceModal && (
        <Dialog open={!!currencyChoiceModal} onOpenChange={() => setCurrencyChoiceModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">Choose Payment Method</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-slate-300 mb-4">
                <p className="mb-2">Purchase <span className="text-emerald-400 font-semibold">{currencyChoiceModal.item.name}</span></p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (currencyChoiceModal.category === 'consumable') {
                      completeConsumablePurchase(currencyChoiceModal.subTab, currencyChoiceModal.item, 'cash');
                    } else {
                      completePurchase(currencyChoiceModal.category, currencyChoiceModal.item, 'cash');
                    }
                    setCurrencyChoiceModal(null);
                  }}
                  disabled={playerData.cash < currencyChoiceModal.item.priceCash || (CONSUMABLE_LIMIT_CATEGORIES.includes(currencyChoiceModal.subTab) && getDailyConsumablePurchased(currencyChoiceModal.item.id))}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40"
                >
                  💵 {currencyChoiceModal.item.priceCash.toLocaleString()}
                </Button>
                <Button
                  onClick={() => {
                    if (currencyChoiceModal.category === 'consumable') {
                      completeConsumablePurchase(currencyChoiceModal.subTab, currencyChoiceModal.item, 'cryd');
                    } else {
                      completePurchase(currencyChoiceModal.category, currencyChoiceModal.item, 'cryd');
                    }
                    setCurrencyChoiceModal(null);
                  }}
                  disabled={playerData.crypto < currencyChoiceModal.item.priceCrypto}
                  className="flex-1 bg-purple-700 hover:bg-purple-600"
                >
                  <CrydIcon size={14} />
                  <span className="ml-1">{currencyChoiceModal.item.priceCrypto} CRYD</span>
                </Button>
              </div>
              <Button
                onClick={() => setCurrencyChoiceModal(null)}
                variant="outline"
                className="w-full border-slate-700 text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Under Equip Level Warning Modal */}
      {underLevelWarning && (
        <Dialog open={!!underLevelWarning} onOpenChange={() => setUnderLevelWarning(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-amber-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-amber-400">⚠️ Level Requirement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-amber-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold mb-1">You are below the required level to EQUIP this weapon.</p>
                  <p className="text-slate-400 text-xs">
                    <span className="text-amber-400 font-bold">{underLevelWarning.item.name}</span> ({underLevelWarning.item.rarityLabel}) requires <span className="text-white font-bold">Level {underLevelWarning.item.equipLevel}</span> to equip to your loadout.
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    You can still purchase it and upgrade it, but it cannot be added to your active loadout until you reach Level {underLevelWarning.item.equipLevel}.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const { category, item } = underLevelWarning;
                    setUnderLevelWarning(null);
                    // Proceed with normal purchase flow
                    if (item.priceCash > 0 && item.priceCrypto > 0) {
                      setCurrencyChoiceModal({ category, item });
                    } else if (item.priceCash > 0 && playerData.cash < item.priceCash) {
                      setInsufficientFundsModal({ type: 'cash', needed: item.priceCash, have: playerData.cash });
                    } else if (item.priceCrypto > 0 && playerData.crypto < item.priceCrypto) {
                      setInsufficientFundsModal({ type: 'cryd', needed: item.priceCrypto, have: playerData.crypto });
                    } else {
                      completePurchase(category, item, item.priceCash > 0 ? 'cash' : 'cryd');
                    }
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold"
                >
                  I Understand — Buy Anyway
                </Button>
                <Button onClick={() => setUnderLevelWarning(null)} variant="outline" className="flex-1 border-slate-700 text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Insufficient Funds Modal */}
      {insufficientFundsModal && (
        <Dialog open={!!insufficientFundsModal} onOpenChange={() => setInsufficientFundsModal(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-red-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Insufficient Funds</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-slate-300">
                <p className="mb-2">You don't have enough {insufficientFundsModal.type === 'cash' ? 'Cash' : 'CRYD'} for this purchase.</p>
                <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">You have:</span>
                    <span className="text-slate-300">{insufficientFundsModal.have.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">You need:</span>
                    <span className="text-red-400">{insufficientFundsModal.needed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Short by:</span>
                    <span className="text-red-500">{(insufficientFundsModal.needed - insufficientFundsModal.have).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setInsufficientFundsModal(null);
                  setActiveTab('resources');
                  setPage(1);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                Get More {insufficientFundsModal.type === 'cash' ? 'Cash' : 'CRYD'} Here
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ItemImagePreviewModal item={itemImagePreview} onClose={() => setItemImagePreview(null)} />

      <PurchaseOverlay state={purchaseOverlay} onClose={() => setPurchaseOverlay(null)} />

      {/* Ability/Stats Preview Modal */}
      {abilityPreview && (
        <Dialog open={!!abilityPreview} onOpenChange={() => setAbilityPreview(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-sm">
                {abilityPreview.type === 'avatar' ? '👁️ Avatar Ability Preview' : '⚔️ Weapon Upgrade Preview'}
              </DialogTitle>
            </DialogHeader>
            {abilityPreview.type === 'avatar' ? (() => {
              const ab = AVATAR_ABILITIES[abilityPreview.item.id];
              if (!ab) return <div className="text-slate-400 text-sm">No ability data.</div>;
              const maxShards = STAR_SHARD_REQUIREMENTS.reduce((a, b) => a + b, 0);
              const defaultBonus = getAvatarStatBonus(abilityPreview.item.id, 0);
              const maxBonus = getAvatarStatBonus(abilityPreview.item.id, maxShards);
              return (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <img src={abilityPreview.item.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg border border-slate-700 bg-slate-900" />
                    <div>
                      <div className="font-bold text-yellow-200">{abilityPreview.item.name}</div>
                      <div className="text-slate-400">{ab.icon} {ab.label}</div>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mb-1">Base (Star 0 — No Shards):</div>
                    {ab.stats.map((s, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-emerald-400">{s}</span>
                        <span className="text-white font-bold">+{defaultBonus?.bonusPct || 0}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-2.5 space-y-1">
                    <div className="text-[10px] text-yellow-500 uppercase font-bold tracking-wide mb-1">Fully Upgraded (Star 10 — {maxShards} Shards):</div>
                    {ab.stats.map((s, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-emerald-400">{s}</span>
                        <span className="text-yellow-400 font-bold">+{maxBonus?.bonusPct || 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (() => {
              const maxParts = WEAPON_STAR_COSTS.reduce((a, b) => a + b, 0);
              const itemRarity = abilityPreview.item.rarity || 'common';
              const maxBonusPct = getWeaponUpgradeBonus(maxParts, itemRarity);
              const item = abilityPreview.item;
              return (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg border border-slate-700 bg-slate-900" />}
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      {item.rarityLabel && <div className={`text-[9px] font-bold ${item.rarityColor}`}>[{item.rarityLabel}]</div>}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mb-1">Base (No Upgrades):</div>
                    <div className="flex justify-between">
                      <span className="text-red-400">ATK</span>
                      <span className="text-white font-bold">+{item.atk}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">DEF</span>
                      <span className="text-white font-bold">+{item.def}</span>
                    </div>
                    {item.igcBonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-cyan-400">IGC</span>
                        <span className="text-white font-bold">+{item.igcBonus}%</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-2.5 space-y-1">
                    <div className="text-[10px] text-yellow-500 uppercase font-bold tracking-wide mb-1">Fully Upgraded (Star 10 — {maxParts} Parts):</div>
                    <div className="flex justify-between">
                      <span className="text-red-400">ATK (+{maxBonusPct}%)</span>
                      <span className="text-yellow-400 font-bold">+{(item.atk * (1 + maxBonusPct / 100)).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">DEF (+{maxBonusPct}%)</span>
                      <span className="text-yellow-400 font-bold">+{(item.def * (1 + maxBonusPct / 100)).toFixed(1)}</span>
                    </div>
                    {item.igcBonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-cyan-400">IGC (+{maxBonusPct}%)</span>
                        <span className="text-yellow-400 font-bold">+{(item.igcBonus * (1 + maxBonusPct / 100)).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[8px] text-slate-600 text-center pt-1 border-t border-slate-800/40">
                    Upgrade Limits: <span className="text-slate-400">Common +{getRarityUpgradeMaxPct('common')}%</span> · <span className="text-blue-400">Rare +{getRarityUpgradeMaxPct('rare')}%</span> · <span className="text-purple-400">Epic +{getRarityUpgradeMaxPct('epic')}%</span> · <span className="text-yellow-400">Legendary +{getRarityUpgradeMaxPct('legendary')}%</span>
                  </div>
                </div>
              );
            })()}
            <Button onClick={() => setAbilityPreview(null)} variant="outline" className="w-full border-slate-700 text-slate-400 mt-2">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      <GlobalChatBar />
      <BottomNav />
    </div>
  );
}