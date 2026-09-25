import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import STATES_DATA from "../components/travel/statesData";
import CityCard from "../components/travel/CityCard";
import HereFrame from "../components/travel/HereFrame";
import { getPlayerData } from "../components/utils/playerStorage";

export default function StatePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const stateName = urlParams.get("state") || "";
  const playerData = getPlayerData();

  const stateData = STATES_DATA.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase()
  );

  if (!stateData) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 font-mono text-sm mb-4">STATE NOT FOUND</p>
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
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30 -ml-2 mb-3">
              <ArrowLeft className="w-4 h-4 mr-1" /> All States
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-white"
              >
                {stateData.name}
              </motion.h1>
              <p className="text-[11px] text-slate-600 font-mono tracking-wider uppercase">
                Select a city to operate in
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cities */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {stateData.cities.map((city, index) => {
          const isCurrent = playerData.locationCity === city && playerData.locationState === stateData.name;
          return (
            <HereFrame key={city} active={isCurrent}>
              <CityCard
                cityName={city}
                isCapital={city === stateData.capital}
                index={index}
                onClick={() => {
                  navigate(createPageUrl("CityPage") + `?state=${encodeURIComponent(stateData.name)}&city=${encodeURIComponent(city)}`);
                }}
              />
            </HereFrame>
          );
        })}
      </div>
    </div>
  );
}