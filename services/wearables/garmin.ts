/**
 * Garmin integration service
 * Handles OAuth2 auth, token refresh, API calls, and payload parsing
 */

import { createClient } from "@/lib/supabase/server";
import { normalizeHealthData, filterMetrics, hasSignificantData } from "./normalizer";
import type { NormalizedHealthMetrics } from "@/lib/health/types";

// ─── Garmin API Configuration ────────────────────────────────────────────

const GARMIN_OAUTH_URL = "https://connect.garmin.com/oauthserver/oauth/authorize";
const GARMIN_TOKEN_URL = "https://connect.garmin.com/oauthserver/oauth/token";
const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";

export interface GarminConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Garmin config from environment
 */
export function getGarminConfig(): GarminConfig {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Garmin OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

// ─── OAuth2 Flow ────────────────────────────────────────────────────────

/**
 * Generate Garmin OAuth authorization URL
 */
export function generateGarminAuthUrl(state: string): string {
  const config = getGarminConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "ACTIVITY READ SLEEP READ HEART_RATE READ STRESS READ TRAINING READ",
    state,
  });

  return `${GARMIN_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeGarminCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
} | null> {
  try {
    const config = getGarminConfig();

    const response = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Garmin token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
    };
  } catch (err) {
    console.error("Error exchanging Garmin code:", err);
    return null;
  }
}

/**
 * Refresh Garmin access token
 */
export async function refreshGarminToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getGarminConfig();

    const response = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Garmin token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error refreshing Garmin token:", err);
    return null;
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch sleep data from Garmin
 */
export async function fetchGarminSleep(
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<Record<string, unknown>[]> {
  try {
    const url = new URL(`${GARMIN_API_BASE}/wellness/dailySleep`);
    url.searchParams.set("from", startDate);
    url.searchParams.set("until", endDate);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Garmin sleep fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.sleep || [];
  } catch (err) {
    console.error("Error fetching Garmin sleep:", err);
    return [];
  }
}

/**
 * Fetch heart rate data from Garmin
 */
export async function fetchGarminHeartRate(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  try {
    const url = new URL(`${GARMIN_API_BASE}/wellness/dailyHeartRate`);
    url.searchParams.set("from", startDate);
    url.searchParams.set("until", endDate);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Garmin heart rate fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.heartRate || [];
  } catch (err) {
    console.error("Error fetching Garmin heart rate:", err);
    return [];
  }
}

/**
 * Fetch stress data from Garmin
 */
export async function fetchGarminStress(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  try {
    const url = new URL(`${GARMIN_API_BASE}/wellness/dailyStress`);
    url.searchParams.set("from", startDate);
    url.searchParams.set("until", endDate);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Garmin stress fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.stress || [];
  } catch (err) {
    console.error("Error fetching Garmin stress:", err);
    return [];
  }
}

/**
 * Fetch activity data from Garmin
 */
export async function fetchGarminActivity(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  try {
    const url = new URL(`${GARMIN_API_BASE}/wellness/dailyActivity`);
    url.searchParams.set("from", startDate);
    url.searchParams.set("until", endDate);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Garmin activity fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.activity || [];
  } catch (err) {
    console.error("Error fetching Garmin activity:", err);
    return [];
  }
}

/**
 * Fetch training metrics from Garmin (Training API)
 */
export async function fetchGarminTrainingMetrics(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  try {
    const url = new URL(`${GARMIN_API_BASE}/training/trainingLoadAnalysis`);
    url.searchParams.set("from", startDate);
    url.searchParams.set("until", endDate);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Garmin training metrics fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.trainingLoad || [];
  } catch (err) {
    console.error("Error fetching Garmin training metrics:", err);
    return [];
  }
}

// ─── Data Aggregation ───────────────────────────────────────────────────

/**
 * Fetch all Garmin wellness data for a date range and aggregate into daily snapshots
 */
export async function fetchAndAggregateGarminData(
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<Map<string, NormalizedHealthMetrics>> {
  // Fetch all data in parallel
  const [sleepData, heartRateData, stressData, activityData, trainingData] = await Promise.all([
    fetchGarminSleep(accessToken, startDate, endDate),
    fetchGarminHeartRate(accessToken, startDate, endDate),
    fetchGarminStress(accessToken, startDate, endDate),
    fetchGarminActivity(accessToken, startDate, endDate),
    fetchGarminTrainingMetrics(accessToken, startDate, endDate),
  ]);

  // Aggregate by date
  const aggregated = new Map<string, NormalizedHealthMetrics>();

  // Process sleep data
  for (const sleep of sleepData) {
    const date = sleep.calendarDate as string;
    const current = aggregated.get(date) || {};

    const normalized = normalizeHealthData(sleep, "garmin");
    aggregated.set(date, { ...current, ...normalized });
  }

  // Process heart rate data
  for (const hr of heartRateData) {
    const date = hr.calendarDate as string;
    const current = aggregated.get(date) || {};

    const normalized = normalizeHealthData(hr, "garmin");
    aggregated.set(date, { ...current, ...normalized });
  }

  // Process stress data
  for (const stress of stressData) {
    const date = stress.calendarDate as string;
    const current = aggregated.get(date) || {};

    const normalized = normalizeHealthData(stress, "garmin");
    aggregated.set(date, { ...current, ...normalized });
  }

  // Process activity data
  for (const activity of activityData) {
    const date = activity.calendarDate as string;
    const current = aggregated.get(date) || {};

    const normalized = normalizeHealthData(activity, "garmin");
    aggregated.set(date, { ...current, ...normalized });
  }

  // Process training data
  for (const training of trainingData) {
    const date = training.calendarDate as string;
    const current = aggregated.get(date) || {};

    const normalized = normalizeHealthData(training, "garmin");
    aggregated.set(date, { ...current, ...normalized });
  }

  return aggregated;
}

// ─── Store Raw Payloads (Optional) ──────────────────────────────────────

/**
 * Store raw Garmin payload for archival/debugging
 */
export async function storeGarminRawPayload(
  userId: string,
  payloadType: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("wearable_raw_payloads")
      .insert({
        user_id: userId,
        provider: "garmin",
        payload_type: payloadType,
        payload_json: payload,
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to store Garmin raw payload:", err);
    return false;
  }
}

/**
 * Store normalized Garmin metrics
 */
export async function storeGarminMetrics(
  userId: string,
  metricDate: string,
  metrics: NormalizedHealthMetrics
): Promise<boolean> {
  try {
    // Filter out empty metrics
    const filtered = filterMetrics(metrics);

    if (!hasSignificantData(filtered)) {
      console.warn(`No significant data for ${metricDate}`);
      return false;
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("wearable_health_metrics")
      .upsert(
        {
          user_id: userId,
          metric_date: metricDate,
          provider: "garmin",
          sleep_duration: filtered.sleep_duration,
          sleep_quality: filtered.sleep_quality,
          hrv: filtered.hrv,
          resting_heart_rate: filtered.resting_heart_rate,
          stress_score: filtered.stress_score,
          daily_steps: filtered.daily_steps,
          active_calories: filtered.active_calories,
          vo2_max: filtered.vo2_max,
          training_load: filtered.training_load,
          recovery_status: filtered.recovery_status,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,metric_date,provider" }
      );

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to store Garmin metrics:", err);
    return false;
  }
}
