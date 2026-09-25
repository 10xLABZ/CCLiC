import React, { useState, useEffect } from "react";
import { getPlayerData } from "../components/utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import {
  getFundData,
  initializePlayerFund,
  calculateFundPower,
  calculateTradingRevenueBonus,
  getMemberCostCash,
  getMemberCostCrypto,
  saveFundData
} from "../components/utils/fundStorage";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { Button } from "@/components/ui/button";
import { uploadToCloud } from "../components/utils/cloudSaveHelper";
import { ENABLE_CLOUD_SAVE } from "@/lib/constants";
import { Sword, Shield, TrendingUp, HelpCircle, ArrowLeft, ChevronLeft } from "lucide-react";
import GlobalChatBar from "@/components/chat/GlobalChatBar";
import { computeCombatStats } from "../components/tradewars/botGenerator";
import { toast } from "sonner";
import CrydIcon from "@/components/shared/CrydIcon";
import HQUpgradeModal from "@/components/hq/HQUpgradeModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const goldShineStyle = `
@keyframes goldShine {
  0%   { box-shadow: 0 0 0px rgba(234,179,8,0); }
  20%  { box-shadow: 0 0 24px 8px rgba(234,179,8,0.9), 0 0 60px 20px rgba(234,179,8,0.4); }
  60%  { box-shadow: 0 0 16px 4px rgba(234,179,8,0.6); }
  100% { box-shadow: 0 0 0px rgba(234,179,8,0); }
}
.gold-shine { animation: goldShine 1.2s ease-out forwards; }
`;

const TIERS = [
  { max: 5,        label: "Lv 1–5",    cost: "$25,000 each" },
  { max: 10,       label: "Lv 6–10",   cost: "$50,000 each" },
  { max: 20,       label: "Lv 11–20",  cost: "$100,000 each" },
  { max: 50,       label: "Lv 21–50",  cost: "$250,000 each" },
  { max: 100,      label: "Lv 51–100", cost: "$500,000 each" },
  { max: Infinity, label: "Lv 101+",   cost: "$1,000,000 each" },
];

// Returns the HQ image URL based on fund level
function getHQImage(level) {
  if (level <= 3)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/6b0f42460_hq1.jpg";
  if (level <= 5)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/eb20bf3bd_hq2.jpg";
  if (level <= 7)   return "https://media.base44.com/images/public/699169456a354d6cb7082777/5553396d7_hq3.jpg";
  if (level <= 10)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/1b9964cbe_hq4.jpg";
  if (level <= 29)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/6741dac16_hq5.jpg";
  if (level <= 99)  return "https://media.base44.com/images/public/699169456a354d6cb7082777/34f8bafcf_hq6.jpg";
  if (level <= 199) return "https://media.base44.com/images/public/699169456a354d6cb7082777/8d0f52206_hq7.jpg";
  if (level <= 499) return "https://media.base44.com/images/public/699169456a354d6cb7082777/a58e41876_hq8.jpg";
  if (level <= 999) return "https://media.base44.com/images/public/699169456a354d6cb7082777/12d604bac_hq9.jpg";
  return "https://media.base44.com/images/public/699169456a354d6cb7082777/6d5d77682_hq10.jpg";
}

export default function HQPage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [fundData, setFundData] = useState(() => {
    const data = getFundData();
    if (!data.playerFund) {
      initializePlayerFund(playerData.username);
      return getFundData();
    }
    return data;
  });
  const [shining, setShining] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [upgradeModalLevel, setUpgradeModalLevel] = useState(null);

  useEffect(() => {
    const handleSync = () => {
      setPlayerData(getPlayerData());
      setFundData(getFundData());
    };
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const cashCost = getMemberCostCash(fundData.playerFund?.fundMembers || 0);

  const handleUpgrade = async (currency) => {
    const totalCost = currency === 'crypto' ? getMemberCostCrypto() : cashCost;
    if (currency === 'cash' && playerData.cash < totalCost) { toast.error("Not enough cash!"); return; }
    if (currency === 'crypto' && playerData.crypto < totalCost) { toast.error("Not enough CRYD!"); return; }

    const delta = currency === 'cash'
      ? { cash_delta: -totalCost }
      : { crypto_delta: -totalCost };

    // Server-authoritative: deduct currency + increment fund_members_owned atomically
    // NO local increment — the server response is the single source of truth
    const result = await applyServerReward({
      ...delta,
      stat_fields: { fund_members_owned: 1 },
      reason: 'hq_upgrade',
      fvf_actions: [{ type: 'hq_upgrade', levels: 1 }],
    });

    if (!result) {
      toast.error("Upgrade failed. Please try again.");
      return;
    }

    // Sync fund data FROM the authoritative server value (not a local increment)
    const updatedPlayer = getPlayerData();
    const newFundMembers = updatedPlayer.fundMembersOwned || 0;
    fundData.playerFund.fundMembers = newFundMembers;
    fundData.playerFund.fundPower = calculateFundPower(newFundMembers, updatedPlayer.respect);
    saveFundData(fundData);
    setFundData({ ...fundData });
    setPlayerData(getPlayerData());
    setShining(false);
    setTimeout(() => setShining(true), 10);
    setTimeout(() => setShining(false), 1300);
    setUpgradeModalLevel(newFundMembers);
  };

  const playerFund = fundData.playerFund;
  const hqLevel = playerFund?.fundMembers || playerData.fundMembersOwned || 0;
  const tradingBonus = calculateTradingRevenueBonus(hqLevel);
  const nextLevel = hqLevel + 1;
  const nextTradingBonus = calculateTradingRevenueBonus(nextLevel);
  const tradingDelta = ((nextTradingBonus - tradingBonus) * 100).toFixed(2);

  const baseStats = computeCombatStats({ level: playerData.level, fundMembers: 0, equipped: playerData.loadout || {} });
  const hqStats   = computeCombatStats({ level: playerData.level, fundMembers: hqLevel, equipped: playerData.loadout || {} });
  const nextStats = computeCombatStats({ level: playerData.level, fundMembers: nextLevel, equipped: playerData.loadout || {} });

  const atkBonus     = (hqStats.atk - baseStats.atk).toFixed(2);
  const defBonus     = (hqStats.def - baseStats.def).toFixed(2);
  const atkPct       = ((hqStats.atk - baseStats.atk) / Math.max(baseStats.atk, 1) * 100).toFixed(2);
  const defPct       = ((hqStats.def - baseStats.def) / Math.max(baseStats.def, 1) * 100).toFixed(2);
  const nextAtkDelta = (nextStats.atk - hqStats.atk).toFixed(2);
  const nextDefDelta = (nextStats.def - hqStats.def).toFixed(2);

  const currentTier = TIERS.find(t => hqLevel < t.max) || TIERS[TIERS.length - 1];
  const hqImage = getHQImage(hqLevel);

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <style>{goldShineStyle}</style>
      <TopHUD />

      <div className="pt-[115px] max-w-2xl mx-auto px-4 space-y-3">

        {/* ── HEADQUARTERS Card ── */}
        <div className="bg-[#0a0f1a] border border-yellow-900/40 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-yellow-900/20">
            <span className="text-yellow-400 font-black text-sm tracking-widest uppercase">HEADQUARTERS</span>
            <button
              onClick={() => setInfoOpen(v => !v)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          {infoOpen && (
            <div className="mx-4 my-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-400">
              Every HQ level increases your ATK &amp; DEF combat power, and boosts your Insider Trade revenue. Upgrade with Cash or CRYD.
            </div>
          )}

          {/* 70/30 split body */}
          <div className="flex">
            {/* LEFT 70% — HQ image */}
            <div className="relative overflow-hidden" style={{ width: '70%' }}>
              <img
                src={hqImage}
                alt={`HQ Level ${hqLevel}`}
                className={`w-full object-cover ${shining ? 'gold-shine' : ''}`}
                style={{ minHeight: '180px', maxHeight: '220px' }}
              />
            </div>

            {/* RIGHT 30% — Level + stats */}
            <div className="flex flex-col items-center justify-start px-2 pt-3 pb-3 bg-[#080d17] border-l border-yellow-900/20" style={{ width: '30%' }}>
              <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest mb-1">HQ LEVEL</div>
              <div
                className="font-black text-yellow-400 leading-none mb-3"
                style={{
                  fontSize: hqLevel >= 1000 ? '18px' : hqLevel >= 100 ? '28px' : '38px',
                  textShadow: '0 0 16px rgba(234,179,8,0.6)'
                }}
              >
                {hqLevel}
              </div>
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500 flex items-center gap-0.5"><Sword className="w-2.5 h-2.5 text-red-400" /> ATK</span>
                  <span className="text-red-400 font-bold" style={{ fontSize: atkBonus.length > 6 ? '7px' : '9px' }}>+{atkBonus}</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5 text-blue-400" /> DEF</span>
                  <span className="text-blue-400 font-bold" style={{ fontSize: defBonus.length > 6 ? '7px' : '9px' }}>+{defBonus}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] border-t border-slate-800/60 pt-1">
                  <span className="text-slate-500 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> Trade $</span>
                  <span className="text-emerald-400 font-bold" style={{ fontSize: (tradingBonus * 100).toFixed(2).length > 6 ? '7px' : '9px' }}>+{(tradingBonus * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info Banner Image ── */}
        <div className="rounded-xl overflow-hidden -mx-0">
          <img
            src="https://media.base44.com/images/public/699169456a354d6cb7082777/e6e185eb6_hqinfoimage1a.jpg"
            alt="HQ Info"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* ── UPGRADE HQ Card ── */}
        <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest">UPGRADE HQ</h2>

          {/* 60/40 split: buttons left, next level boosts right */}
          <div className="flex gap-3">
            {/* LEFT 60% — buttons */}
            <div className="space-y-2" style={{ width: '60%' }}>
              <Button
                className="w-full bg-green-700 hover:bg-green-600 h-[34px] px-2"
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                onClick={() => handleUpgrade('cash')}
              >
                <span className="flex items-center gap-1 text-left leading-tight">
                  <span className="text-sm">💵</span>
                  <span className="flex flex-col items-start">
                    <span className="text-[9px] font-black leading-tight">UPGRADE HQ</span>
                    <span className="text-[9px] font-black leading-tight">+1 LEVEL</span>
                  </span>
                </span>
                <span className="text-green-200 font-black pr-1" style={{ fontSize: cashCost >= 1000000 ? '8px' : cashCost >= 100000 ? '9px' : '10px' }}>
                  ${cashCost.toLocaleString()}
                </span>
              </Button>
              <Button
                className="w-full h-[34px] px-2"
                style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', border: '1px solid #7c3aed', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                onClick={() => handleUpgrade('crypto')}
              >
                <span className="flex items-center gap-1 text-left leading-tight">
                  <CrydIcon size={13} />
                  <span className="flex flex-col items-start">
                    <span className="text-[9px] font-black leading-tight">UPGRADE HQ</span>
                    <span className="text-[9px] font-black leading-tight">+1 LEVEL</span>
                  </span>
                </span>
                <span className="flex items-center gap-0.5 font-black text-purple-200 text-[9px] pr-1">
                  5 <CrydIcon size={11} /> CRYD
                </span>
              </Button>
            </div>

            {/* RIGHT 40% — next level boosts */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-2.5 flex flex-col justify-center" style={{ width: '40%' }}>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 leading-tight">
                NEXT LEVEL BOOSTS
              </div>
              <div className="text-[9px] text-yellow-400 font-bold mb-2">Lv {hqLevel} → {nextLevel}</div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500 flex items-center gap-0.5"><Sword className="w-2.5 h-2.5 text-red-400" /> ATK</span>
                  <span className="text-red-400 font-bold">+{nextAtkDelta}</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5 text-blue-400" /> DEF</span>
                  <span className="text-blue-400 font-bold">+{nextDefDelta}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] border-t border-slate-800/60 pt-1">
                  <span className="text-slate-500 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> Trade $</span>
                  <span className="text-emerald-400 font-bold">+{tradingDelta}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="mt-4 border-t border-slate-800 pt-3">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">CASH UPGRADE TIERS</div>
            <div className="space-y-1">
              {TIERS.map((tier, i) => {
                const isActive = hqLevel < tier.max && (i === 0 || hqLevel >= TIERS[i - 1].max);
                return (
                  <div key={i} className={`flex justify-between text-[10px] px-2 py-0.5 rounded ${isActive ? 'bg-yellow-900/20 text-yellow-400' : 'text-slate-700'}`}>
                    <span>{tier.label}</span>
                    <span>{tier.cost}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-[10px] px-2 py-0.5">
                <span className="text-cyan-400 font-bold">ANY LEVEL</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <CrydIcon size={12} /> 5 CRYD (FIXED)
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <HQUpgradeModal
        open={upgradeModalLevel !== null}
        level={upgradeModalLevel}
        cashCost={getMemberCostCash(fundData.playerFund?.fundMembers || 0)}
        cryptoCost={getMemberCostCrypto()}
        onUpgradeCash={() => handleUpgrade('cash')}
        onUpgradeCryd={() => handleUpgrade('crypto')}
        onClose={() => setUpgradeModalLevel(null)}
      />

      <GlobalChatBar />
      <BottomNav />
    </div>
  );
}