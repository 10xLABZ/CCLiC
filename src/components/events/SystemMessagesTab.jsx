import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPlayerData, savePlayerData } from "@/components/utils/playerStorage";

export default function SystemMessagesTab({ onPlayerUpdate }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    if (!user) { setLoading(false); return; }
    const msgs = await base44.entities.SystemMessage.filter(
      { user_id: user.id },
      '-timestamp',
      50
    );
    setMessages(msgs);
    setLoading(false);
  };

  const handleRestore = async (msg) => {
    setRestoringId(msg.id);
    const res = await base44.functions.invoke('restorePurchase', { system_message_id: msg.id });
    if (res.data?.success) {
      const player = getPlayerData();
      const updates = {};

      if (res.data.restored === 'vip') {
        updates.vipActiveUntil = res.data.new_vip_active_until;
      } else if (res.data.inv_key) {
        // Re-grant item locally
        const inv = { ...(player.inventory || {}) };
        inv[res.data.inv_key] = { ...(inv[res.data.inv_key] || {}) };
        inv[res.data.inv_key][res.data.restored] = (inv[res.data.inv_key][res.data.restored] || 0) + (res.data.quantity || 1);
        updates.inventory = inv;
      }

      const updated = savePlayerData(updates);
      onPlayerUpdate?.(updated);
      toast.success(`✅ Restored!`);
      loadMessages();
    } else {
      toast.error(res.data?.error || 'Restore failed');
    }
    setRestoringId(null);
  };

  const typeColors = {
    purchase_consumable: 'border-blue-900/40',
    purchase_nonconsumable: 'border-emerald-900/40',
    vip_purchase: 'border-yellow-900/40',
    restore_success: 'border-purple-900/40',
    restore_failed: 'border-red-900/40',
    system_event: 'border-slate-700/40',
  };

  const typeIcons = {
    purchase_consumable: '🛒',
    purchase_nonconsumable: '📦',
    vip_purchase: '🌟',
    restore_success: '🔁',
    restore_failed: '❌',
    system_event: '⚙️',
  };

  if (loading) {
    return <div className="text-center text-slate-600 py-12 text-sm">Loading system messages...</div>;
  }

  if (messages.length === 0) {
    return <div className="text-center text-slate-600 py-12 text-sm">No system messages yet.</div>;
  }

  return (
    <div className="space-y-3">
      {messages.map(msg => {
        const canRestore = !msg.is_consumable && !msg.restored &&
          (msg.type === 'purchase_nonconsumable' || msg.type === 'vip_purchase');
        return (
          <div
            key={msg.id}
            className={`bg-[#0a0f1a] border rounded-xl p-4 ${typeColors[msg.type] || 'border-slate-800'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{typeIcons[msg.type] || '📋'}</span>
                  <span className="text-sm font-semibold text-slate-200">{msg.title}</span>
                  {msg.restored && (
                    <span className="text-[9px] bg-purple-900/40 border border-purple-700/40 text-purple-400 px-1.5 py-0.5 rounded-full ml-1">RESTORED</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{msg.body}</div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-slate-700">{new Date(msg.timestamp).toLocaleString()}</span>
                  {msg.amount_paid > 0 && (
                    <span className="text-[10px] text-slate-600">
                      {msg.amount_paid} {msg.currency?.toUpperCase()}
                    </span>
                  )}
                  {msg.is_consumable && (
                    <span className="text-[9px] text-amber-700 bg-amber-950/30 border border-amber-900/30 px-1.5 py-0.5 rounded-full">
                      consumable
                    </span>
                  )}
                </div>
              </div>
              {canRestore && (
                <Button
                  size="sm"
                  disabled={restoringId === msg.id}
                  onClick={() => handleRestore(msg)}
                  className="bg-purple-700 hover:bg-purple-600 text-xs shrink-0 h-7 px-2"
                >
                  {restoringId === msg.id ? '...' : '🔁 Restore'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}