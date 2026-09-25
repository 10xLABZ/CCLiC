import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFrameById } from "@/components/frames/framesData";
import { getOwnedFrames } from "@/components/frames/framesStorage";
import { isVipActive, formatVipTime, getVipTimeRemaining } from "@/lib/vipHelper";
import { PROFILE_IMAGES } from "./avatarUtils";

/**
 * Sub-picker modal for profile images and frames.
 * Uses draft state — selecting an image or frame updates the parent's draft,
 * nothing is saved to the server until the main SAVE button is pressed.
 */
export default function ProfileImageSubPicker({
  open,
  onClose,
  draftProfileImage,
  draftFrameId,
  onSelectImage,
  onSelectFrame,
  playerData,
}) {
  const [tab, setTab] = useState("images");

  if (!open) return null;

  const ownedFrames = getOwnedFrames(playerData);

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative bg-[#0a0f1a] border border-emerald-900/40 rounded-2xl w-full max-w-sm shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-sm font-bold text-slate-200">Profile Image & Frames</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
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
        <div className="p-3 max-h-[50vh] overflow-y-auto">
          {tab === "images" && (
            <div className="grid grid-cols-3 gap-2">
              {PROFILE_IMAGES.map((url, i) => (
                <button
                  key={i}
                  onClick={() => onSelectImage(url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    draftProfileImage === url ? 'border-[#2ecc71] ring-2 ring-[#2ecc71]/50' : 'border-slate-700 hover:border-emerald-500'
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
                  {draftFrameId && (
                    <button
                      onClick={() => onSelectFrame(null)}
                      className="w-full text-xs py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all"
                    >
                      ✕ Remove Current Frame
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {ownedFrames.map(f => {
                      const frame = getFrameById(f.id);
                      if (!frame) return null;
                      const isEquipped = draftFrameId === f.id;
                      const isVipFrame = f.id === 'vip';
                      const timeLeft = isVipFrame ? getVipTimeRemaining(playerData) : (f.expiresAt ? Math.max(0, f.expiresAt - Date.now()) : null);
                      return (
                        <div
                          key={f.id}
                          className={`bg-[#060a12] border rounded-xl p-2 ${isEquipped ? `${frame.borderColor} ring-2 ring-offset-1 ring-offset-[#060a12] ${frame.borderColor}` : 'border-slate-800'}`}
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 mb-1.5">
                            <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                            {isEquipped && (
                              <div className="absolute top-1 right-1 bg-[#2ecc71] rounded-full p-0.5">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className={`text-xs font-bold ${frame.color} text-center mb-0.5`}>{frame.name}</div>
                          {frame.type === 'temporary' && timeLeft && (
                            <div className="text-[9px] text-amber-400 text-center mb-1">TEMPORARY • {formatVipTime(timeLeft)}</div>
                          )}
                          {isEquipped ? (
                            <Button size="sm" onClick={() => onSelectFrame(null)} variant="outline" className="w-full text-[10px] h-6 border-red-700 text-red-400 hover:bg-red-950/30">
                              Remove
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => onSelectFrame(f.id)} className="w-full text-[10px] h-6 bg-[#2ecc71] hover:bg-[#27ae60]">
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

        {/* Done button */}
        <div className="p-3 border-t border-slate-800">
          <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-500">
            Done
          </Button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}