import React, { useState } from 'react';
import { Plus, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import VipInfoModal from './VipInfoModal';
import CrydIcon from '@/components/shared/CrydIcon';
import PurchaseSuccessModal from '@/components/shared/PurchaseSuccessModal';
import {
  getVipXpProgress, getVipStatBonusPct, buyVipXp, getVipLevel, VIP_STAT_BONUS,
} from '@/lib/vipHelper';

const PRESET_AMOUNTS = [100, 500, 1000];

export default function VipXpBar({ playerData, onPlayerUpdate }) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [buying, setBuying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState(null);

  const progress = getVipXpProgress(playerData);
  const statPct = getVipStatBonusPct(playerData);
  const pct = progress.isMax ? 100 : Math.min(100, (progress.xpIntoLevel / progress.xpForNext) * 100);

  const handleBuy = async (amount) => {
    setBuying(true);
    const oldLevel = getVipLevel(playerData);
    const result = await buyVipXp(amount, playerData);
    setBuying(false);
    if (!result.success) { toast.error(result.message); return; }
    onPlayerUpdate(result.updated);
    const newLevel = getVipLevel(result.updated);
    if (newLevel > oldLevel) {
      setLevelUpInfo({ oldLevel, newLevel });
    } else {
      toast.success(`+${amount.toLocaleString()} VIP XP!`);
    }
    setShowPurchase(false);
    setCustomAmount('');
  };

  return (
    <div className="bg-yellow-950/30 border border-yellow-700/40 rounded-xl p-2">
      {/* Level + XP bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-black text-yellow-400 uppercase tracking-wider">VIP Lv</span>
          <span className="text-base font-black text-yellow-300 leading-none">{progress.level}</span>
          <span className="text-[9px] text-slate-500">/20</span>
          <button
            onClick={() => setShowInfo(true)}
            className="shrink-0 w-5 h-5 rounded-full bg-yellow-600/80 hover:bg-yellow-500 text-black flex items-center justify-center info-pulse-glow"
            title="VIP Progression Guide"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
            <span>{progress.isMax ? 'MAX LEVEL' : `${progress.xpIntoLevel.toLocaleString()} / ${progress.xpForNext.toLocaleString()} XP`}</span>
            <span className="text-yellow-500 font-bold whitespace-nowrap">+{statPct}% ATK/DEF/Cash</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* + button */}
        <button
          onClick={() => setShowPurchase(!showPurchase)}
          className="shrink-0 w-6 h-6 rounded-full bg-yellow-600 hover:bg-yellow-500 text-black font-black flex items-center justify-center transition-colors"
          title="Buy VIP XP with CRYD"
        >
          {showPurchase ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Purchase section */}
      {showPurchase && (
        <div className="mt-2 pt-2 border-t border-yellow-800/30 space-y-1.5">
          <div className="text-[9px] text-center text-white flex items-center justify-center gap-1"><CrydIcon size={10} /> 1 CRYD = 1 VIP XP — XP is permanent</div>
          <div className="grid grid-cols-3 gap-1">
            {PRESET_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => handleBuy(amt)}
                disabled={buying}
                className="bg-slate-800 hover:bg-slate-700 border border-yellow-800/30 rounded-lg py-1 text-center transition-colors disabled:opacity-50"
              >
                <div className="text-[10px] font-bold text-yellow-400">{amt.toLocaleString()} XP</div>
                <div className="text-[8px] text-white flex items-center justify-center gap-0.5"><CrydIcon size={9} /> {amt.toLocaleString()}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom amount"
              className="flex-1 bg-slate-800 border border-yellow-800/30 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-500 outline-none"
              min="1"
            />
            <Button
              size="sm"
              onClick={() => customAmount && handleBuy(parseInt(customAmount))}
              disabled={buying || !customAmount}
              className="bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] h-7 px-2"
            >
              BUY
            </Button>
          </div>
        </div>
      )}

      <VipInfoModal open={showInfo} onClose={() => setShowInfo(false)} />

      {levelUpInfo && (
        <PurchaseSuccessModal
          open={!!levelUpInfo}
          onClose={() => setLevelUpInfo(null)}
          title={`VIP Level ${levelUpInfo.newLevel}!`}
          items={[{
            name: `VIP Level ${levelUpInfo.oldLevel} → ${levelUpInfo.newLevel}`,
            icon: '👑',
            detail: `Stat bonus now +${VIP_STAT_BONUS[levelUpInfo.newLevel] || 5}% ATK/DEF/Cash`,
          }]}
        />
      )}
    </div>
  );
}