import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sanitize Leaderboard — Detects and converts ghost slots to Nemesis Bots.
 * A "ghost" slot is one where the human player has reset their account (level 1, near-zero stats)
 * but their slot still holds a high-power position, OR where no PlayerProfile exists at all.
 *
 * Run this manually or on a schedule (e.g. daily).
 */

const GHOST_LEVEL_THRESHOLD = 3;    // level <= this is suspicious
const GHOST_POWER_MISMATCH  = 20;   // slot power must be this much higher than profile power to flag

// Bot name pools for converting ghosts
const BOT_FIRST = ['Shadow','Ghost','Void','Phantom','Echo','Drift','Forge','Neon','Apex','Nova'];
const BOT_LAST  = ['Trader','Runner','Baron','Titan','Surge','Strike','Cipher','Wraith','Vector','Pulse'];
const BOT_IMAGES = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&h=80&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
];

function makeBotId(slotId) {
  return `bot_ghost_${slotId.slice(-6)}`;
}

function makeBotName(slotId) {
  const h = slotId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const first = BOT_FIRST[Math.abs(h) % BOT_FIRST.length];
  const last  = BOT_LAST[Math.abs(h >> 4) % BOT_LAST.length];
  const num   = 100 + (Math.abs(h >> 8) % 900);
  return `${first}${last}${num}`;
}

function makeBotImage(slotId) {
  const h = slotId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return BOT_IMAGES[Math.abs(h) % BOT_IMAGES.length];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch all human (non-nemesis) territory slots
    const allSlots = await base44.asServiceRole.entities.TerritorySlot.list('created_date', 20000);
    const humanSlots = allSlots.filter(s => !s.is_nemesis && s.user_id && !s.user_id.startsWith('bot_'));

    if (humanSlots.length === 0) {
      return Response.json({ success: true, converted: 0, message: 'No human slots found.' });
    }

    // Collect unique user IDs and fetch all profiles in one go
    const uniqueUserIds = [...new Set(humanSlots.map(s => s.user_id))];
    const profileMap = {};
    for (const uid of uniqueUserIds) {
      const results = await base44.asServiceRole.entities.PlayerProfile.filter({ user_id: uid });
      profileMap[uid] = results[0] || null;
      await new Promise(r => setTimeout(r, 60));
    }

    const ghosts = [];

    for (const slot of humanSlots) {
      const profile = profileMap[slot.user_id];

      let isGhost = false;

      if (!profile) {
        // No profile at all — definitely a ghost
        isGhost = true;
      } else {
        const profilePower = (profile.attack_value || 0) + (profile.defense_value || 0);
        const slotPower    = slot.player_power || 0;
        const profileLevel = profile.level || 1;

        // Ghost if: profile is near-fresh (level ≤ threshold) BUT slot holds a significantly higher power
        if (profileLevel <= GHOST_LEVEL_THRESHOLD && slotPower - profilePower > GHOST_POWER_MISMATCH) {
          isGhost = true;
        }
      }

      if (isGhost) ghosts.push(slot);
    }

    // Convert each ghost slot to a Nemesis Bot
    const converted = [];
    for (const slot of ghosts) {
      const botUserId  = makeBotId(slot.id);
      const botName    = makeBotName(slot.id);
      const botImage   = makeBotImage(slot.id);

      await base44.asServiceRole.entities.TerritorySlot.update(slot.id, {
        is_nemesis:        true,
        user_id:           botUserId,
        username:          botName,
        profile_image_url: botImage,
        // Clear any NB challenge cycle fields
        challenge_target_user_id: null,
        challenge_start_at:       null,
        challenge_ready_at:       null,
        target_player_power:      null,
        initial_nb_power:         null,
      });

      converted.push({ oldUserId: slot.user_id, slot: slot.slot_number, city: slot.city, newBot: botName });
      await new Promise(r => setTimeout(r, 120));
    }

    return Response.json({
      success: true,
      scanned: humanSlots.length,
      converted: converted.length,
      ghosts: converted
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});