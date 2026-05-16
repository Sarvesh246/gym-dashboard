/**
 * Apple Health integration service
 * Handles OAuth2 auth and token management for Apple HealthKit
 */

export interface AppleHealthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Apple Health config from environment
 */
export function getAppleHealthConfig(): AppleHealthConfig {
  const clientId = process.env.APPLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.APPLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.APPLE_HEALTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Apple Health OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Apple Health OAuth authorization URL
 */
export function generateAppleHealthAuthUrl(state: string): string {
  const config = getAppleHealthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "openid profile email",
    state,
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeAppleHealthCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getAppleHealthConfig();

    const response = await fetch("https://appleid.apple.com/auth/oauth2/token", {
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
      console.error("Apple Health token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || "",
      expires_in: data.expires_in || 3600,
    };
  } catch (err) {
    console.error("Error exchanging Apple Health code:", err);
    return null;
  }
}

/**
 * Refresh Apple Health access token
 */
export async function refreshAppleHealthToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const config = getAppleHealthConfig();

    const response = await fetch("https://appleid.apple.com/auth/oauth2/token", {
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
      console.error("Apple Health token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  } catch (err) {
    console.error("Error refreshing Apple Health token:", err);
    return null;
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch health data from Apple Health API
 * Note: Most Apple Health data is synced device-to-device
 * This fetches available server-side data via Health Records API
 */
export async function fetchAppleHealthData(
  accessToken: string,
  date: string
): Promise<Record<string, unknown>> {
  try {
    // Apple Health Records API endpoint
    const response = await fetch(
      "https://health.apple.com/api/records",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          predicates: [
            {
              startDate: date,
              endDate: date,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("Apple Health data fetch failed:", response.status);
      return {};
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Apple Health data:", err);
    return {};
  }
}
