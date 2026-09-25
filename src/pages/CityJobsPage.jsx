import React, { useState, useEffect } from "react";
import { getPlayerData, savePlayerData, addXP } from "../components/utils/playerStorage";
import { updateRegenStats } from "../components/utils/regenHelper";
import { generateCityJobs } from "../components/jobs/jobsCatalog";
import PlayerHeader from "@/components/dashboard/PlayerHeader";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Briefcase, Zap, DollarSign, TrendingUp, Flame, Trophy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ResourceReplenishModal from "@/components/shared/ResourceReplenishModal";

export default function CityJobsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const city = urlParams.get("city");
  const state = urlParams.get("state");

  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [jobs, setJobs] = useState([]);
  const [result, setResult] = useState(null);
  const [showReplenish, setShowReplenish] = useState(false);

  useEffect(() => {
    if (city) {
      setJobs(generateCityJobs(city));
    }
  }, [city]);

  const calculateSuccessChance = (baseSuccessPct) => {
    const heatPenalty = Math.floor(playerData.heat / 10) * 2;
    const successPct = baseSuccessPct - heatPenalty;
    return Math.max(10, Math.min(95, successPct));
  };



  const handleRunJob = (job) => {
    const current = updateRegenStats();
    setPlayerData(current);

    if (current.energy < job.energyCost) {
      setShowReplenish(true);
      return;
    }

    // Deduct energy
    const newEnergy = current.energy - job.energyCost;
    savePlayerData({ energy: newEnergy });

    // Roll success
    const successChance = calculateSuccessChance(job.baseSuccessPct);
    const roll = Math.random() * 100;
    const success = roll <= successChance;

    if (success) {
      // SUCCESS
      const cashReward = Math.floor(Math.random() * (job.cashMax - job.cashMin + 1)) + job.cashMin;
      const newCash = current.cash + cashReward;
      const newRespect = current.respect + job.respectGain;
      const newHeat = Math.min(100, current.heat + job.heatGain);
      const prevLevel = current.level;

      savePlayerData({ cash: newCash, respect: newRespect, heat: newHeat, energy: newEnergy });
      const afterXP = addXP(job.xpGain);
      const leveledUp = afterXP.level > prevLevel;

      setResult({
        success: true,
        cash: cashReward,
        xp: job.xpGain,
        respect: job.respectGain,
        heat: job.heatGain,
        leveledUp
      });
    } else {
      // BUSTED
      const cashLoss = Math.min(
        Math.round(job.cashMin * 0.35),
        Math.round(current.cash * 0.05)
      );
      const respectLoss = Math.max(1, Math.floor(job.respectGain * 0.5));
      const newCash = Math.max(0, current.cash - cashLoss);
      const newRespect = Math.max(0, current.respect - respectLoss);
      const newHeat = Math.min(100, current.heat + job.heatGain + 5);

      savePlayerData({
        cash: newCash,
        respect: newRespect,
        heat: newHeat,
        energy: newEnergy
      });

      setResult({
        success: false,
        cash: -cashLoss,
        respect: -respectLoss,
        heat: job.heatGain + 5
      });
    }

    setPlayerData(getPlayerData());
  };

  if (!city) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-20">
        <PlayerHeader playerData={playerData} onUpdate={setPlayerData} />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <Briefcase className="w-16 h-16 text-slate-500/40 mx-auto mb-4" />
            <p className="text-slate-600 text-sm">Select a city from MAP first.</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <PlayerHeader playerData={playerData} onUpdate={setPlayerData} />

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-400">JOBS</h1>
            <p className="text-xs text-slate-600">📍 {city}, {state}</p>
          </div>
        </div>

        {playerData.heat > 50 && (
          <div className="bg-red-950/20 border border-red-800/40 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="text-xs text-red-400">
              <strong>High Heat:</strong> Success rates reduced. Let heat cool down for better odds.
            </div>
          </div>
        )}

        <div className="space-y-2">
          {jobs.map((job) => {
            const successChance = calculateSuccessChance(job.baseSuccessPct);
            const canRun = playerData.energy >= job.energyCost;
            
            const tierColors = {
              "Street": "border-slate-800 bg-slate-900/30",
              "Hustle": "border-emerald-800/40 bg-emerald-950/20",
              "Scheme": "border-amber-800/40 bg-amber-950/20",
              "High Stakes": "border-red-800/40 bg-red-950/20"
            };

            const isHighStakesBlocked = job.tier === 'High Stakes' && playerData.heat > 95;

            return (
              <div key={job.id} className="relative">
                <div
                  className={`border rounded-lg p-3 ${tierColors[job.tier]} ${isHighStakesBlocked ? 'opacity-40 pointer-events-none select-none' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-200">{job.name}</h3>
                      <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                        {job.tier}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRunJob(job)}
                      disabled={!canRun}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Run Job
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      Energy: {job.energyCost}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <DollarSign className="w-3 h-3 text-green-500" />
                      ${job.cashMin}-${job.cashMax}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      XP: {job.xpGain}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Respect: {job.respectGain}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Flame className="w-3 h-3 text-red-500" />
                      Heat: +{job.heatGain}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      Success: {successChance}%
                    </div>
                  </div>
                </div>

                {isHighStakesBlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                    <div className="bg-red-950 border-2 border-red-500 rounded-xl px-4 py-3 text-center shadow-xl shadow-red-900/50 mx-3">
                      <div className="text-xs font-bold text-red-400 mb-1">🔥 TOO HOT TO OPERATE</div>
                      <div className="text-[10px] font-bold text-red-300 mb-2">Reduce your heat to take on High Stakes jobs</div>
                      <Link
                        to="/ShopPage?tab=consumables&sub=opCover"
                        className="inline-block bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        🛡️ Get Cover Boost
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <Dialog open={!!result} onOpenChange={() => setResult(null)}>
          <DialogContent className={`${result.success ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'} text-white`}>
            <DialogHeader>
              <DialogTitle className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                {result.success ? 'SUCCESS!' : 'BUSTED!'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cash:</span>
                <span className={result.cash > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {result.cash > 0 ? '+' : ''}{result.cash > 0 ? '$' + result.cash : '-$' + Math.abs(result.cash)}
                </span>
              </div>
              {result.xp && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">XP:</span>
                  <span className="text-blue-400">+{result.xp}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Respect:</span>
                <span className={result.respect > 0 ? 'text-amber-400' : 'text-red-400'}>
                  {result.respect > 0 ? '+' : ''}{result.respect}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Heat:</span>
                <span className="text-red-400">+{result.heat}</span>
              </div>
              {result.leveledUp && (
                <div className="pt-2 border-t border-emerald-800 text-center">
                  <span className="text-emerald-400 font-bold">🎉 LEVEL UP! 🎉</span>
                </div>
              )}
            </div>
            <Button onClick={() => setResult(null)} className="w-full bg-slate-800 hover:bg-slate-700">
              Close
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {showReplenish && (
        <ResourceReplenishModal
          open={showReplenish}
          onClose={() => setShowReplenish(false)}
          type="energy"
          onPlayerUpdate={(p) => setPlayerData(p)}
          message="Not enough energy to run this job."
        />
      )}

      <BottomNav />
    </div>
  );
}