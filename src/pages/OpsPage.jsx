import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData } from "../components/utils/playerStorage";

import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import CityJobsContent from "../components/ops/CityJobsContent";
import TradeWarsContent from "../components/ops/TradeWarsContent";
import TradingContent from "../components/trading/TradingContent";
import DailyGoalsPanel from "../components/goals/DailyGoalsPanel";
import { getLocationDisplay } from "../components/utils/stateRiskData";
export default function OpsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "tradewars";
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const hasLocation = playerData.locationCity && playerData.locationState;

  if (!hasLocation) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-20">
        <TopHUD />
        
        <div className="pt-[133px] flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-400 mb-2">Operations</h1>
            <p className="text-slate-600 text-sm mb-6">
              Select a location from MAP to begin operations.
            </p>
            <Link to={createPageUrl("TravelPage")}>
              <Button className="bg-emerald-600 hover:bg-emerald-500">
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
      <TopHUD />

      <div className="pt-[133px] max-w-2xl mx-auto px-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-2">
          <TabsList className="grid w-full grid-cols-4 bg-[#0a0f1a] border border-slate-800 h-8">
            <TabsTrigger value="tradewars" className="data-[state=active]:bg-emerald-600 text-xs py-1">Trade Wars</TabsTrigger>
            <TabsTrigger value="jobs" className="data-[state=active]:bg-emerald-600 text-xs py-1">Jobs</TabsTrigger>
            <TabsTrigger value="trading" className="data-[state=active]:bg-emerald-600 text-xs py-1">Trading</TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-amber-600 text-xs py-1">Goals</TabsTrigger>
          </TabsList>

          {/* Location Info */}
          <p className="text-xs text-slate-600 mt-1 mb-1">
            {getLocationDisplay(playerData.locationCity, playerData.locationState)}
          </p>

          <TabsContent value="tradewars" className="mt-0">
            <TradeWarsContent playerData={playerData} onUpdate={setPlayerData} />
          </TabsContent>

          <TabsContent value="jobs" className="mt-0">
            <CityJobsContent playerData={playerData} onUpdate={setPlayerData} />
          </TabsContent>

          <TabsContent value="trading" className="mt-0">
            <TradingContent playerData={playerData} onPlayerUpdate={setPlayerData} />
          </TabsContent>

          <TabsContent value="goals" className="mt-0">
            <DailyGoalsPanel playerData={playerData} onPlayerUpdate={setPlayerData} />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}