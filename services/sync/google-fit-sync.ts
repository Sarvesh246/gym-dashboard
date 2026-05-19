/**
 * Google Fit sync — uses Google Health API (health.googleapis.com).
 * On iPhone, Garmin → Apple Health → Google Fit app; this API reads the Google account cloud copy.
 */

import {
  exchangeFitbitCode,
  refreshFitbitToken,
  fetchFitbitSleep,
  fetchFitbitActivity,
  fetchFitbitHeartRate,
} from "@/services/wearables/fitbit";
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
 * Handle Google Fit OAuth callback (Google Health API scopes)
 */
export async function handleGoogleFitCallback(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const tokenData = await exchangeFitbitCode(code);
    if (!tokenData) {
      console.error("Failed to exchange Google Fit / Google Health code");
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

    if (connection.token_expiry) {
      const expiry = new Date(connection.token_expiry);
      const buffer = 5 * 60 * 1000;

      if (expiry.getTime() - Date.now() < buffer) {
        if (!connection.refresh_token) {
          console.error("No refresh token available");
          return null;
        }

        const newToken = await refreshFitbitToken(connection.refresh_token);
        if (!newToken) {
          console.error("Failed to refresh Google Fit token");
          return null;
        }

        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + newToken.expires_in);

        await upsertWearableConnection(userId, "google_fit", {
          access_token: newToken.access_token,
          token_expiry: newExpiry.toISOString(),
          ...(newToken.refresh_token
            ? { refresh_token: newToken.refresh_token }
            : {}),
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
 * Perform a full Google Fit sync (7 days by default)
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

    const accessToken = await getFreshGoogleFitToken(userId);
    if (!accessToken) {
      await completeSyncLog(
        syncLog.id,
        "failed",
        0,
        "No valid access token — disconnect and reconnect Google Fit in Settings"
      );
      return {
        provider: "google_fit",
        user_id: userId,
        started_at: syncLog.sync_started_at,
        status: "failed",
        records_processed: 0,
        error: "No valid access token — reconnect Google Fit in Settings",
      };
    }

    let recordsProcessed = 0;
    let partialFailure = false;

    for (let i = 0; i <= daysBack; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      const dateStr = currentDate.toISOString().split("T")[0];

      if (!options.force) {
        const exists = await metricsExistForDate(userId, "google_fit", dateStr);
        if (exists) {
          continue;
        }
      }

      try {
        const [sleepData, activityData, heartRateData] = await Promise.all([
          fetchFitbitSleep(accessToken, dateStr),
          fetchFitbitActivity(accessToken, dateStr),
          fetchFitbitHeartRate(accessToken, dateStr),
        ]);

        const aggregated: Record<string, unknown> = {
          ...sleepData,
          ...activityData,
          ...heartRateData,
        };

        const normalized = normalizeHealthData(aggregated, "google_fit");
        const stored = await storeHealthMetrics(
          userId,
          "google_fit",
          dateStr,
          normalized
        );

        if (stored) {
          recordsProcessed++;
        }
      } catch (err) {
        console.error(`Error syncing Google Fit data for ${dateStr}:`, err);
        partialFailure = true;
      }
    }

    await upsertWearableConnection(userId, "google_fit", {
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    });

    const status =
      recordsProcessed === 0 && partialFailure
        ? "failed"
        : partialFailure
          ? "partial"
          : "completed";

    const errorMessage =
      recordsProcessed === 0
        ? "No health data returned from Google. On iPhone, confirm the Google Fit app shows your Garmin/Apple Health data, then disconnect and reconnect here using the same Google account."
        : undefined;

    await completeSyncLog(syncLog.id, status, recordsProcessed, errorMessage);

    return {
      provider: "google_fit",
      user_id: userId,
      started_at: syncLog.sync_started_at,
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
      error: errorMessage,
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
