import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TopHUD from "@/components/dashboard/TopHUD";
import STATES_DATA from "../components/travel/statesData";
import StateCard from "../components/travel/StateCard";
import { GLOBAL_REGIONS } from "../components/travel/globalLocationsData";
import { getPlayerData } from "../components/utils/playerStorage";
import { getCityActivity, getStateActivity, ACTIVITY_CONFIG } from "../components/travel/zoneActivity";
import HereFrame from "../components/travel/HereFrame";

const TRAVEL_COST = 350; // shown in UI only

export default function TravelPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [activeTab, setActiveTab] = useState(() => {
    const player = getPlayerData();
    const isUSState = STATES_DATA.some((s) => s.name === player.locationState);
    return isUSState ? "usa" : "global";
  });

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const filtered = STATES_DATA.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleGlobalTravel = (location) => {
    navigate(createPageUrl("CityPage") + `?state=${encodeURIComponent(location.country)}&city=${encodeURIComponent(location.city)}`);
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD />
      
      <div className="pt-[114px] max-w-5xl mx-auto px-4 py-6">
        {/* Airport Header Image */}
        <div className="mb-4 rounded-xl overflow-hidden">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/37b02b26b_Airport1.png" 
            alt="Airport" 
            className="w-full h-[102px] object-cover"
          />
        </div>

        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center gap-[1px] mb-3">
            <Link to={createPageUrl("MapsPage")} className="mr-[1px]">
              <button className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold bg-[#0a0f1a] border border-white rounded-lg text-white hover:bg-white/10 transition-all">
                <ArrowLeft className="w-3 h-3" /> BACK
              </button>
            </Link>
            <button
              onClick={() => setActiveTab("usa")}
              className={`flex items-center justify-center gap-1 flex-1 px-2 py-[6px] rounded-lg border transition-all ${
                activeTab === "usa"
                  ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-300"
                  : "border-slate-700/60 text-slate-500 hover:border-slate-600 hover:text-slate-400"
              }`}
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[8px] font-bold tracking-tight">USA</span>
                <span className="text-[9px] font-normal">TRAVEL</span>
              </div>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/9bb9fc5e4_icon-usa1.png" alt="USA" className="w-[30px] h-[30px] object-contain" />
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center justify-center gap-1 flex-1 px-2 py-[6px] rounded-lg border transition-all ${
                activeTab === "global"
                  ? "bg-blue-600/20 border-blue-500/60 text-blue-300"
                  : "border-slate-700/60 text-slate-500 hover:border-slate-600 hover:text-slate-400"
              }`}
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[8px] font-bold tracking-tight">GLOBAL</span>
                <span className="text-[9px] font-normal">TRAVEL</span>
              </div>
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/67c96c616_icon-global1.png" alt="Global" className="w-[30px] h-[30px] object-contain" />
            </button>
          </div>
          <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg px-3 py-2 mb-2">
            <p className="text-xs text-yellow-400">
              ✈️ Plane tickets cost ${TRAVEL_COST} per flight
            </p>
          </div>
          {/* Zone activity legend */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px]"><span>🔥</span><span className="text-red-400 font-semibold">Hot</span><span className="text-slate-600">High activity & battle frequency</span></div>
            <div className="flex items-center gap-1 text-[10px]"><span>⚡</span><span className="text-emerald-400 font-semibold">Active</span><span className="text-slate-600">normal activity</span></div>
            <div className="flex items-center gap-1 text-[10px]"><span>❄️</span><span className="text-blue-400 font-semibold">Cold</span><span className="text-slate-600">low activity</span></div>
          </div>
        </div>

        {/* USA TAB */}
        {activeTab === "usa" && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <Input
                placeholder="Search states..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#0a0f1a] border-slate-800 text-slate-300 placeholder:text-slate-700
                  focus:border-emerald-600 focus:ring-emerald-600/20 h-10"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filtered.map((state, i) => {
                const activity = getStateActivity(state.name, state.cities || []);
                const cfg = ACTIVITY_CONFIG[activity];
                const isCurrent = playerData.locationState === state.name;
                return (
                  <Link key={state.name} to={createPageUrl("StatePage") + `?state=${encodeURIComponent(state.name)}`}>
                    <HereFrame active={isCurrent}>
                    <div className={`rounded-xl border p-2 transition-all text-left ${
                      isCurrent
                        ? "bg-emerald-950/30 border-emerald-600/50"
                        : `${cfg.bg} ${cfg.border} ${cfg.hoverBg}`
                    }`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-slate-200 truncate">{state.name}</span>
                        <span className="text-xs">{cfg.emoji}</span>
                      </div>
                      <div className={`text-[9px] font-semibold ${cfg.color}`}>{cfg.label}</div>
                    </div>
                    </HereFrame>
                  </Link>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-700">
                <p className="text-sm font-mono">NO MATCHING STATES FOUND</p>
              </div>
            )}
          </>
        )}

        {/* GLOBAL TAB */}
        {activeTab === "global" && (
          <div className="space-y-6">
            {GLOBAL_REGIONS.map((regionData) => (
              <div key={regionData.region}>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
                  {regionData.region}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                   {regionData.locations.map((loc) => {
                     const isCurrent = playerData.locationCity === loc.city && playerData.locationState === loc.country;
                     const activity = getCityActivity(loc.city);
                     const cfg = ACTIVITY_CONFIG[activity];
                     return (
                       <HereFrame active={isCurrent}>
                       <button
                         key={`${loc.country}-${loc.city}`}
                         onClick={() => !isCurrent && handleGlobalTravel(loc)}
                         disabled={isCurrent}
                         className={`rounded-xl p-3 border text-left transition-all w-full ${
                           isCurrent
                             ? "bg-emerald-950/30 border-emerald-600/50 cursor-default"
                             : `${cfg.bg} ${cfg.border} ${cfg.hoverBg} cursor-pointer`
                         }`}
                       >
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-2xl">{loc.flag}</span>
                           <span className="text-base">{cfg.emoji}</span>
                         </div>
                         <div className="text-xs font-bold text-slate-200 truncate">{loc.city}</div>
                         <div className="text-[10px] text-slate-500 truncate">{loc.country}</div>
                         <div className={`text-[9px] font-semibold mt-1 ${cfg.color}`}>{cfg.label}</div>
                         {isCurrent ? (
                           <div className="text-[9px] text-slate-600 mt-0.5">📍 You are here</div>
                         ) : (
                           <div className="text-[9px] text-slate-600 mt-0.5">✈️ ${TRAVEL_COST}</div>
                         )}
                       </button>
                       </HereFrame>
                     );
                   })}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}