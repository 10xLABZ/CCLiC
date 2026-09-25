import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FUND_TIERS = [
  { tier: 1, researchBonus: 2.5,  breakthroughBonus: 2.5,  researchCost: 5_000_000,      breakthroughCost: 1000 },
  { tier: 2, researchBonus: 5,    breakthroughBonus: 5,    researchCost: 25_000_000,     breakthroughCost: 2500 },
  { tier: 3, researchBonus: 7.5,  breakthroughBonus: 7.5,  researchCost: 100_000_000,    breakthroughCost: 7500 },
  { tier: 4, researchBonus: 10,   breakthroughBonus: 10,   researchCost: 500_000_000,    breakthroughCost: 20000 },
  { tier: 5, researchBonus: 10,   breakthroughBonus: 10,   researchCost: 2_500_000_000,  breakthroughCost: 50000 },
  { tier: 6, researchBonus: 10,   breakthroughBonus: 20,   researchCost: 10_000_000_000, breakthroughCost: 125000 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { currency, amount } = body;

    if (currency !== 'cash' && currency !== 'cryd') {
      return Response.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const minAmount = currency === 'cash' ? 1000 : 50;
    if (!amount || amount < minAmount) {
      return Response.json({ error: `Minimum donation is ${minAmount.toLocaleString()} ${currency === 'cash' ? 'cash' : 'CRYD'}` }, { status: 400 });
    }

    // Get player profile
    const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const profile = profiles[0];

    // Check balance and deduct
    if (currency === 'cash') {
      if ((profile.cash || 0) < amount) {
        return Response.json({ error: 'Insufficient cash', code: 'INSUFFICIENT_CASH' }, { status: 400 });
      }
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, { cash: (profile.cash || 0) - amount });
    } else {
      if ((profile.crypto || 0) < amount) {
        return Response.json({ error: 'Insufficient CRYD', code: 'INSUFFICIENT_CRYD' }, { status: 400 });
      }
      await base44.asServiceRole.entities.PlayerProfile.update(profile.id, { crypto: (profile.crypto || 0) - amount });
    }

    // Get alliance membership
    const memberships = await base44.asServiceRole.entities.AllianceMember.filter({ user_id: user.id });
    if (memberships.length === 0) return Response.json({ error: 'Not in an alliance' }, { status: 400 });
    const membership = memberships[0];
    const allianceId = membership.alliance_id;

    // Get or create FundMember record
    let fundMemberRecords = await base44.asServiceRole.entities.FundMember.filter({ alliance_id: allianceId, user_id: user.id });
    let fundMember;
    if (fundMemberRecords.length > 0) {
      fundMember = fundMemberRecords[0];
    } else {
      fundMember = await base44.asServiceRole.entities.FundMember.create({
        alliance_id: allianceId,
        user_id: user.id,
        username: user.full_name || membership.username || 'Unknown',
        fundbux_balance: 0,
        total_donated_cash: 0,
        total_donated_cryd: 0,
      });
    }

    // Calculate FundBux earned (10 per $1000 or 50 CRYD)
    const fundbuxEarned = currency === 'cash'
      ? Math.floor(amount / 1000) * 10
      : Math.floor(amount / 50) * 10;

    // Update FundMember balance + totals
    const memberUpdate = {
      fundbux_balance: (fundMember.fundbux_balance || 0) + fundbuxEarned,
    };
    if (currency === 'cash') {
      memberUpdate.total_donated_cash = (fundMember.total_donated_cash || 0) + amount;
    } else {
      memberUpdate.total_donated_cryd = (fundMember.total_donated_cryd || 0) + amount;
    }
    await base44.asServiceRole.entities.FundMember.update(fundMember.id, memberUpdate);

    // Get or create FundResearch record
    let frRecords = await base44.asServiceRole.entities.FundResearch.filter({ alliance_id: allianceId });
    let fundResearch;
    if (frRecords.length > 0) {
      fundResearch = frRecords[0];
    } else {
      const alliance = await base44.asServiceRole.entities.Alliance.get(allianceId);
      fundResearch = await base44.asServiceRole.entities.FundResearch.create({
        alliance_id: allianceId,
        alliance_tag: alliance?.tag || '',
        current_tier: 1,
        phase: 'research',
        research_progress: 0,
        breakthrough_progress: 0,
        total_fvf_bonus_pct: 0,
      });
    }

    // Already complete
    if (fundResearch.phase === 'complete') {
      return Response.json({
        success: true,
        fundbux_earned: fundbuxEarned,
        fundbux_balance: memberUpdate.fundbux_balance,
        new_cash: currency === 'cash' ? (profile.cash || 0) - amount : profile.cash,
        new_cryd: currency === 'cryd' ? (profile.crypto || 0) - amount : profile.crypto,
        fund_research: fundResearch,
        message: 'Fund research is already fully complete!',
      });
    }

    const tierData = FUND_TIERS[fundResearch.current_tier - 1];
    const researchUpdate = {};
    let tierCompleted = false;
    let breakthroughCompleted = false;
    let bonusApplied = 0;
    let wrongPhase = false;

    if (currency === 'cash' && fundResearch.phase === 'research') {
      // Cash → research progress
      const newProgress = (fundResearch.research_progress || 0) + amount;
      if (newProgress >= tierData.researchCost) {
        researchUpdate.research_progress = newProgress;
        researchUpdate.phase = 'breakthrough';
        researchUpdate.total_fvf_bonus_pct = (fundResearch.total_fvf_bonus_pct || 0) + tierData.researchBonus;
        tierCompleted = true;
        bonusApplied = tierData.researchBonus;
      } else {
        researchUpdate.research_progress = newProgress;
      }
    } else if (currency === 'cryd' && fundResearch.phase === 'breakthrough') {
      // CRYD → breakthrough progress
      const newProgress = (fundResearch.breakthrough_progress || 0) + amount;
      if (newProgress >= tierData.breakthroughCost) {
        researchUpdate.breakthrough_progress = newProgress;
        researchUpdate.total_fvf_bonus_pct = (fundResearch.total_fvf_bonus_pct || 0) + tierData.breakthroughBonus;
        bonusApplied = tierData.breakthroughBonus;
        breakthroughCompleted = true;

        if (fundResearch.current_tier >= 6) {
          researchUpdate.phase = 'complete';
        } else {
          researchUpdate.current_tier = fundResearch.current_tier + 1;
          researchUpdate.phase = 'research';
          researchUpdate.research_progress = 0;
          researchUpdate.breakthrough_progress = 0;
        }
      } else {
        researchUpdate.breakthrough_progress = newProgress;
      }
    } else {
      // Donation doesn't match current phase — still earn FundBux
      wrongPhase = true;
    }

    if (Object.keys(researchUpdate).length > 0) {
      await base44.asServiceRole.entities.FundResearch.update(fundResearch.id, researchUpdate);
    }

    const updatedFundResearch = { ...fundResearch, ...researchUpdate };

    return Response.json({
      success: true,
      fundbux_earned: fundbuxEarned,
      fundbux_balance: memberUpdate.fundbux_balance,
      new_cash: currency === 'cash' ? (profile.cash || 0) - amount : profile.cash,
      new_cryd: currency === 'cryd' ? (profile.crypto || 0) - amount : profile.crypto,
      tier_completed: tierCompleted,
      breakthrough_completed: breakthroughCompleted,
      bonus_applied: bonusApplied,
      new_total_bonus: updatedFundResearch.total_fvf_bonus_pct,
      wrong_phase: wrongPhase,
      fund_research: updatedFundResearch,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});