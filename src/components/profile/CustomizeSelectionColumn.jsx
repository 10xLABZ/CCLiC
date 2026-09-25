import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * Reusable vertical scroll column for selecting items (avatars, scenes, themes).
 * Items scroll vertically; selected item gets a green outline + checkmark.
 */
export default function CustomizeSelectionColumn({ title, items, selectedId, onSelect, aspectRatio = "3/4" }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-[#2ecc71] text-[10px] font-bold uppercase tracking-wider text-center mb-1.5 shrink-0">
        {title}
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-0 scroll-smooth">
        {items.length === 0 ? (
          <div className="text-center text-slate-600 text-[9px] py-4">None available</div>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-lg overflow-hidden border-2 transition-all relative block ${
                  isSelected ? 'border-[#2ecc71]' : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{ aspectRatio }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name || item.id}
                    className="w-full h-full object-contain bg-slate-900/50"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px] p-1 text-center">
                    {item.name || item.id}
                  </div>
                )}
                <div className="absolute top-1 right-1 z-10">
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2ecc71] drop-shadow-lg" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600/60 drop-shadow-lg" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="text-[#f1c40f] text-[8px] text-center mt-1 shrink-0">SCROLL FOR MORE</div>
    </div>
  );
}