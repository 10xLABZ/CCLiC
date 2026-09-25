/**
 * GlobalJobNotification — mounted in Layout so it renders on EVERY page.
 * Listens for job manager events and shows assist/sabotage toasts + result modal.
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function GlobalJobNotification() {
  const [assistMessages, setAssistMessages] = useState([]);
  const [sabotageMessages, setSabotageMessages] = useState([]);
  const [jobResult, setJobResult] = useState(null);

  useEffect(() => {
    const onAssist = (e) => {
      const { helperName, profileImg, received, total } = e.detail;
      const id = Date.now() + Math.random();
      setAssistMessages(prev => [...prev, { id, helperName, profileImg, received, total }].slice(-3));
      setTimeout(() => setAssistMessages(prev => prev.filter(m => m.id !== id)), 2500);
    };

    const onSabotage = (e) => {
      const { name, profileImg } = e.detail;
      const id = Date.now() + Math.random();
      setSabotageMessages(prev => [...prev, { id, name, profileImg }].slice(-2));
      setTimeout(() => setSabotageMessages(prev => prev.filter(m => m.id !== id)), 3000);
    };

    const onComplete = (e) => {
      setJobResult(e.detail.result);
    };

    window.addEventListener('job_assist_tick', onAssist);
    window.addEventListener('job_sabotage_tick', onSabotage);
    window.addEventListener('job_completed', onComplete);
    return () => {
      window.removeEventListener('job_assist_tick', onAssist);
      window.removeEventListener('job_sabotage_tick', onSabotage);
      window.removeEventListener('job_completed', onComplete);
    };
  }, []);

  return (
    <>
      {/* Floating assist/sabotage toasts — always on top, any page */}
      <div
        className="fixed top-[160px] left-1/2 -translate-x-1/2 z-[200] space-y-2 pointer-events-none"
        style={{ width: '260px' }}
      >
        {assistMessages.map(msg => (
          <div
            key={msg.id}
            className="bg-blue-950/95 border border-blue-600 rounded-lg overflow-hidden flex shadow-lg shadow-blue-900/60 animate-bounce"
          >
            <div className="relative shrink-0" style={{ width: '65px', minHeight: '52px' }}>
              <img src={msg.profileImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full overflow-hidden border border-blue-400 bg-blue-900">
                <img
                  src="https://media.base44.com/images/public/699169456a354d6cb7082777/9e375fe4f_b7f85242-d893-409c-ab55-f7bc704445f1-2.png"
                  alt="Assist"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 px-2 py-1.5 flex flex-col justify-center min-w-0">
              <div className="text-[10px] font-bold text-blue-300 leading-tight truncate">{msg.helperName}</div>
              <div className="text-[9px] text-blue-400 leading-tight">✅ assisted your job!</div>
              <div className="text-[8px] text-blue-500 leading-none mt-0.5">({msg.received}/{msg.total})</div>
            </div>
          </div>
        ))}

        {sabotageMessages.map(msg => (
          <div
            key={msg.id}
            className="bg-red-950/95 border border-red-600 rounded-lg overflow-hidden flex shadow-lg shadow-red-900/60"
          >
            <div className="relative shrink-0" style={{ width: '65px', minHeight: '52px' }}>
              <img src={msg.profileImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full overflow-hidden border border-red-400 bg-red-900">
                <img
                  src="https://media.base44.com/images/public/699169456a354d6cb7082777/61474c4b8_mapbuttons-assist-sab2.PNG"
                  alt="Sabotage"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 px-2 py-1.5 flex flex-col justify-center min-w-0">
              <div className="text-[10px] font-bold text-red-300 leading-tight truncate">{msg.name}</div>
              <div className="text-[9px] text-red-400 leading-tight">💀 sabotaged your job!</div>
              <div className="text-[8px] text-red-500 leading-none mt-0.5">Cut taken from reward</div>
            </div>
          </div>
        ))}
      </div>

      {/* Job Result Modal — fires on any page */}
      {jobResult && (
        <Dialog open={!!jobResult} onOpenChange={() => setJobResult(null)}>
          <DialogContent className="bg-emerald-950/40 border-emerald-800 text-white z-[300]">
            <DialogHeader>
              <DialogTitle className="text-emerald-400">
                ✅ JOB COMPLETE!
                {jobResult.jobName && (
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">{jobResult.jobName}</span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {jobResult.igcBoost > 0 && (
                <div className="flex justify-between"><span className="text-cyan-400">+IGC Boost:</span><span className="text-cyan-400">+💵{jobResult.igcBoost}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-400">Total Cash:</span><span className="text-emerald-400">+💵{jobResult.cash}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">XP:</span><span className="text-blue-400">+{jobResult.xp}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Respect:</span><span className="text-amber-400">+{jobResult.respect}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">🛡️ Op Cover:</span><span className="text-orange-400">-{jobResult.opCoverCost}</span></div>
              {jobResult.sabotageNotice && (
                <div className="mt-2 bg-red-950/40 border border-red-700/50 rounded-lg p-2">
                  <div className="text-[10px] text-red-400 font-semibold mb-1.5">
                    💀 Job Sabotaged {jobResult.sabotageNotice.count}x!
                  </div>
                  <div className="space-y-1 mb-2">
                    {jobResult.sabotageNotice.sabotagers.map((sab, idx) => (
                      <div key={idx} className="text-[9px] bg-red-950/30 border border-red-800/40 rounded px-2 py-1">
                        <div className="text-red-300 font-semibold">{sab.name}</div>
                        <div className="text-red-400">-${sab.cashLost} ({sab.lossPct}%)</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-red-500 font-bold pt-1 border-t border-red-800/50">
                    Total lost: -${jobResult.sabotageNotice.totalCashLost}
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => setJobResult(null)} className="w-full bg-slate-800 mt-2">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}