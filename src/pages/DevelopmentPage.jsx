import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData } from "@/components/utils/playerStorage";
import { getInventoryQty } from "@/components/utils/playerStorage";
import { getCategoryData } from "@/components/store/catalogData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { updateRegenStats } from "@/components/utils/regenHelper";
import { ChevronLeft, Lock, CheckCircle2, Zap } from "lucide-react";
import { AVATARS } from "@/components/store/catalogData";
import { ARCHETYPE_CONFIG } from "@/components/weapons/weaponUpgradeSystem";

// ─── SET DEFINITIONS ─────────────────────────────────────────────────────────

// Weapons: 50 weapons, group into sets of 3 => ~16 sets
const WEAPON_SETS = (() => {
  const weapons = getCategoryData('weapons');
  const sets = [];
  const setBonus = [
    { atk: 2 }, { def: 2 }, { jobs: 3 }, { trades: 3 },
    { atk: 3 }, { def: 3 }, { assists: 3 }, { sabotage: 3 },
    { atk: 4 }, { def: 4 }, { jobs: 5 }, { trades: 5 },
    { atk: 5 }, { def: 5 }, { assists: 5 }, { atk: 6, def: 3 },
    { atk: 8, def: 4 },
  ];
  const bonusLabels = [
    '+2% ATK', '+2% DEF', '+3% Job Income', '+3% Trade Income',
    '+3% ATK', '+3% DEF', '+3% Assist Income', '+3% Sabotage Success',
    '+4% ATK', '+4% DEF', '+5% Job Income', '+5% Trade Income',
    '+5% ATK', '+5% DEF', '+5% Assist Income', '+6% ATK · +3% DEF',
    '+8% ATK · +4% DEF',
  ];
  const setNames = [
    'Street Hustler Set', 'Market Crawler Set', 'Paper Trail Set', 'Trade Floor Set',
    'Algo Runner Set', 'Shield Protocol Set', 'Op Network Set', 'Dark Market Set',
    'Risk Engine Set', 'Fortress Set', 'Money Printer Set', 'Exchange Titan Set',
    'Alpha Seeker Set', 'Iron Vault Set', 'Syndicate Set', 'Apex Dominator Set',
    'Market Overlord Set',
  ];
  for (let i = 0; i < Math.ceil(weapons.length / 3); i++) {
    const items = weapons.slice(i * 3, i * 3 + 3);
    if (items.length === 0) break;
    sets.push({
      id: `wset_${i}`,
      name: setNames[i] || `Weapon Set ${i + 1}`,
      bonus: bonusLabels[i] || '+2% ATK',
      items,
    });
  }
  return sets;
})();

// Vehicles: 50 vehicles, group into sets of 3
const VEHICLE_SETS = (() => {
  const vehicles = getCategoryData('vehicles');
  const setNames = [
    'Street Crew Set', 'Night Run Set', 'City Escape Set', 'Highway Boss Set',
    'Armored Fleet Set', 'Executive Detail Set', 'Shadow Convoy Set', 'Phantom Fleet Set',
    'War Machine Set', 'Titan Road Set', 'Sovereign Drive Set', 'Apex Convoy Set',
    'Market Empire Set', 'Dark Fleet Set', 'Global Command Set', 'Prime Fortress Set',
    'Market King Set',
  ];
  const bonusLabels = [
    '+2% DEF', '+2% ATK', '+3% Escape Rate', '+3% DEF',
    '+4% DEF', '+3% ATK · +2% DEF', '+5% DEF', '+4% ATK',
    '+5% ATK · +2% DEF', '+6% DEF', '+5% ATK · +3% DEF', '+7% DEF',
    '+6% ATK · +3% DEF', '+8% DEF', '+7% ATK', '+8% ATK · +4% DEF',
    '+10% ATK · +5% DEF',
  ];
  const sets = [];
  for (let i = 0; i < Math.ceil(vehicles.length / 3); i++) {
    const items = vehicles.slice(i * 3, i * 3 + 3);
    if (items.length === 0) break;
    sets.push({
      id: `vset_${i}`,
      name: setNames[i] || `Vehicle Set ${i + 1}`,
      bonus: bonusLabels[i] || '+2% DEF',
      items,
    });
  }
  return sets;
})();

// People: 50 people, group into sets of 3
const PEOPLE_SETS = (() => {
  const people = getCategoryData('people');
  const setNames = [
    'Street Connections Set', 'Legal Network Set', 'Insider Ring Set', 'Political Web Set',
    'Market Influence Set', 'Shadow Counsel Set', 'Data Syndicate Set', 'Power Circle Set',
    'Boardroom Control Set', 'Elite Fixer Set', 'Institutional Web Set', 'Sovereign Network Set',
    'Global Command Set', 'Prime Authority Set', 'Dark Council Set', 'Apex Influence Set',
    'Illuminati Pact Set',
  ];
  const bonusLabels = [
    '+3% Job Income', '+3% Trade Income', '+4% Job Income', '+4% Trade Income',
    '+5% Job Income', '+4% ATK · +3% Trade Income', '+5% ATK', '+5% Trade Income · +3% Job Income',
    '+6% ATK', '+6% Trade Income', '+7% Job Income', '+6% ATK · +4% DEF',
    '+7% Trade Income', '+8% ATK', '+8% DEF', '+9% ATK · +5% DEF',
    '+10% All Income',
  ];
  const sets = [];
  for (let i = 0; i < Math.ceil(people.length / 3); i++) {
    const items = people.slice(i * 3, i * 3 + 3);
    if (items.length === 0) break;
    sets.push({
      id: `pset_${i}`,
      name: setNames[i] || `Power Set ${i + 1}`,
      bonus: bonusLabels[i] || '+3% Job Income',
      items,
    });
  }
  return sets;
})();

// Pets: 50 pets, group into sets of 3
const PET_SETS = (() => {
  const pets = getCategoryData('pets');
  const setNames = [
    'Street Pack Set', 'Night Hunters Set', 'Shadow Beasts Set', 'Guardian Pack Set',
    'Predator Set', 'Enforcer Beasts Set', 'Cyber Pack Set', 'Iron Fauna Set',
    'Apex Predators Set', 'Sovereign Beasts Set', 'Titan Fauna Set', 'Prime Pack Set',
    'Dark Menagerie Set', 'Quantum Pack Set', 'Global Apex Set', 'Prime Mythic Set',
    'Immortal Beasts Set',
  ];
  const bonusLabels = [
    '+2% ATK', '+2% DEF', '+3% ATK', '+3% DEF',
    '+4% ATK', '+4% DEF', '+5% ATK · +2% DEF', '+5% DEF',
    '+6% ATK', '+6% DEF', '+7% ATK · +3% DEF', '+7% DEF',
    '+8% ATK', '+8% DEF', '+9% ATK · +4% DEF', '+10% DEF',
    '+10% ATK · +5% DEF',
  ];
  const sets = [];
  for (let i = 0; i < Math.ceil(pets.length / 3); i++) {
    const items = pets.slice(i * 3, i * 3 + 3);
    if (items.length === 0) break;
    sets.push({
      id: `tset_${i}`,
      name: setNames[i] || `Pet Set ${i + 1}`,
      bonus: bonusLabels[i] || '+2% ATK',
      items,
    });
  }
  return sets;
})();

// Avatars: manually defined sets to correctly pair M+F by theme
const AVATAR_SETS = (() => {
  // Helper to find avatar by id
  const byId = (id) => AVATARS.find(a => a.id === id);

  const rawSets = [
    { id: 'aset_0',  name: 'Street Starter Set',   bonus: '+3% Job Income',                  ids: ['A_M_bashin_bobby',    'A_F_chun_bao'] },
    { id: 'aset_1',  name: 'Hustle Duo Set',        bonus: '+3% Trade Income',                ids: ['A_M_beshaun_beats',   'A_F_corporate_chloe'] },
    { id: 'aset_2',  name: 'Cash & Chrome Set',     bonus: '+4% ATK',                         ids: ['A_M_big_jay',         'A_F_dezzy'] },
    { id: 'aset_3',  name: 'Market Movers Set',     bonus: '+4% DEF',                         ids: ['A_M_carlos_mucho_mula','A_F_hacking_hillary'] },
    { id: 'aset_4',  name: 'Grind Set',             bonus: '+5% Job Income',                  ids: ['A_M_cool_clay',       'A_F_maria_maria'] },
    { id: 'aset_5',  name: 'Trade Floor Duo Set',   bonus: '+5% Trade Income',                ids: ['A_M_darius_dzul',     'A_F_samantina'] },
    { id: 'aset_6',  name: 'Leverage Pair Set',     bonus: '+5% ATK · +3% DEF',               ids: ['A_M_jazzy_jeff',      'A_F_mei_lane'] },
    { id: 'aset_7',  name: 'High Roller Set',       bonus: '+6% Job Income',                  ids: ['A_M_johnny_boy',      'A_F_nikki_shades'] },
    { id: 'aset_8',  name: 'Architect Solo',        bonus: '+6% ATK',                         ids: ['A_the_architect'] },
    { id: 'aset_9',  name: 'Syndicate Duo Set',     bonus: '+6% Trade Income · +3% Job Income',ids: ['A_M_koji_li_wei',    'A_F_riley_red'] },
    { id: 'aset_10', name: 'Street Legend Set',     bonus: '+7% ATK',                         ids: ['A_M_machinegun_lou',  'A_F_sasha_magasha'] },
    { id: 'aset_11', name: 'Market Elite Set',      bonus: '+7% DEF',                         ids: ['A_M_martin_fly',      'A_F_selena_sanchez'] },
    { id: 'aset_12', name: 'Dark Horse Set',        bonus: '+7% ATK · +3% DEF',               ids: ['A_M_mega_mills',      'A_F_seriously_sasha'] },
    { id: 'aset_13', name: 'Titan Pair Set',        bonus: '+8% ATK · +4% DEF',               ids: ['A_M_militant_miguel', 'A_F_sharp_cindy'] },
    { id: 'aset_14', name: 'Nick & Sherry Set',     bonus: '+8% Trade Income',                ids: ['A_M_nick_mcsunny',    'A_F_smoken_sherry'] },
    { id: 'aset_15', name: 'Apex Duo Set',          bonus: '+9% ATK',                         ids: ['A_M_paulie_pistols',  'A_F_sophia_sweets'] },
    { id: 'aset_16', name: 'Sovereign Set',         bonus: '+10% All Income',                 ids: ['A_M_sal_smokaccino',  'A_F_su_sing_lee'] },
    { id: 'aset_17', name: 'Lone Apex Set',         bonus: '+12% ATK · +6% DEF',              ids: ['A_M_tommy_gunz'] },
    // New sets (H1, R1, F1, S1 themed)
    { id: 'aset_h1',  name: 'Free Spirit Set',      bonus: '+7% Job Income · +3% Trade Income', ids: ['A_M_dude_stone',         'A_F_star_sunshine'] },
    { id: 'aset_r1',  name: 'Rock Duo Set',         bonus: '+8% ATK · +4% Trade Income',        ids: ['A_M_koji_li_wei',        'A_F_sussie_shasher'] },
    { id: 'aset_f1',  name: 'Federal Set',          bonus: '+9% DEF · +5% ATK',                 ids: ['A_M_frank_price',        'A_F_agent_cross'] },
    { id: 'aset_s1',  name: 'Skate or Die Set',     bonus: '+8% ATK · +5% Job Income',          ids: ['A_M_ryder_riot',         'A_F_nova_knox'] },
    // New batch sets
    { id: 'aset_mil', name: 'Command & Control Set',bonus: '+10% ATK · +6% DEF',                ids: ['A_M_general_wreckette',  'A_F_general_longrange'] },
    { id: 'aset_sci', name: 'Shadow Intel Set',     bonus: '+8% Efficiency · +6% DEF',          ids: ['A_M_dr_malik_quantum',   'A_F_audrey_cipher'] },
    { id: 'aset_gng', name: 'Hustle Royale Set',    bonus: '+7% ATK · +5% Trade Income',        ids: ['A_M_jardon_wolfe',       'A_F_chantella'] },
    { id: 'aset_mon', name: 'Cash Flow Set',        bonus: '+9% Cash Income · +4% ATK',         ids: ['A_M_mo_money',           'A_F_carmen_cash'] },
    { id: 'aset_str', name: 'Street Icons Set',     bonus: '+8% ATK · +5% Job Income',          ids: ['A_M_darius_dzul_v2',     'A_F_jamya_jajones'] },
    { id: 'aset_eli', name: 'Elite Shadows Set',    bonus: '+10% All Income · +7% ATK',         ids: ['A_M_mr_unknown',         'A_F_alma_rosera'] },
    { id: 'aset_ind', name: 'Indigio Twins Set',    bonus: '+10% ATK · +8% DEF',                ids: ['A_M_indigio',            'A_F_indigia'] },
    { id: 'aset_dev', name: 'Demon Duo Set',        bonus: '+12% ATK · +10% DEF',               ids: ['A_M_lucifer',            'A_F_lilith'] },
    { id: 'aset_prs', name: 'Presidential Set',     bonus: '+14% All Income · +12% ATK · +10% DEF', ids: ['A_M_us_president',       'A_F_us_president'] },
    { id: 'aset_ilu', name: 'Illuminati Set',       bonus: '+18% All Income · +15% ATK · +12% DEF', ids: ['A_M_illuminati',         'A_F_illuminati'] },
  ];

  return rawSets.map(s => ({
    ...s,
    items: s.ids.map(id => byId(id)).filter(Boolean),
  })).filter(s => s.items.length > 0);
})();

// ─── ALL-SET BONUSES ──────────────────────────────────────────────────────────
const ALL_SET_BONUSES = {
  weapons:  { bonus: '+5% ATK · +5% DEF · +5% All Income', label: 'All Weapon Sets' },
  vehicles: { bonus: '+5% DEF · +3% Escape Rate · +3% All Income', label: 'All Vehicle Sets' },
  people:   { bonus: '+8% All Income · +4% ATK', label: 'All People of Power Sets' },
  pets:     { bonus: '+6% ATK · +6% DEF', label: 'All Pet Sets' },
  avatars:  { bonus: '+10% All Income · +5% ATK · +5% DEF', label: 'All Avatar Sets' },
};

// ─── HELPER ───────────────────────────────────────────────────────────────────
const isItemOwned = (playerData, category, itemId) => {
  const catMap = { weapons: 'weapons', vehicles: 'vehicles', people: 'power', pets: 'pets', avatars: 'avatars' };
  const invCat = catMap[category] || category;
  return (playerData.inventory?.[invCat]?.[itemId] || 0) > 0;
};

// ─── SET CARD ─────────────────────────────────────────────────────────────────
function SetCard({ set, playerData, category }) {
  const ownedItems = set.items.filter(item => isItemOwned(playerData, category, item.id));
  const isComplete = ownedItems.length === set.items.length;
  const progress = ownedItems.length;
  const total = set.items.length;

  return (
    <div className={`rounded-xl border p-3 mb-3 transition-all ${
      isComplete
        ? 'border-yellow-500/60 bg-yellow-900/10'
        : 'border-slate-800 bg-[#0a0f1a]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200">{set.name}</span>
            {isComplete && <span className="text-[10px] text-yellow-400 font-bold">✓ COMPLETE</span>}
          </div>
          <div className={`text-[11px] font-semibold mt-0.5 ${isComplete ? 'text-yellow-400' : 'text-slate-500'}`}>
            {isComplete ? '🎁 ' : '🔒 '}{set.bonus}
          </div>
        </div>
        <div className="text-xs font-bold text-right shrink-0">
          <span className={isComplete ? 'text-yellow-400' : 'text-slate-500'}>{progress}/{total}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all rounded-full ${isComplete ? 'bg-yellow-400' : 'bg-emerald-600'}`}
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>

      {/* Items */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {set.items.map((item) => {
          const owned = isItemOwned(playerData, category, item.id);
          const archCfg = item.weaponArchetype ? ARCHETYPE_CONFIG[item.weaponArchetype] : null;
          return (
            <div
              key={item.id}
              className={`rounded-lg border p-2 text-center transition-all ${
                owned
                  ? (item.borderColor ? `${item.borderColor} bg-slate-900/60` : 'border-emerald-700 bg-emerald-900/20')
                  : 'border-slate-800/50 bg-slate-900/20 opacity-50'
              }`}
            >
              {item.imageUrl ? (
                <div className="w-10 h-14 mx-auto mb-1 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={`w-full h-full object-contain ${!owned ? 'grayscale' : ''}`}
                  />
                  {!owned && <div className="absolute inset-0 flex items-center justify-center"><Lock className="w-3 h-3 text-slate-500" /></div>}
                </div>
              ) : (
                <div className={`text-xl mb-1 ${!owned ? 'grayscale' : ''}`}>
                  {archCfg ? archCfg.icon : '📦'}
                </div>
              )}
              <div className={`text-[8px] leading-tight font-medium ${owned ? 'text-slate-300' : 'text-slate-600'}`}>
                {item.name}{archCfg ? ` ${archCfg.icon}` : ''}
              </div>
              {item.rarityLabel && (
                <div className={`text-[7px] ${owned ? (item.rarityColor || 'text-slate-500') : 'text-slate-700'}`}>{item.rarityLabel}</div>
              )}
              {owned && <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SETS TAB CONTENT ─────────────────────────────────────────────────────────
function SetsTabContent({ sets, playerData, category, allSetBonus }) {
  const completedSets = sets.filter(set =>
    set.items.every(item => isItemOwned(playerData, category, item.id))
  );
  const allComplete = completedSets.length === sets.length;

  return (
    <div className="space-y-2 mt-3">
      {/* Super-set banner */}
      <div className={`rounded-xl border p-3 mb-4 ${allComplete ? 'border-yellow-400 bg-yellow-900/20' : 'border-violet-800/40 bg-violet-900/10'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Complete All Sets Bonus</div>
            <div className={`text-sm font-bold ${allComplete ? 'text-yellow-300' : 'text-violet-400'}`}>
              {allComplete ? '🏆 ' : '🎯 '}{allSetBonus.bonus}
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">
              Collect all {sets.length} sets to unlock permanently
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xs font-bold ${allComplete ? 'text-yellow-400' : 'text-slate-500'}`}>
              {completedSets.length}/{sets.length} sets
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all rounded-full ${allComplete ? 'bg-yellow-400' : 'bg-violet-600'}`}
            style={{ width: `${(completedSets.length / sets.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Individual sets */}
      {sets.map(set => (
        <SetCard key={set.id} set={set} playerData={playerData} category={category} />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DevelopmentPage() {
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [activeTab, setActiveTab] = useState('weapons');

  const tabs = [
    { key: 'weapons',  label: 'Weapon Sets',  sets: WEAPON_SETS,  icon: '⚔️', category: 'weapons' },
    { key: 'avatars',  label: 'Avatar Sets',  sets: AVATAR_SETS,  icon: '👤', category: 'avatars' },
    { key: 'vehicles', label: 'Vehicle Sets', sets: VEHICLE_SETS, icon: '🚗', category: 'vehicles' },
    { key: 'people',   label: 'Power Sets',   sets: PEOPLE_SETS,  icon: '👔', category: 'people' },
    { key: 'pets',     label: 'Pet Sets',     sets: PET_SETS,     icon: '🐾', category: 'pets' },
  ];

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[133px] max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl('ProfilePage')} className="text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-100">⚗️ Development</h1>
            <p className="text-[10px] text-slate-500">Collect sets to unlock permanent stat bonuses</p>
          </div>
          <Link to={createPageUrl('ResearchPage')}>
            <button className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-700/60 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 transition-colors">
              🔬 Research
            </button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 bg-[#0a0f1a] border border-slate-800 w-full mb-2 h-auto">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="data-[state=active]:bg-violet-700 data-[state=active]:text-white text-[10px] py-1.5 px-1 leading-tight flex flex-col gap-0.5"
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="hidden sm:block">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.key} value={tab.key}>
              <SetsTabContent
                sets={tab.sets}
                playerData={playerData}
                category={tab.category}
                allSetBonus={ALL_SET_BONUSES[tab.key]}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}