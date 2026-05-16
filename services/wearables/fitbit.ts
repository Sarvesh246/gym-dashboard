/**
 * Fitbit integration service
 * Handles OAuth2 auth and token management for Fitbit
 */

export interface FitbitConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Fitbit config from environment
 */
export function getFitbitConfig(): FitbitConfig {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Fitbit OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Fitbit OAuth authorization URL
 */
export function generateFitbitAuthUrl(state: string): string {
  const config = getFitbitConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "activity heartrate profile sleep weight",
    state,
  });

  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFitbitCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getFitbitConfig();
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Fitbit token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error exchanging Fitbit code:", err);
    return null;
  }
}

/**
 * Refresh Fitbit access token
 */
export async function refreshFitbitToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getFitbitConfig();
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Fitbit token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error refreshing Fitbit token:", err);
    return null;
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch sleep data from Fitbit
 */
export async function fetchFitbitSleep(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Fitbit sleep fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.sleep || [];
  } catch (err) {
    console.error("Error fetching Fitbit sleep:", err);
    return [];
  }
}

/**
 * Fetch activity data from Fitbit
 */
export async function fetchFitbitActivity(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Fitbit activity fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Fitbit activity:", err);
    return {};
  }
}

/**
 * Fetch heart rate data from Fitbit
 */
export async function fetchFitbitHeartRate(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Fitbit heart rate fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Fitbit heart rate:", err);
    return {};
  }
}
