import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * Full-screen blocking overlay shown while a cosmetic equip is being
 * confirmed by the server. Shows a spinner during save, then a brief
 * checkmark confirmation before auto-dismissing.
 */
export default function CosmeticSaveOverlay({ status }) {
  // status: null | 'saving' | 'success'
  if (!status) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 bg-[#0a0f1a] border border-emerald-900/50 rounded-2xl px-12 py-10 shadow-2xl animate-in fade-in zoom-in duration-150">
        {status === 'saving' ? (
          <>
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <div className="text-emerald-400 font-bold text-sm tracking-wider uppercase">Saving</div>
            <div className="text-slate-500 text-xs">Confirming with server…</div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <div className="text-emerald-400 font-bold text-sm tracking-wider uppercase">Saved</div>
          </>
        )}
      </div>
    </div>
  );
}