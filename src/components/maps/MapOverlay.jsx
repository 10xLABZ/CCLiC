import React from "react";
import { Moon, Sun } from "lucide-react";

export default function MapOverlay({ hasToggle, mapMode, onToggleMode }) {
  if (!hasToggle) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ top: "150px" }}>
      <div
        className="flex items-center rounded-full p-0.5"
        style={{
          background: "#0a0f1a",
          border: "2px solid #334155",
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={() => onToggleMode("dark")}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${mapMode === "dark" ? "bg-slate-700 text-slate-200" : "text-slate-600"}`}
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onToggleMode("light")}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${mapMode === "light" ? "bg-amber-500 text-black" : "text-slate-600"}`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}