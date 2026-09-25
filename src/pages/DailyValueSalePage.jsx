import React, { useState, useEffect } from "react";
import { getPlayerData, addToInventory, getInventoryQty } from "../components/utils/playerStorage";
import { addOwnedItem } from "../components/utils/storeStorage";
import { applyServerReward, flushToServer } from "@/lib/playerServerSync";
import { kvGet, kvSet, patchPlayerData } from "@/lib/playerMemory";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import ItemImagePreviewModal from "@/components/shared/ItemImagePreviewModal";
import PurchaseSuccessModal from "@/components/shared/PurchaseSuccessModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CrydIcon from "@/components/shared/CrydIcon";
import { AvatarShardIcon, GearPartIcon } from "@/components/shared/shardIcons";
import DailyGiftChest from "@/components/shared/DailyGiftChest";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// ── Daily purchase tracking (resets at midnight via date key) ──────────────
const TODAY_KEY = () => new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'dailyValueSalePurchases';
// ── Permanent purchase tracking — SERVER-BACKED ──────────────────────────
// Checks if the player owns all featured pack items in their server inventory.
const FEATURED_PACK_IDS = ['A_the_architect', 'F_FEATURED_001', 'W_FEATURED_001', 'V_FEATURED_001', 'P_FEATURED_001', 'T_FEATURED_001'];

const isPermanentlyPurchased = () => {
  // Check if ALL featured pack items are owned in the player's inventory
  return FEATURED_PACK_IDS.every(id =>
    getInventoryQty('avatars', id) > 0 ||
    getInventoryQty('firearms', id) > 0 ||
    getInventoryQty('weapons', id) > 0 ||
    getInventoryQty('vehicles', id) > 0 ||
    getInventoryQty('power', id) > 0 ||
    getInventoryQty('pets', id) > 0
  );
};

const getPurchases = () => {
  try {
    const stored = JSON.parse(kvGet(STORAGE_KEY) || '{}');
    if (stored.date !== TODAY_KEY()) return {};
    return stored.items || {};
  } catch { return {}; }
};

const markPurchased = (id) => {
  const current = getPurchases();
  current[id] = true;
  kvSet(STORAGE_KEY, JSON.stringify({ date: TODAY_KEY(), items: current }));
};

// No-op — purchase status is now derived from server inventory ownership
const markPermanentlyPurchased = () => {};

// ── FEATURED POWER PACK ────────────────────────────────────────────────────
// All featured gear items from the store + The Architect avatar + Dual Glocker Elite
// Total store CRYD = 3900 CRYD = ~$78 USD
// Pack price = $49.99

const FEATURED_PACK_ITEMS = [
  {
    category: 'avatars',
    inventoryCat: 'avatars',
    id: 'A_the_architect',
    name: 'The Architect',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/668a44b53_avatar-man-The_Architect.png',
    stat: 'Special Avatar',
    crydValue: 500,
  },
  {
    category: 'firearms',
    inventoryCat: 'firearms',
    id: 'F_FEATURED_001',
    name: 'Dual Glocker Elite',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/9b6073069_21-DualGlocker.png',
    stat: '+26 ATK / +10 DEF',
    crydValue: 900,
  },
  {
    category: 'weapons',
    inventoryCat: 'weapons',
    id: 'W_FEATURED_001',
    name: 'Sovereign Market Blade',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/657f89bcf_MarketOverlordEngine.png',
    stat: '+8 ATK / +24 DEF (Accessory)',
    crydValue: 1000,
  },
  {
    category: 'vehicles',
    inventoryCat: 'vehicles',
    id: 'V_FEATURED_001',
    name: 'Executive Phantom One',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/fae975ac1_executivephantomone.jpg',
    stat: '+10 ATK / +56 DEF',
    crydValue: 500,
  },
  {
    category: 'people',
    inventoryCat: 'power',
    id: 'P_FEATURED_001',
    name: 'Shadow Council Director',
    imageUrl: null,
    stat: '+7 ATK / +13 DEF',
    crydValue: 500,
  },
  {
    category: 'pets',
    inventoryCat: 'pets',
    id: 'T_FEATURED_001',
    name: 'Apex Shadow Dragon',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d8422687f_apexshadowdragon.jpg',
    stat: '+10 ATK / +17 DEF',
    crydValue: 500,
  },
];

// Total CRYD store value
const FEATURED_STORE_CRYD = FEATURED_PACK_ITEMS.reduce((s, i) => s + i.crydValue, 0);
const FEATURED_STORE_USD = parseFloat((FEATURED_STORE_CRYD * 0.02).toFixed(2));
const FEATURED_PACK_USD = 49.99;
// Value % = store_usd / pack_usd * 100
const FEATURED_VALUE_PCT = Math.round((FEATURED_STORE_USD / FEATURED_PACK_USD) * 100); // 120%

// ── ITEMS for the other tabs ───────────────────────────────────────────────
const ITEMS = {
  avatarGear: [
    {
      id: 'vs_avatar_shards_10',
      icon: '🌟',
      iconImage: 'avatar_shard',
      name: '10× Avatar Shards',
      desc: 'Power up your avatar faster',
      cryd: 75,
      usd: '~$1.50',
      valueLabel: '200% VALUE',
      storeValue: 150,
      consumableGrants: [{ key: 'AVATAR_SHARD', amount: 10 }],
    },
    {
      id: 'vs_gear_parts_100',
      icon: '⚙️',
      iconImage: 'gear_shard',
      name: '100× Gear Parts',
      desc: 'Supercharge your weapon upgrades',
      cryd: 75,
      usd: '~$1.50',
      valueLabel: '267% VALUE',
      storeValue: 200,
      consumableGrants: [{ key: 'GEAR_SHARD', amount: 100 }],
    },
  ],
  production: [
    {
      id: 'vs_production_bundle',
      icon: '🎁',
      name: 'Daily Production Bundle',
      desc: '10× Stamina Boost (+25)\n10× Energy Boost (+25)\n10× Cover Boost (+25)\n10× Sabotage Boost (+3)',
      cryd: 150,
      usd: '~$3.00',
      valueLabel: '187% VALUE',
      storeValue: 280,
      consumableGrants: [
        { key: 'STAMINA_25', amount: 10 },
        { key: 'ENERGY_25', amount: 10 },
        { key: 'OPCOVER_25', amount: 10 },
        { key: 'SABOTAGE_3', amount: 10 },
      ],
    },
  ],
  growth: [
    {
      id: 'vs_growth_basic',
      icon: '💵',
      name: 'Growth Pack — Basic',
      desc: '$50,000 IGC',
      cashGrant: 50000,
      cryd: 199,
      usd: '~$4.00',
      valueLabel: '276% VALUE',
      storeValue: 550,
    },
    {
      id: 'vs_growth_premium',
      icon: '💵',
      name: 'Growth Pack — Premium',
      desc: '$200,000 IGC',
      cashGrant: 200000,
      cryd: 399,
      usd: '~$7.98',
      valueLabel: '425% VALUE',
      storeValue: 1700,
    },
  ],
};

// ── ValueItem Card (existing tabs) ─────────────────────────────────────────
function ValueItem({ item, purchased, playerCryd, onBuy, purchasing }) {
  const canAfford = playerCryd >= item.cryd;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        purchased
          ? 'bg-slate-900/40 border-slate-800 opacity-60'
          : 'bg-[#0a0f1a] border-yellow-700/50'
      }`}
      style={!purchased ? { boxShadow: '0 0 12px rgba(234,179,8,0.10)' } : {}}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Limited to 1× daily</span>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${purchased ? 'text-slate-500 border-slate-700 bg-slate-800' : 'text-red-400 border-red-800/60 bg-red-950/40'}`}>
            Available {purchased ? '0' : '1'}/1
          </span>
          <span className="text-[9px] font-black text-yellow-400 bg-yellow-950/50 border border-yellow-700/50 px-1.5 py-0.5 rounded-full">
            {item.valueLabel}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0 flex items-center justify-center" style={{ width: '48px', height: '48px' }}>
          {item.iconImage === 'avatar_shard' ? <AvatarShardIcon size={36} /> : item.iconImage === 'gear_shard' ? <GearPartIcon size={36} /> : item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100 mb-0.5">{item.name}</div>
          <div className="text-[11px] text-slate-500 mb-2 whitespace-pre-wrap leading-relaxed">{item.desc}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-blue-400 font-bold flex items-center gap-1">{item.cryd} <CrydIcon size={12} /> CRYD</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">{item.usd} USD</span>
            <span className="text-slate-700">•</span>
            <span className="text-white font-bold text-[10px]">Store value: {item.storeValue} CRYD</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        {purchased ? (
          <div className="w-full text-center text-[11px] text-slate-600 font-semibold py-2 bg-slate-800/60 rounded-lg">
            ✅ Claimed today — resets at midnight
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => onBuy(item)}
            disabled={!canAfford || purchasing}
            className={`w-full font-black text-sm h-9 ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
          >
            {purchasing ? '⏳ Processing...' : canAfford ? `BUY NOW — ${item.cryd} CRYD` : `Need ${item.cryd - playerCryd} more CRYD`}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Featured Pack Tab ──────────────────────────────────────────────────────
function FeaturedPackTab({ onBuy, synced, onPreviewImage }) {
  const purchased = isPermanentlyPurchased();
  return (
    <div>
      {/* Hero banner */}
      <div
        className="rounded-2xl border-2 border-yellow-400 p-5 mb-4"
        style={{
          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1200 50%, #0a0f1a 100%)',
          boxShadow: '0 0 32px rgba(234,179,8,0.25), 0 0 8px rgba(234,179,8,0.15) inset',
        }}
      >
        <div className="text-center mb-3">
          <div className="text-3xl mb-1">☢️</div>
          <div className="text-xl font-black text-yellow-400 uppercase tracking-widest">POWER PACK</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All 5 Featured Store Items — One Bundle</div>
        </div>

        {/* Item list with images */}
        <div className="space-y-2 mb-4">
          {FEATURED_PACK_ITEMS.map((fi) => {
            const alreadyOwned = getInventoryQty(fi.inventoryCat, fi.id) > 0;
            return (
              <div
                key={fi.id}
                className={`flex items-center gap-3 rounded-xl p-2.5 border ${alreadyOwned ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-yellow-800/40 bg-yellow-950/10'}`}
              >
                {fi.imageUrl ? (
                  <img src={fi.imageUrl} alt={fi.name} className="w-12 h-12 object-contain rounded-lg bg-slate-900/60 border border-slate-700 shrink-0 cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => onPreviewImage && onPreviewImage({ ...fi, atk: fi.stat?.match(/\+(\d+) ATK/) ? parseInt(fi.stat.match(/\+(\d+) ATK/)[1]) : 0, def: fi.stat?.match(/\+(\d+) DEF/) ? parseInt(fi.stat.match(/\+(\d+) DEF/)[1]) : 0 })} />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-900/60 border border-slate-700 shrink-0 flex items-center justify-center text-xl">
                    {fi.category === 'people' ? '👤' : '🐉'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{fi.name}</div>
                  <div className="text-[10px] text-slate-500">{fi.stat}</div>
                  <div className="text-[10px] text-blue-400">{fi.crydValue} CRYD store value</div>
                </div>
                {alreadyOwned ? (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-700/50 px-2 py-0.5 rounded-full shrink-0">✓ OWNED</span>
                ) : (
                  <span className="text-[9px] font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-700/50 px-2 py-0.5 rounded-full shrink-0">INCLUDED</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pricing */}
        <div className="bg-black/40 rounded-xl p-3 mb-3 border border-yellow-800/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500">Store value (CRYD):</span>
            <span className="text-[11px] text-slate-400 line-through">{FEATURED_STORE_CRYD} CRYD (~${FEATURED_STORE_USD})</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-slate-200">Power Pack price:</span>
            <span className="text-xl font-black text-yellow-400">${FEATURED_PACK_USD}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-[10px] font-black text-green-400 bg-green-950/40 border border-green-700/50 px-2 py-0.5 rounded-full">
              {FEATURED_VALUE_PCT}% VALUE vs. buying separately
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-600 text-center mb-3 leading-relaxed">
          Already own some items? No problem — only the items you don't yet own will be delivered. Price stays the same.
        </div>

        {purchased ? (
          <div className="w-full text-center text-[12px] text-slate-500 font-semibold py-3 bg-slate-800/60 rounded-xl border border-slate-700">
            ✅ Power Pack Claimed — items permanently in your inventory
          </div>
        ) : (
          <Button
            onClick={onBuy}
            disabled={!synced}
            className="w-full font-black text-base h-12 bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-60"
            style={{ boxShadow: '0 0 16px rgba(234,179,8,0.4)' }}
          >
            {synced ? `☢️ GET POWER PACK — $${FEATURED_PACK_USD}` : '⏳ Loading...'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DailyValueSalePage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [purchases, setPurchases] = useState(getPurchases());
  const [synced, setSynced] = useState(false);
  const [itemImagePreview, setItemImagePreview] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null); // { title, items, crydSpent }
  const [purchasing, setPurchasing] = useState(false);

  // Wait for server sync before allowing purchases
  useEffect(() => {
    const handleSync = () => {
      setPlayerData(getPlayerData());
      setSynced(true);
    };
    window.addEventListener('player_synced', handleSync);
    // Check if player data is already loaded from server (has user_id)
    const current = getPlayerData();
    if (current?.user_id) {
      setSynced(true);
    }
    // Fallback: if no sync event fires within 3s, allow purchases anyway
    const fallbackTimer = setTimeout(() => setSynced(true), 3000);
    return () => {
      window.removeEventListener('player_synced', handleSync);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleBuy = async (item) => {
    if (purchasing) return;
    const current = getPlayerData();
    if ((current.crypto || 0) < item.cryd) {
      toast.error("Not enough CRYD!");
      return;
    }
    setPurchasing(true);
    try {
      // ═══ SERVER-AUTHORITATIVE PURCHASE ═══
      // NO local state mutation happens until the server returns 200 OK.
      // The button stays disabled (purchasing=true) throughout the entire flow.

      // Step 1: Atomic CRYD deduction + consumable grant via processPurchase.
      // This writes CRYD deduction AND consumable items to PlayerInventory
      // on the server in a single atomic operation — the client never
      // touches consumable state until this returns success.
      const purchasePayload = {
        category: 'consumable',
        item_id: item.id,
        item_name: item.name,
        currency: 'cryd',
        amount: item.cryd,
        quantity: 1,
      };

      if (item.consumableGrants) {
        if (item.consumableGrants.length === 1) {
          purchasePayload.is_consumable = true;
          purchasePayload.consumable_key = item.consumableGrants[0].key;
          purchasePayload.consumable_amount = item.consumableGrants[0].amount;
        } else {
          // Multi-consumable bundle (e.g. production bundle)
          purchasePayload.is_consumable = false;
          purchasePayload.consumable_grants = item.consumableGrants;
        }
      } else {
        purchasePayload.is_consumable = false;
      }

      const result = await base44.functions.invoke('processPurchase', purchasePayload);
      const data = result?.data;

      if (!data?.success) {
        toast.error(data?.error || "Purchase failed — CRYD not deducted.");
        return;
      }

      // Step 2: For growth packs, grant IGC server-side via applyServerReward.
      // This is a separate server call that patches cash_delta atomically.
      if (item.cashGrant) {
        const rewardResult = await applyServerReward({
          cash_delta: item.cashGrant,
          reason: `daily_value_sale:${item.id}`,
        });
        if (!rewardResult?.success) {
          // CRYD was already deducted but IGC grant failed — show specific error
          toast.error("CRYD deducted but IGC grant failed — please contact support.");
          return;
        }
      }

      // ═══ SERVER RETURNED 200 OK — NOW update local state ═══

      // Patch local cache from the authoritative server response ONLY.
      // applyServerReward already patched crypto/cash locally for growth packs.
      const patch = {};
      if (data.new_cryd != null) patch.crypto = data.new_cryd;

      if (item.consumableGrants) {
        const consumables = { ...(getPlayerData().consumables || {}) };
        for (const grant of item.consumableGrants) {
          consumables[grant.key] = (consumables[grant.key] || 0) + grant.amount;
        }
        patch.consumables = consumables;
      }

      patchPlayerData(patch);

      markPurchased(item.id);
      setPlayerData(getPlayerData());
      setPurchases(getPurchases());

      // Build delivered-items list for the success modal — ONLY shown after
      // the server has confirmed the transaction.
      const deliveredItems = [];
      if (item.consumableGrants) {
        for (const grant of item.consumableGrants) {
          deliveredItems.push({
            name: `${grant.amount}× ${grant.key.replace(/_/g, ' ')}`,
            icon: item.icon,
            iconImage: item.iconImage,
            detail: 'Delivered to your inventory',
          });
        }
      }
      if (item.cashGrant) {
        deliveredItems.push({
          name: `$${item.cashGrant.toLocaleString()} IGC`,
          icon: item.icon,
          iconImage: item.iconImage,
          detail: 'Added to your cash balance',
        });
      }

      // Show congrats popup ONLY after server confirmed everything
      setPurchaseSuccess({
        title: 'Purchase Complete!',
        items: deliveredItems.length > 0 ? deliveredItems : [{ name: item.name, icon: item.icon, iconImage: item.iconImage, detail: 'Delivered to your inventory' }],
        crydSpent: item.cryd,
      });
    } catch (e) {
      console.error('Purchase failed:', e);
      const errorMsg = e?.response?.data?.error || e?.data?.error || e?.message || "Purchase failed — please try again.";
      toast.error(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleBuyFeaturedPack = async () => {
    if (!synced) {
      toast.error("Still loading your data — please wait a moment and try again.");
      return;
    }

    let deliveredCount = 0;
    const deliveredNames = [];

    // Add each item individually using addToInventory (which correctly saves+syncs per-call)
    for (const fi of FEATURED_PACK_ITEMS) {
      const alreadyOwned = getInventoryQty(fi.inventoryCat, fi.id) > 0;
      if (!alreadyOwned) {
        addToInventory(fi.inventoryCat, fi.id, 1);
        addOwnedItem(fi.category, fi.id);
        deliveredCount++;
        deliveredNames.push(fi.name);
      }
    }

    // Force immediate flush to server with the final accumulated state
    const finalState = getPlayerData();
    await flushToServer(finalState);

    // Mark as permanently purchased
    markPermanentlyPurchased('vs_featured_power_pack');
    setPlayerData(getPlayerData());
    setPurchases(getPurchases());

    const msg = deliveredCount === 0
      ? "✅ Power Pack delivered! (You already owned all items)"
      : `☢️ Power Pack delivered! ${deliveredCount} new item${deliveredCount > 1 ? 's' : ''} added to your inventory.`;
    toast.success(msg);

    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.entities.SystemMessage.create({
          user_id: user.id,
          type: 'purchase_nonconsumable',
          title: '☢️ Power Pack Purchased',
          body: `Delivered: ${deliveredNames.length > 0 ? deliveredNames.join(', ') : 'All items already owned'} — Power Pack`,
          item_id: 'vs_featured_power_pack',
          item_name: 'Power Pack',
          currency: 'usd',
          amount_paid: 49.99,
          quantity: 1,
          category: 'power_pack',
          is_consumable: false,
          restored: false,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error('SystemMessage write failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[118px] max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex flex-col items-center mb-2">
            <DailyGiftChest giftType="dvs" size={87} />
            <span className="text-white text-xs font-bold mt-1 tracking-wide">FREE DAILY REWARD</span>
          </div>
          <h1 className="text-2xl font-black text-yellow-400 uppercase tracking-wider">DAILY VALUE SALE</h1>
          <p className="text-xs text-slate-500 mt-1">Limited offers — resets every day at midnight</p>
        </div>

        <style>{`
          @keyframes nuclearPulse {
            0%, 100% { box-shadow: 0 0 6px rgba(234,179,8,0.6), 0 0 2px rgba(234,179,8,0.3); }
            50% { box-shadow: 0 0 18px rgba(234,179,8,1), 0 0 8px rgba(234,179,8,0.6); }
          }
          .nuclear-tab[data-state=inactive] { animation: nuclearPulse 1.8s ease-in-out infinite; }
        `}</style>

        <Tabs defaultValue={isPermanentlyPurchased() ? 'avatarGear' : 'featured'}>
          <TabsList className="grid grid-cols-4 bg-[#0a0f1a] border border-yellow-900/30 w-full mb-4">
            <TabsTrigger value="avatarGear" className="data-[state=active]:bg-yellow-700 data-[state=active]:text-black text-[11px] font-bold">
              🌟Avatar/Gear
            </TabsTrigger>
            <TabsTrigger value="production" className="data-[state=active]:bg-yellow-700 data-[state=active]:text-black text-[11px] font-bold">
              ⚡Production
            </TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-yellow-700 data-[state=active]:text-black text-xs font-bold">
              💰Growth
            </TabsTrigger>
            <TabsTrigger
              value="featured"
              className="nuclear-tab data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-[10px] font-black text-yellow-400 rounded-md border border-yellow-600/60"
            >
              ☢️POWER
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatarGear" className="space-y-3">
            {ITEMS.avatarGear.map(item => (
              <ValueItem key={item.id} item={item} purchased={!!purchases[item.id]} playerCryd={playerData.crypto || 0} onBuy={handleBuy} purchasing={purchasing} />
            ))}
          </TabsContent>

          <TabsContent value="production" className="space-y-3">
            {ITEMS.production.map(item => (
              <ValueItem key={item.id} item={item} purchased={!!purchases[item.id]} playerCryd={playerData.crypto || 0} onBuy={handleBuy} purchasing={purchasing} />
            ))}
          </TabsContent>

          <TabsContent value="growth" className="space-y-3">
            {ITEMS.growth.map(item => (
              <ValueItem key={item.id} item={item} purchased={!!purchases[item.id]} playerCryd={playerData.crypto || 0} onBuy={handleBuy} purchasing={purchasing} />
            ))}
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedPackTab onBuy={handleBuyFeaturedPack} synced={synced} onPreviewImage={setItemImagePreview} />
          </TabsContent>
        </Tabs>
      </div>

      <ItemImagePreviewModal item={itemImagePreview} onClose={() => setItemImagePreview(null)} />
      <PurchaseSuccessModal
        open={!!purchaseSuccess}
        onClose={() => setPurchaseSuccess(null)}
        title={purchaseSuccess?.title}
        items={purchaseSuccess?.items}
        crydSpent={purchaseSuccess?.crydSpent}
      />
      <BottomNav />
    </div>
  );
}