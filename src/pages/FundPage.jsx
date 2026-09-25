import React, { useState, useEffect } from "react";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import {
  getFundData,
  initializePlayerFund,
  calculateFundPower,
  calculateFundBonus,
  calculateTradingRevenueBonus,
  getMemberCostCash,
  getMemberCostCrypto,
  purchaseFundMember,
  getPlayerRank,
  saveFundData
} from "../components/utils/fundStorage";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import FundHQPicker from "@/components/fund/FundHQPicker";
import FundImagePicker, { getFundImage } from "@/components/fund/FundImagePicker";
import { Button } from "@/components/ui/button";
import { uploadToCloud } from "../components/utils/cloudSaveHelper";
import { ENABLE_CLOUD_SAVE } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Building2, TrendingUp, Users, MapPin, Coins, Edit2, Image, Octagon, Rocket, Sword, Shield } from "lucide-react";
import { computeCombatStats } from "../components/tradewars/botGenerator";
import { toast } from "sonner";

export default function FundPage() {
  const [playerData, setPlayerData] = useState(getPlayerData());
  const [fundData, setFundData] = useState(() => {
    const data = getFundData();
    if (!data.playerFund) {
      initializePlayerFund(playerData.username);
      return getFundData();
    }
    return data;
  });
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(20);
  const [editingFundName, setEditingFundName] = useState(false);
  const [fundNameInput, setFundNameInput] = useState("");
  const [hqPickerOpen, setHqPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  useEffect(() => {
    // Update fund power when component mounts
    if (fundData.playerFund) {
      const newPower = calculateFundPower(fundData.playerFund.fundMembers, playerData.respect);
      if (newPower !== fundData.playerFund.fundPower) {
        fundData.playerFund.fundPower = newPower;
        setFundData({ ...fundData });
      }
    }
  }, []);

  const calculateBulkCost = (currency, quantity) => {
    if (currency === 'crypto') {
      return getMemberCostCrypto() * quantity;
    }
    
    // For cash, calculate progressive cost
    let totalCost = 0;
    let currentMembers = fundData.playerFund.fundMembers;
    for (let i = 0; i < quantity; i++) {
      totalCost += getMemberCostCash(currentMembers + i);
    }
    return totalCost;
  };

  const handleBulkPurchase = (currency, quantity) => {
    if (quantity < 1 || quantity > 100) {
      toast.error("Quantity must be between 1 and 100");
      return;
    }

    const totalCost = calculateBulkCost(currency, quantity);

    if (currency === 'cash' && playerData.cash < totalCost) {
      toast.error("Not enough cash!");
      return;
    } else if (currency === 'crypto' && playerData.crypto < totalCost) {
      toast.error("Not enough crypto!");
      return;
    }

    // Add members in bulk
    fundData.playerFund.fundMembers += quantity;
    fundData.playerFund.fundPower = calculateFundPower(
      fundData.playerFund.fundMembers,
      playerData.respect
    );
    saveFundData(fundData);
    setFundData({ ...fundData });

    // Update player currency and fundMembersOwned
    const newFundMembers = fundData.playerFund.fundMembers;
    if (currency === 'cash') {
      savePlayerData({ cash: playerData.cash - totalCost, fundMembersOwned: newFundMembers });
      setPlayerData({ ...playerData, cash: playerData.cash - totalCost, fundMembersOwned: newFundMembers });
    } else {
      savePlayerData({ crypto: playerData.crypto - totalCost, fundMembersOwned: newFundMembers });
      setPlayerData({ ...playerData, crypto: playerData.crypto - totalCost, fundMembersOwned: newFundMembers });
      // Cloud save on CRYD fund member purchases
      if (ENABLE_CLOUD_SAVE) uploadToCloud();
    }

    toast.success(`${quantity} fund member${quantity > 1 ? 's' : ''} recruited!`);
  };

  const handleStartFundNameEdit = () => {
    setFundNameInput(playerFund.fundName || "");
    setEditingFundName(true);
  };

  const handleSaveFundName = () => {
    const trimmed = fundNameInput.trim();
    if (trimmed.length < 3 || trimmed.length > 24) {
      toast.error("Fund name must be 3-24 characters");
      return;
    }
    fundData.playerFund.fundName = trimmed;
    saveFundData(fundData);
    setFundData({ ...fundData });
    setEditingFundName(false);
    toast.success("Fund name updated!");
  };

  const handleHQSelect = (location) => {
    fundData.playerFund.hqState = location.state;
    fundData.playerFund.hqCity = location.city;
    saveFundData(fundData);
    setFundData({ ...fundData });
    setHqPickerOpen(false);
    toast.success(`Fund HQ moved to ${location.city}!`);
  };

  const handleImageSelect = (imageId) => {
    fundData.playerFund.imageId = imageId;
    saveFundData(fundData);
    setFundData({ ...fundData });
    setImagePickerOpen(false);
    toast.success("Fund logo updated!");
  };

  const playerFund = fundData.playerFund;
  const botFunds = fundData.botFunds || [];
  const rankInfo = getPlayerRank(playerFund.fundPower, botFunds);
  const fundBonus = calculateFundBonus(playerFund.fundMembers);
  const tradingBonus = calculateTradingRevenueBonus(playerFund.fundMembers);

  // Compute player's full combat stats including fund bonuses
  const playerCombatStats = computeCombatStats({
    level: playerData.level,
    fundMembers: playerFund.fundMembers,
    equipped: playerData.loadout || {}
  });

  const filteredFunds = filter === "all"
    ? botFunds
    : botFunds.filter(f => f.hqState === playerFund.hqState);

  const visibleFunds = filteredFunds.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[148px] max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Fund Logo & Name */}
        <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-4">
          <div className="flex gap-4">
            {/* Left: Fund Image */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl bg-slate-900 border-2 border-emerald-600 flex items-center justify-center text-4xl">
                {getFundImage(playerFund.imageId || "fund_01")}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImagePickerOpen(true)}
                className="text-[10px] h-6 px-2 border-slate-700 text-slate-300 hover:text-emerald-400 hover:bg-slate-800"
              >
                <Image className="w-3 h-3 mr-1" />
                Change
              </Button>
            </div>

            {/* Right: Fund Name */}
            <div className="flex-1">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Fund Name</div>
              {!editingFundName ? (
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {playerFund.fundName || `${playerData.username} Capital` || "My Fund"}
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleStartFundNameEdit} className="text-emerald-400 hover:text-emerald-300">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={fundNameInput}
                    onChange={(e) => setFundNameInput(e.target.value)}
                    placeholder="Enter fund name"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveFundName} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingFundName(false)} className="border-slate-700 text-slate-400">
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-600">3-24 characters</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fund Details */}
        <div className="bg-[#0a0f1a] border border-emerald-900/30 rounded-xl p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">CEO:</span>
              <span className="text-emerald-400 font-semibold">{playerData.username || "Unnamed"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                HQ:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-sm">
                  {playerFund.hqCity && playerFund.hqState ? `${playerFund.hqCity}, ${playerFund.hqState}` : "Not set"}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setHqPickerOpen(true)} className="text-emerald-400 hover:text-emerald-300 h-6 px-2">
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Fund Members:
              </span>
              <span className="text-slate-300 font-semibold">{playerFund.fundMembers}</span>
            </div>
            <div className="pt-2 border-t border-emerald-400/40">
              <div className="text-yellow-400 font-semibold text-xs flex items-center gap-1 mb-2">
                <Rocket className="w-3.5 h-3.5" />
                Fund Combat Contribution:
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Sword className="w-3 h-3 text-red-400" /> Fund ATK bonus:</span>
                  <span className="text-red-400 font-semibold">+{(playerCombatStats.atk - computeCombatStats({ level: playerData.level, fundMembers: 0, equipped: playerData.loadout || {} }).atk).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Shield className="w-3 h-3 text-blue-400" /> Fund DEF bonus:</span>
                  <span className="text-blue-400 font-semibold">+{(playerCombatStats.def - computeCombatStats({ level: playerData.level, fundMembers: 0, equipped: playerData.loadout || {} }).def).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-400">Insider Trade Revenue:</span>
                  <span className="text-emerald-400 font-semibold">+{(tradingBonus * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Members */}
        <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recruit Fund Members
          </h2>
          <div className="space-y-3">
            {/* Bulk Purchase Input */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <label className="text-xs text-slate-500 mb-1 block">Quantity</label>
              <Input
                type="number"
                min="1"
                max="100"
                defaultValue="1"
                id="bulkQuantity"
                className="bg-slate-800 border-slate-600 text-white text-center"
              />
            </div>
            
            <Button
              className="w-full bg-green-600 hover:bg-green-500 justify-between"
              onClick={() => {
                const qty = parseInt(document.getElementById('bulkQuantity').value) || 1;
                handleBulkPurchase('cash', qty);
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">💵</span>
                Buy Members (Cash)
              </span>
              <span className="font-bold">${calculateBulkCost('cash', parseInt(document.getElementById('bulkQuantity')?.value || 1)).toLocaleString()}</span>
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 justify-between"
              onClick={() => {
                const qty = parseInt(document.getElementById('bulkQuantity').value) || 1;
                handleBulkPurchase('crypto', qty);
              }}
            >
              <span className="flex items-center gap-2">
                <Octagon className="w-4 h-4" />
                Buy Members (CRYD)
              </span>
              <span className="font-bold">{(getMemberCostCrypto() * parseInt(document.getElementById('bulkQuantity')?.value || 1))} CRYD</span>
            </Button>
            <p className="text-[10px] text-slate-600 mt-2">
              Cash cost increases with more members. CRYD cost stays fixed at 5 per member.
            </p>
          </div>
        </div>

      </div>

      <FundHQPicker
        open={hqPickerOpen}
        onClose={() => setHqPickerOpen(false)}
        onSelect={handleHQSelect}
        currentHQ={{ city: playerFund.hqCity, state: playerFund.hqState }}
      />

      <FundImagePicker
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={handleImageSelect}
        currentImageId={playerFund.imageId || "fund_01"}
      />

      <BottomNav />
    </div>
  );
}