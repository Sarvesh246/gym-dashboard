/**
 * Google Fit integration
 * OAuth + sync use Google Health API (see fitbit.ts). Legacy Fitness REST helpers remain for reference.
 */

export {
  generateFitbitAuthUrl as generateGoogleFitAuthUrl,
  exchangeFitbitCode as exchangeGoogleFitCode,
  refreshFitbitToken as refreshGoogleFitToken,
} from "@/services/wearables/fitbit";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_API_BASE = "https://www.googleapis.com/fitness/v1";

export interface GoogleFitConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function readRequiredEnv(
  name: "GOOGLE_FIT_CLIENT_ID" | "GOOGLE_FIT_CLIENT_SECRET" | "GOOGLE_FIT_REDIRECT_URI"
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error("Google Fit OAuth credentials not configured");
  }

  return value;
}

/**
 * Legacy Fitness REST config (GOOGLE_FIT_*). Prefer FITBIT_* / Google Health for new connections.
 */
export function getGoogleFitConfig(): GoogleFitConfig {
  return {
    clientId: readRequiredEnv("GOOGLE_FIT_CLIENT_ID"),
    clientSecret: readRequiredEnv("GOOGLE_FIT_CLIENT_SECRET"),
    redirectUri: readRequiredEnv("GOOGLE_FIT_REDIRECT_URI"),
  };
}

/** Google Fit aggregate API expects epoch milliseconds (not nanoseconds). */
function dateToMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function dateToNextMs(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime();
}

/**
 * Fetch activity data from Google Fit for a date range
 */
export async function fetchGoogleFitActivity(
  accessToken: string,
  dateStr: string
): Promise<Record<string, unknown>> {
  try {
    const startMs = dateToMs(dateStr);
    const endMs = dateToNextMs(dateStr);

    const response = await fetch(
      `${GOOGLE_FIT_API_BASE}/users/me/dataset:aggregate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.step_count.delta" },
            { dataTypeName: "com.google.distance.delta" },
            { dataTypeName: "com.google.calories.expended" },
            { dataTypeName: "com.google.active_minutes" },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startMs,
          endTimeMillis: endMs,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Google Fit activity fetch failed:",
        response.status,
        await response.text()
      );
      return {};
    }

    const data = await response.json();
    const bucket = data.bucket?.[0];
    if (!bucket) return {};

    const activity: Record<string, unknown> = {};

    for (const dataset of bucket.dataset || []) {
      const dataType = dataset.dataType?.name || "";
      const point = dataset.point?.[0];
      if (!point) continue;

      const value = point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0;

      if (dataType === "com.google.step_count.delta") {
        activity.steps = value;
      } else if (dataType === "com.google.distance.delta") {
        activity.distance_meters = value;
      } else if (dataType === "com.google.calories.expended") {
        activity.calories = value;
      } else if (dataType === "com.google.active_minutes") {
        activity.active_minutes = value;
      }
    }

    return activity;
  } catch (err) {
    console.error("Error fetching Google Fit activity:", err);
    return {};
  }
}

/**
 * Fetch sleep data from Google Fit for a date range
 */
export async function fetchGoogleFitSleep(
  accessToken: string,
  dateStr: string
): Promise<Record<string, unknown>> {
  try {
    const startMs = dateToMs(dateStr);
    const endMs = dateToNextMs(dateStr);

    const response = await fetch(
      `${GOOGLE_FIT_API_BASE}/users/me/dataset:aggregate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.sleep.segment" },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startMs,
          endTimeMillis: endMs,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Google Fit sleep fetch failed:",
        response.status,
        await response.text()
      );
      return {};
    }

    const data = await response.json();
    const bucket = data.bucket?.[0];
    if (!bucket) return {};

    const sleepData: Record<string, unknown> = {
      sleep_duration_ms: 0,
      sleep_segments: [],
    };

    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const startTime = point.startTimeNanos
          ? Math.floor(Number(point.startTimeNanos) / 1_000_000)
          : 0;
        const endTime = point.endTimeNanos
          ? Math.floor(Number(point.endTimeNanos) / 1_000_000)
          : 0;

        if (startTime && endTime) {
          const durationMs = endTime - startTime;
          (sleepData.sleep_segments as Array<Record<string, unknown>>).push({
            start_time_ms: startTime,
            end_time_ms: endTime,
            duration_ms: durationMs,
            sleep_stage: point.value?.[0]?.intVal || 0,
          });

          (sleepData.sleep_duration_ms as number) += durationMs;
        }
      }
    }

    return sleepData;
  } catch (err) {
    console.error("Error fetching Google Fit sleep:", err);
    return {};
  }
}

/**
 * Fetch heart rate data from Google Fit for a date range
 */
export async function fetchGoogleFitHeartRate(
  accessToken: string,
  dateStr: string
): Promise<Record<string, unknown>> {
  try {
    const startMs = dateToMs(dateStr);
    const endMs = dateToNextMs(dateStr);

    const response = await fetch(
      `${GOOGLE_FIT_API_BASE}/users/me/dataset:aggregate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.heart_rate.bpm" },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startMs,
          endTimeMillis: endMs,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Google Fit heart rate fetch failed:",
        response.status,
        await response.text()
      );
      return {};
    }

    const data = await response.json();
    const bucket = data.bucket?.[0];
    if (!bucket) return {};

    const heartRateData: Record<string, unknown> = {
      average_bpm: 0,
      min_bpm: Infinity,
      max_bpm: 0,
      samples: [],
    };

    let total = 0;
    let count = 0;

    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const bpm = point.value?.[0]?.fpVal || 0;
        if (bpm > 0) {
          (heartRateData.samples as number[]).push(bpm);
          total += bpm;
          count++;
          (heartRateData.min_bpm as number) = Math.min(
            heartRateData.min_bpm as number,
            bpm
          );
          (heartRateData.max_bpm as number) = Math.max(
            heartRateData.max_bpm as number,
            bpm
          );
        }
      }
    }

    if (count > 0) {
      (heartRateData.average_bpm as number) = total / count;
    }

    return heartRateData;
  } catch (err) {
    console.error("Error fetching Google Fit heart rate:", err);
    return {};
  }
}
