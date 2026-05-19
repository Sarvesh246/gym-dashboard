/**
 * Wearable provider registry and metadata
 */

export type WearableProvider = "garmin" | "apple_health" | "fitbit" | "polar" | "wahoo" | "google_fit";

export interface ProviderMetadata {
  name: string;
  description: string;
  implemented: boolean;
  supportedMetrics: HealthMetricType[];
  authFlow: "oauth2" | "api_key" | "platform_native";
  rateLimit?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export type HealthMetricType =
  | "sleep_duration"
  | "sleep_quality"
  | "hrv"
  | "resting_heart_rate"
  | "stress_score"
  | "daily_steps"
  | "active_calories"
  | "activity_level";

export const PROVIDER_REGISTRY: Record<WearableProvider, ProviderMetadata> = {
  garmin: {
    name: "Garmin",
    description: "Garmin watches and fitness trackers",
    implemented: true,
    supportedMetrics: [
      "sleep_duration",
      "sleep_quality",
      "hrv",
      "resting_heart_rate",
      "stress_score",
      "daily_steps",
      "active_calories",
      "activity_level",
    ],
    authFlow: "oauth2",
    rateLimit: {
      requestsPerHour: 60,
      requestsPerDay: 1000,
    },
  },
  apple_health: {
    name: "Apple Health",
    description: "Apple HealthKit (iOS/macOS)",
    implemented: true,
    supportedMetrics: [
      "sleep_duration",
      "sleep_quality",
      "hrv",
      "resting_heart_rate",
      "daily_steps",
      "active_calories",
    ],
    authFlow: "oauth2",
  },
  fitbit: {
    name: "Fitbit (Google Health)",
    description: "Fitbit data read via Google Health API. Requires Fitbit device linked to the user's Google account.",
    implemented: true,
    supportedMetrics: [
      "sleep_duration",
      "sleep_quality",
      "resting_heart_rate",
      "daily_steps",
      "active_calories",
    ],
    authFlow: "oauth2",
    rateLimit: {
      requestsPerHour: 150,
      requestsPerDay: 2400,
    },
  },
  polar: {
    name: "Polar",
    description: "Polar sports watches",
    implemented: true,
    supportedMetrics: [
      "sleep_duration",
      "sleep_quality",
      "hrv",
      "resting_heart_rate",
      "activity_level",
    ],
    authFlow: "oauth2",
  },
  wahoo: {
    name: "Wahoo",
    description: "Wahoo fitness devices",
    implemented: true,
    supportedMetrics: [
      "daily_steps",
      "active_calories",
      "activity_level",
    ],
    authFlow: "oauth2",
  },
  google_fit: {
    name: "Fitbit (Google Health) — legacy id",
    description: "Legacy provider id from the old Google Fit REST API. Treated as an alias for the fitbit row in Settings; no longer fetches Google Fit app data.",
    implemented: true,
    supportedMetrics: [
      "sleep_duration",
      "sleep_quality",
      "resting_heart_rate",
      "daily_steps",
      "active_calories",
      "activity_level",
    ],
    authFlow: "oauth2",
    rateLimit: {
      requestsPerHour: 100,
      requestsPerDay: 2000,
    },
  },
};

export function isProviderImplemented(provider: WearableProvider): boolean {
  return PROVIDER_REGISTRY[provider]?.implemented ?? false;
}

export function getProviderCapabilities(provider: WearableProvider): HealthMetricType[] {
  return PROVIDER_REGISTRY[provider]?.supportedMetrics ?? [];
}

export function getImplementedProviders(): WearableProvider[] {
  return (Object.keys(PROVIDER_REGISTRY) as WearableProvider[]).filter(
    (p) => PROVIDER_REGISTRY[p].implemented
  );
}
