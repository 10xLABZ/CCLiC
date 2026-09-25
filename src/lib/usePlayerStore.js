/**
 * usePlayerStore — singleton global player state store (React hook).
 *
 * 100% server-backed. NO localStorage.
 *
 * Reads from the in-memory cache (playerMemory.js) on mount,
 * then stays in sync via subscriber notifications fired by
 * playerServerSync / playerStorage after every server update.
 *
 * Usage:
 *   const { playerData, isLoading, refreshFromServerNow } = usePlayerStore();
 *
 * All pages and TopHUD use this — zero divergence between pages.
 */

import { useState, useEffect, useRef } from 'react';
import { getCurrentPlayer, subscribe } from '@/lib/playerMemory';
import { base44 } from '@/api/base44Client';

let _serverRefreshInFlight = false;

export function usePlayerStore() {
  const [playerData, setPlayerDataState] = useState(() => ({ ...getCurrentPlayer() }));
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Subscribe this component instance to global in-memory updates
    const handler = (data) => setPlayerDataState({ ...data });
    const unsub = subscribe(handler);

    // Immediately sync to latest in case we missed an event during mount
    setPlayerDataState({ ...getCurrentPlayer() });

    // Periodic server poll — replaces ALL client-side regen intervals.
    // Every 60 seconds, ask the server to calculate regen and return fresh values.
    // The client does ZERO regen math; the server is the single source of truth.
    const pollServer = async () => {
      if (_serverRefreshInFlight) return;
      _serverRefreshInFlight = true;
      try {
        const result = await base44.functions.invoke('syncRegenState', {});
        const data = result?.data;
        if (data?.success) {
          // Import lazily to avoid circular dependency at module load time
          const { patchPlayerData } = await import('@/lib/playerMemory');
          const patch = {};
          if (data.energy != null) patch.energy = data.energy;
          if (data.stamina != null) patch.stamina = data.stamina;
          if (data.op_cover != null) patch.opCover = data.op_cover;
          if (data.last_energy_timestamp) patch.lastEnergyTimestamp = data.last_energy_timestamp;
          if (data.last_stamina_timestamp) patch.lastStaminaTimestamp = data.last_stamina_timestamp;
          if (data.last_op_cover_timestamp) patch.lastOpCoverTimestamp = data.last_op_cover_timestamp;
          if (Object.keys(patch).length > 0) {
            patchPlayerData(patch);
          }
        }
      } catch (err) {
        // Silent fail — will retry next tick
      } finally {
        _serverRefreshInFlight = false;
      }
    };

    pollIntervalRef.current = setInterval(pollServer, 60000);

    return () => {
      unsub();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const refreshPlayerData = () => {
    setPlayerDataState({ ...getCurrentPlayer() });
  };

  // Force a live server pull and update all subscribers
  const refreshFromServerNow = async () => {
    const { refreshFromServer } = await import('@/lib/playerServerSync');
    const fresh = await refreshFromServer();
    if (fresh) {
      setPlayerDataState({ ...getCurrentPlayer() });
    }
    return fresh;
  };

  return { playerData, refreshPlayerData, refreshFromServerNow };
}