import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPlayerData } from "../components/utils/playerStorage";
import { refreshFromServer } from "@/lib/playerServerSync";
import { base44 } from "@/api/base44Client";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import TradingContent from "../components/trading/TradingContent";
import DailyGoalsPanel from "../components/goals/DailyGoalsPanel";
import { getLocationDisplay } from "../components/utils/stateRiskData";
import GlobalChatBar from "@/components/chat/GlobalChatBar";

export default function TradingPage() {
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const navigate = useNavigate();

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  // Sync regen + daily reset from server on mount — ensures trade counters
  // are fresh (daily reset applied) before the trading UI reads them.
  useEffect(() => {
    const syncAndRefresh = async () => {
      try {
        await base44.functions.invoke('syncRegenState', {});
      } catch (err) {
        console.error('Regen sync error:', err);
      }
      await refreshFromServer();
      setPlayerData(getPlayerData());
    };
    syncAndRefresh();
  }, []);

  const hasLocation = playerData.locationCity && playerData.locationState;

  if (!hasLocation) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
        <TopHUD />
        
        <div className="pt-[133px] flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-400 mb-2">Trading</h1>
            <p className="text-slate-600 text-sm mb-6">
              Select a location from MAP to begin trading.
            </p>
            <Link to={createPageUrl("TravelPage")}>
              <Button className="bg-emerald-600 hover:bg-emerald-500">
                <MapPin className="w-4 h-4 mr-2" />
                Go to MAP
              </Button>
            </Link>
          </div>
        </div>

        <GlobalChatBar />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD />

      <div className="pt-[118px] max-w-2xl mx-auto px-4">
        {/* Trade Desk composite — hidden, may be repurposed later */}
        {/*
        <div style={{ border: '4px solid #22c55e', lineHeight: 0, borderRadius: '6px', overflow: 'hidden' }}>
          <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/4dc0605a8_tradedeskA.jpg" alt="" className="w-full block" />
          <div className="flex">
            <Link to={createPageUrl("TradeDeskPage")} className="flex-1 block" style={{ width: '50%' }}>
              <TradeDeskButton />
            </Link>
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/d6f822184_tradedeskC.jpg" alt="" className="flex-1 block" style={{ width: '50%' }} />
          </div>
          <div style={{ overflow: 'hidden', lineHeight: 0, position: 'relative', height: 0, paddingBottom: '8.5%' }}>
            <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/4e2d9e5ae_tradedeskD.jpg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'block' }} />
          </div>
        </div>
        */}

        {/* Insider Trade Intel — thick orange border frame */}
        <div className="mt-0" style={{ border: '4px solid #f97316', borderRadius: '6px', overflow: 'hidden' }}>
          <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/6041b11e8_insidertraderbanner2.JPG" alt="Insider Trade Intel" className="w-full block" />
          <div className="p-2" style={{ lineHeight: 'normal' }}>
            <TradingContent playerData={playerData} onPlayerUpdate={setPlayerData} />
          </div>
        </div>
      </div>

      <GlobalChatBar />
      <BottomNav />
    </div>
  );
}