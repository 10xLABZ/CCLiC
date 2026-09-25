import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Info, ChevronDown } from "lucide-react";

const IMG_AUTO_OFF = "https://media.base44.com/images/public/699169456a354d6cb7082777/db32f0619_example-autotradeoffbutton1.jpg";
const IMG_AUTO_1X = "https://media.base44.com/images/public/699169456a354d6cb7082777/757e56328_example-autotradebutton1x.jpg";
const IMG_AUTO_3X = "https://media.base44.com/images/public/699169456a354d6cb7082777/91c1f6041_example-autotradebutton3x.jpg";
const IMG_NEXT_BAR = "https://media.base44.com/images/public/699169456a354d6cb7082777/7b636d42d_example-nextbarbutton1.jpg";

export default function TradeDeskTutorial({ onClose }) {
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAtBottom(isAtBottom);
  };

  useEffect(() => {
    checkScroll();
  }, []);

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="relative bg-slate-900 border-2 border-orange-600 rounded-2xl p-5 max-w-sm w-full shadow-2xl h-[82vh] flex flex-col">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-600 flex items-center justify-center">
            <Info className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="text-lg font-bold text-orange-400">How Trade Desk Works</h2>
        </div>

        <div ref={scrollRef} onScroll={checkScroll} className="flex-1 overflow-y-auto space-y-3 text-sm text-slate-300 pr-1 mb-2">
          <p className="text-slate-200 font-semibold">The chart doesn't move on its own — you control it:</p>

          {/* Step 1: Auto controls */}
          <div className="flex gap-2">
            <span className="text-orange-400 font-bold shrink-0">1.</span>
            <div className="flex-1">
              <p className="mb-1.5">Tap the auto button to cycle through speeds:</p>
              <div className="flex items-center gap-1">
                <img src={IMG_AUTO_OFF} alt="AUTO OFF" className="h-4 object-contain rounded" />
                <span className="text-slate-500 text-xs">→</span>
                <img src={IMG_AUTO_1X} alt="AUTO 1X" className="h-4 object-contain rounded" />
                <span className="text-slate-500 text-xs">→</span>
                <img src={IMG_AUTO_3X} alt="AUTO 3X" className="h-4 object-contain rounded" />
              </div>
            </div>
          </div>

          {/* Step 2: Next Bar */}
          <div className="flex gap-2">
            <span className="text-yellow-400 font-bold shrink-0">2.</span>
            <div className="flex-1">
              <p className="mb-1.5">Or advance one candle at a time manually:</p>
              <img src={IMG_NEXT_BAR} alt="NEXT BAR" className="h-5 object-contain rounded" />
            </div>
          </div>

          {/* Step 3: Quantity + Buy/Sell */}
          <div className="flex gap-2">
            <span className="text-green-400 font-bold shrink-0">3.</span>
            <div className="flex-1">
              <p>Select your <span className="text-white font-bold">Quantity</span>, then use <span className="text-green-400 font-bold">BUY</span> / <span className="text-red-400 font-bold">SELL</span> to open or close positions as prices move.</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-center">
            <p className="text-[11px] text-slate-400">
              <span className="text-orange-400 font-bold">Tip:</span> The chart must advance (auto or manual) for prices to change. Close your position before the bars run out!
            </p>
          </div>

          <div className="bg-red-950/50 border border-red-700 rounded-lg p-3">
            <p className="text-[11px] text-red-300 font-semibold">
              ⚠️ RISK WARNING: You are risking your IGC (in-game cash)! You can lose some or all of your IGC while trying to gain profit goals. Trade smart!
            </p>
          </div>
        </div>

        {/* Animated scroll indicators — show on both sides when not at bottom */}
        {!atBottom && (
          <div className="flex justify-between items-center px-2 mb-1 shrink-0">
            <ChevronDown className="w-5 h-5 text-orange-400 animate-bounce" />
            <span className="text-[9px] text-orange-400/70 font-semibold animate-pulse">scroll for more</span>
            <ChevronDown className="w-5 h-5 text-orange-400 animate-bounce" />
          </div>
        )}

        <Button onClick={onClose} className="w-full bg-orange-600 hover:bg-orange-500 font-bold shrink-0">
          Got it — Start Trading
        </Button>
      </div>
    </div>
  );
}