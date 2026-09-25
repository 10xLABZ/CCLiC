import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import FundBuxIcon from "./FundBuxIcon";
import { FUND_TIERS, FUND_SHOP_ITEMS, MIN_CASH_DONATION, MIN_CRYD_DONATION, AVATAR_SHARD_ICON_URL, GEAR_PART_ICON_URL } from "./fundConfig";
import { getPlayerData } from "@/components/utils/playerStorage";
import { refreshFromServer, applyServerReward } from "@/lib/playerServerSync";
import PurchaseSuccessModal from "@/components/shared/PurchaseSuccessModal";

function formatCash(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function FundShopPanel({ allianceId, userId }) {
  const [fundMember, setFundMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [player, setPlayer] = useState(getPlayerData());
  const [purchasedItem, setPurchasedItem] = useState(null);

  const loadData = useCallback(async () => {
    if (!allianceId || !userId) return;
    setLoading(true);
    try {
      const records = await base44.entities.FundMember.filter({ alliance_id: allianceId, user_id: userId });
      setFundMember(records[0] || null);
    } catch (e) {
      toast.error("Failed to load FundBux balance");
    }
    setLoading(false);
  }, [allianceId, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleSync = () => setPlayer(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const handleBuy = async (item) => {
    if ((fundMember?.fundbux_balance || 0) < item.cost) {
      toast.error("Not enough FundBux!");
      return;
    }
    setBuying(item.id);
    try {
      const result = await base44.functions.invoke('buyFundShopItem', { item_id: item.id });
      const data = result?.data;
      if (!data?.success) throw new Error(data?.error || 'Purchase failed');

      setFundMember(prev => ({ ...prev, fundbux_balance: data.new_fundbux_balance }));

      // Sync resources from server
      if (data.new_energy != null || data.new_stamina != null || data.new_op_cover != null || data.new_shield_until != null) {
        await refreshFromServer();
      }
      // Show congratulations popup
      setPurchasedItem(item);
    } catch (e) {
      toast.error(e.message || "Purchase failed");
    }
    setBuying(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const gearPartUsed = fundMember?.last_gear_part_date === todayStr;
  const avatarShardUsed = fundMember?.last_avatar_part_date === todayStr;

  if (loading) {
    return <div className="text-center py-10 text-slate-500 text-sm">Loading Fund Shop...</div>;
  }

  return (
    <div className="space-y-4">
      {/* FundBux Balance Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-900/40 to-yellow-900/30 border border-amber-700/40 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <FundBuxIcon size={28} />
          <div>
            <div className="text-xs text-amber-400 font-semibold">Your FundBux</div>
            <div className="text-2xl font-bold text-white">{(fundMember?.fundbux_balance || 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-400">
          <div>Earn 10 FundBux per</div>
          <div>$1,000 or 50 CRYD donated</div>
        </div>
      </div>

      {/* Shop Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {FUND_SHOP_ITEMS.map(item => {
          const canAfford = (fundMember?.fundbux_balance || 0) >= item.cost;
          const dailyUsed = item.id === 'gear_part' ? gearPartUsed : item.id === 'avatar_shard' ? avatarShardUsed : false;
          const disabled = !canAfford || dailyUsed || buying === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 flex flex-col items-center gap-2 ${
                dailyUsed
                  ? 'bg-slate-900/40 border-slate-800 opacity-50'
                  : canAfford
                    ? 'bg-slate-900/60 border-amber-800/40'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              <div className="w-12 h-12 flex items-center justify-center">
                {item.iconUrl
                  ? <img src={item.iconUrl} alt={item.name} className="w-12 h-12 object-contain" />
                  : <span className="text-3xl">{item.emoji}</span>}
              </div>
              <div className="text-xs font-semibold text-white text-center">{item.name}</div>
              {item.dailyLimited && (
                <div className="text-[9px] text-slate-500">{dailyUsed ? 'Daily limit reached' : '1/day'}</div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <FundBuxIcon size={14} />
                <span className="text-sm font-bold text-amber-400">{item.cost}</span>
              </div>
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => handleBuy(item)}
                className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-500 text-black font-bold disabled:opacity-40"
              >
                {buying === item.id ? '...' : dailyUsed ? 'SOLD OUT' : 'BUY'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Congratulations popup with confetti */}
      <PurchaseSuccessModal
        open={!!purchasedItem}
        onClose={() => setPurchasedItem(null)}
        title="Congratulations!"
        items={purchasedItem ? [{
          name: purchasedItem.name,
          icon: purchasedItem.emoji || '🎁',
          iconUrl: purchasedItem.iconUrl,
          detail: 'Purchased from the Fund Shop',
        }] : []}
      />
    </div>
  );
}