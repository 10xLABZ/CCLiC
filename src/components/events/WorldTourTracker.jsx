import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CITY_TARGET, TRADES_TARGET, MAX_CITY_TOTAL,
  getCityProgress, getWorldTourTotals, getTradesProgress, isCityComplete,
  ALL_CITY_REGIONS,
} from "./worldTourStorage";
import { FAST_FIVE_GOAL_ICONS } from "./eventStorage";

const COLS = [
  { key: 'attacks', label: 'Fights', color: 'text-red-400', icon: FAST_FIVE_GOAL_ICONS.attacks },
  { key: 'jobs', label: 'Jobs', color: 'text-emerald-400', icon: FAST_FIVE_GOAL_ICONS.jobs },
  { key: 'assists', label: 'Assists', color: 'text-blue-400', icon: FAST_FIVE_GOAL_ICONS.assists },
  { key: 'sabotages', label: 'Sabotages', color: 'text-orange-400', icon: FAST_FIVE_GOAL_ICONS.sabotages },
];

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = value >= max ? 'bg-emerald-500' : color;
  return (
    <div className="w-full h-1 bg-slate-800 rounded-full mt-0.5">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function WorldTourTracker({ open, onClose, playerData, worldTourData, onClaim }) {
  const navigate = useNavigate();
  const totals = getWorldTourTotals();
  const trades = getTradesProgress(playerData);

  const regionGroups = ALL_CITY_REGIONS;

  const handleCityClick = (location) => {
    onClose();
    navigate(createPageUrl("CityPage") + `?state=${encodeURIComponent(location.country)}&city=${encodeURIComponent(location.city)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#060a12] border border-blue-900/40 text-white p-0 max-w-2xl w-full flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Banner */}
        <div className="relative shrink-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/feffb7256_WorldTourEvents2.jpg"
            alt="World Tour"
            className="w-full object-cover rounded-t-lg"
            style={{ maxHeight: '130px', objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#060a12] rounded-t-lg" />
        </div>

        {/* Sticky Goals Header */}
        <div className="sticky top-0 z-10 bg-[#0a0f1a] border-b border-blue-900/40 px-4 py-3 shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">Overall Progress</div>
          {/* City-based totals */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            {COLS.map(col => {
              const val = totals[col.key];
              const done = val >= MAX_CITY_TOTAL;
              return (
                <div key={col.key} className={`bg-slate-900/60 rounded-lg px-2 py-1.5 border ${done ? 'border-emerald-600/40' : 'border-slate-800'}`}>
                  <div className="flex flex-col items-center gap-0.5 mb-0.5">
                    <img src={col.icon} alt="" className="w-4 h-4 object-contain" />
                    <span className={`text-[10px] font-semibold ${col.color}`}>{col.label}</span>
                  </div>
                  <div className={`text-sm font-bold ${done ? 'text-emerald-400' : 'text-white'}`}>
                    {val}<span className="text-slate-600">/{MAX_CITY_TOTAL}</span>
                    {done && <span className="ml-1">✓</span>}
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-1">
                    <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (val / MAX_CITY_TOTAL) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Insider Trades (global) */}
          <div className={`bg-slate-900/60 rounded-lg px-3 py-2 border ${trades >= TRADES_TARGET ? 'border-emerald-600/40' : 'border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1.5">
                <img src={FAST_FIVE_GOAL_ICONS.trades} alt="" className="w-4 h-4 object-contain" />
                Insider Trades (global)
              </span>
              <span className={`text-sm font-bold ${trades >= TRADES_TARGET ? 'text-emerald-400' : 'text-white'}`}>
                {trades}<span className="text-slate-600">/{TRADES_TARGET}</span>
                {trades >= TRADES_TARGET && <span className="ml-1">✓</span>}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1">
              <div className={`h-full rounded-full ${trades >= TRADES_TARGET ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, (trades / TRADES_TARGET) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Scrollable City Table */}
        <div className="overflow-y-auto flex-1 px-2 pb-4">
          {/* Table header */}
          <div className="sticky top-0 z-10 bg-[#060a12] pt-2 pb-1">
            <div className="grid items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-1"
              style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr' }}>
              <div className="pl-1">City</div>
              {COLS.map(col => (
                <div key={col.key} className="flex flex-col items-center gap-0.5">
                  <img src={col.icon} alt="" className="w-4 h-4 object-contain" />
                  <span className={`${col.color}`}>{col.label}</span>
                </div>
              ))}
            </div>
          </div>

          {regionGroups.map(({ region, locations }) => (
            <div key={region}>
              {/* Region divider */}
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1 pt-3 pb-1 border-b border-slate-900">
                {region}
              </div>
              {locations.map((loc) => {
                const city = loc.city;
                const p = getCityProgress(city);
                const complete = isCityComplete(city);
                return (
                  <button
                    key={city}
                    onClick={() => handleCityClick(loc)}
                    className={`w-full grid items-center py-1.5 border-b border-slate-900/50 hover:bg-blue-950/20 transition-colors ${complete ? 'bg-emerald-950/10' : ''}`}
                    style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr' }}
                  >
                    {/* City name */}
                    <div className="flex items-center gap-1 pl-1 min-w-0 text-left">
                      <span className="text-sm shrink-0">{loc.flag}</span>
                      <span className={`text-[11px] font-medium truncate ${complete ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {city}
                        {complete && <span className="ml-1 text-emerald-500">✓</span>}
                      </span>
                    </div>
                    {/* Per-action columns */}
                    {COLS.map(col => {
                      const val = p[col.key];
                      const done = val >= CITY_TARGET;
                      return (
                        <div key={col.key} className="text-center px-1">
                          <div className={`text-xs font-bold ${done ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {val}<span className="text-slate-700">/{CITY_TARGET}</span>
                          </div>
                          <MiniBar value={val} max={CITY_TARGET} color={
                            col.key === 'attacks' ? 'bg-red-500' :
                            col.key === 'jobs' ? 'bg-emerald-500' :
                            col.key === 'assists' ? 'bg-blue-500' : 'bg-orange-500'
                          } />
                        </div>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 shrink-0 space-y-2">
          {onClaim && (
            <Button onClick={onClaim} className="w-full bg-blue-600 hover:bg-blue-500 font-bold text-sm">
              🌍 CLAIM REWARDS
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full border-slate-700 text-slate-400">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}