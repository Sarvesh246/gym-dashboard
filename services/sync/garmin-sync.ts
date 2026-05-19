/**
 * Garmin-specific sync orchestration
 * Coordinates full Garmin sync workflow: auth, fetch, normalize, store
 */

import {
  exchangeGarminCode,
  refreshGarminToken,
  fetchAndAggregateGarminData,
  storeGarminMetrics,
} from "@/services/wearables/garmin";
import {
  getWearableConnection,
  upsertWearableConnection,
  isProviderConnected,
} from "@/services/wearables";
import {
  createSyncLog,
  completeSyncLog,
  shouldTriggerSync,
  metricsExistForDate,
} from "./orchestrator";
import type { SyncResult } from "@/lib/health/types";

/**
 * Handle Garmin OAuth callback
 * Store tokens and establish connection
 */
export async function handleGarminCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangeGarminCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Garmin code");
      return false;
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    const result = await upsertWearableConnection(userId, "garmin", {
      connection_status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiryDate.toISOString(),
      sync_enabled: true,
      data_visibility_enabled: true,
    });

    return result !== null;
  } catch (err) {
    console.error("Error handling Garmin callback:", err);
    return false;
  }
}

/**
 * Get fresh access token, refreshing if needed
 */
export async function getFreshGarminToken(userId: string): Promise<string | null> {
  try {
    const connection = await getWearableConnection(userId, "garmin");

    if (!connection || !connection.access_token) {
      console.error("No Garmin connection found");
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

        const newToken = await refreshGarminToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Garmin token");
          return null;
        }

        // Update stored token
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "garmin", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
        });

        return newToken.access_token;
      }
    }

    return connection.access_token;
  } catch (err) {
    console.error("Error getting fresh Garmin token:", err);
    return null;
  }
}

/**
 * Perform a full Garmin sync
 * Fetches 7 days of data by default
 */
export async function syncGarminData(
  userId: string,
  daysBack: number = 7,
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  const syncLog = await createSyncLog(userId, "garmin");

  if (!syncLog) {
    return {
      provider: "garmin",
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
      const shouldSync = await shouldTriggerSync(userId, "garmin");
      if (!shouldSync) {
        await completeSyncLog(syncLog.id, "completed", 0);
        return {
          provider: "garmin",
          user_id: userId,
          started_at: syncLog.sync_started_at,
          status: "completed",
          records_processed: 0,
        };
      }
    }

    // Get fresh access token
    const accessToken = await getFreshGarminToken(userId);
    if (!accessToken) {
      // Token refresh failed → mark connection as expired so we stop
      // retrying every sync window. User must reconnect to recover.
      await upsertWearableConnection(userId, "garmin", {
        connection_status: "expired",
      });
      await completeSyncLog(syncLog.id, "failed", 0, "No valid access token");
      return {
        provider: "garmin",
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

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch and aggregate Garmin data
    const aggregatedData = await fetchAndAggregateGarminData(
      accessToken,
      startDateStr,
      endDateStr
    );

    // Store metrics
    let recordsProcessed = 0;
    let partialFailure = false;

    for (const [metricDate, metrics] of aggregatedData.entries()) {
      // Check if already synced (deduplication)
      const exists = await metricsExistForDate(userId, "garmin", metricDate);
      if (exists) {
        continue; // Skip already-synced data
      }

      const stored = await storeGarminMetrics(userId, metricDate, metrics);
      if (stored) {
        recordsProcessed++;
      } else {
        partialFailure = true;
      }
    }

    // Update connection's last_synced_at
    await upsertWearableConnection(userId, "garmin", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    // Complete sync log
    const status = partialFailure ? "partial" : "completed";
    await completeSyncLog(syncLog.id, status, recordsProcessed);

    return {
      provider: "garmin",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
    };
  } catch (err) {
    console.error("Garmin sync error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await completeSyncLog(syncLog.id, "failed", 0, errorMsg);

    return {
      provider: "garmin",
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
export async function triggerManualGarminSync(userId: string): Promise<SyncResult> {
  // Check if provider is connected
  const isConnected = await isProviderConnected(userId, "garmin");
  if (!isConnected) {
    return {
      provider: "garmin",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Garmin not connected or token expired",
    };
  }

  return syncGarminData(userId, 7, { force: true });
}
