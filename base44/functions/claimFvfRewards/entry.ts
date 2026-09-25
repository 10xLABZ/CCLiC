/**
 * claimFvfRewards — Atomic server-side FvF event reward delivery.
 *
 * The winner is computed SERVER-SIDE from FvFScore records and the
 * matchmaking brackets stored on FvFEvent. The client's is_winner
 * flag is IGNORED — this prevents the exploit where a player could
 * claim winning rewards regardless of the actual outcome.
 *
 * Scoring logic (replicated from the client):
 *   - 6 daily themes: intel_day, firearm_dev_day, research_day,
 *     avatar_accessory_day, full_prep_day, battle_day
 *   - Each day, the alliance with more raw points wins 2 event pts
 *     (battle_day = 4 pts). A tie awards 0 to either side.
 *   - Weekly winner = alliance with more total event pts.
 *   - A weekly tie → both alliances receive LOSING rewards.
 *
 * This function atomically:
 *   1. Checks idempotency (SystemMessage reward_claimed lock)
 *   2. Computes the winner server-side
 *   3. Records the claim
 *   4. Delivers IGC (cash) to PlayerProfile
 *   5. Delivers consumables (boosts, shards, gear parts) to PlayerInventory
 *   6. Returns updated authoritative values
 *
 * Payload:
 *   week_start_date: string  (ISO date of the event week Monday)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const WINNING_REWARDS = [
  { type: 'consumable', key: 'OPCOVER_25', amount: 6 },
  { type: 'consumable', key: 'STAMINA_25', amount: 6 },
  { type: 'consumable', key: 'ENERGY_25', amount: 6 },
  { type: 'consumable', key: 'AVATAR_SHARD', amount: 2 },
  { type: 'consumable', key: 'GEAR_SHARD', amount: 3 },
  { type: 'igc', field: 'cash', amount: 50000 },
];

const LOSING_REWARDS = [
  { type: 'consumable', key: 'OPCOVER_25', amount: 2 },
  { type: 'consumable', key: 'STAMINA_25', amount: 2 },
  { type: 'consumable', key: 'ENERGY_25', amount: 2 },
  { type: 'consumable', key: 'GEAR_SHARD', amount: 1 },
  { type: 'igc', field: 'cash', amount: 5000 },
];

const DAILY_THEMES = [
  'intel_day', 'firearm_dev_day', 'research_day',
  'avatar_accessory_day', 'full_prep_day', 'battle_day',
];
const DAY_POINTS: Record<string, number> = { default: 2, battle_day: 4 };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { week_start_date } = body;

    if (!week_start_date) {
      return Response.json({ error: 'Missing week_start_date' }, { status: 400 });
    }

    const rewardKey = `fvf_event_${week_start_date}`;

    // ── 1. Idempotency check ──────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.SystemMessage.filter({
      user_id: user.id,
      type: 'reward_claimed',
      item_id: rewardKey,
    });

    if (existing.length > 0) {
      return Response.json({ success: false, already_claimed: true, error: 'Reward already claimed' });
    }

    // ── 2. Server-authoritative winner determination ───────────────────
    // Get the player's alliance membership
    const memberships = await base44.asServiceRole.entities.AllianceMember.filter({
      user_id: user.id,
    });
    if (memberships.length === 0) {
      return Response.json({
        success: false,
        error: 'You are not in an alliance.',
      }, { status: 400 });
    }
    const myAllianceId = memberships[0].alliance_id;

    // Get the FvF event for this week
    const events = await base44.asServiceRole.entities.FvFEvent.filter({
      week_start_date,
    });
    if (events.length === 0) {
      return Response.json({
        success: false,
        error: 'FvF event not found for this week.',
      }, { status: 400 });
    }
    const event = events[0];

    // Parse matchmaking brackets and find our pair
    let brackets: any[] = [];
    try { brackets = JSON.parse(event.matchmaking_brackets || '[]'); } catch {}
    const myBracket = brackets.find(
      (b: any) => b.alliance_a_id === myAllianceId || b.alliance_b_id === myAllianceId
    );
    if (!myBracket) {
      return Response.json({
        success: false,
        error: 'Your alliance was not matched this week.',
      }, { status: 400 });
    }

    const oppAllianceId = myBracket.alliance_a_id === myAllianceId
      ? myBracket.alliance_b_id
      : myBracket.alliance_a_id;

    // Fetch FvFScore records for both alliances this week
    const myScores = await base44.asServiceRole.entities.FvFScore.filter(
      { alliance_id: myAllianceId, event_week_start: week_start_date },
      '-created_date', 100
    );
    const oppScores = await base44.asServiceRole.entities.FvFScore.filter(
      { alliance_id: oppAllianceId, event_week_start: week_start_date },
      '-created_date', 100
    );

    // Compute per-day totals for both alliances
    const myDayTotals: Record<string, number> = {};
    const oppDayTotals: Record<string, number> = {};
    DAILY_THEMES.forEach(t => { myDayTotals[t] = 0; oppDayTotals[t] = 0; });

    myScores.forEach((s: any) => {
      if (myDayTotals[s.day_theme] !== undefined) {
        myDayTotals[s.day_theme] += (s.points || 0);
      }
    });
    oppScores.forEach((s: any) => {
      if (oppDayTotals[s.day_theme] !== undefined) {
        oppDayTotals[s.day_theme] += (s.points || 0);
      }
    });

    // Determine day winners and event points
    let myEventPts = 0, oppEventPts = 0;
    DAILY_THEMES.forEach(t => {
      const myPts = myDayTotals[t] || 0;
      const oppPts = oppDayTotals[t] || 0;
      const reward = DAY_POINTS[t] ?? DAY_POINTS.default;
      if (myPts > oppPts) { myEventPts += reward; }
      else if (oppPts > myPts) { oppEventPts += reward; }
      // tie → 0 to either side
    });

    // Strict greater-than: a weekly tie means both alliances get losing rewards
    const is_winner = myEventPts > oppEventPts;

    const rewards = is_winner ? WINNING_REWARDS : LOSING_REWARDS;

    // ── 3. Pre-fetch profile & inventory before locking ──────────────
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    const inventories = await base44.asServiceRole.entities.PlayerInventory.filter({ user_id: user.id });

    if (profiles.length === 0) {
      return Response.json({
        success: false,
        error: 'Player profile not found. Please complete onboarding and try again.',
      }, { status: 400 });
    }

    // ── 4. Create the idempotency lock ────────────────────────────────
    const lockRecord = await base44.asServiceRole.entities.SystemMessage.create({
      user_id: user.id,
      type: 'reward_claimed',
      title: 'fvf_event reward claimed',
      body: `Claimed fvf_event reward (${rewardKey})`,
      item_id: rewardKey,
      item_name: 'fvf_event',
      category: 'fvf_event',
      is_consumable: false,
      restored: false,
      timestamp: Date.now(),
      meta: JSON.stringify({
        cycle_id: rewardKey,
        is_winner: !!is_winner,
        my_event_pts: myEventPts,
        opp_event_pts: oppEventPts,
        claimed_at: new Date().toISOString(),
      }),
    });

    // Helper: if reward delivery fails, delete the lock so the user can retry
    const rollbackLock = async () => {
      try {
        await base44.asServiceRole.entities.SystemMessage.delete(lockRecord.id);
      } catch {}
    };

    // ── 5. Deliver IGC (cash) to PlayerProfile ────────────────────────
    const igcReward = rewards.find(r => r.type === 'igc');
    let newCash = null;

    if (igcReward && igcReward.field === 'cash') {
      const profile = profiles[0];
      newCash = (profile.cash || 0) + igcReward.amount;
      try {
        await base44.asServiceRole.entities.PlayerProfile.update(profile.id, { cash: newCash });
      } catch (err) {
        await rollbackLock();
        return Response.json({
          success: false,
          error: 'Failed to deliver cash reward. Please try again.',
        }, { status: 500 });
      }
    }

    // ── 6. Deliver consumables to PlayerInventory ─────────────────────
    const consumableGrants: Record<string, number> = {};
    for (const r of rewards) {
      if (r.type === 'consumable') {
        consumableGrants[r.key] = (consumableGrants[r.key] || 0) + r.amount;
      }
    }

    let newConsumables = null;
    if (Object.keys(consumableGrants).length > 0) {
      if (inventories.length === 0) {
        await rollbackLock();
        return Response.json({
          success: false,
          error: 'Player inventory not found. Please try again later.',
        }, { status: 400 });
      }

      // Pick the inventory record with the most items (dedup)
      const inv = inventories.reduce((best, current) => {
        if (!best) return current;
        const bestCount = Object.values(best)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        const currCount = Object.values(current)
          .filter(v => typeof v === 'object' && v !== null)
          .reduce((sum, cat) => sum + (cat ? Object.keys(cat).length : 0), 0);
        return currCount > bestCount ? current : best;
      }, null);

      const updatedConsumables = { ...(inv.consumables || {}) };
      for (const [key, qty] of Object.entries(consumableGrants)) {
        updatedConsumables[key] = (updatedConsumables[key] || 0) + qty;
      }

      try {
        await base44.asServiceRole.entities.PlayerInventory.update(inv.id, {
          consumables: updatedConsumables,
        });
      } catch (err) {
        await rollbackLock();
        return Response.json({
          success: false,
          error: 'Failed to deliver consumable rewards. Please try again.',
        }, { status: 500 });
      }

      // Delete any duplicate inventory records
      const dupes = inventories.filter(i => i.id !== inv.id);
      for (const dup of dupes) {
        base44.asServiceRole.entities.PlayerInventory.delete(dup.id).catch(() => {});
      }

      newConsumables = updatedConsumables;
    }

    return Response.json({
      success: true,
      already_claimed: false,
      is_winner,
      my_event_pts: myEventPts,
      opp_event_pts: oppEventPts,
      new_cash: newCash,
      new_consumables: newConsumables,
      rewards_delivered: rewards,
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}