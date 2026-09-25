import React, { useState, useEffect, useRef } from "react";
import { getPlayerData, savePlayerData, addXP } from "../utils/playerStorage";
import { getResearchBonuses, applyBonus, applyReduction } from "@/lib/researchHelper";
import { updateRegenStats } from "../utils/regenHelper";
import { applyServerReward } from "@/lib/playerServerSync";
import { setPendingLevelUp } from "@/lib/playerMemory";
import { generateCityJobs } from "../jobs/jobsCatalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import JobMapPins from "./JobMapPins";
import { getMapImage } from "../utils/mapData";
import { getRiskJobModifier } from "../utils/stateRiskData";
import { logWorldTourCityAction } from "../events/worldTourStorage";
import ResourceReplenishModal from "@/components/shared/ResourceReplenishModal";
import { getAccessoryIgcMultiplier } from "@/lib/igcBonusHelper";

export default function CityJobsContent({ playerData: propPlayerData, onUpdate }) {
  const [jobs, setJobs] = useState([]);
  const [result, setResult] = useState(null);
  const [showReplenish, setShowReplenish] = useState(false);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (propPlayerData.locationCity) {
      setJobs(generateCityJobs(propPlayerData.locationCity));
    }
  }, [propPlayerData.locationCity]);

  const calculateSuccessChance = (baseSuccessPct) => {
    // Low cover = reduced success (exposed). Full cover = full power.
    const cover = propPlayerData.opCover ?? 100;
    const coverBonus = Math.floor(cover / 10); // 0-10
    const successPct = baseSuccessPct - (10 - coverBonus); // penalty when cover is low
    return Math.max(10, Math.min(95, successPct));
  };

  const handleRunJob = (job) => {
    const current = updateRegenStats();

    if (current.energy < job.energyCost) {
      setShowReplenish(true);
      return;
    }

    const successChance = calculateSuccessChance(job.baseSuccessPct);
    const roll = Math.random() * 100;
    const success = roll <= successChance;

    if (success) {
      const rb = getResearchBonuses(current);
      const rawCash = Math.floor(Math.random() * (job.cashMax - job.cashMin + 1)) + job.cashMin;
      const baseCash = applyBonus(rawCash, rb.jobCash);
      const igcMult = getAccessoryIgcMultiplier(current);
      const igcBoostAmount = Math.round(baseCash * (igcMult - 1));
      const cashReward = baseCash + igcBoostAmount;
      const coverCost = applyReduction(job.heatGain, rb.heatReduction);

      // Apply all resource changes server-side atomically
      applyServerReward({
        cash_delta: cashReward,
        respect_delta: job.respectGain,
        xp_delta: job.xpGain,
        energy_delta: -job.energyCost,
        op_cover_delta: -coverCost,
        reason: 'job_success',
        stat_fields: {
          total_jobs_completed: (current.totalJobsCompleted || 0) + 1,
          jobs_completed_today: (current.jobsCompletedToday || 0) + 1,
        }
      }).then(data => {
        if (data) {
          const leveledUp = data.new_level > (current.level || 1);
          if (leveledUp) {
            const levels = [];
            for (let i = (current.level || 1) + 1; i <= data.new_level; i++) levels.push(i);
            setPendingLevelUp(levels);
          }
        }
        // Refresh parent AFTER server confirms the new balances
        onUpdate(getPlayerData());
      });

      // Log for World Tour event
      logWorldTourCityAction(propPlayerData.locationCity, 'jobs');

      setResult({
        success: true,
        cash: cashReward,
        igcBoost: igcBoostAmount,
        xp: job.xpGain,
        respect: job.respectGain,
        coverCost,
        leveledUp: false // will be set async above if level up occurs
      });
    } else {
      const rb = getResearchBonuses(current);
      const cashLoss = Math.min(
        Math.round(job.cashMin * 0.35),
        Math.round(current.cash * 0.05)
      );
      const respectLoss = Math.max(1, Math.floor(job.respectGain * 0.5));
      const failCoverCost = applyReduction(job.heatGain + 5, rb.heatReduction);

      // Apply failure penalties server-side atomically
      applyServerReward({
        cash_delta: -cashLoss,
        respect_delta: -respectLoss,
        energy_delta: -job.energyCost,
        op_cover_delta: -failCoverCost,
        reason: 'job_failure',
      }).then(() => {
        onUpdate(getPlayerData());
      });

      setResult({
        success: false,
        cash: -cashLoss,
        respect: -respectLoss,
        coverCost: failCoverCost
      });
    }
  };

  const mapImagePath = getMapImage(propPlayerData.locationCity, propPlayerData.locationState);

  useEffect(() => {
    if (mapContainerRef.current && mapImagePath) {
      const container = mapContainerRef.current;
      setTimeout(() => {
        const scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
        const scrollTop = (container.scrollHeight - container.clientHeight) / 2;
        container.scrollLeft = scrollLeft;
        container.scrollTop = scrollTop;
      }, 100);
    }
  }, [mapImagePath]);

  return (
    <>
      <div 
        ref={mapContainerRef}
        className="relative w-full overflow-auto border-2 border-emerald-900/30 rounded-xl mb-4"
        style={{ height: 'calc(100vh - 280px)' }}
      >
        {mapImagePath && (
          <div style={{ 
            position: 'relative',
            width: '1600px',
            height: '1100px',
            minWidth: '1600px',
            minHeight: '1100px'
          }}>
            <img
              src={mapImagePath}
              alt="City Map"
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <JobMapPins
              jobs={jobs}
              onRunJob={handleRunJob}
              playerEnergy={propPlayerData.energy}
              playerCover={propPlayerData.opCover ?? 100}
              calculateSuccessChance={calculateSuccessChance}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const successChance = calculateSuccessChance(job.baseSuccessPct);
          const cover = propPlayerData.opCover ?? 100;
          const isBlocked = cover < job.heatGain;

          const tierColors = {
            "Street": "border-slate-800 bg-slate-900/30",
            "Hustle": "border-emerald-800/40 bg-emerald-950/20",
            "Scheme": "border-amber-800/40 bg-amber-950/20",
            "High Stakes": "border-red-800/40 bg-red-950/20"
          };

          return (
            <div key={job.id} className="relative">
              <div className={`border rounded-lg p-3 ${tierColors[job.tier]} ${isBlocked ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-200">{job.name}</h3>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">{job.tier}</span>
                  </div>
                  <Button size="sm" onClick={() => handleRunJob(job)} className="bg-emerald-600 hover:bg-emerald-500">
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
                    🛡️ Cover: -{job.heatGain}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    Success: {successChance}%
                  </div>
                </div>
              </div>

              {isBlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-[2px]">
                  <div className="bg-slate-950 border-2 border-orange-600/80 rounded-xl px-4 py-3 text-center shadow-2xl mx-3 w-full max-w-[260px]">
                    <div className="text-sm font-bold text-orange-400 mb-0.5">🔥 TOO HOT TO OPERATE</div>
                    <div className="text-[10px] text-slate-400 mb-2">
                      Need <span className="text-orange-300 font-bold">{job.heatGain} Op Cover</span> — you have <span className="text-red-400 font-bold">{cover}</span>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                      <Link to="/OpCoverInventoryPage" className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        🛡️ Inventory
                      </Link>
                      <Link to="/ShopPage?tab=consumables&sub=opcover" className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        🛒 Shop
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showReplenish && (
        <ResourceReplenishModal
          open={showReplenish}
          onClose={() => setShowReplenish(false)}
          type="energy"
          onPlayerUpdate={(p) => onUpdate(p)}
          message="Not enough energy to run this job."
        />
      )}

      {result && (
        <Dialog open={!!result} onOpenChange={() => setResult(null)}>
          <DialogContent className={`${result.success ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'} text-white`}>
            <DialogHeader>
              <DialogTitle className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                {result.success ? 'SUCCESS!' : 'BUSTED!'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {result.success && result.igcBoost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">+IGC Boost:</span>
                  <span className="text-cyan-400">+${result.igcBoost}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{result.success ? 'Total Cash:' : 'Cash:'}</span>
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
                <span className="text-slate-400">🛡️ Op Cover:</span>
                <span className="text-orange-400">-{result.coverCost}</span>
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
    </>
  );
}