import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePlayerData } from "../utils/playerStorage";
import { getOwnedFrames, equipFrame, unequipFrame, getEquippedFrameId } from "../frames/framesStorage";
import { getFrameById } from "../frames/framesData";
import { isVipActive, formatVipTime, getVipTimeRemaining } from "@/lib/vipHelper";

const PROFILE_IMAGES = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ba9b16930_profilepicture-bots-022.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e788cd81d_profilepicture-bots-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/9701ed03d_profilepicture-bots-027.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4da43053e_profilepicture-bots-female-020.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/815d131dd_profilepicture-bots-female-021.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5e71076b9_profilepicture-bots-female-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d5fc792fd_profilepicture-bots-female-025.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/821b1b4dd_profilepicture-bots-female-004.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/f266a58a0_profilepicture-bots-female-007.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/afe80e37f_profilepicture-bots-048.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/067c165ff_profilepicture-bots-037.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a888307a0_profilepicture-bots-044.jpg",
];

export default function ProfileImageFrameModal({ open, onClose, playerData, onUpdate }) {
  const [tab, setTab] = useState("images");

  if (!open) return null;

  const handleImageSelect = (imageUrl) => {
    const updated = savePlayerData({ profileImageDataUrl: imageUrl });
    onUpdate?.(updated);
    onClose();
  };

  const ownedFrames = getOwnedFrames(playerData);
  const equippedFrameId = getEquippedFrameId(playerData);

  const handleEquip = (frameId) => {
    equipFrame(frameId);
    const updated = savePlayerData({ equippedFrameId: frameId });
    onUpdate?.(updated);
  };

  const handleUnequip = () => {
    unequipFrame();
    const updated = savePlayerData({ equippedFrameId: null });
    onUpdate?.(updated);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-[#0a0f1a] border border-emerald-900/40 rounded-2xl w-full max-w-sm shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-sm font-bold text-slate-200">Profile Customization</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setTab("images")}
            className={`flex-1 py-2.5 text-xs font-bold transition-all ${tab === "images" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-slate-500 hover:text-slate-300"}`}
          >
            📷 Profile Images
          </button>
          <button
            onClick={() => setTab("frames")}
            className={`flex-1 py-2.5 text-xs font-bold transition-all ${tab === "frames" ? "text-purple-400 border-b-2 border-purple-400 bg-purple-950/20" : "text-slate-500 hover:text-slate-300"}`}
          >
            🖼️ My Frames {ownedFrames.length > 0 && <span className="ml-1 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ownedFrames.length}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {tab === "images" && (
            <div className="grid grid-cols-3 gap-2">
              {PROFILE_IMAGES.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handleImageSelect(url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    playerData.profileImageDataUrl === url ? 'border-emerald-500 ring-2 ring-emerald-400/50' : 'border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  <img src={url} alt={`Profile ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {tab === "frames" && (
            <div className="space-y-3">
              {ownedFrames.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div className="text-sm text-slate-500">No frames earned yet</div>
                  <div className="text-xs text-slate-600 mt-1">Win Capital Clash events or activate VIP to earn frames!</div>
                </div>
              ) : (
                <>
                  {equippedFrameId && (
                    <button
                      onClick={handleUnequip}
                      className="w-full text-xs py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all"
                    >
                      ✕ Remove Current Frame
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {ownedFrames.map(f => {
                      const frame = getFrameById(f.id);
                      if (!frame) return null;
                      const isEquipped = equippedFrameId === f.id;
                      const isVipFrame = f.id === 'vip';
                      const timeLeft = isVipFrame ? getVipTimeRemaining(playerData) : (f.expiresAt ? Math.max(0, f.expiresAt - Date.now()) : null);

                      return (
                        <div
                          key={f.id}
                          className={`bg-[#060a12] border rounded-xl p-2 ${isEquipped ? `${frame.borderColor} ring-2 ring-offset-1 ring-offset-[#060a12] ${frame.borderColor}` : 'border-slate-800'}`}
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 mb-2">
                            <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                            {isEquipped && (
                              <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className={`text-xs font-bold ${frame.color} text-center mb-0.5`}>{frame.name}</div>
                          {frame.type === 'temporary' && (
                            <div className="text-[9px] text-amber-400 text-center mb-1">
                              TEMPORARY{timeLeft ? ` • ${formatVipTime(timeLeft)}` : ''}
                            </div>
                          )}
                          <div className="text-[9px] text-slate-500 text-center mb-2 leading-tight">{frame.description}</div>
                          {isEquipped ? (
                            <Button size="sm" onClick={handleUnequip} variant="outline" className="w-full text-[10px] h-6 border-red-700 text-red-400 hover:bg-red-950/30">
                              Remove
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleEquip(f.id)} className="w-full text-[10px] h-6 bg-emerald-600 hover:bg-emerald-500">
                              Equip
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}