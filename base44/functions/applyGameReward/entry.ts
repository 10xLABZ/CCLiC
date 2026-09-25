/**
 * applyGameReward — atomic server-side reward/deduction handler.
 *
 * Used by battles, jobs, trades, and any game event that changes:
 *   cash, crypto (cryd), energy, stamina, op_cover, respect, xp
 *
 * All changes are DELTAS (positive = gain, negative = spend).
 * The server reads the current balance, applies the delta, enforces
 * floor of 0, and writes back. This prevents any stale client data
 * from overwriting the real balance.
 *
 * Payload:
 *   cash_delta:     number  (optional)
 *   crypto_delta:   number  (optional)
 *   energy_delta:   number  (optional, floored at 0, capped at 100)
 *   stamina_delta:  number  (optional, floored at 0, capped at 100)
 *   op_cover_delta: number  (optional, floored at 0, capped at 100)
 *   respect_delta:  number  (optional, floored at 0)
 *   xp_delta:       number  (optional)
 *   reason:         string  (for audit logging)
 *   stat_fields:    object  (optional — non-resource stat updates: winstreak, losstreak, etc.)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    cash_delta = 0,
    crypto_delta = 0,
    energy_delta = 0,
    stamina_delta = 0,
    op_cover_delta = 0,
    respect_delta = 0,
    xp_delta = 0,
    vip_xp_delta = 0,
    reason = 'game_action',
    stat_fields = {},
    fvf_actions = [],
  } = body;

  // Fetch current profile
  const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
  if (profiles.length === 0) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  const profile = profiles[0];

  // --- Daily reset check ---
  // If the server date has changed, zero out daily counters BEFORE processing
  // any stat_fields. When the client sends absolute values like
  // trades_completed_today: 31 (old count 30 + 1), we adjust to just the
  // delta (1) so the new day starts fresh.
  const todayStr = new Date().toISOString().split('T')[0];
  const needsDailyReset = profile.last_daily_reset !== todayStr;
  const preResetCounters = needsDailyReset ? {
    trades: profile.trades_completed_today || 0,
    jobs: profile.jobs_completed_today || 0,
    warswon: profile.trade_wars_won_today || 0,
  } : null;

  // --- VIP buff: level-based % on positive cash earnings (trades, jobs, battles) ---
  const isVipActive = (profile.vip_active_until || 0) > Date.now();
  const VIP_XP_THRESHOLDS = [0,2000,5000,8000,12000,18000,25000,33000,42000,55000,70000,85000,100000,115000,130000,150000,175000,200000,240000,300000];
  const VIP_STAT_BONUS: Record<number, number> = {1:5,2:5,3:5,4:5,5:5,6:5,7:5,8:5,9:5,10:10,11:10,12:11,13:11,14:12,15:12,16:13,17:13,18:15,19:19,20:25};
  let vipLevel = 1;
  for (let i = VIP_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if ((profile.vip_xp || 0) >= VIP_XP_THRESHOLDS[i]) { vipLevel = i + 1; break; }
  }
  const vipBuffPct = isVipActive ? (VIP_STAT_BONUS[vipLevel] || 5) : 0;
  let adjustedCashDelta = cash_delta;
  if (vipBuffPct > 0 && cash_delta > 0) {
    adjustedCashDelta = Math.round(cash_delta * (1 + vipBuffPct / 100) * 100) / 100;
  }

  // --- Apply deltas server-side (server is source of truth) ---
  const update = {};

  if (adjustedCashDelta !== 0) {
    const newCash = (profile.cash || 0) + adjustedCashDelta;
    if (cash_delta < 0 && newCash < 0) {
      return Response.json({ error: 'Insufficient cash', code: 'INSUFFICIENT_CASH' }, { status: 400 });
    }
    update.cash = Math.max(0, newCash);
  }

  if (crypto_delta !== 0) {
    const newCrypto = (profile.crypto || 0) + crypto_delta;
    if (crypto_delta < 0 && newCrypto < 0) {
      return Response.json({ error: 'Insufficient CRYD', code: 'INSUFFICIENT_CRYD' }, { status: 400 });
    }
    update.crypto = Math.max(0, newCrypto);
  }

  if (energy_delta !== 0) {
    const currentEnergy = profile.energy != null ? profile.energy : 100;
    update.energy = Math.max(0, Math.min(100, currentEnergy + energy_delta));
    update.last_energy_timestamp = Date.now();
  }

  if (stamina_delta !== 0) {
    const currentStamina = profile.stamina != null ? profile.stamina : 100;
    update.stamina = Math.max(0, Math.min(100, currentStamina + stamina_delta));
    update.last_stamina_timestamp = Date.now();
  }

  if (op_cover_delta !== 0) {
    const currentOpCover = profile.op_cover != null ? profile.op_cover : 100;
    update.op_cover = Math.max(0, Math.min(100, currentOpCover + op_cover_delta));
    update.last_op_cover_timestamp = Date.now();
  }

  if (respect_delta !== 0) {
    update.respect = Math.max(0, (profile.respect || 0) + respect_delta);
  }

  if (xp_delta !== 0) {
    update.xp = Math.max(0, (profile.xp || 0) + xp_delta);
    // Recalculate level from total XP
    const newXP = update.xp;
    let level = 1;
    let xpRemaining = newXP;
    const getXPForLevel = (l) => {
      if (l <= 4) return 100;
      if (l <= 9) return 200;
      if (l <= 14) return 1000;
      if (l <= 20) return l * 100;
      if (l <= 30) return l * 150;
      if (l <= 40) return l * 300;
      if (l <= 50) return l * 500;
      return l * 1000;
    };
    while (true) {
      const needed = getXPForLevel(level);
      if (xpRemaining >= needed) { xpRemaining -= needed; level++; } else break;
    }
    update.level = Math.max(1, level);
  }

  if (vip_xp_delta !== 0) {
    update.vip_xp = Math.max(0, (profile.vip_xp || 0) + vip_xp_delta);
    // Recalculate VIP level from total VIP XP
    const newVipXp = update.vip_xp;
    let newVipLevel = 1;
    for (let i = VIP_XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (newVipXp >= VIP_XP_THRESHOLDS[i]) { newVipLevel = i + 1; break; }
    }
    update.vip_level = newVipLevel;
  }

  // Merge in any non-resource stat fields (winstreak, losstreak, jobs_completed_today, etc.)
  // Only allow safe stat fields — never allow cash/crypto overrides via this path
  const ALLOWED_STAT_FIELDS = [
    'winstreak', 'losstreak', 'total_trade_war_wins', 'total_trade_war_losses',
    'total_jobs_completed', 'jobs_completed_today', 'trades_completed_today',
    'trade_wars_won_today', 'total_assists', 'total_sabotages', 'sabotages_remaining',
    'last_sabotage_regen_timestamp', 'shield_active_until', 'shield_type',
    'hidden_until', 'last_attacked_by', 'total_trades_completed', 'total_trading_profit',
    'last_claim_date', 'last_vip_daily_claim_date', 'fund_members_owned', 'vip_active_until',
  ];

  // Cumulative stats: client sends a DELTA (e.g., +1). Server increments from
  // its own current value. This prevents stale local cache from overwriting
  // real server totals.
  const CUMULATIVE_STAT_FIELDS = [
    'total_jobs_completed', 'total_trades_completed', 'total_trading_profit',
    'total_trade_war_wins', 'total_trade_war_losses',
    'total_assists', 'total_sabotages', 'fund_members_owned',
  ];

  // Daily counters: client sends a DELTA (e.g., +1). On daily reset, the
  // counter is zeroed first, then the delta is set. Otherwise, increment.
  const DAILY_COUNTER_FIELDS = ['trades_completed_today', 'jobs_completed_today', 'trade_wars_won_today'];

  for (const [key, val] of Object.entries(stat_fields)) {
    if (!ALLOWED_STAT_FIELDS.includes(key)) continue;

    if (DAILY_COUNTER_FIELDS.includes(key)) {
      if (needsDailyReset) {
        // Counter was zeroed by daily reset — just set to the delta
        update[key] = Math.max(0, val);
      } else {
        // No reset — increment from server's current value
        update[key] = (profile[key] || 0) + val;
      }
      continue;
    }

    if (CUMULATIVE_STAT_FIELDS.includes(key)) {
      // Cumulative: increment server value by client delta
      update[key] = (profile[key] || 0) + val;
    } else {
      // Non-cumulative: set absolute value (winstreak, losstreak, shields, etc.)
      update[key] = val;
    }
  }

  // Zero out any daily counters that weren't in stat_fields
  if (needsDailyReset) {
    if (!('trades_completed_today' in update)) update.trades_completed_today = 0;
    if (!('jobs_completed_today' in update)) update.jobs_completed_today = 0;
    if (!('trade_wars_won_today' in update)) update.trade_wars_won_today = 0;
    update.last_daily_reset = todayStr;
  }

  if (Object.keys(update).length > 0) {
    await base44.asServiceRole.entities.PlayerProfile.update(profile.id, update);
  }

  // ── FvF Event Point Tracking ──────────────────────────────────────────
  // After applying resource changes, track FvF points for qualifying actions.
  // Wrapped in try-catch so FvF errors never break the main reward flow.
  try {
    const fvfNow = new Date();

    // Fetch the current FvF event for the week_start_date (source of truth
    // for which week we're in).  Then calculate the correct day theme from
    // the event's week_start_date relative to today's date in the player's
    // timezone (America/New_York), NOT from the stored current_day_theme
    // field (which can go stale if no automation updates it daily) and NOT
    // from raw UTC (which can be off by a day vs ET).
    const fvfEvents = await base44.asServiceRole.entities.FvFEvent.list('-created_date', 1);
    const currentEvent = fvfEvents[0] || null;

    const dayThemes = ['intel_day', 'firearm_dev_day', 'research_day', 'avatar_accessory_day', 'full_prep_day', 'battle_day'];
    let currentDayTheme = 'cooldown';
    let weekStart = '';

    // ET date string (YYYY-MM-DD) — used for both day-theme calculation and
    // FvFScore event_date tagging, so both use the same midnight-ET boundary.
    const etDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(fvfNow);

    if (currentEvent) {
      weekStart = currentEvent.week_start_date;
      const weekStartMs = new Date(weekStart + 'T00:00:00').getTime();
      const etDateMs = new Date(etDateStr + 'T00:00:00').getTime();
      const daysDiff = Math.round((etDateMs - weekStartMs) / (24 * 60 * 60 * 1000));
      if (daysDiff >= 0 && daysDiff < 6) {
        currentDayTheme = dayThemes[daysDiff];
      }
      // daysDiff === 6 (Sunday) → cooldown (default)
    }

    if (currentDayTheme !== 'cooldown') {
      const FVF_SCORING: Record<string, any> = {
        intel_day: { energyStaminaPerUnit: 200, insiderTradePerTrade: 100, crydPerUnit: 100 },
        firearm_dev_day: { energyStaminaPerUnit: 100, firearmShardPerUnit: 500, hqUpgradePerLevel: 2500, crydPerUnit: 100 },
        research_day: { insiderTradePerTrade: 100, crydPerUnit: 100, researchSpendPer1000: 100, researchTierUnlock: { 1: 500, 2: 1500, 3: 4000 }, hqUpgradePerLevel: 2500 },
        avatar_accessory_day: { avatarShardPerUnit: 2500, accessoryShardPerUnit: 500, crydPerUnit: 100 },
        full_prep_day: { insiderTradePerTrade: 100, firearmShardPerUnit: 500, accessoryShardPerUnit: 500, avatarShardPerUnit: 2500, crydPerUnit: 100 },
        battle_day: { battleWinPerWin: 100, battleMemberDefeatPerWin: 2500, crydPerUnit: 100 },
      };

      const scoring = FVF_SCORING[currentDayTheme];
      let fvfPoints = 0;

      // CRYD spent (upgrades, purchases via applyGameReward, etc.)
      // Auto-tracked from crypto_delta — covers ALL CRYD spending, not just
      // explicit cryd_purchase fvf_actions. Shop purchases via processPurchase
      // have their own separate FvF tracking.
      if (crypto_delta < 0 && scoring.crydPerUnit) {
        fvfPoints += Math.abs(crypto_delta) * scoring.crydPerUnit;
      }

      // Energy/stamina spent (only count negative deltas = spending)
      if (scoring.energyStaminaPerUnit) {
        const energySpent = energy_delta < 0 ? Math.abs(energy_delta) : 0;
        const staminaSpent = stamina_delta < 0 ? Math.abs(stamina_delta) : 0;
        fvfPoints += (energySpent + staminaSpent) * scoring.energyStaminaPerUnit;
      }

      // Insider trades
      if (scoring.insiderTradePerTrade) {
        if (reason === 'insider_trade') {
          fvfPoints += scoring.insiderTradePerTrade;
        } else if (reason === 'insider_trade_all') {
          // Each trade costs 2 energy, so trade count = |energy_delta| / 2
          const energySpent = energy_delta < 0 ? Math.abs(energy_delta) : 0;
          const tradeCount = Math.round(energySpent / 2);
          fvfPoints += tradeCount * scoring.insiderTradePerTrade;
        }
      }

      // Battle wins
      if (scoring.battleWinPerWin && reason === 'battle_win') {
        fvfPoints += scoring.battleWinPerWin;
      }

      // Structured FvF actions (firearm shards, avatar shards, HQ upgrades, CRYD purchases, etc.)
      if (Array.isArray(fvf_actions)) {
        for (const action of fvf_actions) {
          const { type, count = 1, amount = 0, levels = 1, tier = 0 } = action;
          switch (type) {
            case 'firearm_shard':
              if (scoring.firearmShardPerUnit) fvfPoints += count * scoring.firearmShardPerUnit;
              break;
            case 'hq_upgrade':
              if (scoring.hqUpgradePerLevel) fvfPoints += levels * scoring.hqUpgradePerLevel;
              break;
            case 'avatar_shard':
              if (scoring.avatarShardPerUnit) fvfPoints += count * scoring.avatarShardPerUnit;
              break;
            case 'accessory_shard':
              if (scoring.accessoryShardPerUnit) fvfPoints += count * scoring.accessoryShardPerUnit;
              break;
            case 'battle_member_defeat':
              if (scoring.battleMemberDefeatPerWin) fvfPoints += count * scoring.battleMemberDefeatPerWin;
              break;
            case 'research_spend':
              if (scoring.researchSpendPer1000) fvfPoints += Math.floor(amount / 1000) * scoring.researchSpendPer1000;
              break;
            case 'research_tier_unlock':
              if (scoring.researchTierUnlock) fvfPoints += (scoring.researchTierUnlock as Record<number, number>)[tier] || 0;
              break;
          }
        }
      }

      if (fvfPoints > 0) {
        // Use ET date (not UTC) so points earned late in the ET evening
        // land on the correct day's bucket. etDateStr is already computed
        // above in ET (YYYY-MM-DD) — matches the day_theme boundary exactly.
        const todayISO = etDateStr;

        // Get user's alliance membership
        const memberships = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: user.id });
        if (memberships.length > 0) {
          const membership = memberships[0];
          const alliance = await base44.asServiceRole.entities.Alliance.get(membership.alliance_id);

          // Apply FundResearch FvF point multiplier (alliance-wide bonus)
          try {
            const frRecords = await base44.asServiceRole.entities.FundResearch.filter({ alliance_id: membership.alliance_id });
            if (frRecords.length > 0) {
              const fr = frRecords[0];
              const bonusPct = fr.total_fvf_bonus_pct || 0;
              if (bonusPct > 0) {
                fvfPoints = Math.round(fvfPoints * (1 + bonusPct / 100));
              }
            }
          } catch (frErr) {
            console.error('FundResearch multiplier error:', frErr.message);
          }

          // Find existing FvFScore for this user+day
          const existingScores = await base44.asServiceRole.entities.FvFScore.filter({
            user_id: user.id,
            event_week_start: weekStart,
            event_date: todayISO,
          });

          if (existingScores.length > 0) {
            // Update existing score — accumulate points and re-tag day_theme
            // in case the record was mis-tagged by the old UTC-based logic.
            const existing = existingScores[0];
            await base44.asServiceRole.entities.FvFScore.update(existing.id, {
              points: (existing.points || 0) + fvfPoints,
              day_theme: currentDayTheme,
            });
          } else {
            // Create new score record
            await base44.asServiceRole.entities.FvFScore.create({
              user_id: user.id,
              username: user.full_name || membership.username || 'Unknown',
              alliance_id: membership.alliance_id,
              alliance_tag: alliance?.tag || '',
              event_week_start: weekStart,
              event_date: todayISO,
              day_theme: currentDayTheme,
              points: fvfPoints,
              is_bot: false,
            });
          }
        }
      }
    }
  } catch (fvfError) {
    // FvF tracking failure must never break the main reward flow
    console.error('FvF tracking error:', fvfError.message);
  }

  // Return the new authoritative values so the client can update localStorage
  if (Object.keys(update).length === 0 && (!Array.isArray(fvf_actions) || fvf_actions.length === 0)) {
    return Response.json({ success: true, message: 'No changes applied' });
  }

  // Collect updated stat values for the client to sync from
  const statUpdates = {};
  for (const key of Object.keys(update)) {
    if (ALLOWED_STAT_FIELDS.includes(key)) {
      statUpdates[key] = update[key];
    }
  }

  return Response.json({
    success: true,
    reason,
    new_cash: update.cash ?? profile.cash,
    new_cryd: update.crypto ?? profile.crypto,
    new_energy: update.energy ?? profile.energy,
    new_stamina: update.stamina ?? profile.stamina,
    new_op_cover: update.op_cover ?? profile.op_cover,
    new_respect: update.respect ?? profile.respect,
    new_xp: update.xp ?? profile.xp,
    new_level: update.level ?? profile.level,
    new_vip_xp: update.vip_xp ?? profile.vip_xp,
    new_vip_level: update.vip_level ?? profile.vip_level ?? 1,
    // echo back timestamps so client can sync regen clocks
    last_energy_timestamp: update.last_energy_timestamp ?? profile.last_energy_timestamp,
    last_stamina_timestamp: update.last_stamina_timestamp ?? profile.last_stamina_timestamp,
    last_op_cover_timestamp: update.last_op_cover_timestamp ?? profile.last_op_cover_timestamp,
    // Authoritative stat values for client sync
    stat_updates: statUpdates,
  });
});