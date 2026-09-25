import React, { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, DollarSign, TrendingUp, Trophy } from "lucide-react";

const TIER_CONFIG = {
  'Street':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/5e70e6874_jobs-lv1.png', size: 44 },
  'Hustle':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d2988220f_jobs-lv2.png', size: 54 },
  'Scheme':      { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/4367fc9d1_jobs-lv3.png', size: 64 },
  'High Stakes': { img: 'https://media.base44.com/images/public/699169456a354d6cb7082777/d416644bb_jobs-lv4.png', size: 76 },
};

export default function JobMapPins({ jobs, onRunJob, playerEnergy, calculateSuccessChance, playerCover = 100 }) {
  const [selectedJob, setSelectedJob] = useState(null);

  const pins = useMemo(() => {
    const positions = [];
    const minDistance = 10; // Minimum distance between pins
    
    return jobs.map((job, index) => {
      let x, y, attempts = 0;
      
      // Try to find non-overlapping position
      do {
        x = 15 + Math.random() * 70;
        y = 15 + Math.random() * 70;
        attempts++;
      } while (
        attempts < 50 &&
        positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance)
      );
      
      positions.push({ x, y });
      
      return {
        job,
        x,
        y,
        id: job.id
      };
    });
  }, [jobs]);

  const handlePinClick = (pin) => {
    setSelectedJob(pin.job);
  };

  const handleRunJob = () => {
    if (selectedJob) {
      onRunJob(selectedJob);
      setSelectedJob(null);
    }
  };

  const [flashId, setFlashId] = useState(null);

  const handlePinClickWithFlash = (pin) => {
    setFlashId(pin.id);
    setTimeout(() => setFlashId(null), 600);
    handlePinClick(pin);
  };

  return (
    <>
      <style>{`
        @keyframes jobGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(52,211,153,0.8)); }
          50% { filter: drop-shadow(0 0 16px rgba(52,211,153,1)); }
        }
        @keyframes jobFlash {
          0% { filter: drop-shadow(0 0 6px rgba(52,211,153,1)); }
          50% { filter: drop-shadow(0 0 28px rgba(52,211,153,1)); }
          100% { filter: drop-shadow(0 0 6px rgba(52,211,153,0.8)); }
        }
      `}</style>
      {pins.map((pin) => {
        const tier = TIER_CONFIG[pin.job.tier] || TIER_CONFIG['Street'];
        return (
          <button
            key={pin.id}
            onClick={() => handlePinClickWithFlash(pin)}
            className="absolute hover:scale-110 transition-transform"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
          >
            <img
              src={tier.img}
              alt={pin.job.tier}
              style={{
                width: tier.size,
                height: tier.size,
                objectFit: 'contain',
                animation: flashId === pin.id ? 'jobFlash 0.6s ease-out' : 'jobGlow 2s ease-in-out infinite'
              }}
            />
          </button>
        );
      })}

      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="bg-[#0a0f1a] border-emerald-900/40 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">{selectedJob.name}</DialogTitle>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                {selectedJob.tier}
              </p>
            </DialogHeader>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  Energy: {selectedJob.energyCost}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <DollarSign className="w-3.5 h-3.5 text-green-500" />
                  ${selectedJob.cashMin}-${selectedJob.cashMax}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  XP: {selectedJob.xpGain}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  Respect: {selectedJob.respectGain}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  🛡️ Cover: -{selectedJob.heatGain}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  Success: {calculateSuccessChance(selectedJob.baseSuccessPct)}%
                </div>
              </div>

              {playerCover < selectedJob.heatGain ? (
                <div className="bg-slate-950 border-2 border-orange-600/80 rounded-xl px-4 py-3 text-center shadow-xl">
                  <div className="text-sm font-bold text-orange-400 mb-0.5">🔥 TOO HOT TO OPERATE</div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    Need <span className="text-orange-300 font-bold">{selectedJob.heatGain} Op Cover</span> — you have <span className="text-red-400 font-bold">{playerCover}</span>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    <Link to="/OpCoverInventoryPage" onClick={() => setSelectedJob(null)} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                      🛡️ Inventory
                    </Link>
                    <Link to="/ShopPage?tab=consumables&sub=opcover" onClick={() => setSelectedJob(null)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                      🛒 Shop
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleRunJob}
                  disabled={playerEnergy < selectedJob.energyCost}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                >
                  RUN JOB
                </Button>
              )}
              </div>
              </DialogContent>
              </Dialog>
              )}
              </>
              );
              }