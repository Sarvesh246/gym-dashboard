/**
 * Health data normalization — converts provider-specific formats to internal standard
 */

import type { NormalizedHealthMetrics } from "@/lib/health/types";
import type { WearableProvider } from "@/lib/wearables/providers";
import { validateMetricsPayload } from "@/lib/wearables/validation";

/**
 * Normalize wearable data from any provider into internal format
 */
export function normalizeHealthData(
  providerData: Record<string, unknown>,
  provider: WearableProvider
): NormalizedHealthMetrics {
  // Validate payload first
  const validation = validateMetricsPayload(providerData);
  if (!validation.valid) {
    console.warn(`Validation errors normalizing ${provider} data:`, validation.errors);
  }

  // Route to provider-specific normalizer
  switch (provider) {
    case "garmin":
      return normalizeGarminData(providerData);
    case "apple_health":
      return normalizeAppleHealthData(providerData);
    case "fitbit":
      return normalizeFitbitData(providerData);
    case "polar":
      return normalizePolarData(providerData);
    case "wahoo":
      return normalizeWahooData(providerData);
    case "google_fit":
      return normalizeGoogleFitData(providerData);
    default:
      return {};
  }
}

/**
 * Normalize Garmin payload
 * Garmin provides metrics directly; minimal transformation needed
 * Handles wellness data (activity, sleep, HR, stress) and training metrics (VO2, load, recovery)
 */
function normalizeGarminData(data: Record<string, unknown>): NormalizedHealthMetrics {
  // Map recovery status strings to normalized format
  const normalizeRecoveryStatus = (status: unknown): string | undefined => {
    if (typeof status === "string") {
      const normalized = status.toLowerCase();
      if (["low", "moderate", "high"].includes(normalized)) {
        return normalized;
      }
    }
    return undefined;
  };

  return {
    sleep_duration: typeof data.sleepDuration === "number" ? data.sleepDuration / 3600 : undefined, // seconds → hours
    sleep_quality: typeof data.sleepQuality === "number" ? data.sleepQuality : undefined,
    hrv: typeof data.hrv === "number" ? data.hrv : undefined,
    resting_heart_rate: typeof data.restingHeartRate === "number" ? data.restingHeartRate : undefined,
    stress_score: typeof data.stressLevel === "number" ? data.stressLevel : undefined,
    daily_steps: typeof data.totalSteps === "number" ? data.totalSteps : undefined,
    active_calories: typeof data.activeCalories === "number" ? data.activeCalories : undefined,
    activity_level: typeof data.activityLevel === "number" ? data.activityLevel : undefined,
    vo2_max: typeof data.vo2MaxValue === "number" ? data.vo2MaxValue : undefined,
    training_load: typeof data.trainingLoadValue === "number" ? data.trainingLoadValue : undefined,
    recovery_status: normalizeRecoveryStatus(data.recoveryStatusValue),
  };
}

/**
 * Normalize Apple HealthKit payload (placeholder)
 */
function normalizeAppleHealthData(data: Record<string, unknown>): NormalizedHealthMetrics {
  return {
    sleep_duration: typeof data.sleepDuration === "number" ? data.sleepDuration : undefined,
    sleep_quality: typeof data.sleepQuality === "number" ? data.sleepQuality : undefined,
    hrv: typeof data.heartRateVariability === "number" ? data.heartRateVariability : undefined,
    resting_heart_rate: typeof data.restingHeartRate === "number" ? data.restingHeartRate : undefined,
    daily_steps: typeof data.stepCount === "number" ? data.stepCount : undefined,
    active_calories: typeof data.activeEnergyBurned === "number" ? data.activeEnergyBurned : undefined,
  };
}

/**
 * Normalize Fitbit payload (placeholder)
 */
function normalizeFitbitData(data: Record<string, unknown>): NormalizedHealthMetrics {
  const sleep = data.sleep as Record<string, unknown> | undefined;
  const heartRate = data.heartRate as Record<string, unknown> | undefined;

  return {
    sleep_duration: typeof sleep?.duration === "number" ? sleep.duration / 3600000 : undefined, // ms → hours
    sleep_quality: typeof sleep?.efficiency === "number" ? sleep.efficiency : undefined,
    resting_heart_rate: typeof heartRate?.resting === "number" ? heartRate.resting : undefined,
    daily_steps: typeof data.steps === "number" ? data.steps : undefined,
    active_calories: typeof data.calories === "number" ? data.calories : undefined,
  };
}

/**
 * Normalize Polar payload (placeholder)
 */
function normalizePolarData(data: Record<string, unknown>): NormalizedHealthMetrics {
  return {
    sleep_duration: typeof data.sleepDuration === "number" ? data.sleepDuration : undefined,
    sleep_quality: typeof data.sleepQuality === "number" ? data.sleepQuality : undefined,
    hrv: typeof data.hrv === "number" ? data.hrv : undefined,
    resting_heart_rate: typeof data.restingHeartRate === "number" ? data.restingHeartRate : undefined,
  };
}

/**
 * Normalize Wahoo payload (placeholder)
 */
function normalizeWahooData(data: Record<string, unknown>): NormalizedHealthMetrics {
  return {
    daily_steps: typeof data.steps === "number" ? data.steps : undefined,
    active_calories: typeof data.calories === "number" ? data.calories : undefined,
  };
}

/**
 * Normalize Google Fit payload
 * Google Fit provides aggregated metrics: activity (steps, calories), sleep (duration, segments), heart rate (avg, min, max)
 */
function normalizeGoogleFitData(data: Record<string, unknown>): NormalizedHealthMetrics {
  // Google Health API (shared with fitbit provider)
  const sleep = data.sleep as Record<string, unknown> | undefined;
  const heartRate = data.heartRate as Record<string, unknown> | undefined;

  if (sleep || heartRate || data.steps !== undefined) {
    return normalizeFitbitData(data);
  }

  // Legacy Google Fitness REST API aggregate payload
  const sleepData = data.sleep_duration_ms;
  const averageBpm =
    typeof data.average_bpm === "number"
      ? data.average_bpm
      : typeof (data.heart_rate as Record<string, unknown> | undefined)?.average_bpm ===
          "number"
        ? ((data.heart_rate as Record<string, unknown>).average_bpm as number)
        : undefined;

  return {
    sleep_duration: typeof sleepData === "number" ? sleepData / 3600000 : undefined, // ms → hours
    resting_heart_rate: averageBpm,
    daily_steps: typeof data.steps === "number" ? data.steps : undefined,
    active_calories: typeof data.calories === "number" ? data.calories : undefined,
    activity_level: typeof data.active_minutes === "number" ? data.active_minutes : undefined,
  };
}

/**
 * Filter out undefined values (missing metrics)
 */
export function filterMetrics(metrics: NormalizedHealthMetrics): NormalizedHealthMetrics {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, v]) => v !== undefined)
  ) as NormalizedHealthMetrics;
}

/**
 * Check if metrics have meaningful data
 */
export function hasSignificantData(metrics: NormalizedHealthMetrics): boolean {
  const keys = Object.keys(filterMetrics(metrics));
  return keys.length > 0;
}
