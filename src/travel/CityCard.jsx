import React from "react";
import { Building2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { getCityActivity, ACTIVITY_CONFIG } from "@/components/travel/zoneActivity";

export default function CityCard({ cityName, isCapital, onClick, index }) {
  const activity = getCityActivity(cityName);
  const cfg = ACTIVITY_CONFIG[activity];

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={onClick}
      className={`group w-full border rounded-xl p-5 text-left transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${cfg.bg} ${cfg.border} ${cfg.hoverBg}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl ${cfg.bg} ${cfg.border}`}>
            {cfg.emoji}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200 group-hover:text-white transition-colors">
              {cityName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isCapital && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[11px] text-yellow-500/80 font-medium uppercase tracking-wider">Capital</span>
                </div>
              )}
              <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
              {activity === "hot" && (
                <span className="text-[9px] text-red-400 bg-red-900/20 border border-red-800/40 rounded px-1 py-0.5">
                  High activity & battle frequency
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`transition-colors text-lg ${cfg.color}`}>→</div>
      </div>
    </motion.button>
  );
}