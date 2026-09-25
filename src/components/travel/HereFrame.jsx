import React from "react";
import { MapPin } from "lucide-react";

export default function HereFrame({ children, active = false, badge = "HERE" }) {
  if (!active) return children;
  return (
    <div className="relative rounded-xl here-glow-frame">
      {children}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full pointer-events-none z-10"
        style={{
          background: "#060a12",
          border: "2px solid #10b981",
          boxShadow: "0 0 8px rgba(16,185,129,0.6)",
        }}
      >
        <MapPin className="w-2.5 h-2.5 text-emerald-400" />
        <span className="text-[8px] font-black text-emerald-400 tracking-widest">{badge}</span>
        <MapPin className="w-2.5 h-2.5 text-emerald-400" />
      </div>
    </div>
  );
}