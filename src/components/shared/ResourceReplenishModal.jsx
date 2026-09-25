import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPlayerData, savePlayerData } from "@/components/utils/playerStorage";
import { applyServerReward } from "@/lib/playerServerSync";
import { Octagon } from "lucide-react";
import { toast } from "sonner";
import ConsumableActionModal from "@/components/shared/ConsumableActionModal";

const CONSUMABLE_CONFIG = {
  energy: {
    label: "Energy",
    icon: "🔋",
    borderColor: "border-yellow-700/50",
    titleColor: "text-yellow-400",
    deltaKey: "energy_delta",
    items: [
      { id: "ENERGY_25",  name: "Energy +25",  amount: 25,  priceCash: 3000,  priceCrypto: 3  },
      { id: "ENERGY_50",  name: "Energy +50",  amount: 50,  priceCash: 5500,  priceCrypto: 5  },
      { id: "ENERGY_75",  name: "Energy +75",  amount: 75,  priceCash: 8000,  priceCrypto: 8  },
      { id: "ENERGY_100", name: "Energy +100", amount: 100, priceCash: 12000, priceCrypto: 12 },
    ],
  },
  stamina: {
    label: "Stamina",
    icon: "⚡",
    borderColor: "border-blue-700/50",
    titleColor: "text-blue-400",
    deltaKey: "stamina_delta",
    items: [
      { id: "STAMINA_25",  name: "Stamina +25",  amount: 25,  priceCash: 3000,  priceCrypto: 3  },
      { id: "STAMINA_50",  name: "Stamina +50",  amount: 50,  priceCash: 5500,  priceCrypto: 5  },
      { id: "STAMINA_75",  name: "Stamina +75",  amount: 75,  priceCash: 8000,  priceCrypto: 8  },
      { id: "STAMINA_100", name: "Stamina +100", amount: 100, priceCash: 12000, priceCrypto: 12 },
    ],
  },
  opCover: {
    label: "Cover",
    icon: "🛡️",
    borderColor: "border-emerald-700/50",
    titleColor: "text-emerald-400",
    deltaKey: "op_cover_delta",
    items: [
      { id: "OPCOVER_25",  name: "Cover +25",  amount: 25,  priceCash: 5000,  priceCrypto: 5  },
      { id: "OPCOVER_50",  name: "Cover +50",  amount: 50,  priceCash: 9000,  priceCrypto: 9  },
      { id: "OPCOVER_75",  name: "Cover +75",  amount: 75,  priceCash: 13000, priceCrypto: 13 },
      { id: "OPCOVER_100", name: "Cover +100", amount: 100, priceCash: 18000, priceCrypto: 18 },
    ],
  },
};

export default function ResourceReplenishModal({ open, onClose, type = "energy", onPlayerUpdate, message }) {
  const cfg = CONSUMABLE_CONFIG[type];
  const [player, setPlayer] = useState(() => getPlayerData());
  const [applying, setApplying] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);  // { item, currency, price }
  const [resultModal, setResultModal] = useState(null);    // { item, newValue, remaining }

  const refresh = () => {
    const p = getPlayerData();
    setPlayer(p);
    onPlayerUpdate?.(p);
  };

  // USE item — server-authoritative, then show result popup
  const applyItem = async (item) => {
    const current = getPlayerData();
    const consumables = current.consumables || {};
    const qty = consumables[item.id] || 0;
    if (qty < 1) { toast.error("You don't own this item!"); return; }

    setApplying(item.id);
    const result = await applyServerReward({ [cfg.deltaKey]: item.amount, reason: `use_${item.id}` });
    setApplying(null);

    if (result) {
      const newConsumables = { ...consumables, [item.id]: qty - 1 };
      if (newConsumables[item.id] <= 0) delete newConsumables[item.id];
      savePlayerData({ consumables: newConsumables });
      window.dispatchEvent(new Event('player_synced'));
      refresh();
      const newVal = result.new_energy ?? result.new_stamina ?? result.new_op_cover;
      setResultModal({ item, newValue: newVal, remaining: Math.max(0, qty - 1) });
    } else {
      toast.error("Server error. Please try again.");
    }
  };

  // BUY item — deduct currency locally, add to inventory
  const buyItem = (item, alsoUse = false) => {
    const current = getPlayerData();
    const hasCash  = item.priceCash > 0   && current.cash   >= item.priceCash;
    const hasCryd  = item.priceCrypto > 0 && current.crypto >= item.priceCrypto;
    if (!hasCash && !hasCryd) { toast.error("Not enough funds!"); return; }

    if (alsoUse) {
      // Show confirm popup before proceeding
      const currency = (hasCryd && item.priceCrypto > 0) ? "cryd" : "cash";
      const price = currency === "cryd" ? item.priceCrypto : item.priceCash;
      setConfirmModal({ item, currency, price });
      return;
    }

    const consumables = { ...(current.consumables || {}) };
    let update = {};
    if (hasCryd && item.priceCrypto > 0) {
      update.crypto = current.crypto - item.priceCrypto;
    } else {
      update.cash = current.cash - item.priceCash;
    }
    consumables[item.id] = (consumables[item.id] || 0) + 1;
    update.consumables = consumables;
    savePlayerData(update);
    toast.success(`Purchased ${item.name}!`);
    refresh();
  };

  const handleConfirmBuyUse = (action) => {
    if (action !== "confirm" || !confirmModal) { setConfirmModal(null); return; }
    const { item, currency } = confirmModal;
    setConfirmModal(null);
    const current = getPlayerData();
    let update = {};
    if (currency === "cryd") {
      update.crypto = current.crypto - item.priceCrypto;
    } else {
      update.cash = current.cash - item.priceCash;
    }
    savePlayerData(update);
    applyItem(item);
  };

  const currentVal = type === "energy" ? player.energy : type === "stamina" ? player.stamina : player.opCover;
  const consumables = player.consumables || {};

  return (
    <React.Fragment>
      <ConsumableActionModal
        open={!!confirmModal}
        onClose={handleConfirmBuyUse}
        mode="confirm"
        item={confirmModal?.item}
        currency={confirmModal?.currency}
        price={confirmModal?.price}
      />
      <ConsumableActionModal
        open={!!resultModal}
        onClose={() => setResultModal(null)}
        mode="result"
        item={resultModal?.item}
        newValue={resultModal?.newValue}
        resourceLabel={cfg.label}
        resourceIcon={cfg.icon}
        remaining={resultModal?.remaining}
      />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`bg-[#0a0f1a] border ${cfg.borderColor} text-white max-w-lg p-0 overflow-hidden`}>
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-slate-800">
            <DialogTitle className={`${cfg.titleColor} flex items-center gap-2 text-sm`}>
              <span>{cfg.icon}</span> {cfg.label} Depleted
              <span className="ml-auto text-slate-400 font-normal text-xs">Current: {currentVal}/100</span>
            </DialogTitle>
            {message && <p className="text-xs text-slate-500 mt-0.5">{message}</p>}
          </DialogHeader>

          <div className="flex gap-0 max-h-[50vh] overflow-hidden">
            {/* LEFT: Inventory */}
            <div className="flex-1 border-r border-slate-800 overflow-y-auto p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">📦 Inventory</div>
              {cfg.items.map((item) => {
                const qty = consumables[item.id] || 0;
                if (qty < 1) return null;
                return (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 mb-1.5">
                    <div>
                      <div className="text-xs text-slate-200 font-semibold">{item.name}</div>
                      <div className="text-[9px] text-slate-500">Owned: {qty}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applyItem(item)}
                      disabled={applying === item.id}
                      className="bg-emerald-600 hover:bg-emerald-500 h-6 text-[9px] px-2 disabled:opacity-60"
                    >
                      {applying === item.id ? '...' : 'USE'}
                    </Button>
                  </div>
                );
              })}
              {cfg.items.every(item => !consumables[item.id] || consumables[item.id] < 1) && (
                <div className="text-[10px] text-slate-600 italic text-center py-4">None owned</div>
              )}
            </div>

            {/* RIGHT: Shop */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">🛒 Shop</div>
              {cfg.items.map((item) => {
                const hasCash = item.priceCash > 0   && player.cash   >= item.priceCash;
                const hasCryd = item.priceCrypto > 0 && player.crypto >= item.priceCrypto;
                const canBuy  = hasCash || hasCryd;
                return (
                  <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 mb-1.5">
                    <div className="text-xs text-slate-200 font-semibold mb-1">{item.name}</div>
                    <div className="text-[9px] text-slate-500 mb-1.5 flex gap-2">
                      {item.priceCash    > 0 && <span>💵 {item.priceCash.toLocaleString()}</span>}
                      {item.priceCrypto  > 0 && <span className="flex items-center gap-0.5">{item.priceCrypto}<Octagon className="w-2 h-2" /></span>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => buyItem(item, false)} disabled={!canBuy}
                        className="flex-1 h-5 text-[8px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-1">
                        BUY
                      </Button>
                      <Button size="sm" onClick={() => buyItem(item, true)} disabled={!canBuy}
                        className="flex-1 h-5 text-[8px] bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-1">
                        BUY&amp;USE
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-2 border-t border-slate-800 flex justify-between items-center">
            <Link to={createPageUrl("ShopPage") + `?tab=consumables&sub=${type}`} onClick={onClose}>
              <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-xs h-7">
                Full Shop →
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-500 text-xs h-7">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}