import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Coins, Zap, Trophy } from "lucide-react";
import { getPlayerData, savePlayerData } from "../utils/playerStorage";

export default function TopHeader({ playerData, onUpdate, showLocation = false }) {
  const fileInputRef = useRef(null);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const updated = savePlayerData({ profileImageDataUrl: evt.target.result });
      onUpdate?.(updated);
    };
    reader.readAsDataURL(file);
  };

  const xpPercent = ((playerData.currentXP / playerData.xpToNextLevel) * 100).toFixed(1);

  return (
    <div className="bg-[#0a0f1a] border-b border-emerald-900/30">
      {/* Bar 1: Primary Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Profile Image */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center overflow-hidden hover:border-emerald-400/50 transition-colors shrink-0"
        >
          {playerData.profileImageDataUrl ? (
            <img src={playerData.profileImageDataUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-emerald-500/60" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImagePick}
          className="hidden"
        />

        {/* Username, Level, XP */}
        <div className="flex-1 min-w-0">
          <Link to={createPageUrl("ProfilePage")}>
            <button className="text-sm font-semibold text-slate-200 hover:text-emerald-400 transition-colors mb-0.5 block">
              {playerData.username || "Tap to set name"}
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">{playerData.level}</div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wide">Level</div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5 text-right">
                XP {playerData.currentXP}/{playerData.xpToNextLevel}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-col gap-1 text-right">
          <div className="flex items-center gap-1 text-xs">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-slate-400">{playerData.respect.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Coins className="w-3 h-3 text-green-500" />
            <span className="text-slate-400">${playerData.cash.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Zap className="w-3 h-3 text-blue-500" />
            <span className="text-slate-400">{playerData.crypto.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bar 2: Secondary Stats */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-[#060a12]">
        <StatBar label="Heat" value={playerData.heat} max={100} color="red" />
        <StatBar label="Energy" value={playerData.energy} max={100} color="yellow" />
        <StatBar label="Stamina" value={playerData.stamina} max={100} color="blue" />
        <Link to={createPageUrl("FundPage")} className="block">
          <StatBar label="Fund Size" value={playerData.fundSize} max={10} color="purple" clickable />
        </Link>
      </div>

      {/* Location Bar (if enabled) */}
      {showLocation && (
        <div className="px-4 py-2 border-t border-slate-900">
          <div className="text-xs text-slate-500 font-mono">
            {playerData.locationCity && playerData.locationState ? (
              <>📍 {playerData.locationCity}, {playerData.locationState}</>
            ) : (
              <>📍 No location — tap MAP</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({ label, value, max, color, clickable }) {
  const percent = ((value / max) * 100).toFixed(0);
  const colorMap = {
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };

  return (
    <div className={clickable ? "hover:opacity-80 transition-opacity cursor-pointer" : ""}>
      <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full ${colorMap[color]} transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <div className="text-[8px] text-slate-700 mt-0.5">{value}/{max}</div>
    </div>
  );
}