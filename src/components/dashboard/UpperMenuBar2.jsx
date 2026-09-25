import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ResourceReplenishModal from "@/components/shared/ResourceReplenishModal";

export default function UpperMenuBar2({ playerData, onPlayerUpdate }) {
  const [replenishType, setReplenishType] = useState(null); // 'energy' | 'stamina' | 'heat'

  const now = Date.now();
  const shieldActive = (playerData.shieldActiveUntil || 0) > now;
  const timeLeft = Math.max(0, (playerData.shieldActiveUntil || 0) - now);
  
  const formatShieldTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <>
      <div className="fixed top-[72px] left-0 right-0 z-50 bg-[#060a12] border-b border-slate-900">
        <div className="flex gap-2 px-4 py-2">
          <button className="flex-1 text-left" onClick={() => setReplenishType('heat')}>
            <StatBar label="🔥" text="Heat" value={playerData.heat} max={100} color="red" clickable />
          </button>
          <button className="flex-1 text-left" onClick={() => setReplenishType('energy')}>
            <StatBar label="🔋" text="Energy" value={playerData.energy} max={100} color="yellow" clickable />
          </button>
          <button className="flex-1 text-left" onClick={() => setReplenishType('stamina')}>
            <StatBar label="⚡" text="Stamina" value={playerData.stamina} max={100} color="blue" clickable />
          </button>
          <Link to={createPageUrl("FundPage")} className="flex-1">
            <StatBar label="👥" text="Fund" value={playerData.fundSize} max={10} color="purple" clickable />
          </Link>
          {shieldActive && (
            <div className="flex-1">
              <StatBar label="🛡️" text={formatShieldTime(timeLeft)} value={100} max={100} color="green" />
            </div>
          )}
        </div>
      </div>

      {replenishType && (
        <ResourceReplenishModal
          open={!!replenishType}
          onClose={() => setReplenishType(null)}
          type={replenishType}
          onPlayerUpdate={onPlayerUpdate}
        />
      )}
    </>
  );
}

function StatBar({ label, text, value, max, color, clickable }) {
  const percent = Math.min(100, ((value / max) * 100)).toFixed(0);
  const colorMap = {
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-emerald-500",
  };

  return (
    <div className={clickable ? "hover:opacity-80 transition-opacity cursor-pointer" : ""}>
      <div className="flex items-center gap-1 mb-0.5">
        {label && <span className="text-xs">{label}</span>}
        {text && <span className="text-[9px] text-slate-600 font-bold tracking-wider">{text}</span>}
      </div>
      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full ${colorMap[color]} transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <div className="text-[8px] text-slate-700 mt-0.5">{value}/{max}</div>
    </div>
  );
}