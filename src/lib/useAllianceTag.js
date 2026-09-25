// Hook to get the current user's alliance tag from the DB (in-memory cache only)
// NO localStorage. The alliance tag is also stored on PlayerProfile entity (server-authoritative).
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache — NO localStorage
let _cachedTag = null;
let _cacheTimestamp = 0;

export function getCachedAllianceTag() {
  if (!_cachedTag) return null;
  if (Date.now() - _cacheTimestamp > CACHE_TTL) return null;
  return _cachedTag;
}

export function setCachedAllianceTag(tag) {
  _cachedTag = tag || null;
  _cacheTimestamp = Date.now();
}

export function clearCachedAllianceTag() {
  _cachedTag = null;
  _cacheTimestamp = 0;
}

// Async fetch of the user's alliance tag — returns null if not in an alliance
export async function fetchAllianceTag(userId) {
  if (!userId) return null;
  try {
    const memberships = await base44.entities.AllianceMember.filter({ user_id: userId });
    if (!memberships || memberships.length === 0) return null;
    const alliances = await base44.entities.Alliance.filter({ id: memberships[0].alliance_id });
    if (!alliances || alliances.length === 0) return null;
    return alliances[0].tag || null;
  } catch { return null; }
}

// React hook — returns the tag string (e.g. "APX") or null
export function useAllianceTag() {
  const [tag, setTag] = useState(() => getCachedAllianceTag());

  useEffect(() => {
    let cancelled = false;
    base44.auth.me().then(async (user) => {
      if (!user || cancelled) return;
      const cached = getCachedAllianceTag();
      if (cached !== null) { setTag(cached); return; }
      const t = await fetchAllianceTag(user.id);
      if (!cancelled) {
        setTag(t);
        setCachedAllianceTag(t);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return tag;
}

// Format display name with alliance tag
export function formatNameWithTag(username, allianceTag) {
  if (!allianceTag) return username || '';
  return `[${allianceTag}]${username || ''}`;
}