/**
 * Google Fit-specific sync orchestration
 * Coordinates full Google Fit sync workflow: auth, fetch, normalize, store
 */

import {
  exchangeGoogleFitCode,
  refreshGoogleFitToken,
  fetchGoogleFitActivity,
  fetchGoogleFitSleep,
  fetchGoogleFitHeartRate,
} from "@/services/wearables/google-fit";
import {
  getWearableConnection,
  upsertWearableConnection,
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
 * Handle Google Fit OAuth callback
 * Store tokens and establish connection
 */
export async function handleGoogleFitCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangeGoogleFitCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Google Fit code");
      return false;
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    const result = await upsertWearableConnection(userId, "google_fit", {
      connection_status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiryDate.toISOString(),
      sync_enabled: true,
      data_visibility_enabled: true,
    });

    return result !== null;
  } catch (err) {
    console.error("Error handling Google Fit callback:", err);
    return false;
  }
}

/**
 * Get fresh access token, refreshing if needed
 */
export async function getFreshGoogleFitToken(userId: string): Promise<string | null> {
  try {
    const connection = await getWearableConnection(userId, "google_fit");

    if (!connection || !connection.access_token) {
      console.error("No Google Fit connection found");
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

        const newToken = await refreshGoogleFitToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Google Fit token");
          return null;
        }

        // Update stored token
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "google_fit", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
        });

        return newToken.access_token;
      }
    }

    return connection.access_token;
  } catch (err) {
    console.error("Error getting fresh Google Fit token:", err);
    return null;
  }
}

/**
 * Perform a full Google Fit sync
 * Fetches 7 days of data by default
 */
export async function syncGoogleFitData(
  userId: string,
  daysBack: number = 7,
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  const syncLog = await createSyncLog(userId, "google_fit");

  if (!syncLog) {
    return {
      provider: "google_fit",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Failed to create sync log",
    };
  }

  try {
    // Manual "sync now" must bypass throttle — see garmin-sync.ts for context.
    if (!options.force) {
      const shouldSync = await shouldTriggerSync(userId, "google_fit");
      if (!shouldSync) {
        await completeSyncLog(syncLog.id, "completed", 0);
        return {
          provider: "google_fit",
          user_id: userId,
          started_at: syncLog.sync_started_at,
          status: "completed",
          records_processed: 0,
        };
      }
    }

    // Get fresh access token
    const accessToken = await getFreshGoogleFitToken(userId);
    if (!accessToken) {
      await completeSyncLog(syncLog.id, "failed", 0, "No valid access token");
      return {
        provider: "google_fit",
        user_id: userId,
        started_at: syncLog.sync_started_at,
        status: "failed",
        records_processed: 0,
        error: "No valid access token",
      };
    }

    let recordsProcessed = 0;
    let partialFailure = false;

    // Fetch data for each day
    for (let i = 0; i <= daysBack; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // Check if already synced
      const exists = await metricsExistForDate(userId, "google_fit", dateStr);
      if (exists) {
        continue;
      }

      try {
        // Fetch all data for the day in parallel
        const [activityData, sleepData, heartRateData] = await Promise.all([
          fetchGoogleFitActivity(accessToken, dateStr),
          fetchGoogleFitSleep(accessToken, dateStr),
          fetchGoogleFitHeartRate(accessToken, dateStr),
        ]);

        // Aggregate data for the day
        const aggregated: Record<string, unknown> = {
          ...activityData,
          ...sleepData,
          ...heartRateData,
        };

        // Normalize and store
        const normalized = normalizeHealthData(aggregated, "google_fit");
        const stored = await storeHealthMetrics(userId, "google_fit", dateStr, normalized);

        if (stored) {
          recordsProcessed++;
        } else {
          partialFailure = true;
        }
      } catch (err) {
        console.error(`Error syncing Google Fit data for ${dateStr}:`, err);
        partialFailure = true;
      }
    }

    // Update connection's last_synced_at
    await upsertWearableConnection(userId, "google_fit", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    // Complete sync log
    const status = partialFailure ? "partial" : "completed";
    await completeSyncLog(syncLog.id, status, recordsProcessed);

    return {
      provider: "google_fit",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
    };
  } catch (err) {
    console.error("Google Fit sync error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await completeSyncLog(syncLog.id, "failed", 0, errorMsg);

    return {
      provider: "google_fit",
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
export async function triggerManualGoogleFitSync(userId: string): Promise<SyncResult> {
  const connection = await getWearableConnection(userId, "google_fit");
  const hasUsableToken =
    connection?.connection_status === "connected" &&
    (connection.refresh_token || connection.access_token);

  if (!hasUsableToken) {
    return {
      provider: "google_fit",
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "failed",
      records_processed: 0,
      error: "Google Fit not connected or token expired",
    };
  }

  return syncGoogleFitData(userId, 7, { force: true });
}
