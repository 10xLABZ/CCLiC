import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData, savePlayerData, getReputationTitle, updateEquipped, equipAvatar, equipScene, equipTheme, getInventoryQty, canEquipItem, updateLoadout } from "../components/utils/playerStorage";
import { getCategoryData, FIREARMS, WEAPONS } from "@/components/store/catalogData";
import { getThemeById } from "@/components/store/themesData";
import { computeCombatStats } from "@/components/tradewars/botGenerator";
import { Shield, Sword, TrendingUp, Edit2, ArrowUpCircle, Info, Settings } from "lucide-react";
import LoadoutDisplay from "@/components/profile/LoadoutDisplay";
import StrengthBreakdownModal from "@/components/profile/StrengthBreakdownModal";
import TerritoriesModal from "@/components/profile/TerritoriesModal";
import { getWeaponPartsSpent, getWeaponStarProgress, getWeaponUpgradeBonus, ARCHETYPE_CONFIG } from "@/components/weapons/weaponUpgradeSystem";
import WeaponUpgradeModal from "@/components/weapons/WeaponUpgradeModal";
import SimpleUpgradeModal from "@/components/upgrades/SimpleUpgradeModal";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import GlobalChatBar from "@/components/chat/GlobalChatBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import CustomizeProfileOverlay from "@/components/profile/CustomizeProfileOverlay";
import { getAvatarUrl } from "@/components/profile/avatarUtils";
import CosmeticSaveOverlay from "@/components/profile/CosmeticSaveOverlay";
import { equipCosmetic, equipCosmetics, refreshFromServer, saveProfileCore, saveFullLoadout } from "@/lib/playerServerSync";
import AvatarWithScene from "@/components/avatar/AvatarWithScene";
import AvatarUpgradeModule from "@/components/avatar/AvatarUpgradeModule";
import { AVATAR_ABILITIES, getAvatarStarProgress, SUBS_PER_STAR } from "@/components/avatar/avatarAbilities";
import { getPlayerType, PLAYER_TYPE_COLORS } from "@/components/utils/playerTypeHelper";
import VipFrame from "@/components/vip/VipFrame";
import { isVipActive } from "@/lib/vipHelper";
import { computeFullPlayerStats } from "@/lib/playerStatsHelper";
import { FAST_FIVE_GOAL_ICONS } from "@/components/events/eventStorage";
import { base44 } from "@/api/base44Client";

// Resolve any loadout item by ID regardless of category
const getLoadoutItem = (itemId) => {
  if (!itemId) return null;
  if (itemId.startsWith('F')) return FIREARMS.find(i => i.id === itemId) || null;
  if (itemId.startsWith('W')) return WEAPONS.find(i => i.id === itemId) || null;
  // vehicles, people, pets
  return (
    getCategoryData('vehicles').find(i => i.id === itemId) ||
    getCategoryData('people').find(i => i.id === itemId) ||
    getCategoryData('pets').find(i => i.id === itemId) ||
    null
  );
};

const getItemById = (category, itemId) => {
  if (!itemId) return null;
  if (category === 'firearms') return FIREARMS.find(i => i.id === itemId) || null;
  const items = getCategoryData(category);
  return items.find(item => item.id === itemId) || null;
};

const SLOT_NAMES = {
  weapon1: "🔫 Weapon Slot 1",
  weapon2: "🔫 Weapon Slot 2",
  weapon3: "🗡️ Accessory Slot 1",
  weapon4: "🗡️ Accessory Slot 2",
  vehicle: "🚗 Vehicle",
  personPower: "👤 Person of Power",
  pet: "🐾 Pet",
};

export default function ProfilePage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [pageLoading, setPageLoading] = useState(true);
  const [cosmeticSave, setCosmeticSave] = useState(null); // null | 'saving' | 'success'

  // On mount: pull the real server state before rendering anything.
  // The profile page is a "dumb TV" — it projects ONLY what the server says.
  React.useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    refreshFromServer().finally(() => setPageLoading(false));
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [confirmEquip, setConfirmEquip] = useState(null);
  const [upgradeWeaponModal, setUpgradeWeaponModal] = useState(null);
  const [simpleUpgradeModal, setSimpleUpgradeModal] = useState(null); // { item, category }
  const [territoriesOpen, setTerritoriesOpen] = useState(false);
  const [strengthBreakdownOpen, setStrengthBreakdownOpen] = useState(false);

  // Loadout presets — stored on the player record itself so they sync via the
  // standard savePlayerData → flushToServer pipeline (no separate API calls needed)
  const [presetPopup, setPresetPopup] = useState(null);
  const [presetConfirm, setPresetConfirm] = useState(null);

  // Presets live in playerData.loadoutPresets (a JSON-stringified object)
  const getPresets = () => {
    try { return JSON.parse(playerData.loadoutPresets || '{}'); } catch { return {}; }
  };

  const handleSavePreset = (num) => {
    const presets = getPresets();
    presets[num] = { ...playerData.loadout };
    const updated = savePlayerData({ loadoutPresets: JSON.stringify(presets) });
    setPlayerData(updated);
    setPresetConfirm(null);
    setPresetPopup(null);
    toast.success(`Preset ${num} saved!`);
  };

  const handleLoadPreset = async (num) => {
    const presets = getPresets();
    if (!presets[num]) {
      toast.error(`Preset ${num} is empty — save a loadout first.`);
      setPresetPopup(null);
      return;
    }
    // Patch local cache for responsive UI, then direct server write
    const player = getPlayerData();
    setPlayerData({ ...player, loadout: presets[num] });
    try {
      await saveFullLoadout(presets[num]);
      setPlayerData(getPlayerData());
      toast.success(`Preset ${num} loaded!`);
    } catch (err) {
      toast.error("Failed to load preset — try again");
    }
    setPresetPopup(null);
  };

  const handleClearPreset = (num) => {
    const presets = getPresets();
    delete presets[num];
    const updated = savePlayerData({ loadoutPresets: JSON.stringify(presets) });
    setPlayerData(updated);
    setPresetConfirm(null);
    setPresetPopup(null);
    toast.success(`Preset ${num} cleared.`);
  };

  const reputationTitle = getReputationTitle(playerData.respect);
  
  const totalWars = (playerData.totalTradeWarWins || 0) + (playerData.totalTradeWarLosses || 0);
  const warWinRate = totalWars > 0 
    ? ((playerData.totalTradeWarWins || 0) / totalWars * 100).toFixed(3)
    : "0.000";

  const getInventoryForSlot = (slot) => {
    if (slot === 'weapon1' || slot === 'weapon2') {
      // FIREARMS only in slots 1 & 2
      return FIREARMS.filter(f => (playerData.inventory?.firearms || {})[f.id] > 0);
    } else if (slot === 'weapon3' || slot === 'weapon4') {
      // ACCESSORIES (legacy weapons) only in slots 3 & 4
      return WEAPONS.filter(w => (playerData.inventory?.weapons || {})[w.id] > 0);
    } else if (slot === 'vehicle') {
      return getCategoryData('vehicles').filter(v => (playerData.inventory?.vehicles || {})[v.id] > 0);
    } else if (slot === 'personPower') {
      return getCategoryData('people').filter(p => (playerData.inventory?.power || {})[p.id] > 0);
    } else if (slot === 'pet') {
      return getCategoryData('pets').filter(p => (playerData.inventory?.pets || {})[p.id] > 0);
    }
    return [];
  };

  // Map UI slot names to loadout keys
  const slotToLoadoutKey = {
    weapon1: 'weapon1', weapon2: 'weapon2', weapon3: 'weapon3', weapon4: 'weapon4',
    vehicle: 'vehicle', personPower: 'power', pet: 'pet'
  };

  const handleEquipClick = (slot, itemId) => {
    const loadoutKey = slotToLoadoutKey[slot] || slot;
    if (!itemId) {
      updateLoadout(loadoutKey, null);
      setPlayerData(getPlayerData());
      setSelectedSlot(null);
      toast.success("Unequipped!");
      return;
    }

    const categoryMap = {
      weapon1: 'firearms', weapon2: 'firearms', weapon3: 'weapons', weapon4: 'weapons',
      vehicle: 'vehicles', personPower: 'power', pet: 'pets'
    };
    const category = categoryMap[slot];

    if (!canEquipItem(category, itemId)) {
      const ownedQty = getInventoryQty(category, itemId);
      toast.error(`You only own ${ownedQty}. Already equipped.`);
      return;
    }

    // Level lock check
    const equipItem = getLoadoutItem(itemId);
    if (equipItem && equipItem.equipLevel && playerData.level < equipItem.equipLevel) {
      toast.error(`Requires Level ${equipItem.equipLevel} to equip!`);
      return;
    }

    const item = getLoadoutItem(itemId);
    setConfirmEquip({ slot, loadoutKey, itemId, item });
  };

  const handleConfirmEquip = () => {
    if (confirmEquip) {
      updateLoadout(confirmEquip.loadoutKey || confirmEquip.slot, confirmEquip.itemId);
      setPlayerData(getPlayerData());
      setConfirmEquip(null);
      setSelectedSlot(null);
      toast.success("Equipped!");
    }
  };

  const handleCosmeticSave = async (draft) => {
    setCosmeticSave('saving');
    try {
      // Single atomic server update for ALL cosmetic fields at once
      await equipCosmetics({ avatar: draft.avatar, scene: draft.scene, theme: draft.theme });
      // Save core profile fields atomically
      const coreUpdates = {};
      if (draft.profileImage !== playerData.profileImageDataUrl) coreUpdates.profileImageDataUrl = draft.profileImage;
      if (draft.frameId !== playerData.equippedFrameId) coreUpdates.equippedFrameId = draft.frameId;
      const trimmedName = draft.username?.trim() || '';
      if (trimmedName && trimmedName !== (playerData.username || '')) {
        if (trimmedName.length < 3 || trimmedName.length > 16) {
          toast.error("Name must be 3-16 characters");
          setCosmeticSave(null);
          return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
          toast.error("Only letters, numbers, and underscore allowed");
          setCosmeticSave(null);
          return;
        }
        const existing = await base44.entities.PlayerProfile.filter({ username: trimmedName });
        if (existing && existing.length > 0) {
          toast.error("That username is already taken.");
          setCosmeticSave(null);
          return;
        }
        coreUpdates.username = trimmedName;
      }
      if (Object.keys(coreUpdates).length > 0) {
        await saveProfileCore(coreUpdates);
      }

      setPlayerData(getPlayerData());
      setCosmeticSave('success');
      setTimeout(() => {
        setCosmeticSave(null);
        setAvatarModalOpen(false);
      }, 800);
    } catch (err) {
      toast.error("Failed to save. Please try again.");
      setCosmeticSave(null);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <div className="text-emerald-500 text-xs font-semibold tracking-wider uppercase">Loading Profile</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD />

      {/* Cosmetic Save Overlay — blocks all interaction until server confirms */}
      <CosmeticSaveOverlay status={cosmeticSave} />

      <div className="pt-[114px] max-w-4xl mx-auto px-4 py-4">
        {/* USERNAME BOX - with background image */}
        <div 
          className="mb-2 rounded-xl overflow-hidden relative"
          style={{
            backgroundImage: `url(${getThemeById(playerData.equippedThemeId)?.usernameImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/1cb4bea85_Theme_001_UsernameBox-RustyHotness.jpg'})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: '80px'
          }}
        >
          <div className="text-center py-3 px-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl">{playerData.gender === 'M' ? '🚹' : playerData.gender === 'F' ? '🚺' : playerData.gender === 'NB' ? '⚧️' : '🚹'}</span>
              {playerData.allianceTag && (
                <span className="text-xl font-bold text-amber-400">[{playerData.allianceTag}]</span>
              )}
              <div className="text-2xl font-bold text-slate-200">
                {playerData.username || "Create Username"}
              </div>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setAvatarModalOpen(true)} 
                className="bg-black hover:bg-slate-900 text-slate-400 hover:text-slate-300 h-7 w-7"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-xs font-bold uppercase ${PLAYER_TYPE_COLORS[getPlayerType(playerData)]}`}>{getPlayerType(playerData)}</span>
              <span className="text-xs text-amber-400">{reputationTitle}</span>
            </div>
          </div>
        </div>

        {/* MAIN BODY: Two Columns - Left 40%, Right 60% */}
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: '40% 60%' }}>
          {/* LEFT COLUMN - STATS + BUTTONS (40% width) */}
          <div className="space-y-2" style={{ minWidth: '140px' }}>
            {/* Strength Stats */}
            <div 
              className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-2.5 relative overflow-hidden"
              style={{
                backgroundImage: `url(${getThemeById(playerData.equippedThemeId)?.strengthImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/604225359_Theme_001_StrengthBox_RustyHotness.jpg'})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10">
                <Sword className="w-3 h-3" /> Strength
                <button onClick={() => setStrengthBreakdownOpen(true)} className="text-yellow-400 hover:text-yellow-300 transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </h3>
              <div className="space-y-1 relative z-10">
                {(() => {
                const stats = computeFullPlayerStats(playerData);
                return (
                  <>
                    <StatRow label="ATK" value={stats.atk.toFixed(2)} icon="⚔️" />
                    <StatRow label="DEF" value={stats.def.toFixed(2)} icon="🛡️" />
                    <StatRow label="TP" value={(stats.atk + stats.def).toFixed(2)} icon="💥" />
                  </>
                );
              })()}
              </div>
            </div>

            {/* Performance Stats */}
            <div 
              className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-2.5 relative overflow-hidden"
              style={{
                backgroundImage: `url(${getThemeById(playerData.equippedThemeId)?.performanceImage || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/913a43062_Theme_001_PerformanceBox_RustyHotness.jpg'})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 relative z-10">
                <TrendingUp className="w-3 h-3" /> Performance
              </h3>
              <div className="space-y-1 relative z-10">
                <StatRow label="Jobs" value={playerData.totalJobsCompleted || 0} iconUrl={FAST_FIVE_GOAL_ICONS.jobs} />
                <StatRow label="Assists" value={playerData.totalAssists || 0} iconUrl={FAST_FIVE_GOAL_ICONS.assists} />
                <StatRow label="Sabotages" value={playerData.totalSabotages || 0} iconUrl={FAST_FIVE_GOAL_ICONS.sabotages} />
                <StatRow label="Trades" value={playerData.totalTradesCompleted || 0} iconUrl="https://media.base44.com/images/public/699169456a354d6cb7082777/3152921ec_tradeimage1.jpg" />
                <div className="pt-1 border-t border-slate-900/50 mt-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>⚔️</span>
                    Trade Wars
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">W/L:</span>
                      <span className="text-slate-300 font-semibold">
                        {playerData.totalTradeWarWins || 0}/{playerData.totalTradeWarLosses || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">W%:</span>
                      <span className="text-slate-300 font-semibold">{warWinRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Button Stack */}
            <div className="flex flex-col gap-0.5">
              <Link to={createPageUrl("HQPage")} className="block">
                <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]">
                  <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/966f79e98_button-hq2.png" alt="HQ" className="w-full h-full object-cover" />
                </button>
              </Link>
              <Link to={createPageUrl("AlliancePage")} className="block">
                <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]">
                  <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/6d657fb4e_button-fund4.png" alt="FUND" className="w-full h-full object-cover" />
                </button>
              </Link>
              <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.5)]" onClick={() => setTerritoriesOpen(true)}>
                <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/81eb38a61_button-territories.png" alt="TERRITORIES" className="w-full h-full object-cover" />
              </button>
              <Link to={createPageUrl("InventoryPage")} className="block">
                <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-white/50 shadow-[0_0_6px_rgba(255,255,255,0.3)]">
                  <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/cd24efb12_button-inventory.png" alt="INVENTORY" className="w-full h-full object-cover" />
                </button>
              </Link>
              <Link to={createPageUrl("DevelopmentPage")} className="block">
                <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                  <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/761a89b4e_button-development.png" alt="DEVELOPMENT" className="w-full h-full object-cover" />
                </button>
              </Link>
              <Link to={createPageUrl("ResearchPage")} className="block">
                <button className="w-full h-8 rounded-md overflow-hidden hover:opacity-90 transition-opacity border-2 border-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                  <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/3165fb3a1_button-research.png" alt="RESEARCH" className="w-full h-full object-cover" />
                </button>
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN - AVATAR (60% width) */}
          <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-2 relative" style={{ minWidth: '180px' }}>
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="w-full bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-600/50 transition-colors overflow-hidden relative"
              style={{ height: 'clamp(260px, 60vh, 420px)' }}
            >
              <AvatarWithScene
                  avatarSrc={getAvatarUrl(playerData.equippedAvatarId)}
                  sceneId={playerData.equippedSceneId}
                  className="w-full h-full"
                />
            </button>
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="absolute top-2 right-2 z-10 w-7 h-7 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-600/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="mt-2">
              <div className="text-center text-[10px] text-emerald-400 mb-1">Click Image to Customize</div>
              {/* Avatar info column */}
              {playerData.equippedAvatarId && (() => {
                const ab = AVATAR_ABILITIES[playerData.equippedAvatarId];
                // Resolve real name from catalog or defaults
                const allDefaults = [
                  { id: 'avatar_male_01', name: 'Marcus Vaughn' },
                  { id: 'avatar_male_02', name: 'Ethan Caldwell' },
                  { id: 'avatar_male_03', name: 'Kenji Nakamura' },
                  { id: 'avatar_male_04', name: 'Alejandro Reyes' },
                  { id: 'avatar_female_01', name: 'Imani Brooks' },
                  { id: 'avatar_female_02', name: 'Isabella Cruz' },
                  { id: 'avatar_female_03', name: 'Mei Lin Chen' },
                  { id: 'avatar_female_04', name: 'Claire Bennett' },
                ];
                const defaultMatch = allDefaults.find(a => a.id === playerData.equippedAvatarId);
                const catalogMatch = getCategoryData('avatars').find(a => a.id === playerData.equippedAvatarId);
                const avatarName = defaultMatch?.name || catalogMatch?.name || playerData.equippedAvatarId;
                return ab ? (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1.5 mb-1 text-center">
                    <div className="text-[10px] font-bold text-slate-300">{avatarName}</div>
                    <div className="text-[9px] text-slate-500">{ab.icon} {ab.label}</div>
                  </div>
                ) : null;
              })()}
              <AvatarUpgradeModule
                avatarId={playerData.equippedAvatarId}
                playerData={playerData}
                onUpdate={setPlayerData}
              />
            </div>
          </div>
        </div>

        {/* EQUIPPED LOADOUT - Full Width Below */}
        <div className="rounded-xl overflow-hidden border-2 border-slate-500/50" style={{ boxShadow: '0 0 10px rgba(100,116,139,0.12)' }}>
          <LoadoutDisplay
            playerData={{
              ...playerData,
              _resolvedLoadout: {
                weapon1: getLoadoutItem(playerData.loadout?.weapon1),
                weapon2: getLoadoutItem(playerData.loadout?.weapon2),
                weapon3: getLoadoutItem(playerData.loadout?.weapon3),
                weapon4: getLoadoutItem(playerData.loadout?.weapon4),
                power:   getItemById('people', playerData.loadout?.power),
                pet:     getItemById('pets', playerData.loadout?.pet),
                vehicle: getItemById('vehicles', playerData.loadout?.vehicle),
              }
            }}
            loadout={playerData.loadout}
            onSlotClick={setSelectedSlot}
            presetControls={
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider mr-1">PRESET:</span>
                {[1, 2, 3].map((num) => {
                  const presets = getPresets();
                  const hasSaved = !!presets[num];
                  return (
                    <div key={num} className="relative">
                      <button
                        onClick={() => setPresetPopup(presetPopup === num ? null : num)}
                        className={`w-7 h-7 rounded-md text-xs font-black border-2 transition-all ${
                          hasSaved
                            ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        {num}
                      </button>
                      {presetPopup === num && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setPresetPopup(null)} />
                          <div className="absolute right-0 top-9 z-50 bg-[#0d1526] border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1 border-b border-slate-800">Preset {num}</div>
                            <button onClick={() => handleLoadPreset(num)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/30 transition-colors">▶ Load</button>
                            <button onClick={() => { setPresetPopup(null); setPresetConfirm({ action: 'save', num }); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-900/30 transition-colors">💾 Save</button>
                            <button onClick={() => { setPresetPopup(null); setPresetConfirm({ action: 'clear', num }); }} disabled={!hasSaved} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-30 disabled:pointer-events-none">🗑 Clear</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            }
          />
        </div>
      </div>

      {/* Equipment Selection Modal */}
      {selectedSlot && (
        <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">
                Select {SLOT_NAMES[selectedSlot]}
              </DialogTitle>
            </DialogHeader>
            {/* Currently Equipped Banner */}
            {(() => {
              const loadoutKey = slotToLoadoutKey[selectedSlot];
              const currentId = playerData.loadout?.[loadoutKey];
              const currentItem = currentId ? getLoadoutItem(currentId) : null;
              if (!currentItem) return null;
              const isWeapon = selectedSlot.startsWith('weapon');
              const totalSpent = isWeapon ? getWeaponPartsSpent(playerData, currentItem.id) : 0;
              const prog = isWeapon ? getWeaponStarProgress(totalSpent) : null;
              const archCfg = isWeapon && currentItem.weaponArchetype ? ARCHETYPE_CONFIG[currentItem.weaponArchetype] : null;
              return (
                <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-lg p-3 mb-2">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-2">✅ Currently Equipped in {SLOT_NAMES[selectedSlot]}</div>
                  <div className="flex items-center gap-3">
                    {currentItem.imageUrl && (
                      <div className="w-12 h-12 rounded bg-slate-800/60 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={currentItem.imageUrl} alt={currentItem.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{currentItem.name}{archCfg ? ` ${archCfg.icon}` : ''}</div>
                      {isWeapon && prog && (
                        <div className="flex gap-[1px] mt-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className={`text-[9px] ${i < prog.star ? 'text-yellow-400' : 'text-slate-700'}`}>{i < prog.star ? '★' : '☆'}</span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">
                        {currentItem.atk > 0 && `+${currentItem.atk} ATK `}
                        {currentItem.def > 0 && `+${currentItem.def} DEF `}
                        {currentItem.igcBonus > 0 && `+${currentItem.igcBonus}% IGC`}
                      </div>
                    </div>
                    {isWeapon && (
                      <button
                        onClick={() => { setSelectedSlot(null); setUpgradeWeaponModal({ item: currentItem }); }}
                        className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded border border-orange-700/60 bg-orange-900/20 text-orange-400 hover:bg-orange-800/30 transition-colors text-[10px] font-semibold"
                      >
                        <ArrowUpCircle className="w-3 h-3" /> UPGRADE
                      </button>
                    )}
                    {!isWeapon && (() => {
                      const catMap = { vehicle: 'vehicles', personPower: 'power', pet: 'pets' };
                      const cat = catMap[selectedSlot];
                      return cat ? (
                        <button
                          onClick={() => { setSelectedSlot(null); setSimpleUpgradeModal({ item: currentItem, category: cat }); }}
                          className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded border border-orange-700/60 bg-orange-900/20 text-orange-400 hover:bg-orange-800/30 transition-colors text-[10px] font-semibold"
                        >
                          <ArrowUpCircle className="w-3 h-3" /> UPGRADE
                        </button>
                      ) : null;
                    })()}
                  </div>
                </div>
              );
            })()}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <Link to={`/ShopPage?tab=weapons&weaponSub=${selectedSlot === 'weapon3' || selectedSlot === 'weapon4' ? 'accessories' : 'firearms'}`}>
                <button className="w-full p-3 bg-emerald-950/40 border border-emerald-600/50 rounded-lg hover:bg-emerald-900/40 transition-colors text-left mb-2">
                  <div className="text-sm text-emerald-400 font-semibold">🛒 Go to Shop{selectedSlot === 'weapon3' || selectedSlot === 'weapon4' ? ' — Accessories' : ''}</div>
                </button>
              </Link>
              <button
                onClick={() => handleEquipClick(selectedSlot, null)}
                className="w-full p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="text-sm text-slate-500">Unequip</div>
              </button>
              {getInventoryForSlot(selectedSlot).length === 0 ? (
                <div className="text-center text-slate-600 py-4 text-sm">
                  No items in inventory. Visit the shop to buy items.
                </div>
              ) : (
                getInventoryForSlot(selectedSlot).map((item) => {
                const categoryMap = {
                  weapon1: 'firearms', weapon2: 'firearms', weapon3: 'weapons', weapon4: 'weapons',
                  vehicle: 'vehicles', personPower: 'power', pet: 'pets'
                };
                const category = categoryMap[selectedSlot];
                  const ownedQty = getInventoryQty(category, item.id);
                  const isWeaponSlot = selectedSlot.startsWith('weapon');
                  const totalSpent = isWeaponSlot ? getWeaponPartsSpent(playerData, item.id) : 0;
                  const prog = isWeaponSlot ? getWeaponStarProgress(totalSpent) : null;
                  const archCfg = isWeaponSlot && item.weaponArchetype ? ARCHETYPE_CONFIG[item.weaponArchetype] : null;
                  const isLevelLocked = isWeaponSlot && item.equipLevel && playerData.level < item.equipLevel;

                  // Check if this item is already equipped in the CURRENT slot
                  const loadoutKeyForSlot = slotToLoadoutKey[selectedSlot];
                  const isCurrentlyEquipped = playerData.loadout?.[loadoutKeyForSlot] === item.id;

                  // Check if this weapon is already equipped in a DIFFERENT weapon slot
                  const otherWeaponSlots = ['weapon1', 'weapon2', 'weapon3', 'weapon4'].filter(s => s !== selectedSlot);
                  const equippedInOtherSlot = isWeaponSlot
                    ? otherWeaponSlots.find(s => playerData.loadout?.[s] === item.id)
                    : null;
                  const slotNumMap = { weapon1: 'W#1', weapon2: 'W#2', weapon3: 'ACC1', weapon4: 'ACC2' };
                  const otherSlotNum = equippedInOtherSlot ? slotNumMap[equippedInOtherSlot] : null;

                  return (
                    <div
                      key={item.id}
                      className={`relative w-full rounded-lg border text-left overflow-hidden flex ${
                        equippedInOtherSlot
                          ? 'border-red-700 bg-slate-900/30 opacity-60 cursor-not-allowed'
                          : isWeaponSlot && item.borderColor
                          ? `${item.borderColor} bg-slate-900/50 hover:bg-slate-800/50`
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50'
                      }`}
                    >
                      {/* EQUIPPED IN OTHER SLOT — vertical left sidebar */}
                      {equippedInOtherSlot && (
                        <div className="flex items-center justify-center bg-red-700 shrink-0" style={{ width: '22px', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          <span className="text-white font-black text-[9px] tracking-widest uppercase py-2">
                             EQUIPPED {otherSlotNum}
                           </span>
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3 flex-1">
                        {item.imageUrl && (
                          <div className="w-12 h-12 rounded bg-slate-800/60 flex items-center justify-center shrink-0 overflow-hidden">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2 flex-1">
                        <button
                          className={`flex-1 text-left ${isLevelLocked || equippedInOtherSlot ? 'pointer-events-none' : ''}`}
                          onClick={() => {
                            if (equippedInOtherSlot) return;
                            isLevelLocked ? toast.error(`Requires Level ${item.equipLevel} to equip!`) : handleEquipClick(selectedSlot, item.id);
                          }}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-slate-200">
                              {item.name}{archCfg ? ` ${archCfg.icon}` : ''}
                            </span>
                            {isWeaponSlot && item.rarityLabel && (
                              <span className={`text-[9px] font-bold ${item.rarityColor}`}>[{item.rarityLabel}]</span>
                            )}
                          </div>
                          {isWeaponSlot && prog && (
                            <div className="flex gap-[1px] mt-0.5">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <span key={i} className={`text-[9px] ${i < prog.star ? 'text-yellow-400' : 'text-slate-700'}`}>
                                  {i < prog.star ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-slate-600 mt-0.5">
                            {item.atk > 0 && `+${item.atk} ATK `}
                            {item.def > 0 && `+${item.def} DEF `}
                            {item.igcBonus > 0 && `+${item.igcBonus}% IGC`}
                          </div>
                          <div className="text-xs text-emerald-500 mt-1">Owned: {ownedQty}</div>
                          {isLevelLocked && (
                            <div className="text-xs text-red-400 font-semibold mt-0.5">🔒 Requires Level {item.equipLevel}</div>
                          )}
                        </button>
                        <div className="shrink-0 flex flex-col gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEquipClick(selectedSlot, item.id); }}
                            disabled={isLevelLocked || equippedInOtherSlot || isCurrentlyEquipped}
                            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-[11px] font-black shadow-lg shadow-emerald-900/40 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Shield className="w-3.5 h-3.5" /> {isCurrentlyEquipped ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                          {isWeaponSlot && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); setUpgradeWeaponModal({ item }); }}
                              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 border-orange-500 bg-orange-600 text-white hover:bg-orange-500 transition-colors text-[11px] font-black shadow-lg shadow-orange-900/40"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" /> UPGRADE
                            </button>
                          )}
                          {!isWeaponSlot && (() => {
                            const catMap = { vehicle: 'vehicles', personPower: 'power', pet: 'pets' };
                            const cat = catMap[selectedSlot];
                            return cat ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); setSimpleUpgradeModal({ item, category: cat }); }}
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 border-orange-500 bg-orange-600 text-white hover:bg-orange-500 transition-colors text-[11px] font-black shadow-lg shadow-orange-900/40"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" /> UPGRADE
                              </button>
                            ) : null;
                          })()}
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Avatar Selection Modal */}
      {/* Equip Confirmation Modal */}
      {confirmEquip && (
        <Dialog open={!!confirmEquip} onOpenChange={() => setConfirmEquip(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-emerald-900/40 text-white">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">Confirm Equip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-slate-300">
                <p>Equip <span className="text-emerald-400 font-semibold">{confirmEquip.item?.name}</span> to {SLOT_NAMES[confirmEquip.slot]}?</p>
                <div className="mt-2 text-xs text-slate-600">
                  {confirmEquip.item?.atk > 0 && `+${confirmEquip.item.atk} ATK `}
                  {confirmEquip.item?.def > 0 && `+${confirmEquip.item.def} DEF `}
                  {confirmEquip.item?.igcBonus > 0 && `+${confirmEquip.item.igcBonus}% IGC`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmEquip}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => setConfirmEquip(null)}
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

      {/* Weapon Upgrade Modal (from loadout popup) */}
      {upgradeWeaponModal && (
        <WeaponUpgradeModal
          open={!!upgradeWeaponModal}
          weapon={upgradeWeaponModal.item}
          onClose={() => { setUpgradeWeaponModal(null); setPlayerData(getPlayerData()); }}
        />
      )}

      {/* Simple Upgrade Modal — Vehicles, Pets, Power (from loadout popup) */}
      <SimpleUpgradeModal
        open={!!simpleUpgradeModal}
        onClose={() => { setSimpleUpgradeModal(null); setPlayerData(getPlayerData()); }}
        item={simpleUpgradeModal?.item}
        category={simpleUpgradeModal?.category}
        onUpgraded={() => setPlayerData(getPlayerData())}
      />

      <StrengthBreakdownModal open={strengthBreakdownOpen} onClose={() => setStrengthBreakdownOpen(false)} />

      <TerritoriesModal
        open={territoriesOpen}
        onClose={() => setTerritoriesOpen(false)}
        playerData={playerData}
      />

      {/* Customize Profile Overlay — full-screen redesign */}
      <CustomizeProfileOverlay
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />

      {/* Preset Save / Clear Confirmation */}
      {presetConfirm && (
        <Dialog open={!!presetConfirm} onOpenChange={() => setPresetConfirm(null)}>
          <DialogContent className="bg-[#0a0f1a] border border-slate-700 text-white max-w-xs">
            <DialogHeader>
              <DialogTitle className={presetConfirm.action === 'save' ? 'text-blue-400' : 'text-red-400'}>
                {presetConfirm.action === 'save' ? `💾 Save Preset ${presetConfirm.num}` : `🗑 Clear Preset ${presetConfirm.num}`}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-300">
              {presetConfirm.action === 'save'
                ? `Save your current loadout to Preset ${presetConfirm.num}? This will overwrite any existing data.`
                : `Clear Preset ${presetConfirm.num}? This cannot be undone.`}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => presetConfirm.action === 'save' ? handleSavePreset(presetConfirm.num) : handleClearPreset(presetConfirm.num)}
                className={`flex-1 ${presetConfirm.action === 'save' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-700 hover:bg-red-600'}`}
              >
                {presetConfirm.action === 'save' ? 'Save' : 'Clear'}
              </Button>
              <Button onClick={() => setPresetConfirm(null)} variant="outline" className="flex-1 border-slate-700 text-slate-400">
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <GlobalChatBar />
      <BottomNav />
    </div>
  );
}

function StatRow({ label, value, icon, iconUrl }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-900/50">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="w-4 h-4 object-cover rounded-sm" />
        ) : (
          <span className="text-xs">{icon}</span>
        )}
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-300">{value}</span>
    </div>
  );
}

function VehicleSlot({ equipped, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900/50 border border-slate-600 rounded-lg p-2 hover:brightness-110 transition-all text-left w-full relative"
    >
      <div className="text-[9px] text-slate-500 uppercase tracking-wider absolute top-2 left-2">🚗 Vehicle</div>
      <div className="flex flex-col items-center pt-5">
        <div className="w-full rounded overflow-hidden bg-slate-800/40 flex items-center justify-center mb-1" style={{ height: equipped?.id === 'V_FEATURED_001' ? '80px' : '64px' }}>
          {equipped?.imageUrl ? (
            <img src={equipped.imageUrl} alt={equipped.name} className={equipped?.id === 'V_FEATURED_001' ? 'w-full h-full object-cover' : 'h-full object-contain'} />
          ) : (
            <span className="text-slate-700 text-[9px]">{equipped ? '🚗' : 'empty'}</span>
          )}
        </div>
        <div className="text-[11px] text-slate-300 font-medium text-center">
          {equipped ? equipped.name : 'Empty'}
        </div>
        {equipped && (
          <div className="text-[9px] text-emerald-600 text-center mt-0.5">
            {equipped.atk > 0 && `+${equipped.atk} ATK `}
            {equipped.def > 0 && `+${equipped.def} DEF`}
          </div>
        )}
      </div>
    </button>
  );
}

function EquippedSlot({ slotName, equipped, onClick, playerData, fullWidth = false }) {
  const isWeapon = slotName && (slotName.includes('Weapon') || slotName.includes('Accessory'));
  let star = 0, bonusPct = 0;
  if (isWeapon && equipped && playerData) {
    const totalSpent = getWeaponPartsSpent(playerData, equipped.id);
    const prog = getWeaponStarProgress(totalSpent);
    star = prog.star;
    bonusPct = getWeaponUpgradeBonus(totalSpent);
  }
  const archCfg = isWeapon && equipped?.weaponArchetype ? ARCHETYPE_CONFIG[equipped.weaponArchetype] : null;
  const borderClass = isWeapon && equipped?.borderColor ? equipped.borderColor : 'border-slate-800';
  const itemImage = equipped?.imageUrl || null;

  return (
    <button
      onClick={onClick}
      className={`bg-slate-900/50 border ${borderClass} rounded-lg p-2 hover:brightness-110 transition-all text-left w-full ${fullWidth ? 'flex items-center gap-3' : ''}`}
    >
      <div className={`text-[9px] text-slate-600 uppercase tracking-wider mb-1 ${fullWidth ? 'mb-0 shrink-0 w-20' : ''}`}>{slotName}</div>
      {/* Image area — same fixed height for all slots */}
      <div className={`rounded overflow-hidden bg-slate-800/40 flex items-center justify-center ${fullWidth ? 'shrink-0' : 'w-full mb-1'}`} style={{ height: '56px', width: fullWidth ? '72px' : undefined }}>
        {itemImage ? (
          <img src={itemImage} alt={equipped.name} className="w-full h-full object-contain" />
        ) : equipped ? (
          <span className="text-xl opacity-40">{isWeapon ? '⚔️' : slotName === 'Vehicle' ? '🚗' : slotName === 'Pet' ? '🐾' : '👤'}</span>
        ) : (
          <span className="text-slate-700 text-[9px]">empty</span>
        )}
      </div>
      <div className={`text-[11px] text-slate-400 font-medium truncate ${fullWidth ? '' : ''}`}>
        {equipped ? `${equipped.name}${archCfg ? ` ${archCfg.icon}` : ''}` : 'Empty'}
      </div>
      {isWeapon && equipped && (
        <div className="flex gap-[1px] mt-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={`text-[9px] leading-none ${i < star ? 'text-yellow-400' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
          ))}
        </div>
      )}
      {equipped && (
        <div className="text-[9px] text-emerald-600 mt-0.5">
          {equipped.atk > 0 && `+${equipped.atk} ATK `}
          {equipped.def > 0 && `+${equipped.def} DEF`}
          {isWeapon && bonusPct > 0 && ` · +${bonusPct}%`}
        </div>
      )}
    </button>
  );
}