import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrydIcon from "@/components/shared/CrydIcon";
import { AvatarShardIcon, GearPartIcon } from "@/components/shared/shardIcons";

/**
 * PurchaseSuccessModal — shows "Congratulations, you've got..." popup with
 * the delivered items and a confetti animation.
 *
 * Props:
 *   open: bool
 *   onClose: fn
 *   title: string (default "Congratulations!")
 *   items: array of { name, icon, detail }
 *   crydSpent: number (optional)
 */
export default function PurchaseSuccessModal({ open, onClose, title = "Congratulations!", items = [], crydSpent = 0 }) {
  useEffect(() => {
    if (!open) return;
    // Fire confetti burst
    const burst = (opts) => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, ...opts });
    burst({ colors: ['#fbbf24', '#f59e0b', '#fde047', '#ffffff'] });
    setTimeout(() => burst({ angle: 60, colors: ['#fbbf24', '#fde047'] }), 200);
    setTimeout(() => burst({ angle: 120, colors: ['#f59e0b', '#ffffff'] }), 400);
  }, [open]);

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="relative bg-gradient-to-b from-[#0a0f1a] to-[#060a12] border-2 border-yellow-500/60 rounded-2xl w-full max-w-sm shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 0 32px rgba(234,179,8,0.3)' }}
      >
        {/* Header */}
        <div className="text-center pt-6 pb-3 px-4">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-xl font-black text-yellow-400 uppercase tracking-wider">{title}</div>
          <div className="text-[11px] text-slate-400 mt-1">You've successfully purchased:</div>
        </div>

        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>

        {/* Items list */}
        <div className="px-5 pb-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-900/60 border border-yellow-800/30 p-3">
              <div className="text-2xl shrink-0 flex items-center justify-center" style={{ width: '32px', height: '32px' }}>
                {item.iconImage === 'avatar_shard' ? <AvatarShardIcon size={28} /> : item.iconImage === 'gear_shard' ? <GearPartIcon size={28} /> : item.iconUrl ? <img src={item.iconUrl} alt={item.name} className="w-7 h-7 object-contain" /> : (item.icon || '🎁')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-100 truncate">{item.name}</div>
                {item.detail && <div className="text-[11px] text-slate-500">{item.detail}</div>}
              </div>
              <span className="text-emerald-400 text-lg font-bold shrink-0">✓</span>
            </div>
          ))}
        </div>

        {/* Cost footer */}
        {crydSpent > 0 && (
          <div className="px-5 pb-2 flex items-center justify-center gap-1 text-xs text-slate-500">
            <span>Paid:</span>
            <span className="font-bold text-blue-400 flex items-center gap-1">{crydSpent} <CrydIcon size={12} /></span>
          </div>
        )}

        {/* CTA */}
        <div className="p-5 pt-3">
          <Button onClick={onClose} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black h-11">
            AWESOME!
          </Button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}