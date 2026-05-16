/**
 * Polar integration service
 * Handles OAuth2 auth and token management for Polar
 */

export interface PolarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Polar config from environment
 */
export function getPolarConfig(): PolarConfig {
  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  const redirectUri = process.env.POLAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Polar OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Polar OAuth authorization URL
 */
export function generatePolarAuthUrl(state: string): string {
  const config = getPolarConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "activity:read heartrate:read sleep:read training:read",
    state,
  });

  return `https://www.polaraccesslink.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangePolarCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getPolarConfig();

    const response = await fetch("https://www.polaraccesslink.com/oauth2/token", {
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
      console.error("Polar token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error exchanging Polar code:", err);
    return null;
  }
}

/**
 * Refresh Polar access token
 */
export async function refreshPolarToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getPolarConfig();

    const response = await fetch("https://www.polaraccesslink.com/oauth2/token", {
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
      console.error("Polar token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error refreshing Polar token:", err);
    return null;
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch sleep data from Polar
 */
export async function fetchPolarSleep(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://www.polaraccesslink.com/api/v3/users/-/sleep/date/${date}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Polar sleep fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Polar sleep:", err);
    return {};
  }
}

/**
 * Fetch activity data from Polar
 */
export async function fetchPolarActivity(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://www.polaraccesslink.com/api/v3/users/-/activity-logs/date/${date}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Polar activity fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Polar activity:", err);
    return {};
  }
}
