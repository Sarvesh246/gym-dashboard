/**
 * Apple Health-specific sync orchestration
 * Note: Apple HealthKit data is typically synced via device-side APIs
 * This service handles server-side token management and historical data retrieval
 */

import {
  exchangeAppleHealthCode,
  refreshAppleHealthToken,
  fetchAppleHealthData,
} from "@/services/wearables/apple";
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
 * Handle Apple Health OAuth callback
 */
export async function handleAppleHealthCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangeAppleHealthCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Apple Health code");
      return false;
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    const result = await upsertWearableConnection(userId, "apple_health", {
      connection_status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiryDate.toISOString(),
      sync_enabled: true,
      data_visibility_enabled: true,
    });

    return result !== null;
  } catch (err) {
    console.error("Error handling Apple Health callback:", err);
    return false;
  }
}

/**
 * Get fresh access token, refreshing if needed
 */
export async function getFreshAppleHealthToken(userId: string): Promise<string | null> {
  try {
    const connection = await getWearableConnection(userId, "apple_health");

    if (!connection || !connection.access_token) {
      console.error("No Apple Health connection found");
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

        const newToken = await refreshAppleHealthToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Apple Health token");
          return null;
        }

        // Update stored token
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "apple_health", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
        });

        return newToken.access_token;
      }
    }

    return connection.access_token;
  } catch (err) {
    console.error("Error getting fresh Apple Health token:", err);
    return null;
  }
}

/**
 * Perform a full Apple Health sync
 * Note: Most Apple Health data comes from device-side integration
 * This method serves as a placeholder for server-side data retrieval
 */
export async function syncAppleHealthData(
  userId: string,
  daysBack: number = 7,
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  const syncLog = await createSyncLog(userId, "apple_health");

  if (!syncLog) {
    return {
      provider: "apple_health",
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
      const shouldSync = await shouldTriggerSync(userId, "apple_health");
      if (!shouldSync) {
        await completeSyncLog(syncLog.id, "completed", 0);
        return {
          provider: "apple_health",
          user_id: userId,
          started_at: syncLog.sync_started_at,
          status: "completed",
          records_processed: 0,
        };
      }
    }

    // Get fresh access token
    const accessToken = await getFreshAppleHealthToken(userId);
    if (!accessToken) {
      await completeSyncLog(syncLog.id, "failed", 0, "No valid access token");
      return {
        provider: "apple_health",
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
      const exists = await metricsExistForDate(userId, "apple_health", dateStr);
      if (exists) {
        continue;
      }

      try {
        // Fetch health data for the day
        const healthData = await fetchAppleHealthData(accessToken, dateStr);

        // Normalize and store
        const normalized = normalizeHealthData(healthData, "apple_health");
        const stored = await storeHealthMetrics(userId, "apple_health", dateStr, normalized);

        if (stored) {
          recordsProcessed++;
        } else {
          partialFailure = true;
        }
      } catch (err) {
        console.error(`Error syncing Apple Health data for ${dateStr}:`, err);
        partialFailure = true;
      }
    }

    // Update connection's last_synced_at
    await upsertWearableConnection(userId, "apple_health", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    // Complete sync log
    const status = partialFailure ? "partial" : "completed";
    await completeSyncLog(syncLog.id, status, recordsProcessed);

    return {
      provider: "apple_health",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
    };
  } catch (err) {
    console.error("Apple Health sync error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await completeSyncLog(syncLog.id, "failed", 0, errorMsg);

    return {
      provider: "apple_health",
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
export async function triggerManualAppleHealthSync(userId: string): Promise<SyncResult> {
  // Check if provider is connected
  const isConnected = await isProviderConnected(userId, "apple_health");
  if (!isConnected) {
    return {
      provider: "apple_health",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Apple Health not connected or token expired",
    };
  }

  return syncAppleHealthData(userId, 7, { force: true });
}
