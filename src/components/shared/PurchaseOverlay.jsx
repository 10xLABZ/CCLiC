import React, { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen blocking overlay for purchase transactions.
 * status: 'processing' → spinner + "Do not close"
 * status: 'success'    → confetti + item display + Continue button
 * status: 'error'      → error message + Close button
 *
 * No interaction is possible while this is visible — prevents double-clicks,
 * navigation away, or any action that could cause a lost purchase.
 */
export default function PurchaseOverlay({ state, onClose }) {
  useEffect(() => {
    if (state?.status === 'success') {
      import('canvas-confetti').then(({ default: confetti }) => {
        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'];
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors });
        setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
        setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors }), 400);
      }).catch(() => {});
    }
  }, [state]);

  if (!state) return null;

  const { status, item } = state;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 bg-[#0a0f1a] border border-emerald-900/50 rounded-2xl px-8 py-10 shadow-2xl max-w-sm w-full mx-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <div className="text-emerald-400 font-bold text-lg tracking-wider uppercase">Processing</div>
            <div className="text-slate-400 text-sm text-center">Purchasing {item?.name}…</div>
            <div className="text-amber-500/70 text-xs font-semibold">⚠ Do not close or navigate away</div>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div className="text-emerald-400 font-bold text-lg tracking-wider uppercase">Purchase Complete!</div>
            {item?.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-contain rounded-lg border border-emerald-700/40 bg-slate-900" />
            )}
            <div className="text-slate-300 text-sm font-semibold text-center">{item?.name}</div>
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-500 w-full">Continue</Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500" />
            <div className="text-red-400 font-bold text-lg tracking-wider uppercase">Purchase Failed</div>
            <div className="text-slate-400 text-sm text-center">{state.error || 'Something went wrong. No charge was made.'}</div>
            <Button onClick={onClose} variant="outline" className="border-slate-700 text-slate-300 w-full">Close</Button>
          </>
        )}
      </div>
    </div>
  );
}