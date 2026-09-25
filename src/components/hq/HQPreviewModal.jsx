import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

// Returns the HQ image URL based on fund level
function getHQImage(level) {
  if (level <= 3)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/6b0f42460_hq1.jpg";
  if (level <= 5)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/eb20bf3bd_hq2.jpg";
  if (level <= 7)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/5553396d7_hq3.jpg";
  if (level <= 10)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/1b9964cbe_hq4.jpg";
  if (level <= 29)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/6741dac16_hq5.jpg";
  if (level <= 99)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/34f8bafcf_hq6.jpg";
  if (level <= 199) return "https://media.base44.com/images/public/699169456a354d6cb7082777/8d0f52206_hq7.jpg";
  if (level <= 499) return "https://media.base44.com/images/public/699169456a354d6cb7082777/a58e41876_hq8.jpg";
  if (level <= 999) return "https://media.base44.com/images/public/699169456a354d6cb7082777/12d604bac_hq9.jpg";
  return "https://media.base44.com/images/public/699169456a354d6cb7082777/6d5d77682_hq10.jpg";
}

/**
 * Read-only HQ preview popup — shows the HQ building image + level only.
 * Uses Radix Dialog (React Portal) to escape any parent stacking context.
 */
export default function HQPreviewModal({ open, onClose, level = 0, username = "" }) {
  const hqImage = getHQImage(level);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0a0f1a] border border-yellow-900/40 rounded-xl overflow-hidden w-full max-w-md shadow-2xl p-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-yellow-900/20 pr-10">
          <span className="text-yellow-400 font-black text-sm tracking-widest uppercase">HEADQUARTERS</span>
          {username && <span className="text-[10px] text-slate-500 truncate">— {username}</span>}
        </div>

        {/* 70/30 split body — image + level only */}
        <div className="flex">
          {/* LEFT 70% — HQ image */}
          <div className="relative overflow-hidden" style={{ width: '70%' }}>
            <img
              src={hqImage}
              alt={`HQ Level ${level}`}
              className="w-full object-cover"
              style={{ minHeight: '180px', maxHeight: '220px' }}
            />
          </div>

          {/* RIGHT 30% — Level only */}
          <div className="flex flex-col items-center justify-center px-2 py-4 bg-[#080d17] border-l border-yellow-900/20" style={{ width: '30%' }}>
            <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest mb-1">HQ LEVEL</div>
            <div
              className="font-black text-yellow-400 leading-none"
              style={{
                fontSize: level >= 1000 ? '18px' : level >= 100 ? '28px' : '38px',
                textShadow: '0 0 16px rgba(234,179,8,0.6)'
              }}
            >
              {level}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}