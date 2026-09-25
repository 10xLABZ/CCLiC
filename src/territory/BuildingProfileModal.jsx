import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VipFrame from '../vip/VipFrame';
import { isVipActive } from '@/lib/vipHelper';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Crown } from 'lucide-react';
import { computeTerritoryBotStats } from '@/lib/territoryBotHelper';

const getSlotPayout = (slot) => {
  if (slot === 1) return 10;
  if (slot <= 3) return 8;
  if (slot <= 10) return 7;
  if (slot <= 19) return 5;
  if (slot <= 29) return 3;
  return 1;
};



export default function BuildingProfileModal({ slot, open, onClose, buildingName }) {
  if (!slot || !slot.user_id) return null;

  const isBot = slot.user_id.startsWith('bot_') || slot.user_id.startsWith('nemesis_');
  const isNemesis = slot.user_id.startsWith('nemesis_');
  const isBotRegular = isBot && !isNemesis;
  // Nemesis always VIP; regular bots 15% deterministic; humans use passed vipActiveUntil
  const botHasVip = isNemesis ||
    (isBotRegular && (Math.abs(slot.user_id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 100 < 15)) ||
    (!isBot && (slot.vipActiveUntil || 0) > Date.now());
  const totalWars = (slot.bot_wins || 0) + (slot.bot_losses || 0);
  const winRate = totalWars > 0 ? Math.round(((slot.bot_wins || 0) / totalWars) * 100) : null;
  // For bots: use stored atk/def from seeding; fall back to deterministic helper.
  // For humans: use pre-enriched stats passed in.
  const botStats = isBot ? computeTerritoryBotStats(slot) : null;
  const pwr = botStats?.pwr ?? slot.pwr ?? slot.player_power ?? null;
  const atk = slot.atk ?? botStats?.atk ?? null;
  const def = slot.def ?? botStats?.def ?? null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#060a12] border border-emerald-900/40 text-white max-w-sm">
        <div className="space-y-4 pt-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <VipFrame active={botHasVip || (!isBot && (slot.vipActiveUntil || 0) > Date.now())} className="w-16 h-16 rounded-xl shrink-0">
            <div className="w-16 h-16 rounded-xl border border-emerald-500/30 bg-slate-900 overflow-hidden">
              {slot.profile_image_url ? (
                <img src={slot.profile_image_url} alt={slot.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
          </VipFrame>
            <div>
              <div className="text-lg font-bold text-slate-100">{slot.username}</div>
              <div className="text-xs text-slate-500">Level {slot.player_level}</div>
              <div className="flex items-center gap-2 mt-1">
                {slot.slot_number === 1 && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" /> #1 TERRITORY HOLDER
                  </span>
                )}
                {slot.slot_number !== 1 && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                    Slot #{slot.slot_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Building info */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 text-xs">
            <span className="text-slate-500">Holding:</span>{' '}
            <span className="text-emerald-400 font-semibold">{buildingName}</span>
            <span className="text-green-400 font-bold ml-2">+${getSlotPayout(slot.slot_number) * 24}/Day</span>
          </div>

          {/* Combat Stats */}
          <div className="border border-slate-800 rounded-xl p-3">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Combat Strength
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] text-slate-600 mb-0.5">ATK</div>
                <div className="text-sm font-bold text-red-400">{atk !== null ? atk.toFixed(2) : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-600 mb-0.5">DEF</div>
                <div className="text-sm font-bold text-blue-400">{def !== null ? def.toFixed(2) : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-600 mb-0.5">TP</div>
                <div className="text-sm font-bold text-emerald-400">{pwr !== null ? pwr.toFixed(2) : '—'}</div>
              </div>
            </div>
          </div>

          {/* W/L Record */}
          {totalWars > 0 && (
            <div className="border border-slate-800 rounded-xl p-3">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Territory Record
              </h3>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">W / L: </span>
                  <span className="text-green-400 font-bold">{slot.bot_wins || 0}</span>
                  <span className="text-slate-600"> / </span>
                  <span className="text-red-400 font-bold">{slot.bot_losses || 0}</span>
                </div>
                {winRate !== null && (
                  <div>
                    <span className="text-slate-500 text-xs">Win Rate: </span>
                    <span className="text-yellow-400 font-bold">{winRate}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}