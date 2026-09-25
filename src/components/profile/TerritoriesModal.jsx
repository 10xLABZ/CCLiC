import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plane, MapPin, Bell, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { refreshFromServer } from '@/lib/playerServerSync';
import PurchaseSuccessModal from '@/components/shared/PurchaseSuccessModal';

const TRAVEL_COST = 200;

const getSlotPayout = (slot) => {
  if (slot === 1) return 10;
  if (slot === 2) return 8;
  if (slot === 3) return 6;
  if (slot <= 9) return 5;
  if (slot <= 19) return 4;
  if (slot <= 29) return 3;
  if (slot <= 39) return 2;
  return 1;
};

// Daily rate = hourly * 24
const getSlotDailyPayout = (slot) => getSlotPayout(slot) * 24;

const getSlotBadge = (slot) => {
  if (slot === 1) return { label: 'MAYOR', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-600/50' };
  if (slot <= 3) return { label: `#${slot}`, color: 'text-orange-400 bg-orange-950/30 border-orange-600/40' };
  if (slot <= 10) return { label: `#${slot}`, color: 'text-purple-400 bg-purple-950/30 border-purple-600/40' };
  if (slot <= 19) return { label: `#${slot}`, color: 'text-blue-400 bg-blue-950/30 border-blue-600/40' };
  return { label: `#${slot}`, color: 'text-slate-400 bg-slate-900/40 border-slate-700/40' };
};

// ET date string for comparing claim dates
const getETDateString = (ms) => {
  const d = ms ? new Date(ms) : new Date();
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [, month, day, year] = etStr.match(/(\d+)\/(\d+)\/(\d+)/);
  return `${year}-${month}-${day}`;
};

export default function TerritoriesModal({ open, onClose, playerData }) {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [lastClaimAmount, setLastClaimAmount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [travelConfirm, setTravelConfirm] = useState(null);

  const fetchSlots = () => {
    if (!open) return;
    setLoading(true);
    base44.auth.me().then(u => {
      if (!u) { setLoading(false); return; }
      // Get ALL territory slots for this user (not just mayors_office)
      base44.entities.TerritorySlot.filter({ user_id: u.id })
        .then(slotsData => {
          const sorted = (slotsData || []).sort((a, b) => a.slot_number - b.slot_number);
          setSlots(sorted);

          // Check if already claimed today
          const todayStr = getETDateString();
          const claimed = sorted.some(slot => {
            if (!slot.last_payout_at) return false;
            return getETDateString(slot.last_payout_at) === todayStr;
          });
          setAlreadyClaimed(claimed);
        }).catch(() => {}).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [open]);

  const totalPerDay = slots.reduce((sum, s) => sum + getSlotDailyPayout(s.slot_number), 0);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await base44.functions.invoke('collectTerritoryIncome', {});
      const data = res.data || res;
      if (data.error) {
        if (data.alreadyClaimed) {
          setAlreadyClaimed(true);
          toast.info('Already claimed today!');
        } else {
          toast.error(data.error);
        }
      } else {
        setAlreadyClaimed(true);
        const claimedAmount = data.claimed || 0;
        setLastClaimAmount(claimedAmount);
        // Pull authoritative cash balance from server into in-memory cache
        await refreshFromServer();
        // Show congratulations popup with confetti
        setShowSuccess(true);
      }
    } catch (err) {
      toast.error('Failed to claim. Try again.');
    }
    setClaiming(false);
  };

  const handleTravel = (slot) => {
    setTravelConfirm(slot);
  };

  const confirmTravel = () => {
    const slot = travelConfirm;
    setTravelConfirm(null);
    setShowSuccess(false);
    onClose();
    navigate(createPageUrl('CityPage') + `?state=${encodeURIComponent(slot.state)}&city=${encodeURIComponent(slot.city)}`);
  };

  return (
    <>
    <Dialog open={open && !showSuccess} onOpenChange={(e) => { if (!e && !showSuccess) onClose(); }}>
      <DialogContent
        onInteractOutside={(e) => { if (showSuccess) e.preventDefault(); }}
        className="bg-[#080c18] border border-purple-900/40 text-white max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-b from-purple-950/60 to-transparent px-4 pt-4 pb-3 border-b border-purple-900/30">
          <DialogTitle className="text-purple-300 text-base font-bold flex items-center gap-2 mb-1">
            🏛️ Territory Control
          </DialogTitle>
          <div className="bg-emerald-950/50 border border-emerald-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between relative">
            <div>
              <div className="text-[10px] text-emerald-600 uppercase tracking-widest font-semibold">Total Earnings</div>
              <div className="text-2xl font-black text-emerald-400">${totalPerDay.toLocaleString()}<span className="text-sm font-normal text-emerald-600">/Day</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest">Territories</div>
              <div className="text-xl font-black text-slate-300">{slots.length}</div>
            </div>
            {/* CLAIM button in center */}
            {slots.length > 0 && (
              <button
                onClick={handleClaim}
                disabled={claiming || alreadyClaimed}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg px-5 py-2 font-black text-xs tracking-wider transition-all ${
                  alreadyClaimed
                    ? 'bg-slate-800 text-slate-500 cursor-default'
                    : claiming
                    ? 'bg-amber-700 text-amber-200 animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/30 hover:scale-105'
                }`}
              >
                {alreadyClaimed ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> DONE</span>
                ) : claiming ? (
                  'CLAIMING...'
                ) : (
                  'CLAIM'
                )}
              </button>
            )}
          </div>
          {alreadyClaimed && lastClaimAmount > 0 && (
            <div className="text-center text-[10px] text-emerald-500 mt-1">
              ✓ Claimed ${lastClaimAmount.toLocaleString()} today. Come back tomorrow!
            </div>
          )}
          {alreadyClaimed && lastClaimAmount === 0 && (
            <div className="text-center text-[10px] text-slate-500 mt-1">
              Already claimed today. Come back tomorrow!
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-12 italic">
              You don't hold any territories yet.<br />Challenge slots at the Mayor's Office to claim one!
            </div>
          ) : (
            slots.map((slot) => {
              const dailyPayout = getSlotDailyPayout(slot.slot_number);
              const badge = getSlotBadge(slot.slot_number);
              const isCurrent = playerData?.locationCity === slot.city && playerData?.locationState === slot.state;
              return (
                <div key={slot.id} className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 ${badge.color}`}>
                  <div className={`shrink-0 rounded-lg px-2 py-1 border text-center min-w-[40px] ${badge.color}`}>
                    <div className="text-xs font-black">{badge.label}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-200 truncate">{slot.city}</div>
                    <div className="text-[10px] text-slate-500 truncate">{slot.state}</div>
                  </div>

                  <div className="shrink-0 text-right mr-1">
                    <div className="text-sm font-black text-emerald-400">+${dailyPayout}</div>
                    <div className="text-[9px] text-emerald-700">/Day</div>
                  </div>

                  <button
                    onClick={() => handleTravel(slot)}
                    className={`shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-500'
                        : 'border-blue-700/50 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40'
                    }`}
                    title={isCurrent ? 'You are here' : `Fly for $${TRAVEL_COST}`}
                  >
                    <Plane className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-bold">{isCurrent ? 'HERE' : `$${TRAVEL_COST}`}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Travel confirmation popup — rendered inside DialogContent so the focus trap doesn't block it */}
        {travelConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75" onClick={() => setTravelConfirm(null)}>
            <div className="bg-[#0a0f1a] border border-blue-700/50 rounded-xl p-5 w-64 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <Plane className="w-7 h-7 text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white mb-0.5">Fly to {travelConfirm.city}?</div>
              <div className="text-[11px] text-slate-400 mb-1">{travelConfirm.state}</div>
              <div className="text-[11px] text-amber-400 font-bold mb-4">Cost: ${TRAVEL_COST}</div>
              <div className="flex gap-2">
                <button onClick={() => setTravelConfirm(null)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">Cancel</button>
                <button onClick={confirmTravel} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">Fly</button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

    </Dialog>

    {/* Congratulations popup with confetti — outside Dialog to avoid focus trap */}
    <PurchaseSuccessModal
      open={showSuccess}
      onClose={() => setShowSuccess(false)}
      title="Territory Income Collected!"
      items={[
        {
          name: `Cash +$${lastClaimAmount.toLocaleString()}`,
          icon: '💰',
          detail: `Daily earnings from ${slots.length} territor${slots.length === 1 ? 'y' : 'ies'}`,
        },
      ]}
    />
    </>
  );
}