import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ResourceReplenishModal from "@/components/shared/ResourceReplenishModal";

const RISK_IMAGES = {
  Low:    "https://media.base44.com/images/public/699169456a354d6cb7082777/462be4b49_risk-low.png",
  Medium: "https://media.base44.com/images/public/699169456a354d6cb7082777/c2319fdfa_risk-medium.png",
  High:   "https://media.base44.com/images/public/699169456a354d6cb7082777/3262c5612_risk-high.png",
};

const FOLDER_BG = "https://media.base44.com/images/public/699169456a354d6cb7082777/6ec70e51f_insidertipsfolder1.png";

const TIP_EXPIRE_SECONDS = 30;

export default function TradeOpportunityCard({ trade, onTrade, playerCash, playerCryd, playerEnergy, playerCover = 100, disabledByParent = false }) {
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);

  const getTrendIcon = () => {
    if (trade.trend === "Trending Up") return <TrendingUp className="w-3.5 h-3.5 text-green-700" />;
    if (trade.trend === "Trending Down") return <TrendingDown className="w-3.5 h-3.5 text-red-700" />;
    return <Activity className="w-3.5 h-3.5 text-amber-700" />;
  };

  const isBlocked = playerCover < trade.heatImpact;

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        backgroundImage: `url(${FOLDER_BG})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        minHeight: '180px',
      }}
    >
      <style>{`
        @keyframes tradePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(100,116,139,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(100,116,139,0); }
        }
        .trade-pulse { animation: tradePulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* Content */}
      <div className="pl-6 pr-3 pt-4 pb-4 flex flex-col gap-1.5">

        {/* Row 1: Stock symbol + heat (center) + risk sticker */}
        <div className="flex items-center justify-between">
          <span className="font-black text-base text-amber-950 tracking-tight">{trade.assetName}</span>

          {/* Op Cover + Energy cost */}
          <div className="flex items-center gap-0.5 bg-slate-800/60 border border-slate-700/40 rounded px-2 py-0.5">
            <span className="text-[11px]">🛡️</span>
            <span className="text-[12px] font-bold text-orange-400">-{trade.heatImpact}</span>
            <span className="text-slate-600 mx-0.5">|</span>
            <span className="text-[11px]">🔋</span>
            <span className="text-[12px] font-bold text-yellow-400">-2</span>
          </div>

          {/* Risk sticker */}
          <img
            src={RISK_IMAGES[trade.risk] || RISK_IMAGES.Low}
            alt={`${trade.risk} Risk`}
            className="h-7 object-contain"
          />
        </div>

        {/* Row 2: Trend icon + description */}
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className="text-[13px] text-amber-900 font-black">{trade.trend}</span>
        </div>

        {/* Row 3+4: Win/Loss + Action button side by side */}
         <div className="flex items-center justify-between gap-2 mt-1">
           {/* Win / Loss stacked left */}
           <div className="flex flex-col gap-0.5">
             <div className="flex items-center gap-1">
               <DollarSign className="w-3 h-3 text-green-700" />
               <span className="text-[13px] font-bold text-amber-900">Win:</span>
               <span className="text-[13px] text-green-700 font-black">${trade.potentialWinCash}</span>
             </div>
             <div className="flex items-center gap-1">
               <DollarSign className="w-3 h-3 text-red-700" />
               <span className="text-[13px] font-bold text-amber-900">Loss:</span>
               <span className="text-[13px] text-red-700 font-black">${trade.potentialLossCash}</span>
             </div>
           </div>

           {/* Single unified BUY/TRADE action */}
           <button
             onClick={async () => {
               if (playerEnergy < 2) { setShowEnergyModal(true); return; }
               setIsTransacting(true);
               try {
                 await onTrade(trade);
               } finally {
                 setIsTransacting(false);
               }
             }}
             disabled={playerCash < trade.tipCost || isTransacting || disabledByParent}
             className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold text-[10px] h-auto px-2.5 py-1 leading-tight border-0 flex flex-col items-center shrink-0 rounded-md transition-colors"
           >
             {isTransacting ? (
               <>
                 <span className="tracking-wide text-white">TRANSACTING...</span>
                 <div className="mt-1.5 w-12 h-1 bg-black/40 rounded-full overflow-hidden">
                   <div className="h-full bg-white animate-pulse" style={{ width: '100%' }}></div>
                 </div>
               </>
             ) : (
               <>
                 <span className="tracking-wide">BUY / TRADE</span>
                 <span className="mt-0.5 border border-white/50 rounded px-1.5 py-0.5 text-[9px] font-bold bg-black/20 whitespace-nowrap">
                   COST: ${trade.tipCost.toLocaleString()}
                 </span>
               </>
             )}
           </button>
         </div>

      </div>

      <ResourceReplenishModal
        open={showEnergyModal}
        onClose={() => setShowEnergyModal(false)}
        type="energy"
        message="You need at least 2 Energy to execute a trade."
      />

      {isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-[2px] rounded-lg">
          <div className="bg-slate-950 border-2 border-orange-600/80 rounded-xl px-4 py-3 text-center shadow-2xl mx-3 w-full max-w-[220px]">
            <div className="text-sm font-bold text-orange-400 mb-0.5">🛡️ LOW COVER</div>
            <div className="text-[10px] text-slate-400 mb-2">
              Need <span className="text-orange-300 font-bold">{trade.heatImpact} Op Cover</span> — you have <span className="text-red-400 font-bold">{playerCover}</span>
            </div>
            <div className="flex gap-1.5 justify-center">
              <Link to="/OpCoverInventoryPage" className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                Inventory
              </Link>
              <Link to="/ShopPage?tab=consumables&sub=opcover" className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                🛒 Shop
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}