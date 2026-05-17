/**
 * Fitbit integration via Google Health API
 * OAuth2 uses Google Cloud credentials; health data is read from health.googleapis.com
 */

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_HEALTH_API_BASE = "https://health.googleapis.com/v4";

/** Scopes configured in Google Cloud → OAuth client → Data Access */
const GOOGLE_HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
].join(" ");

export interface FitbitConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function readRequiredEnv(
  name: "FITBIT_CLIENT_ID" | "FITBIT_CLIENT_SECRET" | "FITBIT_REDIRECT_URI"
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error("Fitbit (Google Health) OAuth credentials not configured");
  }

  return value;
}

/**
 * Get Google OAuth config from FITBIT_* environment variables
 */
export function getFitbitConfig(): FitbitConfig {
  return {
    clientId: readRequiredEnv("FITBIT_CLIENT_ID"),
    clientSecret: readRequiredEnv("FITBIT_CLIENT_SECRET"),
    redirectUri: readRequiredEnv("FITBIT_REDIRECT_URI"),
  };
}

function nextCalendarDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0]!;
}

async function listGoogleHealthDataPoints(
  accessToken: string,
  dataType: string,
  filter: string
): Promise<Record<string, unknown>[]> {
  const url = new URL(
    `${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints`
  );
  url.searchParams.set("filter", filter);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      `Google Health list ${dataType} failed:`,
      response.status,
      await response.text()
    );
    return [];
  }

  const data = (await response.json()) as { dataPoints?: Record<string, unknown>[] };
  return data.dataPoints ?? [];
}

/**
 * Generate Google OAuth authorization URL for Fitbit / Google Health access
 */
export function generateFitbitAuthUrl(state: string): string {
  const config = getFitbitConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: GOOGLE_HEALTH_SCOPES,
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
export async function exchangeFitbitCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getFitbitConfig();

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
export async function refreshFitbitToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
} | null> {
  try {
    const config = getFitbitConfig();

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
      console.error("Google OAuth token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in ?? 3600,
      refresh_token: data.refresh_token,
    };
  } catch (err) {
    console.error("Error refreshing Google OAuth token:", err);
    return null;
  }
}

// ─── Data fetching (Google Health API) ───────────────────────────────────

function parseSleepSummary(
  dataPoints: Record<string, unknown>[]
): { duration?: number; efficiency?: number } {
  if (dataPoints.length === 0) return {};

  const sleep = dataPoints[0]?.sleep as Record<string, unknown> | undefined;
  const summary = sleep?.sleepSummary as Record<string, unknown> | undefined;
  if (!summary) return {};

  const minutesAsleep = Number(summary.minutesAsleep);
  const minutesInPeriod = Number(summary.minutesInSleepPeriod);

  if (!Number.isFinite(minutesAsleep)) return {};

  return {
    duration: minutesAsleep * 60 * 1000,
    efficiency:
      Number.isFinite(minutesInPeriod) && minutesInPeriod > 0
        ? Math.round((minutesAsleep / minutesInPeriod) * 100)
        : undefined,
  };
}

function parseStepsAndCalories(dataPoints: Record<string, unknown>[]): {
  steps?: number;
  calories?: number;
} {
  let steps = 0;
  let calories = 0;
  let hasSteps = false;
  let hasCalories = false;

  for (const point of dataPoints) {
    const stepsField = point.steps as Record<string, unknown> | undefined;
    if (stepsField?.count !== undefined) {
      steps += Number(stepsField.count);
      hasSteps = true;
    }

    const caloriesField = point.totalCalories as Record<string, unknown> | undefined;
    const kcal =
      caloriesField?.caloriesKcal ??
      caloriesField?.value ??
      caloriesField?.energyKcal;
    if (kcal !== undefined) {
      calories += Number(kcal);
      hasCalories = true;
    }
  }

  return {
    steps: hasSteps ? steps : undefined,
    calories: hasCalories ? calories : undefined,
  };
}

function parseRestingHeartRate(dataPoints: Record<string, unknown>[]): number | undefined {
  const primary = dataPoints[0];
  if (!primary) return undefined;

  const daily = primary.dailyRestingHeartRate as Record<string, unknown> | undefined;
  const bpm = daily?.beatsPerMinute;
  return typeof bpm === "number" ? bpm : bpm !== undefined ? Number(bpm) : undefined;
}

/**
 * Fetch sleep data for a calendar day
 */
export async function fetchFitbitSleep(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const endDate = nextCalendarDate(date);
    const filter = `sleep.interval.civil_end_time >= "${date}" AND sleep.interval.civil_end_time < "${endDate}"`;
    const dataPoints = await listGoogleHealthDataPoints(accessToken, "sleep", filter);
    const summary = parseSleepSummary(dataPoints);

    if (!summary.duration && summary.efficiency === undefined) {
      return {};
    }

    return { sleep: summary };
  } catch (err) {
    console.error("Error fetching Google Health sleep:", err);
    return {};
  }
}

/**
 * Fetch activity (steps, calories) for a calendar day
 */
export async function fetchFitbitActivity(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const endDate = nextCalendarDate(date);
    const stepsFilter = `steps.interval.civil_start_time >= "${date}" AND steps.interval.civil_start_time < "${endDate}"`;
    const caloriesFilter = `total_calories.interval.civil_start_time >= "${date}" AND total_calories.interval.civil_start_time < "${endDate}"`;

    const [stepsPoints, caloriesPoints] = await Promise.all([
      listGoogleHealthDataPoints(accessToken, "steps", stepsFilter),
      listGoogleHealthDataPoints(accessToken, "total-calories", caloriesFilter),
    ]);

    const { steps, calories } = parseStepsAndCalories([
      ...stepsPoints,
      ...caloriesPoints,
    ]);

    const result: Record<string, unknown> = {};
    if (steps !== undefined) result.steps = steps;
    if (calories !== undefined) result.calories = calories;
    return result;
  } catch (err) {
    console.error("Error fetching Google Health activity:", err);
    return {};
  }
}

/**
 * Fetch resting heart rate for a calendar day
 */
export async function fetchFitbitHeartRate(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const endDate = nextCalendarDate(date);
    const filter = `dailyRestingHeartRate.date >= "${date}" AND dailyRestingHeartRate.date < "${endDate}"`;
    const dataPoints = await listGoogleHealthDataPoints(
      accessToken,
      "daily-resting-heart-rate",
      filter
    );
    const resting = parseRestingHeartRate(dataPoints);

    if (resting === undefined) return {};
    return { heartRate: { resting } };
  } catch (err) {
    console.error("Error fetching Google Health heart rate:", err);
    return {};
  }
}
