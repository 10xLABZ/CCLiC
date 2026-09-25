import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { getCityMapImage, getLocationDisplay } from "../components/utils/mapHelper";
import { toast } from "sonner";

export default function CityPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const stateName = urlParams.get("state") || "";
  const cityName = urlParams.get("city") || "";
  const [showNoFundsDialog, setShowNoFundsDialog] = useState(false);

  const handleSelectCity = () => {
    const playerData = getPlayerData();
    const isCurrentLocation = playerData.locationCity === cityName && playerData.locationState === stateName;
    const isFirstTime = !playerData.locationCity && !playerData.locationState;

    if (isCurrentLocation) {
      navigate(createPageUrl("MapsPage"));
      return;
    }

    if (!isFirstTime) {
      if (playerData.cash < 350) {
        setShowNoFundsDialog(true);
        return;
      }
      savePlayerData({ 
        cash: playerData.cash - 350,
        locationCity: cityName,
        locationState: stateName
      });
      toast.success(`Traveled to ${cityName} (-$350)`);
    } else {
      savePlayerData({
        locationCity: cityName,
        locationState: stateName
      });
      toast.success(`Arrived in ${cityName}!`);
    }

    navigate(createPageUrl("MapsPage"));
  };

  if (!stateName || !cityName) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 font-mono text-sm mb-4">CITY NOT FOUND</p>
          <Link to={createPageUrl("TravelPage")}>
            <Button variant="outline" className="border-emerald-800 text-emerald-400 hover:bg-emerald-950/30">
              Back to Travel
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white">
      {/* Header */}
      <div className="bg-[#060a12]/95 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link to={createPageUrl("TravelPage")}>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Travel
            </Button>
          </Link>
        </div>
      </div>

      {/* City Summary - No Map */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          {/* Welcome sign with city name overlay */}
          <div className="relative mb-4 mx-auto" style={{ maxWidth: '480px' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/788504058_2-welcome.png"
              alt="Welcome To"
              className="w-full rounded-lg"
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ top: '20%' }}>
              <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.95), -1px -1px 4px rgba(0,0,0,0.8)' }}>
                {cityName}
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{stateName}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-[#0a0f1a] border border-emerald-900/30 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-600 font-mono tracking-widest uppercase">
              City Operations Available
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            You've arrived in <span className="text-slate-300 font-medium">{cityName}</span>.
            Local jobs and missions are available for your crew.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Button
            onClick={handleSelectCity}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base
              rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-200
              hover:shadow-emerald-800/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Enter Operations
          </Button>
        </motion.div>
      </div>

      {showNoFundsDialog && (
        <Dialog open={showNoFundsDialog} onOpenChange={setShowNoFundsDialog}>
          <DialogContent className="bg-[#0a0f1a] border-red-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Insufficient Funds</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                You need <span className="text-green-400 font-semibold">$350</span> to travel to a new city.
              </p>
              <Button
                onClick={() => setShowNoFundsDialog(false)}
                className="w-full bg-slate-800 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}