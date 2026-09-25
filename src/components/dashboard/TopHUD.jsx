import React from "react";
import { usePlayerStore } from "@/lib/usePlayerStore";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Star, Plus } from "lucide-react";
import CrydIcon from "@/components/shared/CrydIcon";
import { getFundData } from "../utils/fundStorage";
import { getEquippedFrameUrl } from "../frames/framesStorage";

/**
 * TopHUD — reads from the global usePlayerStore.
 * No playerData prop needed. Always shows the same live state on every page.
 * isPlayerHomePage: if true, profile button navigates back instead of to PlayerHomePage.
 */
export default function TopHUD({ isPlayerHomePage }) {
  const { playerData } = usePlayerStore();
  const navigate = useNavigate();



  const equippedFrameUrl = getEquippedFrameUrl(playerData);

  const xpThisLevel = parseInt(playerData.xpThisLevel) || 0;
  const xpToNext = parseInt(playerData.xpToNext) || 100;
  const xpPercent = Math.min(100, ((xpThisLevel / xpToNext) * 100)).toFixed(1);

  const fundData = getFundData();
  const fundMembersOwned = fundData.playerFund?.fundMembers || 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a0f1a] border-b border-emerald-900/30" style={{ height: '110px' }}>
      {/* Row 1: Profile, Username, Level, XP | Resources */}
      <div className="flex items-start justify-between gap-4 px-4 py-1.5 border-b border-slate-900">
        {/* LEFT: Profile, Username, Level, XP */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => isPlayerHomePage ? navigate(-1) : navigate(createPageUrl("PlayerHomePage"))}
            title={isPlayerHomePage ? "Close" : "Open player home"}
            className="relative w-11 h-11 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center overflow-hidden hover:border-emerald-400/50 transition-colors"
          >
            {playerData.profileImageDataUrl ? (
              <img src={playerData.profileImageDataUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-emerald-500/60" />
            )}
            {equippedFrameUrl && (
              <img src={equippedFrameUrl} alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ zIndex: 20 }} />
            )}
          </button>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1 min-w-0">
              <Link to={createPageUrl("ProfilePage")} className="min-w-0 flex-1">
                <button className="text-[11px] font-semibold text-slate-200 hover:text-emerald-400 transition-colors flex items-center gap-0.5 min-w-0 truncate max-w-full">
                  <span className="text-[11px] shrink-0">{playerData.gender === 'M' ? '🚹' : playerData.gender === 'F' ? '🚺' : playerData.gender === 'NB' ? '⚧️' : '🚹'}</span>
                  {playerData.allianceTag && <span className="text-amber-400 font-bold text-[10px] shrink-0">[{playerData.allianceTag}]</span>}
                  <span className="truncate">{playerData.username || "Tap to set name"}</span>
                </button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-[140px]">
                <div className="h-2 bg-slate-300 rounded-full overflow-hidden border border-slate-400">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="text-[9px] mt-0.5 flex justify-between items-center">
                  <span className="font-bold text-emerald-400">Lv {playerData.level}</span>
                  <span>
                    <span className="font-bold text-emerald-400">XP</span>{" "}
                    <span className="text-white font-semibold">{xpThisLevel}</span>
                    <span className="text-cyan-400 font-bold">/</span>
                    <span className="text-white font-semibold">{xpToNext}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Resources */}
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1 text-[10px]">
            <Star className="w-2.5 h-2.5 text-purple-400" />
            <span className="font-semibold text-purple-300">{playerData.respect?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-0.5 text-[10px] leading-none">
            <Link to="/ShopPage?tab=consumables&sub=cash" className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ring-1 ring-green-700/50 rounded px-0.5 flex-1">
              <span className="text-green-400">💵</span>
              <span className="font-semibold text-green-300">{Math.floor(playerData.cash || 0).toLocaleString()}</span>
            </Link>
            <Link to="/ShopPage?tab=consumables&sub=cash" className="flex items-center justify-center bg-green-700/30 ring-1 ring-green-600/50 rounded text-green-400 hover:bg-green-600/40 transition-colors shrink-0" style={{ width: '14px', height: '14px' }}>
              <Plus className="w-2.5 h-2.5" />
            </Link>
          </div>
          <div className="flex items-center gap-0.5 text-[10px] leading-none">
            <Link to="/ShopPage?tab=consumables&sub=cryd" className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ring-1 ring-purple-700/50 rounded px-0.5 flex-1">
              <CrydIcon size={11} />
              <span className="font-semibold text-purple-300">{(playerData.crypto || 0).toLocaleString()}</span>
            </Link>
            <Link to="/ShopPage?tab=consumables&sub=cryd" className="flex items-center justify-center bg-purple-700/30 ring-1 ring-purple-600/50 rounded text-purple-400 hover:bg-purple-600/40 transition-colors shrink-0" style={{ width: '14px', height: '14px' }}>
              <Plus className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Stats Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 py-1 bg-[#060a12]">
        <StatBar 
          label="🛡️ COVER" 
          value={playerData.opCover ?? 100} 
          max={100} 
          color="orange"
          inventoryUrl={createPageUrl("OpCoverInventoryPage")}
          shopUrl="/ShopPage?tab=consumables&sub=opcover"
        />
        <StatBar 
          label="🔋 ENERGY" 
          value={playerData.energy ?? 100} 
          max={100} 
          color="yellow"
          inventoryUrl={createPageUrl("EnergyInventoryPage")}
          shopUrl="/ShopPage?tab=consumables&sub=energy"
        />
        <StatBar 
          label="⚡ STAMINA" 
          value={playerData.stamina ?? 100} 
          max={100} 
          color="blue"
          inventoryUrl={createPageUrl("StaminaInventoryPage")}
          shopUrl="/ShopPage?tab=consumables&sub=stamina"
        />
        <Link to={createPageUrl("HQPage")} className="block">
          <div className="hover:opacity-80 transition-opacity cursor-pointer flex flex-col items-center justify-center"
            style={{
              backgroundImage: `url(https://media.base44.com/images/public/699169456a354d6cb7082777/99da10450_hq-tophud.png)`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              width: '52px',
              height: '36px',
              position: 'relative',
            }}>
            <div className="absolute bottom-[2px] left-0 right-0 text-center"
              style={{
                fontSize: fundMembersOwned >= 100 ? '10px' : '15px',
                fontWeight: 'bold',
                color: '#e2e8f0',
                lineHeight: 1,
                transition: 'font-size 0.2s'
              }}>
              Lv {fundMembersOwned}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color, inventoryUrl, shopUrl }) {
   const safeValue = Math.max(0, Math.min(max, value ?? 0));
   const percent = ((safeValue / max) * 100).toFixed(0);
   const colorMap = {
     red: "bg-red-500",
     yellow: "bg-yellow-500",
     blue: "bg-blue-500",
     orange: "bg-orange-500",
   };
   const shopColors = {
     orange: "ring-orange-600/50 text-orange-400 bg-orange-700/30 hover:bg-orange-600/40",
     yellow: "ring-yellow-600/50 text-yellow-400 bg-yellow-700/30 hover:bg-yellow-600/40",
     blue: "ring-blue-600/50 text-blue-400 bg-blue-700/30 hover:bg-blue-600/40",
     red: "ring-red-600/50 text-red-400 bg-red-700/30 hover:bg-red-600/40",
   };

   return (
     <div className="flex flex-col">
       <div className="text-[10px] text-white font-semibold mb-0.5 h-4 flex items-center">{label}</div>
       <div className="flex items-center gap-0.5">
         <Link to={inventoryUrl} className="flex-1 hover:opacity-80 transition-opacity cursor-pointer block">
           <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
             <div className={`h-full ${colorMap[color]} transition-all`} style={{ width: `${percent}%` }} />
           </div>
         </Link>
         <Link to={shopUrl} className={`flex items-center justify-center rounded ring-1 transition-colors shrink-0 ${shopColors[color]}`} style={{ width: '12px', height: '12px' }}>
           <Plus className="w-2 h-2 text-white" />
         </Link>
       </div>
       <div className="text-[8px] mt-0.5">
         <span className="text-white font-semibold">{safeValue}</span>
         <span className="text-cyan-400 font-bold">/</span>
         <span className="text-white font-semibold">{max}</span>
       </div>
     </div>
   );
 }