import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/dashboard/BottomNav";
import TopHUD from "@/components/dashboard/TopHUD";
import { getPlayerData, savePlayerData } from "../components/utils/playerStorage";
import { applyServerReward, refreshFromServer } from "@/lib/playerServerSync";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";
import { toast } from "sonner";
import ConsumableActionModal from "@/components/shared/ConsumableActionModal";

const STAMINA_CONSUMABLES = [
  { id: "STAMINA_25",  name: "Stamina Boost (+25)",  amount: 25,  icon: "💪" },
  { id: "STAMINA_50",  name: "Stamina Boost (+50)",  amount: 50,  icon: "💪" },
  { id: "STAMINA_75",  name: "Stamina Boost (+75)",  amount: 75,  icon: "💪" },
  { id: "STAMINA_100", name: "Stamina Refill (+100)", amount: 100, icon: "💪" }
];

const SHOP_ITEMS = [
  { id: "STAMINA_25",  name: "Stamina Boost +25",  amount: 25,  igcPrice: 3500,  crydPrice: 5,  icon: "💪" },
  { id: "STAMINA_50",  name: "Stamina Boost +50",  amount: 50,  igcPrice: 6500,  crydPrice: 10, icon: "💪" },
  { id: "STAMINA_75",  name: "Stamina Boost +75",  amount: 75,  igcPrice: 9500,  crydPrice: 15, icon: "💪" },
  { id: "STAMINA_100", name: "Stamina Refill +100", amount: 100, igcPrice: 14000, crydPrice: 25, icon: "💪" }
];

export default function StaminaInventoryPage() {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [resultModal, setResultModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  useEffect(() => {
    refreshFromServer().then(() => setPlayerData(getPlayerData()));
  }, []);

  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const handleUse = async (item) => {
    const current = getPlayerData();
    const currentInventory = current.consumables || {};
    const ownedQty = currentInventory[item.id] || 0;
    if (ownedQty < 1) { toast.error("You don't own this item!"); return; }
    // Apply stamina delta SERVER-SIDE FIRST — only deduct inventory on success
    const result = await applyServerReward({ stamina_delta: item.amount, reason: `use_${item.id}` });
    if (result) {
      const merged = { ...currentInventory, [item.id]: ownedQty - 1 };
      if (merged[item.id] <= 0) delete merged[item.id];
      savePlayerData({ consumables: merged });
      setPlayerData(prev => ({ ...prev, stamina: result.new_stamina, lastStaminaTimestamp: result.last_stamina_timestamp, consumables: merged }));
      window.dispatchEvent(new Event('player_synced'));
      setResultModal({ item, newValue: result.new_stamina, remaining: Math.max(0, ownedQty - 1) });
    } else {
      toast.error("Server error. Please try again.");
    }
  };

  const handleBuyClick = (item, currency) => {
    const current = getPlayerData();
    const price = currency === 'igc' ? item.igcPrice : item.crydPrice;
    if (currency === 'igc' && current.cash < item.igcPrice) { toast.error("Not enough cash!"); return; }
    if (currency === 'cryd' && current.crypto < item.crydPrice) { toast.error("Not enough CRYD!"); return; }
    setConfirmModal({ item, currency, price });
  };

  const handleConfirmBuy = (action) => {
    if (action !== "confirm" || !confirmModal) { setConfirmModal(null); return; }
    const { item, currency, price } = confirmModal;
    setConfirmModal(null);
    const current = getPlayerData();
    const fullConsumables = { ...(current.consumables || {}) };
    fullConsumables[item.id] = (fullConsumables[item.id] || 0) + 1;
    if (currency === 'igc') {
      savePlayerData({ cash: current.cash - item.igcPrice, consumables: fullConsumables });
    } else {
      savePlayerData({ crypto: current.crypto - item.crydPrice, consumables: fullConsumables });
    }
    setPlayerData(getPlayerData());
    window.dispatchEvent(new Event('player_synced'));
    setSuccessModal({ item, currency, price });
  };

  const consumables   = playerData.consumables || {};
  const ownedItems    = STAMINA_CONSUMABLES.filter(item => (consumables[item.id] || 0) > 0);
  const hasInventory  = ownedItems.length > 0;

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[148px] px-3 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="border-slate-700 text-slate-400 hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-blue-400 flex items-center gap-2">⚡ Stamina</h1>
          <div className="w-16" />
        </div>

        {/* Regen Notice */}
        <div className="text-[9px] text-white text-center mb-4">Regens +1 every 3 min • Deducted by battles &amp; assists</div>

        {/* Split View: Inventory | Shop */}
        <div className="grid grid-cols-2 gap-3">

          {/* LEFT — Inventory */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Your Inventory</div>
            {hasInventory ? (
              <div className="space-y-2">
                {STAMINA_CONSUMABLES.map((item) => {
                  const qty = consumables[item.id] || 0;
                  if (qty === 0) return null;
                  return (
                    <div key={item.id} className="bg-[#0a0f1a] border border-blue-900/40 rounded-lg p-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-slate-200 leading-tight">{item.name}</div>
                          <div className="text-[10px] text-emerald-400">x{qty} owned</div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleUse(item)} className="w-full text-xs bg-blue-600 hover:bg-blue-500 h-7">
                        Use
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-red-600 bg-red-950/30 p-4 text-center flex flex-col items-center gap-2"
                style={{ animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 0 12px rgba(220,38,38,0.5)' }}
              >
                <Activity className="w-7 h-7 text-red-400" />
                <p className="text-[11px] font-bold text-red-400 leading-tight">No Stamina Boosts!</p>
                <p className="text-[10px] text-red-300/70 leading-tight">Use the shop to buy stamina items.</p>
              </div>
            )}
          </div>

          {/* RIGHT — Shop */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Buy Stamina</div>
            <div className="space-y-2">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className="bg-[#0a0f1a] border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base">{item.icon}</span>
                    <div className="text-[11px] font-semibold text-slate-200 leading-tight">{item.name}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleBuyClick(item, 'igc')}
                      disabled={playerData.cash < item.igcPrice}
                      className="w-full text-[10px] font-bold bg-green-900/50 hover:bg-green-800/60 border border-green-700/40 text-green-300 rounded px-2 py-1 disabled:opacity-40 transition-colors"
                    >
                      💵 ${item.igcPrice.toLocaleString()}
                    </button>
                    <button
                      onClick={() => handleBuyClick(item, 'cryd')}
                      disabled={playerData.crypto < item.crydPrice}
                      className="w-full text-[10px] font-bold bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/40 text-purple-300 rounded px-2 py-1 disabled:opacity-40 transition-colors"
                    >
                      💎 {item.crydPrice} CRYD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
      <ConsumableActionModal
        open={!!confirmModal}
        onClose={handleConfirmBuy}
        mode="confirm"
        item={confirmModal?.item}
        currency={confirmModal?.currency}
        price={confirmModal?.price}
      />
      <ConsumableActionModal
        open={!!successModal}
        onClose={() => setSuccessModal(null)}
        mode="success"
        item={successModal?.item}
        currency={successModal?.currency}
        price={successModal?.price}
      />
      <ConsumableActionModal
        open={!!resultModal}
        onClose={() => setResultModal(null)}
        mode="result"
        item={resultModal?.item}
        newValue={resultModal?.newValue}
        resourceLabel="Stamina"
        resourceIcon="⚡"
        remaining={resultModal?.remaining}
      />
    </div>
  );
}