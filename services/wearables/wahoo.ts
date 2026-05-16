/**
 * Wahoo integration service
 * Handles OAuth2 auth and token management for Wahoo
 */

export interface WahooConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Wahoo config from environment
 */
export function getWahooConfig(): WahooConfig {
  const clientId = process.env.WAHOO_CLIENT_ID;
  const clientSecret = process.env.WAHOO_CLIENT_SECRET;
  const redirectUri = process.env.WAHOO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Wahoo OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Wahoo OAuth authorization URL
 */
export function generateWahooAuthUrl(state: string): string {
  const config = getWahooConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "user:read activity:read",
    state,
  });

  return `https://api.wahooligan.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeWahooCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getWahooConfig();

    const response = await fetch("https://api.wahooligan.com/oauth/token", {
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
      console.error("Wahoo token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error exchanging Wahoo code:", err);
    return null;
  }
}

/**
 * Refresh Wahoo access token
 */
export async function refreshWahooToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getWahooConfig();

    const response = await fetch("https://api.wahooligan.com/oauth/token", {
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
      console.error("Wahoo token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error("Error refreshing Wahoo token:", err);
    return null;
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch activity data from Wahoo
 */
export async function fetchWahooActivities(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(
      `https://api.wahooligan.com/v1/user/activities?date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Wahoo activities fetch failed:", response.status);
      return [];
    }

    const data = await response.json();
    return data.activities || [];
  } catch (err) {
    console.error("Error fetching Wahoo activities:", err);
    return [];
  }
}

/**
 * Fetch summary data from Wahoo
 */
export async function fetchWahooSummary(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://api.wahooligan.com/v1/user/summary/date/${date}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Wahoo summary fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Wahoo summary:", err);
    return {};
  }
}
