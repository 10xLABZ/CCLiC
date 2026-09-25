import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getPlayerData, savePlayerData } from '@/components/utils/playerStorage';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, FlaskConical, Lock, Info } from 'lucide-react';
import BottomNav from '@/components/dashboard/BottomNav';
import TopHUD from '@/components/dashboard/TopHUD';
import { toast } from 'sonner';
import {
  RESEARCH_ITEMS, RESEARCH_TABS, MAX_LAB_LEVEL, MAX_RESEARCH_LEVEL,
  getLabUpgradeCost, getResearchCost, getLabLevelForResearchLevel, getEliteBonus,
} from '@/lib/researchHelper';
import ResearchItemCard from '@/components/research/ResearchItemCard';
import LabUpgradeBar from '@/components/research/LabUpgradeBar';

export default function ResearchPage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [activeTab, setActiveTab] = useState('avatar');
  const [upgrading, setUpgrading] = useState(null);

  const labLevel = playerData.researchLabLevel || 0;
  const playerLevel = playerData.level || 1;
  const canAccessLab = playerLevel >= 5;
  const hqLevel = playerData.fundMembersOwned || 0;
  const eliteBonus = getEliteBonus(hqLevel);

  // Clear legacy timer-based research on mount
  useEffect(() => {
    if (playerData.activeResearch || playerData.activeLabUpgrade) {
      const updated = savePlayerData({ activeResearch: null, activeLabUpgrade: null });
      setPlayerData(updated);
    }
  }, []);

  const handleResearch = async (itemId) => {
    const currentLevel = (playerData.research || {})[itemId] || 0;
    if (currentLevel >= MAX_RESEARCH_LEVEL) { toast.error("Max level!"); return; }

    const cost = getResearchCost(currentLevel);
    const labReq = getLabLevelForResearchLevel(currentLevel + 1);
    if (labLevel < labReq) { toast.error(`Requires Lab Level ${labReq}!`); return; }
    if (playerData.cash < cost) { toast.error("Not enough cash!"); return; }

    setUpgrading(itemId);
    const newLevel = currentLevel + 1;
    const newResearch = { ...(playerData.research || {}) };
    newResearch[itemId] = newLevel;

    // Tier milestone: completing last level of a tier
    const tierUnlocked = newLevel === 5 ? 1 : newLevel === 10 ? 2 : newLevel === 15 ? 3 : null;

    try {
      const response = await base44.functions.invoke('applyGameReward', {
        cash_delta: -cost,
        reason: 'research',
        fvf_actions: [
          { type: 'research_spend', amount: cost },
          ...(tierUnlocked ? [{ type: 'research_tier_unlock', tier: tierUnlocked }] : []),
        ],
      });

      const updated = savePlayerData({
        cash: response.data?.new_cash ?? (playerData.cash - cost),
        research: newResearch,
      });
      setPlayerData(updated);
      toast.success(`${RESEARCH_ITEMS[itemId].label} → Level ${newLevel}!`);
    } catch (error) {
      toast.error("Research failed: " + (error.response?.data?.error || "Server error"));
    } finally {
      setUpgrading(null);
    }
  };

  const handleLabUpgrade = async () => {
    if (labLevel >= MAX_LAB_LEVEL) return;
    const cost = getLabUpgradeCost(labLevel);
    if (playerData.cash < cost) { toast.error("Not enough cash!"); return; }

    setUpgrading('lab');
    try {
      const response = await base44.functions.invoke('applyGameReward', {
        cash_delta: -cost,
        reason: 'lab_upgrade',
        fvf_actions: [
          { type: 'research_spend', amount: cost },
          { type: 'hq_upgrade', levels: 1 },
        ],
      });

      const updated = savePlayerData({
        cash: response.data?.new_cash ?? (playerData.cash - cost),
        researchLabLevel: labLevel + 1,
      });
      setPlayerData(updated);
      toast.success(`Lab upgraded to Level ${labLevel + 1}!`);
    } catch (error) {
      toast.error("Lab upgrade failed: " + (error.response?.data?.error || "Server error"));
    } finally {
      setUpgrading(null);
    }
  };

  const tabItems = Object.entries(RESEARCH_ITEMS)
    .filter(([_, item]) => item.tab === activeTab)
    .map(([id]) => id);

  if (!canAccessLab) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white pb-20">
        <TopHUD playerData={playerData} onUpdate={setPlayerData} />
        <div className="pt-[133px] max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to={createPageUrl("DevelopmentPage")} className="text-slate-500 hover:text-slate-300">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-violet-400" /> Research Lab
              </h1>
              <p className="text-[10px] text-slate-500">Unlocks at Player Level 5</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-red-600 rounded-xl p-6 text-center">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-400 mb-2">Research Lab Locked</h2>
            <p className="text-sm text-slate-400 mb-4">Reach <span className="text-white font-bold">Level 5</span> to unlock</p>
            <p className="text-xs text-slate-500">Current Level: {playerLevel} / 5</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[133px] max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("DevelopmentPage")} className="text-slate-500 hover:text-slate-300">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-violet-400" /> Research Lab
            </h1>
            <p className="text-[10px] text-slate-500">Instant upgrades • Cash only</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#0a0f1a] border border-violet-900/30 rounded-xl px-3 py-2">
            <div className="text-[9px] text-slate-500 mb-0.5">Lab Level</div>
            <div className="text-sm font-bold text-violet-400">Lv {labLevel} / {MAX_LAB_LEVEL}</div>
          </div>
          <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl px-3 py-2">
            <div className="text-[9px] text-slate-500 mb-0.5">Cash</div>
            <div className="text-sm font-bold text-emerald-400">${(playerData.cash || 0).toLocaleString()}</div>
          </div>
          <div className="bg-[#0a0f1a] border border-cyan-900/30 rounded-xl px-3 py-2">
            <div className="text-[9px] text-slate-500 mb-0.5">Elite Bonus</div>
            <div className="text-sm font-bold text-cyan-400">+{eliteBonus}%</div>
          </div>
        </div>

        {/* Lab Upgrade */}
        <LabUpgradeBar
          labLevel={labLevel}
          playerCash={playerData.cash || 0}
          onUpgrade={handleLabUpgrade}
          upgrading={upgrading === 'lab'}
        />

        {/* Tab Buttons */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {Object.entries(RESEARCH_TABS).map(([key, tab]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-xl border py-2 px-1 text-center transition-all ${
                activeTab === key
                  ? `${tab.borderColor} ${tab.bgColor} ${tab.color}`
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="text-lg">{tab.icon}</div>
              <div className="text-[9px] font-bold mt-0.5">{tab.label}</div>
            </button>
          ))}
        </div>

        {/* Research Items */}
        <div className="space-y-2">
          {tabItems.map(itemId => (
            <ResearchItemCard
              key={itemId}
              itemId={itemId}
              currentLevel={(playerData.research || {})[itemId] || 0}
              labLevel={labLevel}
              playerCash={playerData.cash || 0}
              onUpgrade={handleResearch}
              upgrading={upgrading === itemId}
            />
          ))}
        </div>

        {/* Elite Bonus — HQ tab only */}
        {activeTab === 'hq' && (
          <div className="mt-3 bg-cyan-900/15 border border-cyan-700/40 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <span className="text-xs font-bold text-cyan-300">Elite Bonus</span>
              </div>
              <span className="text-[9px] text-slate-500">Passive</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
              HQ Level <span className="text-cyan-400 font-bold">{hqLevel}</span> →
              <span className="text-emerald-400 font-bold"> +{eliteBonus}% ATK & DEF</span>
              <span className="text-slate-600"> (+1% per 5 HQ levels, max +20%)</span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-[9px] text-slate-500 space-y-0.5">
              <p>• Research is instant — pay cash, gain levels immediately</p>
              <p>• Each item has 3 tiers (I, II, III) with 5 levels each</p>
              <p>• Higher lab levels unlock higher research tiers</p>
              <p>• Elite Bonus is passive, based on your HQ Level</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}