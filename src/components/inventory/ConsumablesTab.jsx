import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BatteryFull, Zap, DollarSign, Octagon, Shield, Settings, Skull, ShieldAlert, Puzzle } from "lucide-react";

const AVATAR_SHARD_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c5ea853fc_avatarshard1.png";
const GEAR_PART_ICON_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/c2b4a0d83_gearparts1.png";

const CONSUMABLE_CATEGORIES = [
  {
    key: "cash",
    label: "Cash",
    icon: DollarSign,
    color: "text-green-500",
    borderColor: "border-green-900/40",
    items: [
      { id: "CASH_50K", name: "$50,000" },
      { id: "CASH_100K", name: "$100,000" },
      { id: "CASH_250K", name: "$250,000" },
      { id: "CASH_500K", name: "$500,000" },
      { id: "CASH_1M",   name: "$1,000,000" },
    ]
  },
  {
    key: "opcover",
    label: "Op Cover",
    icon: ShieldAlert,
    color: "text-orange-400",
    borderColor: "border-orange-900/40",
    items: [
      { id: "OPCOVER_25",  name: "Cover Booster (+25)"  },
      { id: "OPCOVER_50",  name: "Cover Booster (+50)"  },
      { id: "OPCOVER_75",  name: "Cover Booster (+75)"  },
      { id: "OPCOVER_100", name: "Cover Refill (+100)"  },
    ]
  },
  {
    key: "sabotage",
    label: "Sabotage",
    icon: Skull,
    color: "text-purple-400",
    borderColor: "border-purple-900/40",
    items: [
      { id: "SABOTAGE_3",  name: "Sabotage Boost (+3)"  },
      { id: "SABOTAGE_10", name: "Sabotage Refill (10)" },
    ]
  },
  {
    key: "energy",
    label: "Energy",
    icon: BatteryFull,
    color: "text-yellow-500",
    borderColor: "border-yellow-900/40",
    items: [
      { id: "ENERGY_25",  name: "Energy Boost (25)"   },
      { id: "ENERGY_50",  name: "Energy Boost (50)"   },
      { id: "ENERGY_75",  name: "Energy Boost (75)"   },
      { id: "ENERGY_100", name: "Energy Refill (100)" },
    ]
  },
  {
    key: "stamina",
    label: "Stamina",
    icon: Zap,
    color: "text-blue-500",
    borderColor: "border-blue-900/40",
    items: [
      { id: "STAMINA_25",  name: "Stamina Boost (25)"   },
      { id: "STAMINA_50",  name: "Stamina Boost (50)"   },
      { id: "STAMINA_75",  name: "Stamina Boost (75)"   },
      { id: "STAMINA_100", name: "Stamina Refill (100)" },
    ]
  },
  {
    key: "cryd",
    label: "CRYD",
    icon: Octagon,
    color: "text-sky-300",
    borderColor: "border-sky-500/50",
    items: [
      { id: "CRYD_50",   name: "50 CRYD"    },
      { id: "CRYD_200",  name: "200 CRYD"   },
      { id: "CRYD_500",  name: "500 CRYD"   },
      { id: "CRYD_1000", name: "1000 CRYD"  },
    ]
  },
  {
    key: "shields",
    label: "Shields",
    icon: Shield,
    color: "text-emerald-500",
    borderColor: "border-emerald-900/40",
    items: [
      { id: "SHIELD_12H", name: "🌐 Shield: 12 Hours" },
      { id: "SHIELD_1D",  name: "🌐 Shield: 1 Day"    },
      { id: "SHIELD_3D",  name: "🌐 Shield: 3 Days"   },
    ]
  }
];

// IDs that should NOT have a Use button (managed elsewhere)
const NO_USE_IDS = new Set(["AVATAR_SHARD", "AVATAR_SHARD_25", "AVATAR_SHARD_100", "GEAR_SHARD"]);

export default function ConsumablesTab({ playerData, onUse }) {
  const [activeSub, setActiveSub] = useState("cash");
  const consumables = playerData.consumables || {};
  const shardCount = consumables["AVATAR_SHARD"] || 0;
  const gearShardCount = consumables["GEAR_SHARD"] || 0;

  const ALL_CATEGORIES = [
    ...CONSUMABLE_CATEGORIES,
    {
      key: "shards",
      label: "Shards",
      icon: Puzzle,
      iconUrl: AVATAR_SHARD_ICON_URL,
      color: "text-yellow-400",
      borderColor: "border-yellow-900/40",
      items: [{ id: "AVATAR_SHARD", name: "Avatar Upgrade Shard" }]
    },
    {
      key: "parts",
      label: "Parts",
      icon: Settings,
      iconUrl: GEAR_PART_ICON_URL,
      color: "text-orange-400",
      borderColor: "border-orange-700",
      items: [{ id: "GEAR_SHARD", name: "Gear Part" }]
    }
  ];

  const activeCategory = ALL_CATEGORIES.find(c => c.key === activeSub);
  const ownedInCategory = activeSub === "shards"
    ? (shardCount > 0 ? [{ id: "AVATAR_SHARD", name: "Avatar Upgrade Shard" }] : [])
    : activeSub === "parts"
    ? (gearShardCount > 0 ? [{ id: "GEAR_SHARD", name: "Gear Part" }] : [])
    : activeCategory.items.filter(item => consumables[item.id] > 0);

  const mainCategories = ALL_CATEGORIES.filter(c => !["shards", "parts", "shields"].includes(c.key));
  const bottomCategories = ["shields", "parts", "shards"].map(k => ALL_CATEGORIES.find(c => c.key === k)).filter(Boolean);

  return (
    <div>
      {/* Main sub-tabs row */}
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {mainCategories.map(cat => {
          const Icon = cat.icon;
          const hasItems = cat.items.some(item => consumables[item.id] > 0);
          const isCryd = cat.key === 'cryd';
          return (
            <button
              key={cat.key}
              onClick={() => setActiveSub(cat.key)}
              className={`relative flex items-center justify-center p-2.5 rounded-lg border transition-all ${
                isCryd
                  ? activeSub === 'cryd'
                    ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-900/40'
                    : 'bg-[#0d1520] border-slate-700 text-white hover:border-sky-500/60 hover:bg-slate-800'
                  : activeSub === cat.key
                    ? `bg-slate-700 ${cat.borderColor} ${cat.color} shadow-md`
                    : 'bg-[#0d1520] border-slate-700 text-white hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {hasItems && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full px-1 text-[8px] leading-none py-0.5">
                  {cat.items.reduce((sum, item) => sum + (consumables[item.id] || 0), 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shards / Parts / Shields row */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {bottomCategories.map(cat => {
          const Icon = cat.icon;
          const hasItems = cat.key === "shards" ? shardCount > 0 : cat.key === "parts" ? gearShardCount > 0 : cat.items.some(item => consumables[item.id] > 0);
          const borderHighlight = cat.key === 'parts' ? 'border-2 border-blue-600' : cat.key === 'shards' ? 'border-2 border-yellow-500' : '';
          return (
            <button
              key={cat.key}
              onClick={() => setActiveSub(cat.key)}
              className={`relative flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all text-[11px] font-medium ${borderHighlight} ${
                activeSub === cat.key
                  ? `bg-slate-700 ${cat.borderColor} ${cat.color} shadow-md`
                  : "bg-[#0d1520] border-slate-700 text-white hover:border-slate-500 hover:bg-slate-800"
              }`}
            >
              {cat.iconUrl
                ? <img src={cat.iconUrl} alt={cat.label} className="w-4 h-4 object-contain" />
                : <Icon className="w-3.5 h-3.5" />}
              {cat.label}
              {hasItems && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full px-1 text-[8px] leading-none py-0.5">
                  {cat.key === "shards" ? shardCount : cat.key === "parts" ? gearShardCount : 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {activeSub === "parts" && ownedInCategory.length === 0 ? (
          <div className="bg-[#0a0f1a] border border-orange-900/30 rounded-lg p-6 text-center">
            <img src={GEAR_PART_ICON_URL} alt="Gear Part" className="w-12 h-12 object-contain mx-auto mb-3" />
            <h3 className="text-slate-300 font-semibold text-sm mb-2">Parts (Weapon Upgrades)</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Collect Gear Parts from the <span className="text-orange-400 font-semibold">Gear Overdrive</span> event or buy them in the shop.
            </p>
          </div>
        ) : ownedInCategory.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <p className="text-sm">No {activeCategory.label} items owned</p>
          </div>
        ) : (
          ownedInCategory.map(item => {
            const qty = activeSub === "shards" ? shardCount : activeSub === "parts" ? gearShardCount : consumables[item.id];
            const canUse = !NO_USE_IDS.has(item.id);
            return (
              <div key={item.id} className={`bg-[#0a0f1a] border ${activeCategory.borderColor} rounded-lg p-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${activeCategory.color}`}>
                    {activeSub === "shards"
                      ? <img src={AVATAR_SHARD_ICON_URL} alt="Avatar Shard" className="w-6 h-6 object-contain inline-block" />
                      : activeSub === "parts"
                        ? <img src={GEAR_PART_ICON_URL} alt="Gear Part" className="w-6 h-6 object-contain inline-block" />
                        : <activeCategory.icon className="w-5 h-5" />}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{item.name}</div>
                    <div className="text-xs text-emerald-400">Owned: {qty}</div>
                    {activeSub === "shards" && <div className="text-[9px] text-slate-500">Used in Profile → Avatar Upgrade</div>}
                    {activeSub === "parts" && <div className="text-[9px] text-slate-500">Used for Weapon Upgrades</div>}
                  </div>
                </div>
                {canUse && (
                  <Button size="sm" onClick={() => onUse(item.id)} className="bg-emerald-600 hover:bg-emerald-500 text-xs">
                    Use
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}