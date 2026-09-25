import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ALLIANCE_IMAGES = [
  { id: "alliance_00", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/d75e39cf9_alliance-logo0.jpg", label: "Money Bag" },
  { id: "alliance_01", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/ad7bc1ec6_alliance-logo1.jpg", label: "Cards" },
  { id: "alliance_02", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/037a93b70_alliance-logo2.jpg", label: "Skull Cyber" },
  { id: "alliance_02b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/f61390b8c_alliance-logo2b.jpg", label: "Skull Pixel" },
  { id: "alliance_02c", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/2cb038da7_alliance-logo2c.jpg", label: "Skull Triangle" },
  { id: "alliance_03", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/6b36632a2_alliance-logo3.jpg", label: "Torii Gate" },
  { id: "alliance_03a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/8f208bea2_alliance-logo3a.jpg", label: "Pirate" },
  { id: "alliance_04", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/01ff86c72_alliance-logo4.jpg", label: "Enso Circle" },
  { id: "alliance_04a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/26b2c35d7_alliance-logo4a.jpg", label: "Neon City" },
  { id: "alliance_05", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/1e5896ab3_alliance-logo5.jpg", label: "Tree of Life" },
  { id: "alliance_06", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/2869d921c_alliance-logo6.jpg", label: "Green Tree" },
  { id: "alliance_07", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/f66f76dfb_alliance-logo7.jpg", label: "Crystal Gem" },
  { id: "alliance_07b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/4ee580186_alliance-logo7b.jpg", label: "Diamond" },
  { id: "alliance_07c", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/184145cff_alliance-logo7c.jpg", label: "Gold X" },
  { id: "alliance_08", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/87dc4cfbc_alliance-logo8.jpg", label: "Fingerprint" },
  { id: "alliance_09", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/003d5c5fd_alliance-logo9.jpg", label: "Compass Teal" },
  { id: "alliance_09a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/bc1d51afd_alliance-logo9a.jpg", label: "Compass Gold" },
  { id: "alliance_10", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/1dcfb3dd6_alliance-logo10.jpg", label: "Hourglass" },
  { id: "alliance_11", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/bd9b14ce1_alliance-logo11.jpg", label: "Great Wave" },
  { id: "alliance_11a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/9dd3b6e49_alliance-logo11a.jpg", label: "Cube Grid" },
  { id: "alliance_11b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/926716e05_alliance-logo11b.jpg", label: "Gold Coin Bag" },
  { id: "alliance_11c", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/7cde8cf55_alliance-logo11c.jpg", label: "Column Crest" },
  { id: "alliance_12", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/14164e6d3_alliance-logo12.jpg", label: "Dollar Grunge" },
  { id: "alliance_12a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/1215cff3a_alliance-logo12a.jpg", label: "Tribal" },
  { id: "alliance_13", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/b54bc4505_alliance-logo13.jpg", label: "Valknut" },
  { id: "alliance_14", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/70ec7446d_alliance-logo14.jpg", label: "Alliance Crest" },
  { id: "alliance_14b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/896e4919b_alliance-logo14b.jpg", label: "Wolf Shield" },
  { id: "alliance_15", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/bc49aa0a0_alliance-logo15.jpg", label: "Wolf Geo" },
  { id: "alliance_16", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/e39d2f9b2_alliance-logo16.jpg", label: "Wolf Rage" },
  { id: "alliance_16b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/8ce298a08_alliance-logo16b.jpg", label: "Knight Crown" },
  { id: "alliance_17", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/1f42fbcb4_alliance-logo17.jpg", label: "Spartan" },
  { id: "alliance_17b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/858400790_alliance-logo17b.jpg", label: "Red Dragon" },
  { id: "alliance_18", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/d71df3ec3_alliance-logo18.jpg", label: "Ink Dragon" },
  { id: "alliance_18b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/9a7ea5be2_alliance-logo18b.jpg", label: "City Shield" },
  { id: "alliance_18c", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/5ca77dfed_alliance-logo18c.jpg", label: "Crown Shield" },
  { id: "alliance_19", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/a856e038b_alliance-logo19.jpg", label: "All-Seeing Green" },
  { id: "alliance_20", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/cfd294b69_alliance-logo20.jpg", label: "All-Seeing Gold" },
  { id: "alliance_21", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/a35b3b460_alliance-logo21.jpg", label: "Eye Candles" },
  { id: "alliance_22", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/456dc1c14_alliance-logo22.jpg", label: "Eagle USA" },
  { id: "alliance_22a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/1604bc897_alliance-logo22a.jpg", label: "Dark Reaper" },
  { id: "alliance_23", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/c01c530b8_alliance-logo23.jpg", label: "Trader Hood" },
  { id: "alliance_23a", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/857adabfd_alliance-logo23a.jpg", label: "Globe Tech" },
  { id: "alliance_24", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/2fcd537c6_alliance-logo24.jpg", label: "Globe Gold" },
  { id: "alliance_25", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/d09675f44_alliance-logo25.jpg", label: "Shark" },
  { id: "alliance_26", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/6419fe4b8_alliance-logo26.jpg", label: "Phoenix Pixel" },
  { id: "alliance_27", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/49351158f_alliance-logo27.jpg", label: "Phoenix Clean" },
  { id: "alliance_28", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/dfbfdd9e4_alliance-logo28.jpg", label: "Lion Crest" },
  { id: "alliance_29", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/9bfa91622_alliance-logo29.jpg", label: "Lion Simple" },
  { id: "alliance_30", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/037f07c32_alliance-logo30.jpg", label: "Chart Arrow" },
  { id: "alliance_31", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/3c7329845_alliance-logo31.jpg", label: "Mountain Bull" },
  { id: "alliance_31b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/3c109eced_alliance-logo31b.jpg", label: "Crash Bank" },
  { id: "alliance_32", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/7cc47cfb4_alliance-logo32.jpg", label: "Mob Boss" },
  { id: "alliance_32b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/cfb9f9845_alliance-logo32b.jpg", label: "Raven" },
  { id: "alliance_33", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/c1f7a1276_alliance-logo33.jpg", label: "Crossed Swords" },
  { id: "alliance_34", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/eae243205_alliance-logo34.jpg", label: "Skull Suit" },
  { id: "alliance_35", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/68da191d1_alliance-logo35.jpg", label: "Wall St Skull" },
  { id: "alliance_35b", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/a4b89cd7d_alliance-logo35b.jpg", label: "City Spire" },
  { id: "alliance_36", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/c24529bee_alliance-logo36.jpg", label: "Buildings Ring" },
  { id: "alliance_37", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/58f4b8e30_alliance-logo37.jpg", label: "Bull Shield 1" },
  { id: "alliance_38", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/2feb541f0_alliance-logo38.jpg", label: "Bull Shield 2" },
  { id: "alliance_39", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/cc927267d_alliance-logo39.jpg", label: "Bull Grunge" },
  { id: "alliance_40", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/6cb3f744f_alliance-logo40.jpg", label: "Bull Green" },
  { id: "alliance_41", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/c78fcdfb6_alliance-logo41.jpg", label: "Samurai Demon" },
  { id: "alliance_42", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/9d4ac5ba7_alliance-logo42.jpg", label: "Samurai Ink" },
  { id: "alliance_43", url: "https://media.base44.com/images/public/699169456a354d6cb7082777/d75e39cf9_alliance-logo0.jpg", label: "Chess King" },
];

export function getAllianceImageUrl(imageId) {
  const found = ALLIANCE_IMAGES.find(img => img.id === imageId);
  return found?.url || null;
}

// Legacy support for old emoji-based fund images
const LEGACY_FUND_EMOJIS = {
  fund_01: "🏢", fund_02: "💼", fund_03: "💰", fund_04: "📈",
  fund_05: "🏦", fund_06: "💎", fund_07: "🚀", fund_08: "⚡",
  fund_09: "🎯", fund_10: "👑", fund_11: "🔥", fund_12: "💵",
  fund_13: "🌟", fund_14: "🏆", fund_15: "⭐", fund_16: "💸",
  fund_17: "🎲", fund_18: "🔔", fund_19: "🎰", fund_20: "🏁",
};

export function getFundImage(imageId) {
  if (LEGACY_FUND_EMOJIS[imageId]) return LEGACY_FUND_EMOJIS[imageId];
  return null;
}

export function AllianceEmblem({ imageId, className = "w-full h-full object-cover rounded-xl" }) {
  const url = getAllianceImageUrl(imageId);
  const emoji = getFundImage(imageId);
  if (url) {
    return <img src={url} alt="emblem" className={className} />;
  }
  if (emoji) {
    return <span className="text-3xl">{emoji}</span>;
  }
  return <span className="text-3xl">🏰</span>;
}

export default function FundImagePicker({ open, onClose, onSelect, currentImageId }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative bg-[#0a0f1a] border border-amber-900/40 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-amber-400">Choose Alliance Emblem</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          <div className="grid grid-cols-4 gap-2">
            {ALLIANCE_IMAGES.map((img) => (
              <button
                key={img.id}
                onClick={() => { onSelect(img.id); onClose(); }}
                className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                  currentImageId === img.id
                    ? "border-amber-500 shadow-lg shadow-amber-500/30"
                    : "border-slate-700 hover:border-amber-600"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}