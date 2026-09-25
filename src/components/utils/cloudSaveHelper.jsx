/**
 * cloudSaveHelper.js — 100% server-backed. NO localStorage.
 *
 * Since the server is the single source of truth, cloud saves are
 * snapshots of the in-memory player data stored in the GameSave entity.
 * Restore triggers a fresh server fetch via initializeFromServer.
 */

import { base44 } from "@/api/base44Client";
import { getCurrentPlayer } from "@/lib/playerMemory";

const MAX_CLOUD_SAVES = 5;

/**
 * Upload current in-memory player data to cloud
 */
export const uploadToCloud = async () => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error("User not authenticated");

    const playerData = getCurrentPlayer();
    const now = Date.now();

    const saveData = {
      user_id: user.id,
      save_data: JSON.stringify(playerData),
      timestamp: now,
      device_info: navigator.userAgent.substring(0, 100)
    };

    await base44.entities.GameSave.create(saveData);
    console.log('Cloud save created at:', new Date(now).toLocaleString());

    // Clean up old saves
    const allSaves = await base44.entities.GameSave.filter(
      { user_id: user.id },
      '-timestamp'
    );

    if (allSaves.length > MAX_CLOUD_SAVES) {
      const savesToDelete = allSaves.slice(MAX_CLOUD_SAVES);
      for (const save of savesToDelete) {
        await base44.entities.GameSave.delete(save.id);
      }
    }

    return { success: true, timestamp: now };
  } catch (error) {
    console.error("Cloud save upload failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all cloud saves for current user
 */
export const getCloudSaves = async () => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error("User not authenticated");

    const saves = await base44.entities.GameSave.filter(
      { user_id: user.id },
      '-timestamp',
      MAX_CLOUD_SAVES
    );

    return { success: true, saves };
  } catch (error) {
    console.error("Failed to fetch cloud saves:", error);
    return { success: false, error: error.message, saves: [] };
  }
};

/**
 * Restore from a specific cloud save — triggers a fresh server sync
 */
export const restoreFromCloud = async (saveId) => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error("User not authenticated");

    const saves = await base44.entities.GameSave.filter({ user_id: user.id });
    const save = saves.find(s => s.id === saveId);

    if (!save) throw new Error("Save not found");

    console.log('Restoring cloud save from:', new Date(save.timestamp).toLocaleString());

    // Trigger a fresh server sync — the server is authoritative
    const { initializeFromServer } = await import('@/lib/playerServerSync');
    await initializeFromServer();

    return { success: true, needsReload: true };
  } catch (error) {
    console.error("Cloud restore failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete all cloud saves for current user
 */
export const deleteAllCloudSaves = async () => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error("User not authenticated");

    const saves = await base44.entities.GameSave.filter({ user_id: user.id });

    for (const save of saves) {
      await base44.entities.GameSave.delete(save.id);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete cloud saves:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Auto-sync on app start — server is authoritative, so just ensure
 * the in-memory cache is populated from the server.
 */
export const autoSyncOnStart = async () => {
  try {
    const user = await base44.auth.me();
    if (!user) return { success: false, reason: "Not authenticated" };

    // Server is the source of truth — just run initializeFromServer
    const { initializeFromServer } = await import('@/lib/playerServerSync');
    const result = await initializeFromServer();

    // Also upload a cloud save snapshot if none exists
    const { saves } = await getCloudSaves();
    if (!saves || saves.length === 0) {
      await uploadToCloud();
      return { success: true, action: "uploaded" };
    }

    return { success: true, action: "synced" };
  } catch (error) {
    console.error("Auto-sync failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * @deprecated — localStorage timestamp no longer used.
 */
export const updateLocalTimestamp = () => {
  // No-op — server is authoritative
};