import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Swords, Users, Zap, TrendingUp } from "lucide-react";
import { WEAPONS, FIREARMS, VEHICLES, PEOPLE, PETS } from "../store/catalogData";
import { getSceneById } from "../store/scenesData";
import { getWeaponStarProgress } from "../weapons/weaponUpgradeSystem";

const getItemById = (category, itemId) => {
  if (!itemId || typeof itemId === 'object') return null;
  const catalogMap = { weapons: WEAPONS, firearms: FIREARMS, vehicles: VEHICLES, people: PEOPLE, pets: PETS };
  const catalog = catalogMap[category];
  return catalog?.find(item => item.id === itemId) || null;
};

// Firearms have IDs starting with 'F'; accessories are in the WEAPONS catalog
const findWeaponAnyCategory = (itemId) => {
  if (!itemId || typeof itemId !== 'string') return null;
  if (itemId.startsWith('F')) return getItemById('firearms', itemId);
  return getItemById('weapons', itemId);
};

const getAutoPilotPenalty = (heat) => {
  if (heat >= 85) return 15;
  if (heat >= 70) return 12;
  if (heat >= 50) return 8;
  return 5;
};

export default function LiveAttackBriefing({ 
  open, 
  attacker, 
  playerData,
  onJoinBattle, 
  onAutoPilot,
  onCountdownComplete 
}) {
  const [countdown, setCountdown] = useState(11);

  useEffect(() => {
    if (!open) {
      setCountdown(11);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onCountdownComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onCountdownComplete]);

  if (!attacker) return null;

  // Ensure safe values
  const safeAttacker = {
    ...attacker,
    level: Number(attacker.level) || 1,
    name: attacker.name || "Unknown",
    type: attacker.type || "Average",
    atk: Number(attacker.atk) || 0,
    def: Number(attacker.def) || 0,
    fundPower: Number(attacker.fundPower) || 0,
    pwr: Number(attacker.pwr || attacker.totalPower) || 0,
    tradeWarsWins: Number(attacker.tradeWarsWins) || 0,
    tradeWarsLosses: Number(attacker.tradeWarsLosses) || 0,
    lifetimeJobs: Number(attacker.lifetimeJobs) || 0,
    lifetimeTrades: Number(attacker.lifetimeTrades) || 0
  };

  const genderEmoji = attacker.botGenderEmoji === 'M' ? '🚹' : attacker.botGenderEmoji === 'F' ? '🚺' : '⚧️';
  const winPct = safeAttacker.tradeWarsWins + safeAttacker.tradeWarsLosses > 0
    ? ((safeAttacker.tradeWarsWins / (safeAttacker.tradeWarsWins + safeAttacker.tradeWarsLosses)) * 100).toFixed(1)
    : 0;

  const autoPilotPenalty = getAutoPilotPenalty(Number(playerData.heat) || 0);

  // Check both equipped and equippedLoadout
  const equipData = attacker.equippedLoadout || attacker.equipped || {};
  
  const botWeaponUpgrades = attacker.weaponUpgrades || {};
  const botSimpleUpgrades = attacker.simpleUpgrades || {};
  const loadout = [
    { slot: 'Firearm 1', item: findWeaponAnyCategory(equipData.weapon1), upgradeLevel: (() => { const sp = botWeaponUpgrades[equipData.weapon1] || 0; return getWeaponStarProgress(sp).star; })() },
    { slot: 'Firearm 2', item: findWeaponAnyCategory(equipData.weapon2), upgradeLevel: (() => { const sp = botWeaponUpgrades[equipData.weapon2] || 0; return getWeaponStarProgress(sp).star; })() },
    { slot: 'Accessory 1', item: findWeaponAnyCategory(equipData.weapon3), upgradeLevel: (() => { const sp = botWeaponUpgrades[equipData.weapon3] || 0; return getWeaponStarProgress(sp).star; })() },
    { slot: 'Accessory 2', item: findWeaponAnyCategory(equipData.weapon4), upgradeLevel: (() => { const sp = botWeaponUpgrades[equipData.weapon4] || 0; return getWeaponStarProgress(sp).star; })() },
    { slot: 'Vehicle', item: getItemById('vehicles', equipData.vehicle), upgradeLevel: botSimpleUpgrades[equipData.vehicle] || 0 },
    { slot: 'Power', item: getItemById('people', equipData.power), upgradeLevel: botSimpleUpgrades[equipData.power] || 0 },
    { slot: 'Pet', item: getItemById('pets', equipData.pet), upgradeLevel: botSimpleUpgrades[equipData.pet] || 0 }
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-gradient-to-b from-red-950 to-slate-950 border-4 border-red-600 text-white max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-red-400 animate-pulse">
              🚨 YOU'RE BEING ATTACKED
            </h2>
            <p className="text-sm text-slate-300">
              By: <span className="font-bold">{safeAttacker.name}</span> {genderEmoji} • {safeAttacker.type} • Lv {safeAttacker.level}
            </p>
            <div className="text-2xl font-bold text-red-400">
              Battle starts in: {countdown}
            </div>
          </div>

          {/* Profile Layout: Stats LEFT + Avatar RIGHT */}
          <div className="flex gap-3 bg-slate-900/50 rounded-lg p-3">
            {/* LEFT: Stats + Performance */}
            <div className="flex-1 space-y-2">
              {/* Stats */}
              <div className="space-y-1">
                <StatRow icon={<TrendingUp className="w-3 h-3" />} label="Level" value={safeAttacker.level} />
                <StatRow icon={<Swords className="w-3 h-3" />} label="ATK" value={safeAttacker.atk.toFixed(2)} />
                <StatRow icon={<Shield className="w-3 h-3" />} label="DEF" value={safeAttacker.def.toFixed(2)} />
                <StatRow icon={<Users className="w-3 h-3" />} label="FUND" value={safeAttacker.fundPower.toFixed(2)} />
                <StatRow icon={<Zap className="w-3 h-3" />} label="PWR" value={safeAttacker.pwr.toFixed(2)} color="text-yellow-400" />
              </div>

              {/* Performance */}
              <div className="pt-2 border-t border-slate-700">
                <h3 className="text-[9px] font-semibold text-slate-400 mb-1">PERFORMANCE</h3>
                <div className="grid grid-cols-3 gap-1 text-[9px]">
                  <div>
                    <div className="text-slate-500">Jobs</div>
                    <div className="font-bold text-slate-200">{safeAttacker.lifetimeJobs}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Trades</div>
                    <div className="font-bold text-slate-200">{safeAttacker.lifetimeTrades}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Wars</div>
                    <div className="font-bold text-slate-200">
                      {safeAttacker.tradeWarsWins}/{safeAttacker.tradeWarsLosses}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Avatar + Scene */}
            <div className="flex-shrink-0 relative" style={{ width: '140px', height: '180px' }}>
              {attacker.botSceneId && (
                <img 
                  src={getSceneById(attacker.botSceneId)?.imageUrl} 
                  alt="Scene"
                  className="absolute inset-0 w-full h-full object-cover rounded"
                />
              )}
              <img 
                src={attacker.botAvatar} 
                alt={safeAttacker.name}
                className="absolute inset-0 w-full h-full object-contain z-10"
              />
            </div>
          </div>

          {/* Loadout */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">LOADOUT</h3>
            <div className="space-y-1">
              {loadout.map((entry, idx) => (
                <LoadoutRow key={idx} slot={entry.slot} item={entry.item} upgradeLevel={entry.upgradeLevel} />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onAutoPilot}
              variant="outline"
              className="flex-1 border-slate-600 hover:bg-slate-800 h-auto py-3 flex flex-col items-center gap-1"
            >
              <span className="font-bold text-black text-sm">Leave (Auto-Resolve)</span>
              <span className="text-base font-bold text-red-500">Penalty: -{autoPilotPenalty}% power</span>
            </Button>
            <Button
              onClick={onJoinBattle}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-auto py-2"
            >
              <span className="text-lg">JOIN FIGHT</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatRow({ icon, label, value, color = "text-slate-200" }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-500">{icon}</span>
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ml-auto ${color}`}>{value}</span>
    </div>
  );
}

function LoadoutRow({ slot, item, upgradeLevel = 0 }) {
  if (!item || item.locked) {
    return (
      <div className="flex items-center justify-between text-[10px] py-0.5">
        <span className="text-slate-500">{slot}:</span>
        <span className="text-slate-600 italic">🔒 Locked</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-[10px] py-0.5">
      <span className="text-slate-400">{slot}:</span>
      <span className="text-slate-200 font-semibold flex items-center gap-1">
        {item.name}
        {upgradeLevel > 0 && (
          <span className="text-yellow-400 text-[8px]">
            {Array.from({ length: Math.min(upgradeLevel, 10) }).map(() => '★').join('')}
          </span>
        )}
        <span className="text-emerald-400 ml-1">+{item.atk || 0}</span>
        <span className="text-blue-400 ml-0.5">+{item.def || 0}</span>
      </span>
    </div>
  );
}