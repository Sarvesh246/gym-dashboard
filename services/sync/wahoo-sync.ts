/**
 * Wahoo-specific sync orchestration
 * Coordinates full Wahoo sync workflow: auth, fetch, normalize, store
 */

import {
  exchangeWahooCode,
  refreshWahooToken,
  fetchWahooActivities,
  fetchWahooSummary,
} from "@/services/wearables/wahoo";
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
 * Handle Wahoo OAuth callback
 */
export async function handleWahooCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangeWahooCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Wahoo code");
      return false;
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    const result = await upsertWearableConnection(userId, "wahoo", {
      connection_status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiryDate.toISOString(),
      sync_enabled: true,
      data_visibility_enabled: true,
    });

    return result !== null;
  } catch (err) {
    console.error("Error handling Wahoo callback:", err);
    return false;
  }
}

/**
 * Get fresh access token, refreshing if needed
 */
export async function getFreshWahooToken(userId: string): Promise<string | null> {
  try {
    const connection = await getWearableConnection(userId, "wahoo");

    if (!connection || !connection.access_token) {
      console.error("No Wahoo connection found");
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

        const newToken = await refreshWahooToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Wahoo token");
          return null;
        }

        // Update stored token
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "wahoo", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
        });

        return newToken.access_token;
      }
    }

    return connection.access_token;
  } catch (err) {
    console.error("Error getting fresh Wahoo token:", err);
    return null;
  }
}

/**
 * Perform a full Wahoo sync
 * Fetches 7 days of data by default
 */
export async function syncWahooData(
  userId: string,
  daysBack: number = 7,
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  const syncLog = await createSyncLog(userId, "wahoo");

  if (!syncLog) {
    return {
      provider: "wahoo",
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
      const shouldSync = await shouldTriggerSync(userId, "wahoo");
      if (!shouldSync) {
        await completeSyncLog(syncLog.id, "completed", 0);
        return {
          provider: "wahoo",
          user_id: userId,
          started_at: syncLog.sync_started_at,
          status: "completed",
          records_processed: 0,
        };
      }
    }

    // Get fresh access token
    const accessToken = await getFreshWahooToken(userId);
    if (!accessToken) {
      await completeSyncLog(syncLog.id, "failed", 0, "No valid access token");
      return {
        provider: "wahoo",
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
      const exists = await metricsExistForDate(userId, "wahoo", dateStr);
      if (exists) {
        continue;
      }

      try {
        // Fetch all data for the day
        const [activitiesData, summaryData] = await Promise.all([
          fetchWahooActivities(accessToken, dateStr),
          fetchWahooSummary(accessToken, dateStr),
        ]);

        // Aggregate data for the day
        const aggregated: Record<string, unknown> = {
          activities: activitiesData,
          ...summaryData,
        };

        // Normalize and store
        const normalized = normalizeHealthData(aggregated, "wahoo");
        const stored = await storeHealthMetrics(userId, "wahoo", dateStr, normalized);

        if (stored) {
          recordsProcessed++;
        } else {
          partialFailure = true;
        }
      } catch (err) {
        console.error(`Error syncing Wahoo data for ${dateStr}:`, err);
        partialFailure = true;
      }
    }

    // Update connection's last_synced_at
    await upsertWearableConnection(userId, "wahoo", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    // Complete sync log
    const status = partialFailure ? "partial" : "completed";
    await completeSyncLog(syncLog.id, status, recordsProcessed);

    return {
      provider: "wahoo",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
    };
  } catch (err) {
    console.error("Wahoo sync error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await completeSyncLog(syncLog.id, "failed", 0, errorMsg);

    return {
      provider: "wahoo",
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
export async function triggerManualWahooSync(userId: string): Promise<SyncResult> {
  // Check if provider is connected
  const isConnected = await isProviderConnected(userId, "wahoo");
  if (!isConnected) {
    return {
      provider: "wahoo",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Wahoo not connected or token expired",
    };
  }

  return syncWahooData(userId, 7, { force: true });
}
