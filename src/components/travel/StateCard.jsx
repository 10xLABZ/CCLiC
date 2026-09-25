import React from "react";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function StateCard({ state, onClick, index }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01, duration: 0.25 }}
      onClick={onClick}
      className="group relative bg-[#0a0f1a] border border-emerald-900/40 rounded-lg px-3 py-3 text-left
        hover:border-emerald-400/60 hover:bg-emerald-950/20 transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
    >
      <div className="flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-emerald-500/60 group-hover:text-emerald-400 transition-colors shrink-0" />
        <span className="text-sm font-medium text-slate-300 group-hover:text-emerald-300 transition-colors truncate">
          {state.name}
        </span>
      </div>
      <div className="text-[10px] text-slate-600 mt-1 pl-5.5 group-hover:text-slate-500 transition-colors">
        {state.capital}
      </div>
    </motion.button>
  );
}