/**
 * Recovery enhancement layer — applies wearable data modifiers to recovery scoring
 * Wearables refine and enhance deterministic recovery logic WITHOUT replacing it
 */

import { createClient } from "@/lib/supabase/server";
import type { NormalizedHealthMetrics, RecoveryConfidenceContext } from "@/lib/health/types";
import {
  calculateDataQualityScore,
  calculateConfidenceModifiers,
  calculateRecoveryConfidenceMultiplier,
  buildRecoveryConfidenceContext,
  isDataStale,
} from "@/lib/health/confidence";

// ─── Recovery Modifier Calculations ───────────────────────────────────────

/**
 * Calculate recovery modifier from wearable metrics
 * Returns adjustment factors for readiness scoring (e.g., fatigue multiplier, recovery adjustment)
 */
export function calculateRecoveryModifiers(metrics: NormalizedHealthMetrics): {
  fatigue_adjustment: number;          // 0.8–1.2, applied to fatigue
  readiness_adjustment: number;        // 0.8–1.1, applied to readiness
  sleep_quality_override?: number;    // 0–100, overrides manual sleep entry
  hrv_stress_indicator: number;       // 0–1, stress/fatigue signal
} {
  const adjustments = {
    fatigue_adjustment: 1.0,
    readiness_adjustment: 1.0,
    sleep_quality_override: undefined as number | undefined,
    hrv_stress_indicator: 0.5,
  };

  // ─── HRV Analysis ───────────────────────────────────────────────────────
  // Low HRV = elevated fatigue/stress, High HRV = good recovery
  if (typeof metrics.hrv === "number") {
    // Typical ranges: 20–200 ms (lower = more stressed, higher = more recovered)
    const normalized = Math.min(1, metrics.hrv / 150); // 150ms = reference max
    adjustments.hrv_stress_indicator = 1 - normalized; // Inverted: high HRV → low stress

    // If HRV is very low, increase fatigue sensitivity
    if (metrics.hrv < 40) {
      adjustments.fatigue_adjustment *= 1.15; // +15% fatigue sensitivity
      adjustments.readiness_adjustment *= 0.9; // -10% readiness boost
    }
  }

  // ─── Resting Heart Rate Analysis ─────────────────────────────────────
  // Elevated RHR = elevated stress, indicates incomplete recovery
  if (typeof metrics.resting_heart_rate === "number") {
    // Typical: 50–70 bpm (baseline depends on athlete, but elevated = fatigue)
    const baseline = 60; // Conservative baseline
    const elevation = metrics.resting_heart_rate - baseline;

    if (elevation > 10) {
      adjustments.readiness_adjustment *= 0.95; // -5% readiness
    } else if (elevation < -5) {
      adjustments.readiness_adjustment *= 1.05; // +5% readiness bonus
    }
  }

  // ─── Sleep Quality/Duration ─────────────────────────────────────────
  // Use wearable sleep as authoritative if available
  if (typeof metrics.sleep_quality === "number") {
    adjustments.sleep_quality_override = metrics.sleep_quality;

    // Supplement with duration for additional context
    if (typeof metrics.sleep_duration === "number") {
      // Short sleep (<6h) = moderate recovery penalty, Long sleep (>9h) = minimal bonus
      if (metrics.sleep_duration < 6) {
        adjustments.fatigue_adjustment *= 1.1;
      } else if (metrics.sleep_duration > 9) {
        adjustments.readiness_adjustment *= 1.05;
      }
    }
  }

  // ─── Stress Score ───────────────────────────────────────────────────
  // Wearable stress/wellness indicator
  if (typeof metrics.stress_score === "number") {
    // 0–100 scale, higher = more stressed
    if (metrics.stress_score > 70) {
      adjustments.fatigue_adjustment *= 1.12; // +12% fatigue
      adjustments.readiness_adjustment *= 0.88; // -12% readiness
    } else if (metrics.stress_score < 30) {
      adjustments.readiness_adjustment *= 1.08; // +8% readiness
    }
  }

  // ─── Activity Level ─────────────────────────────────────────────────
  // If wearable shows very low activity, user may be in active recovery mode
  if (typeof metrics.activity_level === "number" && metrics.activity_level < 20) {
    adjustments.readiness_adjustment *= 1.1; // +10% readiness if very inactive
  }

  // Clamp adjustments to reasonable ranges
  adjustments.fatigue_adjustment = Math.max(0.8, Math.min(1.2, adjustments.fatigue_adjustment));
  adjustments.readiness_adjustment = Math.max(0.8, Math.min(1.1, adjustments.readiness_adjustment));

  return adjustments;
}

// ─── Fetch Latest Wearable Metrics ───────────────────────────────────────

/**
 * Fetch the most recent wearable health metrics for a user
 */
export async function getLatestWearableMetrics(
  userId: string
): Promise<{ metrics: NormalizedHealthMetrics; metricDate: string; provider: string } | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("wearable_health_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("metric_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Reconstruct metrics object from database fields
    const metrics: NormalizedHealthMetrics = {
      sleep_duration: data.sleep_duration,
      sleep_quality: data.sleep_quality,
      hrv: data.hrv,
      resting_heart_rate: data.resting_heart_rate,
      stress_score: data.stress_score,
      daily_steps: data.daily_steps,
      active_calories: data.active_calories,
    };

    return {
      metrics,
      metricDate: data.metric_date,
      provider: data.provider,
    };
  } catch (err) {
    console.error("Failed to fetch latest wearable metrics:", err);
    return null;
  }
}

// ─── Build Recovery Context ──────────────────────────────────────────────

/**
 * Build comprehensive recovery context including wearable data
 * Used by readiness/recovery scoring engine
 */
export async function buildRecoveryContextWithWearables(
  userId: string,
  hasManualSleep: boolean
): Promise<RecoveryConfidenceContext> {
  const wearableData = await getLatestWearableMetrics(userId);

  if (!wearableData) {
    // No wearable data available
    return buildRecoveryConfidenceContext(hasManualSleep, false, null);
  }

  // Check if data is stale
  const metricDate = new Date(wearableData.metricDate);
  if (isDataStale(metricDate)) {
    return buildRecoveryConfidenceContext(hasManualSleep, false, null);
  }

  // Calculate confidence modifiers
  const modifiers = calculateConfidenceModifiers(
    wearableData.metrics,
    metricDate,
    wearableData.provider
  );

  return buildRecoveryConfidenceContext(hasManualSleep, true, modifiers);
}

// ─── Readiness Score Enhancement ────────────────────────────────────────

/**
 * Apply wearable adjustments to a readiness score
 * baseReadiness: 0–100, from deterministic recovery calculation
 * Returns adjusted score (still 0–100)
 */
export function applyWearableReadinessAdjustment(
  baseReadiness: number,
  confidenceContext: RecoveryConfidenceContext
): number {
  // Apply confidence multiplier
  const adjusted = baseReadiness * confidenceContext.confidence_multiplier;

  // Clamp to valid range
  return Math.max(0, Math.min(100, adjusted));
}

/**
 * Enhance readiness explanation with wearable context
 */
export function enhanceReadinessExplanation(
  baseExplanation: string,
  confidenceContext: RecoveryConfidenceContext
): string {
  if (!confidenceContext.has_wearable_sleep && !confidenceContext.has_hrv_data) {
    return baseExplanation;
  }

  let enhancement = baseExplanation;

  if (confidenceContext.has_hrv_data) {
    enhancement += " HRV shows ";
    enhancement += confidenceContext.confidence_multiplier > 1.0 ? "strong recovery signals." : "stress indicators.";
  }

  if (confidenceContext.has_resting_hr) {
    enhancement += " Heart rate data included.";
  }

  return enhancement;
}

/**
 * Get human-readable data source description
 */
export function getDataSourceDescription(context: RecoveryConfidenceContext): string {
  return context.data_source_description;
}
