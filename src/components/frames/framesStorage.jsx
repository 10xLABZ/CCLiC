// Frame equip/own management — stored in playerData via playerStorage
import { getPlayerData, savePlayerData } from '../utils/playerStorage';
import { isVipActive } from '@/lib/vipHelper';
import { getFrameById } from './framesData';
import { saveProfileCore } from '@/lib/playerServerSync';

// Get all frames a player currently owns (valid)
export function getOwnedFrames(playerData) {
  const pd = playerData || getPlayerData();
  const now = Date.now();
  const owned = [];

  // VIP frame — valid if VIP is active
  if (isVipActive(pd)) {
    owned.push({ id: 'vip', expiresAt: pd.vipActiveUntil || 0 });
    // VIP Legend frame — unlocked at VIP level 10+
    if ((pd.vipLevel || 1) >= 10) {
      owned.push({ id: 'vip_legend', expiresAt: pd.vipActiveUntil || 0 });
    }
  }

  // Earned frames stored in player data
  const savedFrames = pd.ownedFrames || [];
  savedFrames.forEach(f => {
    // Skip expired temporary frames
    if (f.expiresAt && f.expiresAt < now) return;
    // Skip VIP (handled above)
    if (f.id === 'vip') return;
    owned.push(f);
  });

  return owned;
}

// Grant a frame to the player (CC wins, etc.)
// Now server-authoritative — persists to PlayerProfile.owned_frames
export async function grantFrame(frameId, expiresAt = null) {
  const pd = getPlayerData();
  const existing = pd.ownedFrames || [];
  // Remove old entry for same frame
  const filtered = existing.filter(f => f.id !== frameId);
  filtered.push({ id: frameId, expiresAt, grantedAt: Date.now() });
  savePlayerData({ ownedFrames: filtered });
  // Fire-and-forget server sync — grantFrame is called from backend functions
  saveProfileCore({ ownedFrames: filtered }).catch(() => {});
}

// Get currently equipped frame id
export function getEquippedFrameId(playerData) {
  const pd = playerData || getPlayerData();
  return pd.equippedFrameId || null;
}

// Get URL of currently equipped frame
export function getEquippedFrameUrl(playerData) {
  const equipped = getEquippedFrameId(playerData);
  if (!equipped) return null;
  const owned = getOwnedFrames(playerData);
  const isOwned = owned.some(f => f.id === equipped);
  if (!isOwned) return null;
  const frame = getFrameById(equipped);
  return frame?.imageUrl || null;
}

// Equip a frame — server-authoritative via saveProfileCore
export async function equipFrame(frameId) {
  savePlayerData({ equippedFrameId: frameId });
  await saveProfileCore({ equippedFrameId: frameId });
}

// Unequip current frame — server-authoritative via saveProfileCore
export async function unequipFrame() {
  savePlayerData({ equippedFrameId: null });
  await saveProfileCore({ equippedFrameId: null });
}