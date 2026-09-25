import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import FundBuxIcon from "./FundBuxIcon";
import { FUND_TIERS, MIN_CASH_DONATION, MIN_CRYD_DONATION, FUNDBUX_PER_UNIT } from "./fundConfig";
import { getPlayerData } from "@/components/utils/playerStorage";
import { refreshFromServer } from "@/lib/playerServerSync";

function formatCash(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCryd(n) {
  return `${n.toLocaleString()} CRYD`;
}

export default function FundResearchPanel({ allianceId, allianceTag, userId }) {
  const [fundResearch, setFundResearch] = useState(null);
  const [fundMember, setFundMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateCurrency, setDonateCurrency] = useState('cash');
  const [donateAmount, setDonateAmount] = useState('');
  const [confirmCryd, setConfirmCryd] = useState(false);
  const [donating, setDonating] = useState(false);
  const [player, setPlayer] = useState(getPlayerData());

  const loadData = useCallback(async () => {
    if (!allianceId) return;
    setLoading(true);
    try {
      const [frRecords, fmRecords] = await Promise.all([
        base44.entities.FundResearch.filter({ alliance_id: allianceId }),
        userId ? base44.entities.FundMember.filter({ alliance_id: allianceId, user_id: userId }) : Promise.resolve([]),
      ]);
      setFundResearch(frRecords[0] || null);
      setFundMember(fmRecords[0] || null);
    } catch (e) {
      toast.error("Failed to load fund research");
    }
    setLoading(false);
  }, [allianceId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleSync = () => setPlayer(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const currentTier = fundResearch?.current_tier || 1;
  const phase = fundResearch?.phase || 'research';
  const tierData = FUND_TIERS[currentTier - 1];
  const isComplete = phase === 'complete';

  const researchProgress = fundResearch?.research_progress || 0;
  const breakthroughProgress = fundResearch?.breakthrough_progress || 0;
  const researchPct = tierData ? Math.min(100, (researchProgress / tierData.researchCost) * 100) : 0;
  const breakthroughPct = tierData ? Math.min(100, (breakthroughProgress / tierData.breakthroughCost) * 100) : 0;
  const totalBonus = fundResearch?.total_fvf_bonus_pct || 0;

  const handleDonate = async () => {
    const amt = parseInt(donateAmount);
    const min = donateCurrency === 'cash' ? MIN_CASH_DONATION : MIN_CRYD_DONATION;
    if (!amt || amt < min) {
      toast.error(`Minimum donation is ${min.toLocaleString()} ${donateCurrency === 'cash' ? 'cash' : 'CRYD'}`);
      return;
    }

    setDonating(true);
    try {
      const result = await base44.functions.invoke('donateToFund', { currency: donateCurrency, amount: amt });
      const data = result?.data;
      if (!data?.success) throw new Error(data?.error || 'Donation failed');

      setFundResearch(data.fund_research);
      setFundMember(prev => ({ ...prev, fundbux_balance: data.fundbux_balance }));

      // Sync player resources from server
      await refreshFromServer();

      const fundbuxEarned = data.fundbux_earned;
      toast.success(`Donation successful! +${fundbuxEarned} FundBux earned`);

      // Celebrate tier/breakthrough completion
      if (data.tier_completed || data.breakthrough_completed) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        const bonusType = data.tier_completed ? 'Research' : 'Breakthrough';
        toast.success(`🎉 ${bonusType} Tier ${currentTier} Complete! +${data.bonus_applied}% FvF Points!`, { duration: 5000 });
      }

      if (data.breakthrough_completed && data.fund_research?.phase === 'complete') {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        toast.success(`🏆 FUND RESEARCH COMPLETE! Maximum +100% FvF bonus achieved!`, { duration: 6000 });
      }

      setDonateOpen(false);
      setConfirmCryd(false);
      setDonateAmount('');
    } catch (e) {
      toast.error(e.message || "Donation failed");
    }
    setDonating(false);
  };

  const openDonate = (currency) => {
    setDonateCurrency(currency);
    setDonateAmount(currency === 'cash' ? String(MIN_CASH_DONATION) : String(MIN_CRYD_DONATION));
    setConfirmCryd(false);
    setDonateOpen(true);
  };

  const quickAmounts = donateCurrency === 'cash'
    ? [MIN_CASH_DONATION, MIN_CASH_DONATION * 5, MIN_CASH_DONATION * 25, MIN_CASH_DONATION * 100]
    : [MIN_CRYD_DONATION, MIN_CRYD_DONATION * 5, MIN_CRYD_DONATION * 25, MIN_CRYD_DONATION * 100];

  if (loading) {
    return <div className="text-center py-10 text-slate-500 text-sm">Loading Fund Research...</div>;
  }

  const playerCash = player.cash || 0;
  const playerCryd = player.crypto || 0;

  return (
    <div className="space-y-4">
      {/* Header — Total Bonus + FundBux Balance */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-900/40 to-yellow-900/30 border border-amber-700/40 rounded-xl px-4 py-3">
        <div>
          <div className="text-xs text-amber-400 font-semibold">Alliance FvF Bonus</div>
          <div className="text-2xl font-bold text-white">+{totalBonus}%</div>
        </div>
        <div className="flex items-center gap-2">
          <FundBuxIcon size={24} />
          <div>
            <div className="text-xs text-amber-400 font-semibold">Your FundBux</div>
            <div className="text-lg font-bold text-white">{(fundMember?.fundbux_balance || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Current Tier Progress */}
      {!isComplete ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-amber-400">Tier {currentTier} — {phase === 'research' ? 'Research' : 'Breakthrough'}</div>
              <div className="text-[10px] text-slate-500">
                {phase === 'research'
                  ? `Donate Cash to earn +${tierData.researchBonus}% FvF bonus`
                  : `Donate CRYD to earn +${tierData.breakthroughBonus}% FvF bonus`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">
                {phase === 'research' ? formatCash(researchProgress) : formatCryd(breakthroughProgress)}
              </div>
              <div className="text-[10px] text-slate-500">
                / {phase === 'research' ? formatCash(tierData.researchCost) : formatCryd(tierData.breakthroughCost)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                phase === 'research'
                  ? 'bg-gradient-to-r from-green-600 to-green-400'
                  : 'bg-gradient-to-r from-sky-600 to-sky-400'
              }`}
              style={{ width: `${phase === 'research' ? researchPct : breakthroughPct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {phase === 'research' ? `${researchPct.toFixed(1)}%` : `${breakthroughPct.toFixed(1)}%`}
            </div>
          </div>

          {/* Donate Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => openDonate('cash')}
              disabled={phase !== 'research'}
              className={`h-9 text-xs font-bold ${phase === 'research' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-800 text-slate-600'}`}
            >
              💵 Donate Cash
            </Button>
            <Button
              onClick={() => openDonate('cryd')}
              disabled={phase !== 'breakthrough'}
              className={`h-9 text-xs font-bold ${phase === 'breakthrough' ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-800 text-slate-600'}`}
            >
              💎 Donate CRYD
            </Button>
          </div>
          {phase === 'research' && (
            <div className="text-center text-[10px] text-slate-600">
              CRYD donations also earn FundBux. Breakthrough unlocks after Research completes.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/30 border border-amber-600/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-lg font-bold text-amber-400">Fund Research Complete!</div>
          <div className="text-sm text-slate-400 mt-1">Maximum +100% FvF Event Points bonus achieved!</div>
        </div>
      )}

      {/* Tier Progression List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
        <div className="text-xs font-bold text-amber-400 mb-2">Tier Progression</div>
        <div className="space-y-1.5">
          {FUND_TIERS.map(t => {
            const isPast = currentTier > t.tier;
            const isCurrent = currentTier === t.tier && !isComplete;
            const isFuture = currentTier < t.tier || isComplete;
            return (
              <div
                key={t.tier}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                  isPast ? 'bg-green-900/20 border border-green-800/30'
                  : isCurrent ? 'bg-amber-900/30 border border-amber-700/50'
                  : 'bg-slate-900/30 border border-slate-800/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isPast ? 'bg-green-600 text-white' : isCurrent ? 'bg-amber-600 text-black' : 'bg-slate-700 text-slate-500'
                }`}>
                  {isPast ? '✓' : t.tier}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-300">Tier {t.tier}</span>
                  <span className="text-slate-500 ml-1">+{t.researchBonus + t.breakthroughBonus}%</span>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  {formatCash(t.researchCost)} + {formatCryd(t.breakthroughCost)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Donation Modal */}
      <Dialog open={donateOpen} onOpenChange={(o) => { setDonateOpen(o); if (!o) setConfirmCryd(false); }}>
        <DialogContent className="bg-[#0a0f1a] border-amber-700/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400 text-sm">
              Donate {donateCurrency === 'cash' ? 'Cash' : 'CRYD'} to Fund Research
            </DialogTitle>
          </DialogHeader>

          {!confirmCryd ? (
            <div className="space-y-3">
              {/* Balance display */}
              <div className="text-xs text-slate-400 text-center">
                Your {donateCurrency === 'cash' ? 'Cash' : 'CRYD'} Balance:{' '}
                <span className="font-bold text-white">
                  {donateCurrency === 'cash' ? formatCash(playerCash) : formatCryd(playerCryd)}
                </span>
              </div>

              {/* Amount input */}
              <div>
                <Input
                  type="number"
                  step="1000"
                  value={donateAmount}
                  onChange={e => setDonateAmount(e.target.value)}
                  placeholder={donateCurrency === 'cash' ? `Min ${MIN_CASH_DONATION.toLocaleString()}` : `Min ${MIN_CRYD_DONATION}`}
                  className="bg-slate-900 border-slate-700 text-white text-center text-lg font-bold"
                />
                <div className="text-center text-[10px] text-slate-500 mt-1">
                  Earns {Math.floor((parseInt(donateAmount) || 0) / (donateCurrency === 'cash' ? 1000 : 50)) * FUNDBUX_PER_UNIT} FundBux
                </div>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(String(amt))}
                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold transition-colors"
                  >
                    {donateCurrency === 'cash' ? formatCash(amt) : `${amt}`}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (donateCurrency === 'cryd') {
                    setConfirmCryd(true);
                  } else {
                    handleDonate();
                  }
                }}
                disabled={donating || !donateAmount}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold h-10"
              >
                {donating ? 'Processing...' : 'DONATE'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-4xl">💎</div>
              <div className="text-sm font-bold text-white">Confirm CRYD Donation</div>
              <div className="text-2xl font-bold text-sky-400">{formatCryd(parseInt(donateAmount) || 0)}</div>
              <div className="text-xs text-slate-400">
                You will earn {Math.floor((parseInt(donateAmount) || 0) / 50) * FUNDBUX_PER_UNIT} FundBux
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmCryd(false)}
                  disabled={donating}
                  className="border-slate-700 text-slate-400 h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDonate}
                  disabled={donating}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold h-9"
                >
                  {donating ? '...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}