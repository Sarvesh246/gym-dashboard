/**
 * Confidence scoring for health and recovery data
 */

import type { NormalizedHealthMetrics, ConfidenceModifiers, RecoveryConfidenceContext } from "./types";

/**
 * Calculate data completeness: what fraction of expected metrics are present
 */
export function calculateDataCompleteness(metrics: NormalizedHealthMetrics): number {
  const expected = [
    "sleep_duration",
    "sleep_quality",
    "hrv",
    "resting_heart_rate",
    "stress_score",
    "daily_steps",
    "active_calories",
  ];

  const present = expected.filter((key) => metrics[key as keyof NormalizedHealthMetrics] !== undefined).length;

  return present / expected.length;
}

/**
 * Calculate data freshness score: how recent is the sync
 * Returns 1.0 for today's data, 0.5 for 7 days old, 0.0 for >14 days
 */
export function calculateDataFreshness(metricDate: Date, now: Date = new Date()): number {
  const daysDiff = Math.floor((now.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 1.0;    // today
  if (daysDiff === 1) return 0.9;    // yesterday
  if (daysDiff <= 3) return 0.8;     // last 3 days
  if (daysDiff <= 7) return 0.5;     // last week
  if (daysDiff <= 14) return 0.2;    // older
  return 0.0;                        // stale
}

/**
 * Calculate overall data quality score (0–1)
 * Combines completeness and freshness
 */
export function calculateDataQualityScore(
  metrics: NormalizedHealthMetrics,
  metricDate: Date
): number {
  const completeness = calculateDataCompleteness(metrics);
  const freshness = calculateDataFreshness(metricDate);

  // Weighted average: completeness 60%, freshness 40%
  return completeness * 0.6 + freshness * 0.4;
}

/**
 * Get provider reliability score
 * Garmin = 0.95 (very reliable), others calibrated based on data quality patterns
 */
export function getProviderReliability(provider: string): number {
  const reliability: Record<string, number> = {
    garmin: 0.95,
    apple_health: 0.90,
    fitbit: 0.85,
    polar: 0.88,
    wahoo: 0.80,
  };

  return reliability[provider] ?? 0.75;
}

/**
 * Calculate confidence modifiers for wearable data
 */
export function calculateConfidenceModifiers(
  metrics: NormalizedHealthMetrics,
  metricDate: Date,
  provider: string
): ConfidenceModifiers {
  const completeness = calculateDataCompleteness(metrics);
  const freshness = calculateDataFreshness(metricDate);
  const reliability = getProviderReliability(provider);
  const qualityScore = calculateDataQualityScore(metrics, metricDate);

  return {
    wearable_data_available: true,
    data_completeness: completeness,
    data_freshness: freshness,
    provider_reliability: reliability,
    metric_quality_score: qualityScore,
  };
}

/**
 * Calculate recovery confidence multiplier for readiness scoring
 * Returns value between 0.85–1.15 to adjust readiness confidence
 * 1.0 = no change, >1.0 = more confident, <1.0 = less confident
 */
export function calculateRecoveryConfidenceMultiplier(modifiers: ConfidenceModifiers): number {
  if (!modifiers.wearable_data_available) {
    return 1.0; // No multiplier if no wearable data
  }

  // Base multiplier from quality score: 0.85–1.15
  const qualityBoost = 0.85 + modifiers.metric_quality_score * 0.3;

  // Freshness adjustment: reduce confidence if data is stale
  const freshnessAdjust = modifiers.data_freshness < 0.5 ? -0.05 : 0;

  // Combine
  const combined = qualityBoost + freshnessAdjust;

  // Clamp to reasonable range
  return Math.max(0.85, Math.min(1.15, combined));
}

/**
 * Build recovery confidence context for readiness scoring
 */
export function buildRecoveryConfidenceContext(
  hasManualSleep: boolean,
  hasWearableMetrics: boolean,
  modifiers: ConfidenceModifiers | null
): RecoveryConfidenceContext {
  const hasHRV = modifiers ? modifiers.metric_quality_score > 0.3 : false;
  const hasRestingHR = modifiers ? modifiers.metric_quality_score > 0.3 : false;

  const confidenceMultiplier = modifiers
    ? calculateRecoveryConfidenceMultiplier(modifiers)
    : 1.0;

  let description = "";
  if (hasManualSleep && hasWearableMetrics) {
    description = "Manual + wearable data";
  } else if (hasWearableMetrics) {
    description = "Wearable data only";
  } else if (hasManualSleep) {
    description = "Manual entry only";
  } else {
    description = "Limited data available";
  }

  return {
    has_manual_sleep: hasManualSleep,
    has_wearable_sleep: hasWearableMetrics,
    has_hrv_data: hasHRV,
    has_resting_hr: hasRestingHR,
    confidence_multiplier: confidenceMultiplier,
    data_source_description: description,
  };
}

/**
 * Determine if wearable data should be considered stale
 */
export function isDataStale(lastSyncDate: Date, now: Date = new Date()): boolean {
  const daysDiff = Math.floor((now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 7; // Data older than 7 days is considered stale
}
