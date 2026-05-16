/**
 * Historical trend aggregation service.
 * Provides data-fetching + smoothing pipelines for multi-period analytics.
 * No AI calls — purely deterministic aggregation.
 */

import { createClient } from "@/lib/supabase/server";
import { rollingAverage, linearSlope, type TrendPoint } from "@/lib/analytics/trends";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function yearBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Generate an array of YYYY-MM strings for all months in a year up to current month. */
export function monthsInYear(year: number): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const maxMonth = year === currentYear ? currentMonth : 12;
  return Array.from({ length: maxMonth }, (_, i) => {
    const m = i + 1;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

// ─── Raw fetchers ─────────────────────────────────────────────────────────────

export async function fetchReadinessSeries(
  userId: string,
  start: string,
  end: string
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("recovery_snapshots")
      .select("snapshot_date, readiness_score")
      .eq("user_id", userId)
      .gte("snapshot_date", start)
      .lte("snapshot_date", end)
      .order("snapshot_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.snapshot_date, value: r.readiness_score ?? 0 }));
  } catch {
    return [];
  }
}

export async function fetchVolumeSeries(
  userId: string,
  start: string,
  end: string
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("workout_sessions")
      .select("session_date, total_sets")
      .eq("user_id", userId)
      .gte("session_date", start)
      .lte("session_date", end)
      .order("session_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.session_date, value: r.total_sets ?? 0 }));
  } catch {
    return [];
  }
}

export async function fetchWeightSeries(
  userId: string,
  start: string,
  end: string
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("health_metrics")
      .select("metric_date, weight_kg")
      .eq("user_id", userId)
      .gte("metric_date", start)
      .lte("metric_date", end)
      .not("weight_kg", "is", null)
      .order("metric_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.metric_date, value: r.weight_kg }));
  } catch {
    return [];
  }
}

export async function fetchSleepSeries(
  userId: string,
  start: string,
  end: string
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("health_metrics")
      .select("metric_date, sleep_hours")
      .eq("user_id", userId)
      .gte("metric_date", start)
      .lte("metric_date", end)
      .not("sleep_hours", "is", null)
      .order("metric_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.metric_date, value: r.sleep_hours }));
  } catch {
    return [];
  }
}

export async function fetchWorkoutCount(
  userId: string,
  start: string,
  end: string
): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await (supabase as any)
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("session_date", start)
      .lte("session_date", end);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchNutritionSeries(
  userId: string,
  start: string,
  end: string
): Promise<Array<{ date: string; calorieAdherence: number; proteinAdherence: number }>> {
  try {
    const supabase = await createClient();
    const { data: logs } = await (supabase as any)
      .from("nutrition_daily_logs")
      .select("log_date, total_calories, total_protein_g")
      .eq("user_id", userId)
      .gte("log_date", start)
      .lte("log_date", end)
      .order("log_date", { ascending: true });

    const { data: goals } = await (supabase as any)
      .from("nutrition_goals")
      .select("calories_target, protein_g_target")
      .eq("user_id", userId)
      .single();

    if (!logs || logs.length === 0) return [];

    const calTarget = goals?.calories_target ?? 2000;
    const protTarget = goals?.protein_g_target ?? 150;

    return logs.map((l: any) => ({
      date: l.log_date,
      calorieAdherence: calTarget > 0 ? Math.min(1, (l.total_calories ?? 0) / calTarget) : 0,
      proteinAdherence: protTarget > 0 ? Math.min(1, (l.total_protein_g ?? 0) / protTarget) : 0,
    }));
  } catch {
    return [];
  }
}

// ─── Smoothing ────────────────────────────────────────────────────────────────

/** Apply a simple moving average to a TrendPoint series. */
export function smoothSeries(points: TrendPoint[], windowDays = 7): TrendPoint[] {
  if (points.length === 0) return [];
  return points.map((p, i) => {
    const window = points.slice(Math.max(0, i - windowDays + 1), i + 1);
    const avg = window.reduce((a, w) => a + w.value, 0) / window.length;
    return { date: p.date, value: avg };
  });
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

export interface PeriodSummary {
  start: string;
  end: string;
  avgReadiness: number;
  totalWorkouts: number;
  totalVolumeSets: number;
  avgSleepHours: number;
  avgCalorieAdherence: number;
  avgProteinAdherence: number;
  avgWeightKg: number | null;
  readinessTrend: "up" | "down" | "flat";
  volumeSlope: number;
}

export async function buildPeriodSummary(
  userId: string,
  start: string,
  end: string
): Promise<PeriodSummary> {
  const [readiness, volume, sleep, nutrition, weight, workoutCount] = await Promise.all([
    fetchReadinessSeries(userId, start, end),
    fetchVolumeSeries(userId, start, end),
    fetchSleepSeries(userId, start, end),
    fetchNutritionSeries(userId, start, end),
    fetchWeightSeries(userId, start, end),
    fetchWorkoutCount(userId, start, end),
  ]);

  const avgReadiness = rollingAverage(readiness, readiness.length) || 0;
  const totalVolumeSets = volume.reduce((a, p) => a + p.value, 0);
  const avgSleepHours = sleep.length > 0
    ? sleep.reduce((a, p) => a + p.value, 0) / sleep.length
    : 0;
  const avgCalorieAdherence = nutrition.length > 0
    ? nutrition.reduce((a, n) => a + n.calorieAdherence, 0) / nutrition.length
    : 0;
  const avgProteinAdherence = nutrition.length > 0
    ? nutrition.reduce((a, n) => a + n.proteinAdherence, 0) / nutrition.length
    : 0;
  const avgWeightKg = weight.length > 0
    ? weight.reduce((a, p) => a + p.value, 0) / weight.length
    : null;

  const readinessSlope = linearSlope(readiness);
  const readinessTrend: "up" | "down" | "flat" =
    Math.abs(readinessSlope) < 0.1 ? "flat" : readinessSlope > 0 ? "up" : "down";
  const volumeSlope = linearSlope(volume);

  return {
    start,
    end,
    avgReadiness,
    totalWorkouts: workoutCount,
    totalVolumeSets,
    avgSleepHours,
    avgCalorieAdherence,
    avgProteinAdherence,
    avgWeightKg,
    readinessTrend,
    volumeSlope,
  };
}
