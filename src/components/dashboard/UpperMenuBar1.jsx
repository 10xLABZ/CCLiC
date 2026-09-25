import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Star, DollarSign, Zap } from "lucide-react";
import { savePlayerData } from "../utils/playerStorage";
import ProfileImageFrameModal from "../profile/ProfileImageFrameModal";
import { getEquippedFrameUrl } from "../frames/framesStorage";

export default function UpperMenuBar1({ playerData, onUpdate }) {
  const fileInputRef = useRef(null);
  const [frameModalOpen, setFrameModalOpen] = useState(false);

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
  const equippedFrameUrl = getEquippedFrameUrl(playerData);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a] border-b border-emerald-900/30">
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Profile Image */}
        <button
          onClick={() => setFrameModalOpen(true)}
          className="relative w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center overflow-visible hover:border-emerald-400/50 transition-colors shrink-0"
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden">
            {playerData.profileImageDataUrl ? (
              <img src={playerData.profileImageDataUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-emerald-500/60" /></div>
            )}
          </div>
          {equippedFrameUrl && (
            <img src={equippedFrameUrl} alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ zIndex: 20 }} />
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
              {playerData.username || "InsiderTrader0000"}
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-center shrink-0">
              <div className="text-base font-bold text-emerald-400">{playerData.level}</div>
              <div className="text-[8px] text-slate-600 uppercase tracking-wide">Lv</div>
            </div>
            <div className="w-24">
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5 text-right">
                {playerData.currentXP}/{playerData.xpToNextLevel}
              </div>
            </div>
          </div>

          {/* Resources Row */}
          <div className="flex gap-3 mt-1.5">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Star className="w-3 h-3 text-purple-400" />
              <span className="font-semibold text-purple-300">{playerData.respect?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="text-green-400">💵</span>
              <span className="font-semibold text-green-300">{playerData.cash?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Zap className="w-3 h-3 text-blue-400" />
              <span className="font-semibold text-blue-300">{playerData.crypto || 0}</span>
            </div>
          </div>
        </div>
      </div>
      <ProfileImageFrameModal
        open={frameModalOpen}
        onClose={() => setFrameModalOpen(false)}
        playerData={playerData}
        onUpdate={(updated) => { onUpdate?.(updated); }}
      />
    </div>
  );
}