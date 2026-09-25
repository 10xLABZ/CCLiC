import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const botAllianceTags = ['TCR', 'REM', 'SHC', 'ISY', 'CKG', 'EMT'];
    const results = {};

    for (const tag of botAllianceTags) {
      const alliances = await base44.entities.Alliance.filter({ tag });
      if (!alliances.length) {
        results[tag] = { success: false, error: 'Alliance not found' };
        continue;
      }

      const alliance = alliances[0];
      const members = await base44.entities.AllianceMember.filter({ alliance_id: alliance.id });

      // Fetch all member profiles and calculate real TP
      let realTotalPower = 0;
      for (const member of members) {
        const profiles = await base44.entities.PlayerProfile.filter({ user_id: member.user_id });
        if (profiles.length > 0) {
          const tp = (profiles[0].attack_value || 0) + (profiles[0].defense_value || 0);
          realTotalPower += tp;
        }
      }

      // Update alliance with real TP
      await base44.entities.Alliance.update(alliance.id, {
        total_power: realTotalPower,
        member_count: members.length
      });

      results[tag] = {
        success: true,
        alliance_id: alliance.id,
        old_tp: alliance.total_power,
        new_tp: realTotalPower,
        member_count: members.length
      };
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});