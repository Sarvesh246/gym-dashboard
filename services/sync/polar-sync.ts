/**
 * Polar-specific sync orchestration
 * Coordinates full Polar sync workflow: auth, fetch, normalize, store
 */

import {
  exchangePolarCode,
  refreshPolarToken,
  fetchPolarSleep,
  fetchPolarActivity,
} from "@/services/wearables/polar";
import {
  getWearableConnection,
  upsertWearableConnection,
  isProviderConnected,
  storeHealthMetrics,
} from "@/services/wearables";
import {
  createSyncLog,
  completeSyncLog,
  shouldTriggerSync,
  metricsExistForDate,
} from "./orchestrator";
import { normalizeHealthData } from "@/services/wearables/normalizer";
import type { SyncResult } from "@/lib/health/types";

/**
 * Handle Polar OAuth callback
 */
export async function handlePolarCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangePolarCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Polar code");
      return false;
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    const result = await upsertWearableConnection(userId, "polar", {
      connection_status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiryDate.toISOString(),
      sync_enabled: true,
      data_visibility_enabled: true,
    });

    return result !== null;
  } catch (err) {
    console.error("Error handling Polar callback:", err);
    return false;
  }
}

/**
 * Get fresh access token, refreshing if needed
 */
export async function getFreshPolarToken(userId: string): Promise<string | null> {
  try {
    const connection = await getWearableConnection(userId, "polar");

    if (!connection || !connection.access_token) {
      console.error("No Polar connection found");
      return null;
    }

    // Check if token is expired
    if (connection.token_expiry) {
      const expiry = new Date(connection.token_expiry);
      const buffer = 5 * 60 * 1000; // 5 min buffer

      if (expiry.getTime() - Date.now() < buffer) {
        // Token is about to expire, refresh it
        if (!connection.refresh_token) {
          console.error("No refresh token available");
          return null;
        }

        const newToken = await refreshPolarToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Polar token");
          return null;
        }

        // Update stored token
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "polar", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
        });

        return newToken.access_token;
      }
    }

    return connection.access_token;
  } catch (err) {
    console.error("Error getting fresh Polar token:", err);
    return null;
  }
}

/**
 * Perform a full Polar sync
 * Fetches 7 days of data by default
 */
export async function syncPolarData(
  userId: string,
  daysBack: number = 7,
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  const syncLog = await createSyncLog(userId, "polar");

  if (!syncLog) {
    return {
      provider: "polar",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Failed to create sync log",
    };
  }

  try {
    // Manual "sync now" must bypass the 6h throttle — otherwise the user
    // clicks Sync, sees "completed" + 0 records, and thinks the system is
    // broken. Scheduled / background syncs keep the throttle.
    if (!options.force) {
      const shouldSync = await shouldTriggerSync(userId, "polar");
      if (!shouldSync) {
        await completeSyncLog(syncLog.id, "completed", 0);
        return {
          provider: "polar",
          user_id: userId,
          started_at: syncLog.sync_started_at,
          status: "completed",
          records_processed: 0,
        };
      }
    }

    // Get fresh access token
    const accessToken = await getFreshPolarToken(userId);
    if (!accessToken) {
      await completeSyncLog(syncLog.id, "failed", 0, "No valid access token");
      return {
        provider: "polar",
        user_id: userId,
        started_at: syncLog.sync_started_at,
        status: "failed",
        records_processed: 0,
        error: "No valid access token",
      };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let recordsProcessed = 0;
    let partialFailure = false;

    // Fetch data for each day
    for (let i = 0; i <= daysBack; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // Check if already synced
      const exists = await metricsExistForDate(userId, "polar", dateStr);
      if (exists) {
        continue;
      }

      try {
        // Fetch all data for the day
        const [sleepData, activityData] = await Promise.all([
          fetchPolarSleep(accessToken, dateStr),
          fetchPolarActivity(accessToken, dateStr),
        ]);

        // Aggregate data for the day
        const aggregated: Record<string, unknown> = {
          ...sleepData,
          ...activityData,
        };

        // Normalize and store
        const normalized = normalizeHealthData(aggregated, "polar");
        const stored = await storeHealthMetrics(userId, "polar", dateStr, normalized);

        if (stored) {
          recordsProcessed++;
        } else {
          partialFailure = true;
        }
      } catch (err) {
        console.error(`Error syncing Polar data for ${dateStr}:`, err);
        partialFailure = true;
      }
    }

    // Update connection's last_synced_at
    await upsertWearableConnection(userId, "polar", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    // Complete sync log
    const status = partialFailure ? "partial" : "completed";
    await completeSyncLog(syncLog.id, status, recordsProcessed);

    return {
      provider: "polar",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
    };
  } catch (err) {
    console.error("Polar sync error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await completeSyncLog(syncLog.id, "failed", 0, errorMsg);

    return {
      provider: "polar",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      status: "failed",
      records_processed: 0,
      error: errorMsg,
    };
  }
}

/**
 * Manual sync trigger (for "sync now" button)
 */
export async function triggerManualPolarSync(userId: string): Promise<SyncResult> {
  // Check if provider is connected
  const isConnected = await isProviderConnected(userId, "polar");
  if (!isConnected) {
    return {
      provider: "polar",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Polar not connected or token expired",
    };
  }

  return syncPolarData(userId, 7, { force: true });
}
