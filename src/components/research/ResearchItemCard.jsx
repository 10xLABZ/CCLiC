import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import {
  RESEARCH_ITEMS, MAX_RESEARCH_LEVEL, BONUS_PER_LEVEL,
  getResearchCost, getResearchItemBonus, getResearchTier,
  getLabLevelForResearchLevel,
} from '@/lib/researchHelper';

export default function ResearchItemCard({ itemId, currentLevel, labLevel, playerCash, onUpgrade, upgrading }) {
  const item = RESEARCH_ITEMS[itemId];
  if (!item) return null;

  const isMaxed = currentLevel >= MAX_RESEARCH_LEVEL;
  const cost = getResearchCost(currentLevel);
  const currentBonus = getResearchItemBonus(itemId, currentLevel);
  const nextBonus = getResearchItemBonus(itemId, currentLevel + 1);
  const currentTier = getResearchTier(currentLevel || 1);
  const labReq = getLabLevelForResearchLevel(currentLevel + 1);
  const labLocked = !isMaxed && labLevel < labReq;
  const canAfford = playerCash >= cost;

  const bonusArr = BONUS_PER_LEVEL[item.type] || BONUS_PER_LEVEL.economy;
  const nextDelta = bonusArr[currentLevel] || 0;
  const pct = (currentLevel / MAX_RESEARCH_LEVEL) * 100;

  const tierColor = currentTier.tier === 1 ? 'bg-blue-500'
    : currentTier.tier === 2 ? 'bg-purple-500'
    : 'bg-yellow-500';

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isMaxed ? 'border-emerald-600/50 bg-emerald-900/10'
      : labLocked ? 'border-slate-800/50 bg-slate-900/20 opacity-60'
      : 'border-slate-700 bg-slate-900/50'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{item.icon}</span>
          <span className="text-xs font-bold text-slate-200">{item.label}</span>
        </div>
        <div className="text-[9px] text-slate-500">
          Lv {currentLevel}/{MAX_RESEARCH_LEVEL}
        </div>
      </div>

      {/* Progress bar with tier dividers */}
      <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full transition-all ${tierColor}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-px bg-slate-600" style={{ left: '33.3%' }} />
        <div className="absolute top-0 h-full w-px bg-slate-600" style={{ left: '66.6%' }} />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-[9px]">
          <span className="text-slate-500">Current: </span>
          <span className="text-emerald-400 font-bold">+{currentBonus}%</span>
          {!isMaxed && (
            <>
              <span className="text-slate-600 ml-1">→</span>
              <span className="text-yellow-400 font-bold ml-1">+{nextBonus}%</span>
              <span className="text-slate-600 ml-0.5">(+{nextDelta}%)</span>
            </>
          )}
        </div>
        {isMaxed ? (
          <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> MAX
          </span>
        ) : labLocked ? (
          <span className="text-[8px] text-red-400 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Lab {labReq}+
          </span>
        ) : (
          <button
            onClick={() => onUpgrade(itemId)}
            disabled={!canAfford || upgrading}
            className={`text-[9px] font-bold px-2.5 py-1 rounded border transition-colors ${
              canAfford && !upgrading
                ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40'
                : 'border-slate-700 bg-slate-900/40 text-slate-600 cursor-not-allowed'
            }`}
          >
            {upgrading ? '...' : `$${cost.toLocaleString()}`}
          </button>
        )}
      </div>
    </div>
  );
}