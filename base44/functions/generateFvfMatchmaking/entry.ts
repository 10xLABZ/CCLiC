import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Compute ET-based date, week start, and day theme ─────────────────────
    const now = new Date();
    const etFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const etParts = etFmt.formatToParts(now);
    const etYear = etParts.find(p => p.type === 'year').value;
    const etMonth = etParts.find(p => p.type === 'month').value;
    const etDay = etParts.find(p => p.type === 'day').value;
    const etWeekday = etParts.find(p => p.type === 'weekday').value;
    const todayISO = `${etYear}-${etMonth}-${etDay}`;
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[etWeekday];
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayDate = new Date(todayISO + 'T12:00:00Z');
    mondayDate.setUTCDate(mondayDate.getUTCDate() - daysSinceMonday);
    const weekStart = mondayDate.toISOString().split('T')[0];

    // ── Determine current day theme ─────────────────────────────────────────
    const dayThemes = ['intel_day', 'firearm_dev_day', 'research_day', 'avatar_accessory_day', 'full_prep_day', 'battle_day'];
    const todayIdx = dayOfWeek === 0 ? -1 : dayOfWeek - 1;
    const currentDayTheme = todayIdx >= 0 && todayIdx < 6 ? dayThemes[todayIdx] : 'cooldown';

    // ── Fetch all alliances ───────────────────────────────────────────────────
    const alliances = await base44.asServiceRole.entities.Alliance.list();

    const BOT_ALLIANCE_TAGS = ['RKR', 'EMT', 'SHC', 'ISY', 'REM', 'CKG', 'TCR'];
    const isBotAlliance = (a) => BOT_ALLIANCE_TAGS.includes(a.tag) || a.is_bot === true || (a.leader_user_id && a.leader_user_id.startsWith('bot_'));
    const humanAlliances = alliances.filter(a => !isBotAlliance(a));
    const botAlliances = alliances.filter(a => isBotAlliance(a));

    // ── Build rematch blacklist from previous 3 weeks ───────────────────────
    // Rule: no alliance pair can be rematched within 3 weeks of their last matchup.
    // Week 4+ is acceptable if they happen to be randomly matched again.
    const rematchBlacklist = {};
    const prevEvents = await base44.asServiceRole.entities.FvFEvent.list('-week_start_date', 50);
    const pastWeeks = prevEvents.filter(ev => ev.week_start_date !== weekStart && ev.matchmaking_brackets).slice(0, 3);
    for (const ev of pastWeeks) {
      try {
        const pastBrackets = JSON.parse(ev.matchmaking_brackets);
        for (const b of pastBrackets) {
          if (!rematchBlacklist[b.alliance_a_id]) rematchBlacklist[b.alliance_a_id] = new Set();
          if (!rematchBlacklist[b.alliance_b_id]) rematchBlacklist[b.alliance_b_id] = new Set();
          rematchBlacklist[b.alliance_a_id].add(b.alliance_b_id);
          rematchBlacklist[b.alliance_b_id].add(b.alliance_a_id);
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // ── Deterministic pseudo-random for consistent daily target per bot ──────
    const seededRand = (seedStr) => {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
      }
      return (Math.abs(Math.sin(hash)) * 10000) % 1;
    };

    // ── Simulate bot FvF scores — 4-tier daily distribution ────────────────
    // Each bot alliance rolls a deterministic daily target within its group's
    // range (rounded to nearest 100). Points are distributed via 4 cumulative
    // tiers at specific ET times: 20% @ 02:00, 30% @ 12:00, 10% @ 18:00,
    // 40% @ 23:00. On Battle Day, the target is reduced to 5–10% of normal.
    const etHourFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
    const etHourStr = etHourFmt.format(now);
    const etHour = etHourStr === '24' ? 0 : parseInt(etHourStr);

    let cumulativePct = 0;
    if (etHour >= 2 && etHour < 12) cumulativePct = 0.20;
    else if (etHour >= 12 && etHour < 18) cumulativePct = 0.50;   // 20 + 30
    else if (etHour >= 18 && etHour < 23) cumulativePct = 0.60;   // 20 + 30 + 10
    else if (etHour >= 23) cumulativePct = 1.00;                  // 20 + 30 + 10 + 40
    // 0:00–1:59 ET: cumulativePct stays 0 (new day, no score yet)

    // ── Per-alliance-group daily score ranges ──────────────────────────────
    const BOT_SCORE_RANGES: Record<string, { min: number; max: number }> = {
      TCR: { min: 5000000, max: 15000000 },
      CKG: { min: 2500000, max: 7500000 },
      REM: { min: 750000, max: 4500000 },
      ISY: { min: 750000, max: 4500000 },
      SHC: { min: 100000, max: 2500000 },
      EMT: { min: 100000, max: 2500000 },
      RKR: { min: 100000, max: 2500000 },
    };

    let botScoresCreated = 0;
    let botScoresUpdated = 0;

    // Skip bot score simulation on Sunday cooldown or before first tier.
    if (currentDayTheme !== 'cooldown' && cumulativePct > 0) {
    for (const bot of botAlliances) {
      const botScores = await base44.asServiceRole.entities.FvFScore.filter({
        user_id: bot.leader_user_id,
        event_week_start: weekStart,
        event_date: todayISO,
      });

      const range = BOT_SCORE_RANGES[bot.tag] || { min: 100000, max: 2500000 };
      const rand = seededRand(bot.id + todayISO + weekStart);
      let dailyTarget = Math.round((range.min + rand * (range.max - range.min)) / 100) * 100;

      // Battle Day: reduce target to 5–10% of normal range (separate roll)
      if (currentDayTheme === 'battle_day') {
        const battleRoll = seededRand(bot.id + todayISO + weekStart + 'battle');
        const battleMultiplier = 0.05 + battleRoll * (0.10 - 0.05);
        dailyTarget = Math.round((dailyTarget * battleMultiplier) / 100) * 100;
      }

      const targetPoints = Math.round((dailyTarget * cumulativePct) / 100) * 100;

      if (botScores.length === 0) {
        // No score yet — create at current tier level
        await base44.asServiceRole.entities.FvFScore.create({
          user_id: bot.leader_user_id,
          username: bot.leader_username || bot.name,
          alliance_id: bot.id,
          alliance_tag: bot.tag,
          event_week_start: weekStart,
          event_date: todayISO,
          day_theme: currentDayTheme,
          points: targetPoints,
          is_bot: true,
        });
        botScoresCreated++;
      } else {
        // Score exists — sync to current tier target (handles tier upgrades
        // AND corrections when scores are above target, e.g. day theme change)
        const score = botScores[0];
        if (score.points !== targetPoints) {
          await base44.asServiceRole.entities.FvFScore.update(score.id, {
            points: targetPoints,
          });
          botScoresUpdated++;
        }
      }
    }
    }

    // ── Check if event already exists for this week ─────────────────────────
    const existing = await base44.asServiceRole.entities.FvFEvent.filter({ week_start_date: weekStart });
    if (existing.length > 0 && existing[0].matchmaking_brackets) {
      // Always sync current_day_theme to today's server-derived theme so the
      // stored field advances daily (the 3x-daily workflow calls this function).
      // Without this, the field stays frozen on Monday for the whole week.
      let updatedEvent = existing[0];
      if (existing[0].current_day_theme !== currentDayTheme) {
        updatedEvent = await base44.asServiceRole.entities.FvFEvent.update(existing[0].id, {
          current_day_theme: currentDayTheme,
        });
      }
      return Response.json({
        success: true,
        message: 'Matchmaking already done for this week',
        event: updatedEvent,
        botScoresCreated,
        botScoresUpdated,
        botCount: botAlliances.length,
      });
    }

    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const brackets = [];
    const matchedHumanIds = new Set();
    const usedBotIds = new Set();

    // ── Step 1: Match humans vs humans first, avoiding 3-week blacklist ─────
    const shuffledHumans = shuffle(humanAlliances);

    for (const human of shuffledHumans) {
      if (matchedHumanIds.has(human.id)) continue;

      const blacklisted = rematchBlacklist[human.id] || new Set();
      // Find a non-blacklisted, unmatched human opponent
      const availableHumans = shuffledHumans.filter(h =>
        h.id !== human.id &&
        !matchedHumanIds.has(h.id) &&
        !blacklisted.has(h.id)
      );

      if (availableHumans.length > 0) {
        const opponent = availableHumans[Math.floor(Math.random() * availableHumans.length)];
        brackets.push({ alliance_a_id: human.id, alliance_b_id: opponent.id, tier: 'human_vs_human' });
        matchedHumanIds.add(human.id);
        matchedHumanIds.add(opponent.id);
      }
    }

    // ── Step 2: Remaining humans → match vs bots (same 3-week blacklist) ────
    const humansNeedingBots = humanAlliances.filter(a => !matchedHumanIds.has(a.id));

    for (const human of humansNeedingBots) {
      const blacklisted = rematchBlacklist[human.id] || new Set();
      // Prefer non-blacklisted bots
      let availableBots = botAlliances.filter(b => !usedBotIds.has(b.id) && !blacklisted.has(b.id));
      // Fall back to any unused bot (blacklisted but no alternative)
      if (availableBots.length === 0) {
        availableBots = botAlliances.filter(b => !usedBotIds.has(b.id));
      }
      if (availableBots.length > 0) {
        const opponent = availableBots[Math.floor(Math.random() * availableBots.length)];
        brackets.push({ alliance_a_id: human.id, alliance_b_id: opponent.id, tier: 'human_vs_bot' });
        usedBotIds.add(opponent.id);
        matchedHumanIds.add(human.id);
      }
    }

    // ── Step 3: Last resort — allow blacklisted human rematches if no bots ──
    const stillUnmatched = shuffle(humanAlliances.filter(a => !matchedHumanIds.has(a.id)));
    while (stillUnmatched.length >= 2) {
      const a = stillUnmatched.shift();
      const b = stillUnmatched.find(h => h.id !== a.id);
      if (!b) break;
      const bIdx = stillUnmatched.indexOf(b);
      stillUnmatched.splice(bIdx, 1);
      brackets.push({ alliance_a_id: a.id, alliance_b_id: b.id, tier: 'human_vs_human' });
      matchedHumanIds.add(a.id);
      matchedHumanIds.add(b.id);
    }

    // ── Create or update FvFEvent ────────────────────────────────────────────
    if (existing.length > 0) {
      const updated = await base44.asServiceRole.entities.FvFEvent.update(existing[0].id, {
        status: 'active',
        current_day_theme: currentDayTheme,
        matchmaking_brackets: JSON.stringify(brackets),
        total_alliances: humanAlliances.length,
        rewards_distributed: false,
      });
      return Response.json({ success: true, event: updated, brackets, humanCount: humanAlliances.length, botCount: botAlliances.length, botScoresCreated, botScoresUpdated });
    } else {
      const event = await base44.asServiceRole.entities.FvFEvent.create({
        week_start_date: weekStart,
        status: 'active',
        current_day_theme: currentDayTheme,
        matchmaking_brackets: JSON.stringify(brackets),
        total_alliances: humanAlliances.length,
        rewards_distributed: false,
      });
      return Response.json({ success: true, event, brackets, humanCount: humanAlliances.length, botCount: botAlliances.length, botScoresCreated, botScoresUpdated });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});