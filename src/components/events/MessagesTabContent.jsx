import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getRewardImageUrl } from "@/components/shared/shardIcons";

export default function MessagesTabContent({ messages, claimingEvent, onClaimMessage, onClaimAll, onMarkAllRead, onDeleteAll }) {
  const [deleteConfirm1, setDeleteConfirm1] = useState(false);
  const [deleteConfirm2, setDeleteConfirm2] = useState(false);
  const [claimingAll, setClaimingAll] = useState(false);

  const unclaimedMessages = messages.filter(m => !m.claimed);
  const claimedMessages = messages.filter(m => m.claimed);

  const handleClaimAll = async () => {
    setClaimingAll(true);
    await onClaimAll();
    setClaimingAll(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Unclaimed section */}
      {unclaimedMessages.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">📬 Unclaimed ({unclaimedMessages.length})</div>
          <div className="space-y-2">
            {unclaimedMessages.map(msg => (
              <div key={msg.id} className="bg-[#0a0f1a] border border-blue-900/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200">{msg.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{msg.body}</div>
                    {msg.rewards && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.rewards.map(r => {
                          const imgUrl = getRewardImageUrl(r.id);
                          return (
                           <span key={r.id} className="text-[10px] bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">{imgUrl ? <img src={imgUrl} alt="" className="w-3 h-3 object-contain inline-block" /> : r.icon} {r.label}</span>
                          );
                         })}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-700 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onClaimMessage(msg.id)}
                    disabled={claimingEvent === msg.id}
                    className="bg-blue-600 hover:bg-blue-500 text-xs shrink-0 disabled:opacity-50"
                  >
                    {claimingEvent === msg.id ? '⏳' : 'CLAIM'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div className="text-center text-slate-600 py-12 text-sm">No messages yet.</div>
      )}

      {/* Claimed history */}
      {claimedMessages.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">✅ Claimed History ({claimedMessages.length})</div>
          <div className="space-y-2">
            {claimedMessages.map(msg => (
              <div key={msg.id} className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-3 opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-400">{msg.title}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{msg.body}</div>
                    <div className="text-[10px] text-slate-700 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>
                  </div>
                  <span className="text-xs text-emerald-600 shrink-0 font-bold">✓ Claimed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bulk action bar */}
      {messages.length > 0 && (
        <div className="sticky bottom-0 bg-[#060a12] pt-3 pb-2 flex gap-2 border-t border-slate-800 mt-2">
          {unclaimedMessages.length > 0 && (
            <Button
              size="sm"
              onClick={handleClaimAll}
              disabled={claimingAll}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-bold disabled:opacity-50"
            >
              {claimingAll ? '⏳ Claiming...' : `🎁 CLAIM ALL (${unclaimedMessages.length})`}
            </Button>
          )}
          <Button
            size="sm"
            onClick={onMarkAllRead}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 text-xs font-bold"
          >
            ✓ MARK READ
          </Button>
          <Button
            size="sm"
            onClick={() => setDeleteConfirm1(true)}
            variant="outline"
            className="flex-1 border-red-900/50 text-red-500 hover:bg-red-950/30 text-xs font-bold"
          >
            🗑 DELETE ALL
          </Button>
        </div>
      )}

      {/* Delete confirmation 1 */}
      <Dialog open={deleteConfirm1} onOpenChange={setDeleteConfirm1}>
        <DialogContent className="bg-[#0a0f1a] border border-red-900/50 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete All Messages?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300 mb-4">This will permanently delete all {messages.length} messages including claimed history. Are you sure?</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm1(false)} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
            <Button onClick={() => { setDeleteConfirm1(false); setDeleteConfirm2(true); }} className="flex-1 bg-red-700 hover:bg-red-600">Yes, Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation 2 */}
      <Dialog open={deleteConfirm2} onOpenChange={setDeleteConfirm2}>
        <DialogContent className="bg-[#0a0f1a] border-2 border-red-600 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-red-400">⚠️ Final Confirmation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300 mb-4">This action <span className="text-red-400 font-bold">CANNOT be undone</span>. All message history will be erased permanently.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm2(false)} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
            <Button onClick={() => { setDeleteConfirm2(false); onDeleteAll(); }} className="flex-1 bg-red-600 hover:bg-red-500 font-bold">🗑 DELETE FOREVER</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}