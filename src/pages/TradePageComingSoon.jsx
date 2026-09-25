import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BottomNav from "@/components/dashboard/BottomNav";
import { Swords, MapPin, RefreshCw, Heart, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { generateCityBots } from "../components/tradewars/botGenerator";
import BattleEngine from "../components/tradewars/BattleEngine";

export default function TradeWarsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const city = urlParams.get("city");
  const state = urlParams.get("state");

  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [cityBots, setCityBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);

  useEffect(() => {
    if (city && cityBots.length === 0) {
      setCityBots(generateCityBots(playerData.level));
    }
  }, [city]);

  const handleRefresh = () => {
    setCityBots(generateCityBots(playerData.level));
  };

  const handleFightClick = (bot) => {
    const current = updateRegenStats();
    setPlayerData(current);

    if (current.stamina < 5) {
      return;
    }

    savePlayerData({ stamina: current.stamina - 5 });
    setPlayerData({ ...current, stamina: current.stamina - 5 });
    setSelectedBot(bot);
  };

  const handleBattleComplete = () => {
    const updated = updateRegenStats();
    setPlayerData(updated);
    setSelectedBot(null);
  };

  if (!city) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-20">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <Swords className="w-16 h-16 text-red-500/40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-400 mb-2">Trade Wars</h1>
            <p className="text-slate-600 text-sm mb-6">
              Select a city from MAP to engage in Trade Wars.
            </p>
            <Link to={createPageUrl("TravelPage")}>
              <Button variant="outline" className="border-emerald-800 text-emerald-400 hover:bg-emerald-950/30">
                <MapPin className="w-4 h-4 mr-2" />
                Go to MAP
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0f1a] border-b border-red-900/30 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-red-400 flex items-center gap-2">
              <Swords className="w-5 h-5" />
              TRADE WARS
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              📍 {city}, {state}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Player Stats Bar */}
        <div className="mt-3">
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              Stamina (5 per fight)
            </div>
            <div className="text-sm font-semibold text-yellow-400">
              {playerData.stamina}/100
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {playerData.stamina < 5 && (
          <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-xs text-yellow-400">
              <strong>Low Stamina:</strong> You need at least 5 stamina to fight. Wait for regeneration (+1 every 3 min).
            </div>
          </div>
        )}

        {/* Bot List */}
        <div className="space-y-2">
          {cityBots.map((bot) => {
            const typeColors = {
              Whale: "text-purple-400 border-purple-900/40",
              Strong: "text-red-400 border-red-900/40",
              Average: "text-slate-400 border-slate-800",
              Weak: "text-green-400 border-green-900/40",
              Noob: "text-blue-400 border-blue-900/40"
            };

            return (
              <div
                key={bot.id}
                className={`bg-[#0a0f1a] border rounded-lg p-3 flex items-center justify-between ${typeColors[bot.type]}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-200">{bot.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${typeColors[bot.type]}`}>
                      {bot.type}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-600">
                    <span>Lv{bot.level}</span>
                    <span>ATK: {bot.attack}</span>
                    <span>DEF: {bot.defense}</span>
                    <span>FUND: {bot.fundMembers}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleFightClick(bot)}
                  disabled={playerData.stamina < 5}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40"
                >
                  <Swords className="w-3 h-3 mr-1" />
                  Fight
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Battle Modal */}
      {selectedBot && (
        <BattleEngine
          player={playerData}
          bot={selectedBot}
          onComplete={handleBattleComplete}
        />
      )}

      <BottomNav />
    </div>
  );
}