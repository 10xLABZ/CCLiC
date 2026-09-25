/**
 * syncAllianceTag — Server-side propagation of alliance tag changes.
 *
 * When a leader renames the alliance tag, or when a member is kicked/leaves,
 * the alliance_tag stored on each member's PlayerProfile must be updated.
 * Client-side updates fail due to RLS (users can only update their own profile).
 * This function runs as service role to bypass RLS and sync all members.
 *
 * Payload:
 *   alliance_id: string   — The alliance to sync
 *   tag: string | null    — The new tag, or null to clear (kick/leave/disband)
 *   clear_user_id: string — (Optional) Clear this specific user's tag only
 *                           (used when kicking a member who's already removed from AllianceMember)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { alliance_id, tag, clear_user_id } = body;

    // If clearing a specific user's tag (e.g. kicked member)
    if (clear_user_id) {
      try {
        const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({
          user_id: clear_user_id,
        });
        if (profiles.length > 0) {
          await base44.asServiceRole.entities.PlayerProfile.update(profiles[0].id, {
            alliance_tag: null,
          });
        }
        return Response.json({ success: true, cleared_user: clear_user_id });
      } catch (e) {
        return Response.json({ error: e.message, success: false }, { status: 500 });
      }
    }

    if (!alliance_id) {
      return Response.json({ error: 'Missing alliance_id' }, { status: 400 });
    }

    // Fetch all members of this alliance
    const members = await base44.asServiceRole.entities.AllianceMember.filter({
      alliance_id,
    });

    if (members.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No members found' });
    }

    // Update each member's PlayerProfile.alliance_tag
    const updates = members.map(async (m) => {
      try {
        const profiles = await base44.asServiceRole.entities.PlayerProfile.filter({
          user_id: m.user_id,
        });
        if (profiles.length > 0) {
          await base44.asServiceRole.entities.PlayerProfile.update(profiles[0].id, {
            alliance_tag: tag || null,
          });
          return { user_id: m.user_id, success: true };
        }
        return { user_id: m.user_id, success: false, reason: 'No profile found' };
      } catch (e) {
        return { user_id: m.user_id, success: false, reason: e.message };
      }
    });

    const results = await Promise.all(updates);
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    return Response.json({
      success: true,
      updated: succeeded,
      failed: failed.length,
      failures: failed,
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}