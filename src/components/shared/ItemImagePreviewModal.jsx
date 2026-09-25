import React from "react";
import { X } from "lucide-react";

/**
 * Full-ratio image preview modal — no cropping, transparent/dark bg.
 * Usage: <ItemImagePreviewModal item={item} onClose={() => setPreview(null)} />
 * item must have: imageUrl, name, atk, def
 */
export default function ItemImagePreviewModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4 bg-[#0a0f1a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-full p-1.5 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — full ratio, no cropping */}
        <div className="w-full bg-slate-900/60 flex items-center justify-center p-4">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="max-w-full max-h-[60vh] object-contain"
            style={{ display: "block" }}
          />
        </div>

        {/* Info bar */}
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="text-sm font-bold text-slate-100 mb-1">{item.name}</div>
          <div className="flex gap-4 text-xs">
            {item.atk > 0 && <span className="text-red-400">+{item.atk} ATK</span>}
            {item.def > 0 && <span className="text-blue-400">+{item.def} DEF</span>}
            {item.igcBonus > 0 && <span className="text-cyan-400">+{item.igcBonus}% IGC</span>}
            {item.description && (
              <span className="text-slate-500 truncate">{item.description}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}