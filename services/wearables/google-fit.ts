/**
 * Google Fit integration
 * Direct access to Google Fit API for activity, sleep, and health metrics
 * Works with web-app-on-iOS via browser OAuth flow
 */

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_API_BASE = "https://www.googleapis.com/fitness/v1";

const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.body.read",
].join(" ");

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
 * Get Google OAuth config from GOOGLE_FIT_* environment variables
 */
export function getGoogleFitConfig(): GoogleFitConfig {
  return {
    clientId: readRequiredEnv("GOOGLE_FIT_CLIENT_ID"),
    clientSecret: readRequiredEnv("GOOGLE_FIT_CLIENT_SECRET"),
    redirectUri: readRequiredEnv("GOOGLE_FIT_REDIRECT_URI"),
  };
}

function dateToMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime() * 1_000_000;
}

function dateToNextMs(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime() * 1_000_000;
}

/**
 * Generate Google OAuth authorization URL for Google Fit access
 */
export function generateGoogleFitAuthUrl(state: string): string {
  const config = getGoogleFitConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: GOOGLE_FIT_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for Google OAuth tokens
 */
export async function exchangeGoogleFitCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getGoogleFitConfig();

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Google OAuth token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    if (!data.access_token || !data.refresh_token) {
      console.error("Google OAuth response missing tokens");
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? 3600,
    };
  } catch (err) {
    console.error("Error exchanging Google OAuth code:", err);
    return null;
  }
}

/**
 * Refresh Google OAuth access token
 */
export async function refreshGoogleFitToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getGoogleFitConfig();

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Google Fit token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    if (!data.access_token) {
      console.error("Google Fit refresh response missing access token");
      return null;
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in ?? 3600,
    };
  } catch (err) {
    console.error("Error refreshing Google Fit token:", err);
    return null;
  }
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
