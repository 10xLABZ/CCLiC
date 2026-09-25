import React from 'react';
import { FlaskConical } from 'lucide-react';
import { MAX_LAB_LEVEL, getLabUpgradeCost, RESEARCH_TIERS } from '@/lib/researchHelper';

export default function LabUpgradeBar({ labLevel, playerCash, onUpgrade, upgrading }) {
  const isMaxed = labLevel >= MAX_LAB_LEVEL;
  const cost = getLabUpgradeCost(labLevel);
  const canAfford = playerCash >= cost;

  const nextTier = RESEARCH_TIERS.find(t => t.labLevelReq > labLevel);
  const nextTierLabel = nextTier ? `Tier ${nextTier.name} unlocks at Lab ${nextTier.labLevelReq}` : null;

  return (
    <div className="bg-violet-900/15 border border-violet-700/40 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-violet-300">Research Lab</span>
        </div>
        <div className="text-[9px] text-slate-400">Lv {labLevel} / {MAX_LAB_LEVEL}</div>
      </div>

      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-violet-500 transition-all" style={{ width: `${(labLevel / MAX_LAB_LEVEL) * 100}%` }} />
      </div>

      {!isMaxed ? (
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-slate-500">
            {nextTierLabel && <span className="text-violet-400">⚡ {nextTierLabel}</span>}
          </div>
          <button
            onClick={onUpgrade}
            disabled={!canAfford || upgrading}
            className={`text-[9px] font-bold px-3 py-1.5 rounded border transition-colors ${
              canAfford && !upgrading
                ? 'border-violet-600/60 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50'
                : 'border-slate-700 bg-slate-900/40 text-slate-600 cursor-not-allowed'
            }`}
          >
            {upgrading ? 'Upgrading...' : `⬆ Lv ${labLevel + 1} — $${cost.toLocaleString()}`}
          </button>
        </div>
      ) : (
        <div className="text-center text-[9px] text-violet-400 font-bold">★ Max Lab Level ★</div>
      )}
    </div>
  );
}