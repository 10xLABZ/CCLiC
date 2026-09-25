import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Reusable "Already Claimed" popup — shown when the server rejects
 * a reward claim because it was already claimed (on another device,
 * in a previous session, or due to a desync glitch).
 *
 * Identical visual style to the one in DailyGiftChest for consistency.
 */
export default function AlreadyClaimedPopup({ open, onClose, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 p-4">
      <div className="bg-gradient-to-b from-slate-900 to-[#0a0805] border-2 border-slate-600 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-lg font-black text-slate-200 mb-2 tracking-wide">ALREADY CLAIMED</h2>
        <p className="text-sm text-slate-400 mb-5">
          {message || "You've already claimed this reward. Check back after the next server reset for your next one."}
        </p>
        <Button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          GOT IT
        </Button>
      </div>
    </div>
  );
}