import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trophy, Skull, Clock, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { shouldRollDefense, rollFakeDefense, getFakeLogs } from '@/lib/fakeTcDefenseGenerator';

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function TerritoryMatchHistoryModal({ open, onClose, city, state, buildingName, buildingId, slots, mySlotNumber }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.auth.me().then(u => {
      if (!u) { setLoading(false); return; }
      setMyUserId(u.id);

      // Roll fake defense if 8h timer allows
      if (city && state && mySlotNumber && Array.isArray(slots) && shouldRollDefense(city, state)) {
        rollFakeDefense({
          city, state,
          mySlotNumber,
          slots,
          myUserId: u.id,
          myUsername: u.full_name || u.email
        });
      }

      // Load fake logs from localStorage
      const fakeLogs = getFakeLogs(city, state);

      // Fetch real logs (limit 10)
      base44.entities.TerritoryBattleLog
        .filter({ building_id: buildingId || 'mayors_office', city, state, defender_user_id: u.id }, '-timestamp', 10)
        .then(realLogs => {
          const merged = [...fakeLogs, ...realLogs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
          setLogs(merged);
        })
        .catch(() => setLogs(fakeLogs.slice(0, 10)))
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [open, city, state]);

  const displayLogs = logs.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-purple-900/40 text-white max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-purple-300 text-sm flex items-center gap-2">
            📋 {buildingName} — Battle History
          </DialogTitle>
          <div className="text-[10px] text-slate-500">{city}, {state} • Last 10 times you were challenged</div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-8 italic">No defense activity yet. Check back later!</div>
          ) : (
            displayLogs.map((log, i) => {
              const defended = log.outcome === 'LOSS';
              return (
                <div key={log.id || i} className={`rounded-lg border px-3 py-2 text-xs ${
                  defended ? 'bg-emerald-950/30 border-emerald-700/50' : 'bg-red-950/30 border-red-800/50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {defended
                        ? <><Shield className="w-3 h-3 text-emerald-400" /><span className="font-bold text-emerald-400">DEFENDED</span></>
                        : <><Skull className="w-3 h-3 text-red-400" /><span className="font-bold text-red-400">SLOT LOST</span></>
                      }
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{timeAgo(log.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-300 font-semibold">{log.challenger_username}</span>
                    {log.challenger_slot ? ` (#${log.challenger_slot})` : ''} challenged you
                    {log.defender_slot ? ` at slot #${log.defender_slot}` : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}