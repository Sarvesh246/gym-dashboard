/**
 * Health data ingestion and scoring service.
 * Handles daily metric logging (sleep, HRV, stress, hydration, soreness, injuries)
 * and computation of normalized scores for readiness calculation.
 */

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyHealthMetrics {
  id: number;
  user_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  resting_heart_rate: number | null;
  hrv_score: number | null;
  stress_level: number | null;
  hydration_score: number | null;
  soreness_report: Record<string, number> | null;
  injury_flags: Array<{ muscle_group: string; note: string; since_date: string }> | null;
  created_at: string;
  updated_at: string;
}

export interface HealthMetricsInput {
  sleep_hours?: number;
  sleep_quality?: number;  // 1-10
  resting_heart_rate?: number;
  hrv_score?: number;  // 0-100
  stress_level?: number;  // 1-10
  hydration_score?: number;  // 0-100
  soreness_report?: Record<string, number>;
  injury_flags?: Array<{ muscle_group: string; note: string; since_date: string }>;
}

export interface NormalizedHealthScores {
  sleep_quality_score: number;  // 0-100
  stress_score: number;  // 0-100
  hrv_score: number;  // 0-100
  hydration_score: number;  // 0-100
}

export interface HealthMetricsWithDefaults extends DailyHealthMetrics {
  isLogged: boolean;  // true if user explicitly logged data, false if using defaults
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute 0-100 sleep quality score from hours and Likert scale (1-10).
 * High value: 7-9 hours + good quality (7+ on Likert) = 85-100.
 * Low value: <5 hours or quality 1-3 = 20-40.
 */
export function computeSleepQualityScore(
  sleepHours: number | null,
  sleepQualityLikert: number | null
): number {
  if (!sleepHours && !sleepQualityLikert) return 50;  // neutral default

  let hourScore = 50;  // default
  if (sleepHours !== null) {
    if (sleepHours >= 7 && sleepHours <= 9) hourScore = 90;
    else if (sleepHours >= 6.5 && sleepHours < 7) hourScore = 80;
    else if (sleepHours >= 6 && sleepHours < 6.5) hourScore = 75;
    else if (sleepHours >= 5.5 && sleepHours < 6) hourScore = 60;
    else if (sleepHours >= 5 && sleepHours < 5.5) hourScore = 45;
    else if (sleepHours < 5) hourScore = 30;
    else if (sleepHours > 9) hourScore = 75;  // too much sleep = suboptimal
  }

  let qualityScore = 50;  // default
  if (sleepQualityLikert !== null) {
    if (sleepQualityLikert >= 8) qualityScore = 90;
    else if (sleepQualityLikert === 7) qualityScore = 80;
    else if (sleepQualityLikert === 6) qualityScore = 65;
    else if (sleepQualityLikert === 5) qualityScore = 50;
    else if (sleepQualityLikert === 4) qualityScore = 35;
    else if (sleepQualityLikert <= 3) qualityScore = 20;
  }

  // Average hour and quality scores
  return Math.round((hourScore + qualityScore) / 2);
}

/**
 * Compute 0-100 stress score from 1-10 Likert scale.
 * Higher score = worse recovery (1-10 Likert inverted).
 */
export function computeStressScore(stressLikert: number | null): number {
  if (stressLikert === null) return 50;  // neutral default

  // 1 (low stress) → 10 score, 10 (high stress) → 90 score
  return Math.round((stressLikert - 1) * 10);
}

/**
 * Normalize HRV score (already 0-100 from wearable or manual input).
 * Higher HRV = better recovery capacity.
 */
export function normalizeHRVScore(hrvScore: number | null): number {
  if (hrvScore === null) return 50;  // neutral default
  return Math.max(0, Math.min(100, hrvScore));
}

/**
 * Normalize hydration score (already 0-100).
 */
export function normalizeHydrationScore(hydrationScore: number | null): number {
  if (hydrationScore === null) return 50;  // neutral default
  return Math.max(0, Math.min(100, hydrationScore));
}

// ─── Database Operations ──────────────────────────────────────────────────────

/**
 * Fetch daily health metrics for a specific date.
 * If not found, returns null (caller should use profile defaults as fallback).
 */
export async function getDailyHealthMetrics(
  userId: string,
  date: string,  // ISO format YYYY-MM-DD
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<DailyHealthMetrics | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("daily_health_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (error) {
      // PGRST116 = no rows found (expected). Missing-table errors mean
      // migration 006 hasn't been applied — degrade silently in that case.
      const missing =
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /Could not find the table .* in the schema cache/i.test(error.message || "");
      if (error.code !== "PGRST116" && !missing) {
        console.error("[getDailyHealthMetrics] Error:", error.message);
      }
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[getDailyHealthMetrics] Exception:", err);
    return null;
  }
}

/**
 * Log or update daily health metrics for a specific date.
 * Upserts to ensure idempotency (same date = update, not duplicate).
 */
export async function logDailyHealthMetrics(
  userId: string,
  date: string,
  input: HealthMetricsInput,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<DailyHealthMetrics | null> {
  try {
    const payload = {
      user_id: userId,
      date,
      sleep_hours: input.sleep_hours || null,
      sleep_quality: input.sleep_quality || null,
      resting_heart_rate: input.resting_heart_rate || null,
      hrv_score: input.hrv_score || null,
      stress_level: input.stress_level || null,
      hydration_score: input.hydration_score || null,
      soreness_report: input.soreness_report || null,
      injury_flags: input.injury_flags || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("daily_health_metrics")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();

    if (error) {
      console.error("[logDailyHealthMetrics] Error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[logDailyHealthMetrics] Exception:", err);
    return null;
  }
}

/**
 * Compute normalized health scores from metrics.
 * If a metric is not available, uses neutral defaults (50).
 */
export function computeNormalizedHealthScores(
  metrics: DailyHealthMetrics | null
): NormalizedHealthScores {
  if (!metrics) {
    return {
      sleep_quality_score: 50,
      stress_score: 50,
      hrv_score: 50,
      hydration_score: 50,
    };
  }

  return {
    sleep_quality_score: computeSleepQualityScore(metrics.sleep_hours, metrics.sleep_quality),
    stress_score: computeStressScore(metrics.stress_level),
    hrv_score: normalizeHRVScore(metrics.hrv_score),
    hydration_score: normalizeHydrationScore(metrics.hydration_score),
  };
}

/**
 * Get health metrics with profile-derived fallbacks.
 * If user hasn't logged data for today, falls back to profile defaults.
 * This prevents readiness collapse on missing data.
 */
export async function getDailyHealthMetricsWithDefaults(
  userId: string,
  date: string,
  profileDefaults: {
    sleepQuality: "low" | "medium" | "high";
    stressLevel: "low" | "medium" | "high";
  },
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<HealthMetricsWithDefaults> {
  const loggedMetrics = await getDailyHealthMetrics(userId, date, supabase);

  if (loggedMetrics) {
    return {
      ...loggedMetrics,
      isLogged: true,
    };
  }

  // Fall back to profile-derived defaults
  const defaultSleepQuality = {
    low: 4,      // pessimistic
    medium: 6,   // neutral
    high: 8,     // optimistic
  }[profileDefaults.sleepQuality];

  const defaultStressLevel = {
    low: 2,      // optimistic
    medium: 5,   // neutral
    high: 8,     // pessimistic
  }[profileDefaults.stressLevel];

  return {
    id: -1,  // placeholder
    user_id: userId,
    date,
    sleep_hours: 7,  // conservative baseline
    sleep_quality: defaultSleepQuality,
    resting_heart_rate: null,
    hrv_score: null,
    stress_level: defaultStressLevel,
    hydration_score: 60,  // conservative baseline
    soreness_report: null,
    injury_flags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isLogged: false,
  };
}

/**
 * Fetch health metrics for a date range (e.g., last 7 days).
 * Used for trend analysis and historical review.
 */
export async function getDailyHealthMetricsRange(
  userId: string,
  startDate: string,
  endDate: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<DailyHealthMetrics[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("daily_health_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("[getDailyHealthMetricsRange] Error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[getDailyHealthMetricsRange] Exception:", err);
    return [];
  }
}

/**
 * Aggregate health metrics over a date range.
 * Useful for computing average sleep, stress, etc. over 7 days.
 */
export function aggregateHealthMetrics(
  metrics: DailyHealthMetrics[]
): {
  avgSleepHours: number | null;
  avgSleepQuality: number | null;
  avgStressLevel: number | null;
  avgHRVScore: number | null;
  avgHydrationScore: number | null;
  daysLogged: number;
} {
  if (metrics.length === 0) {
    return {
      avgSleepHours: null,
      avgSleepQuality: null,
      avgStressLevel: null,
      avgHRVScore: null,
      avgHydrationScore: null,
      daysLogged: 0,
    };
  }

  const sleepHours = metrics.filter((m) => m.sleep_hours !== null).map((m) => m.sleep_hours!);
  const sleepQualities = metrics.filter((m) => m.sleep_quality !== null).map((m) => m.sleep_quality!);
  const stressLevels = metrics.filter((m) => m.stress_level !== null).map((m) => m.stress_level!);
  const hrvScores = metrics.filter((m) => m.hrv_score !== null).map((m) => m.hrv_score!);
  const hydrationScores = metrics.filter((m) => m.hydration_score !== null).map((m) => m.hydration_score!);

  return {
    avgSleepHours: sleepHours.length > 0 ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null,
    avgSleepQuality: sleepQualities.length > 0 ? sleepQualities.reduce((a, b) => a + b, 0) / sleepQualities.length : null,
    avgStressLevel: stressLevels.length > 0 ? stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length : null,
    avgHRVScore: hrvScores.length > 0 ? hrvScores.reduce((a, b) => a + b, 0) / hrvScores.length : null,
    avgHydrationScore: hydrationScores.length > 0 ? hydrationScores.reduce((a, b) => a + b, 0) / hydrationScores.length : null,
    daysLogged: metrics.length,
  };
}
