import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Gift, Info, Crown } from "lucide-react";
import { getPlayerData, savePlayerData } from "../utils/playerStorage";
import { updateRegenStats } from "../utils/regenHelper";
import { serverClaimReward, isRewardClaimedServer } from "@/lib/rewardClaimHelper";
import { applyServerReward } from "@/lib/playerServerSync";
import { FAST_FIVE_GOAL_ICONS } from "@/components/events/eventStorage";
import AlreadyClaimedPopup from "@/components/shared/AlreadyClaimedPopup";

export default function DailyGoalsPanel({ playerData, onPlayerUpdate }) {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState(null);
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [alreadyClaimedMsg, setAlreadyClaimedMsg] = useState("");
  const [claiming, setClaiming] = useState(null);
  const [infoGoalId, setInfoGoalId] = useState(null);
  const [serverClaimedGoals, setServerClaimedGoals] = useState({});

  // Server-authoritative sync: check which goals have been claimed on the server
  // to prevent false "claimable" state when local cache is stale.
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const goalIds = ['jobs', 'trades', 'tradewars', 'all_bonus'];
    Promise.all(
      goalIds.map(async (id) => {
        const claimed = await isRewardClaimedServer(`daily_goals_${id}_${today}`);
        return [id, claimed];
      })
    ).then((entries) => {
      setServerClaimedGoals(Object.fromEntries(entries));
    }).catch(() => {});
  }, [playerData?.lastClaimDate]);

  const goals = [
    {
      id: "jobs",
      label: "Complete 5 Jobs",
      iconUrl: FAST_FIVE_GOAL_ICONS.jobs,
      progress: playerData.jobsCompletedToday || 0,
      target: 5,
      reward: { cash: 1000, respect: 10, xp: 50 },
      howTo: "Run jobs from the Ops page. Each job you complete counts toward this goal. Jobs cost Energy and Op Cover.",
    },
    {
      id: "trades",
      label: "Complete 3 Trades",
      iconUrl: FAST_FIVE_GOAL_ICONS.trades,
      progress: playerData.tradesCompletedToday || 0,
      target: 3,
      reward: { cash: 800, respect: 8, xp: 40 },
      howTo: "Execute trades from the Trade Desk or Insider Tips. Each completed trade counts toward this goal. Trades cost Energy.",
    },
    {
      id: "tradewars",
      label: "Win 3 Attacks",
      iconUrl: FAST_FIVE_GOAL_ICONS.attacks,
      progress: playerData.tradeWarsWonToday || 0,
      target: 3,
      reward: { cash: 1200, respect: 15, xp: 60 },
      howTo: "Battle other players in Attacks from the Ops page. Only wins count toward this goal. Each attack costs Stamina and Op Cover.",
    },
  ];

  const allGoalBonus = { cash: 500, respect: 20, xp: 100 };
  const completedCount = goals.filter(g => g.progress >= g.target).length;
  const allCompleted = completedCount === goals.length;

  const getClaimedGoals = () => {
    const player = getPlayerData();
    let claimed = player.claimedDailyGoals;
    if (!claimed) return [];
    if (typeof claimed === 'string') {
      try { return JSON.parse(claimed); } catch (e) { return []; }
    }
    return Array.isArray(claimed) ? claimed : [];
  };

  const isGoalClaimed = (goalId) => {
    const today = new Date().toISOString().split('T')[0];
    const player = getPlayerData();
    if (player.lastClaimDate !== today) return false;
    return getClaimedGoals().includes(goalId) || serverClaimedGoals[goalId] === true;
  };

  const isAllBonusClaimed = () => {
    const today = new Date().toISOString().split('T')[0];
    const player = getPlayerData();
    if (player.lastClaimDate !== today) return false;
    return getClaimedGoals().includes('all_bonus') || serverClaimedGoals['all_bonus'] === true;
  };

  const handleClaimGoal = async (goal) => {
    if (claiming) return;
    const today = new Date().toISOString().split('T')[0];
    const player = getPlayerData();

    if (player.lastClaimDate === today && getClaimedGoals().includes(goal.id)) {
      setAlreadyClaimedMsg("You've already claimed the reward for this goal today.");
      setShowAlreadyClaimed(true);
      return;
    }

    if (goal.progress < goal.target) return;

    setClaiming(goal.id);
    const rewardKey = `daily_goals_${goal.id}_${today}`;
    const result = await serverClaimReward('daily_goals', rewardKey, rewardKey);
    if (!result.success) {
      setClaiming(null);
      setAlreadyClaimedMsg("You've already claimed the reward for this goal today.");
      setShowAlreadyClaimed(true);
      return;
    }

    // Route balance changes through the server-authoritative applyGameReward
    // so cash/respect/xp are atomically updated on the server.
    const rewardResult = await applyServerReward({
      cash_delta: goal.reward.cash,
      respect_delta: goal.reward.respect,
      xp_delta: goal.reward.xp,
      reason: `daily_goal_${goal.id}`,
    });

    // Update claimed state locally + flush the non-resource field
    const player2 = getPlayerData();
    const claimedGoals = player2.lastClaimDate === today ? [...getClaimedGoals()] : [];
    if (!claimedGoals.includes(goal.id)) claimedGoals.push(goal.id);
    savePlayerData({ claimedDailyGoals: claimedGoals, lastClaimDate: today });
    onPlayerUpdate(updateRegenStats());

    setClaimedRewards({ totalCash: goal.reward.cash, totalRespect: goal.reward.respect, totalXP: goal.reward.xp, allCompleted: false, leveledUp: !!(rewardResult && rewardResult.new_level > (player2.level || 1)), goalLabel: goal.label });
    setShowClaimModal(true);
    setClaiming(null);
  };

  const handleClaimAllBonus = async () => {
    if (claiming) return;
    const today = new Date().toISOString().split('T')[0];
    const player = getPlayerData();

    if (!allCompleted) return;

    if (player.lastClaimDate === today && getClaimedGoals().includes('all_bonus')) {
      setAlreadyClaimedMsg("You've already claimed the All Goals Bonus today.");
      setShowAlreadyClaimed(true);
      return;
    }

    setClaiming('all_bonus');
    const rewardKey = `daily_goals_all_bonus_${today}`;
    const result = await serverClaimReward('daily_goals', rewardKey, rewardKey);
    if (!result.success) {
      setClaiming(null);
      setAlreadyClaimedMsg("You've already claimed the All Goals Bonus today.");
      setShowAlreadyClaimed(true);
      return;
    }

    // Route balance changes through the server-authoritative applyGameReward
    const rewardResult = await applyServerReward({
      cash_delta: allGoalBonus.cash,
      respect_delta: allGoalBonus.respect,
      xp_delta: allGoalBonus.xp,
      reason: 'daily_goal_all_bonus',
    });

    const player2 = getPlayerData();
    const claimedGoals = player2.lastClaimDate === today ? [...getClaimedGoals()] : [];
    if (!claimedGoals.includes('all_bonus')) claimedGoals.push('all_bonus');
    savePlayerData({ claimedDailyGoals: claimedGoals, lastClaimDate: today });
    onPlayerUpdate(updateRegenStats());

    setClaimedRewards({ totalCash: allGoalBonus.cash, totalRespect: allGoalBonus.respect, totalXP: allGoalBonus.xp, allCompleted: true, leveledUp: !!(rewardResult && rewardResult.new_level > (player2.level || 1)), goalLabel: "All Goals Bonus" });
    setShowClaimModal(true);
    setClaiming(null);
  };

  const canClaimToday = () => {
    const today = new Date().toISOString().split('T')[0];
    if (playerData.lastClaimDate === today) {
      return goals.some(g => g.progress >= g.target && !(playerData.claimedDailyGoals || []).includes(g.id) && serverClaimedGoals[g.id] !== true);
    }
    return goals.some(g => g.progress >= g.target && serverClaimedGoals[g.id] !== true);
  };

  const infoGoal = goals.find(g => g.id === infoGoalId);

  return (
    <>
      <Card className="bg-[#0a0f1a] border-emerald-900/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-slate-300">Daily Goals</span>
          </div>
        </div>

        <div className="space-y-3">
          {goals.map(goal => {
            const completed = goal.progress >= goal.target;
            const percent = Math.min(100, (goal.progress / goal.target) * 100);
            const claimed = isGoalClaimed(goal.id);

            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={goal.iconUrl}
                      alt=""
                      className={`w-3.5 h-3.5 object-cover rounded-sm ${completed ? '' : 'opacity-50'}`}
                    />
                    <span className="text-slate-400">{goal.label}</span>
                    <button
                      onClick={() => setInfoGoalId(goal.id)}
                      className="ml-0.5 text-slate-500 hover:text-amber-400 transition-colors"
                      title="Rewards info"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                  <span className={`font-bold ${completed ? 'text-green-400' : 'text-slate-500'}`}>
                    {goal.progress}/{goal.target}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex-1">
                    <div
                      className={`h-full transition-all ${completed ? 'bg-green-500' : 'bg-emerald-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {claimed ? (
                    <span className="text-green-500 text-xs font-bold whitespace-nowrap">✓ Claimed</span>
                  ) : completed ? (
                    <Button
                      size="sm"
                      onClick={() => handleClaimGoal(goal)}
                      disabled={claiming !== null}
                      className="bg-amber-600 hover:bg-amber-500 text-[10px] h-6 px-2 whitespace-nowrap disabled:opacity-50"
                    >
                      <Gift className="w-3 h-3 mr-0.5" />
                      {claiming === goal.id ? '...' : 'CLAIM'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* 4th line: Complete All Goals */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Crown className={`w-3.5 h-3.5 ${allCompleted ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="text-slate-400">Complete All Goals</span>
                <button
                  onClick={() => setInfoGoalId('all_bonus')}
                  className="ml-0.5 text-slate-500 hover:text-amber-400 transition-colors"
                  title="Rewards info"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <span className={`font-bold ${allCompleted ? 'text-amber-400' : 'text-slate-500'}`}>
                {completedCount}/{goals.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex-1">
                <div
                  className={`h-full transition-all ${allCompleted ? 'bg-amber-500' : 'bg-amber-700'}`}
                  style={{ width: `${(completedCount / goals.length) * 100}%` }}
                />
              </div>
              {isAllBonusClaimed() ? (
                <span className="text-green-500 text-xs font-bold whitespace-nowrap">✓ Claimed</span>
              ) : allCompleted ? (
                <Button
                  size="sm"
                  onClick={handleClaimAllBonus}
                  disabled={claiming !== null}
                  className="bg-amber-600 hover:bg-amber-500 text-[10px] h-6 px-2 whitespace-nowrap disabled:opacity-50"
                >
                  <Gift className="w-3 h-3 mr-0.5" />
                  {claiming === 'all_bonus' ? '...' : 'CLAIM'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* Info Dialog */}
      {infoGoalId && (
        <Dialog open={!!infoGoalId} onOpenChange={(open) => !open && setInfoGoalId(null)}>
          <DialogContent className="bg-[#0a0f1a] border-amber-900/40 text-white max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-amber-400 text-sm">
                {infoGoalId === 'all_bonus' ? 'Complete All Goals Bonus' : (goals.find(g => g.id === infoGoalId)?.label || 'Goal Info')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              {infoGoalId === 'all_bonus' ? (
                <>
                  <p className="text-slate-300">Complete all 3 daily goals to unlock this bonus reward.</p>
                  <div className="bg-slate-900/50 rounded-lg p-2 space-y-1">
                    <div className="flex justify-between text-green-400"><span>Cash:</span><span>+${allGoalBonus.cash}</span></div>
                    <div className="flex justify-between text-amber-400"><span>Respect:</span><span>+{allGoalBonus.respect}</span></div>
                    <div className="flex justify-between text-blue-400"><span>XP:</span><span>+{allGoalBonus.xp}</span></div>
                  </div>
                  <p className="text-slate-400">How to complete: Finish all 3 goals above (5 Jobs, 3 Trades, 3 Attack wins).</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <img
                      src={infoGoal?.iconUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded-md"
                    />
                    <span className="text-slate-300 font-semibold">{infoGoal?.label}</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 space-y-1">
                    <div className="flex justify-between text-green-400"><span>Cash:</span><span>+${infoGoal?.reward.cash}</span></div>
                    <div className="flex justify-between text-amber-400"><span>Respect:</span><span>+{infoGoal?.reward.respect}</span></div>
                    <div className="flex justify-between text-blue-400"><span>XP:</span><span>+{infoGoal?.reward.xp}</span></div>
                  </div>
                  <p className="text-slate-300">{infoGoal?.howTo}</p>
                </>
              )}
              <Button onClick={() => setInfoGoalId(null)} className="w-full bg-amber-600 hover:bg-amber-500 text-xs h-7">
                GOT IT
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Claim Modal */}
      {claimedRewards && (
        <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
          <DialogContent className="bg-[#0a0f1a] border-amber-900/40 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-amber-400">{claimedRewards.goalLabel} Claimed!</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="text-center text-4xl mb-2">🎁</div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-green-400">
                  <span>Cash:</span>
                  <span>+${claimedRewards.totalCash}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Respect:</span>
                  <span>+{claimedRewards.totalRespect}</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>XP:</span>
                  <span>+{claimedRewards.totalXP}</span>
                </div>
              </div>

              <Button
                onClick={() => setShowClaimModal(false)}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                AWESOME!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlreadyClaimedPopup
        open={showAlreadyClaimed}
        onClose={() => setShowAlreadyClaimed(false)}
        message={alreadyClaimedMsg || "You've already claimed this reward today. Check back after the daily server reset."}
      />
    </>
  );
}