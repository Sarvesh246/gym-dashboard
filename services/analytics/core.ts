/**
 * Analytics core: aggregates raw app data into compact AI-ready summaries.
 * All logic here is deterministic. AI only interprets these outputs.
 */

import { createClient } from "@/lib/supabase/server";
import {
  analyzeTrend,
  rollingAverage,
  computeConsistency,
  linearSlope,
  type TrendPoint,
} from "@/lib/analytics/trends";
import {
  scoreConsistency,
  scoreProgressionVelocity,
  scoreRecoveryTrend,
  scoreNutritionAdherence,
  compositeWeeklyScore,
  computeDeloadUrgency,
} from "@/lib/analytics/scoring";

export interface WeeklyAnalyticsSummary {
  periodStart: string;
  periodEnd: string;
  // Volume
  weeklyVolumeSets: number;
  volumeTrend: ReturnType<typeof analyzeTrend>;
  // Recovery
  avgReadiness7d: number;
  avgReadiness14d: number;
  recoveryTrend: ReturnType<typeof analyzeTrend>;
  // Sleep
  avgSleepHours: number;
  // Nutrition
  proteinAdherencePct: number;
  calorieAdherencePct: number;
  hydrationAdherencePct: number;
  // Consistency
  workoutConsistencyPct: number;
  workoutDaysThisWeek: number;
  // Fatigue
  fatigueHotspots: string[];
  fatigueAccumulation: number;
  // Bodyweight
  bodymassChange: number | null;
  bodymassChangeLbs: string | null;
  // Scores
  consistencyScore: number;
  recoveryScore: number;
  progressionScore: number;
  nutritionScore: number;
  compositeScore: number;
  // Deload
  deloadUrgency: 0 | 1 | 2 | 3;
  // Flags
  plateauFlags: string[];
  imbalanceFlags: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekBounds(weeksBack = 0): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - weeksBack * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchReadinessSeries(userId: string, days = 14): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const since = daysAgo(days);
    const { data } = await (supabase as any)
      .from("recovery_snapshots")
      .select("snapshot_date, readiness_score")
      .eq("user_id", userId)
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.snapshot_date, value: r.readiness_score }));
  } catch {
    return [];
  }
}

async function fetchVolumeSeries(userId: string, days = 28): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const since = daysAgo(days);
    const { data } = await (supabase as any)
      .from("workout_sessions")
      .select("session_date, total_sets")
      .eq("user_id", userId)
      .gte("session_date", since)
      .order("session_date", { ascending: true });
    return (data ?? []).map((r: any) => ({ date: r.session_date, value: r.total_sets ?? 0 }));
  } catch {
    return [];
  }
}

async function fetchSleepSeries(userId: string, days = 7): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const since = daysAgo(days);
    const { data } = await (supabase as any)
      .from("health_metrics")
      .select("metric_date, sleep_hours")
      .eq("user_id", userId)
      .gte("metric_date", since)
      .order("metric_date", { ascending: true });
    return (data ?? [])
      .filter((r: any) => r.sleep_hours != null)
      .map((r: any) => ({ date: r.metric_date, value: r.sleep_hours }));
  } catch {
    return [];
  }
}

async function fetchNutritionAdherence(userId: string): Promise<{
  proteinAdherencePct: number;
  calorieAdherencePct: number;
  hydrationAdherencePct: number;
}> {
  try {
    const res = await fetch(`/api/nutrition/history?days=7`, { cache: "no-store" });
    if (!res.ok) throw new Error("nutrition history failed");
    const json = await res.json();
    const stats = json?.weeklyStats ?? {};
    return {
      proteinAdherencePct: Math.round((stats.protein_adherence ?? 0) * 100),
      calorieAdherencePct: Math.round((stats.calorie_adherence ?? 0) * 100),
      hydrationAdherencePct: Math.round((stats.hydration_adherence ?? 0) * 100),
    };
  } catch {
    return { proteinAdherencePct: 0, calorieAdherencePct: 0, hydrationAdherencePct: 0 };
  }
}

async function fetchFatigueHotspots(userId: string): Promise<{ muscles: string[]; accumulation: number }> {
  try {
    const supabase = await createClient();
    const since = daysAgo(7);
    const { data } = await (supabase as any)
      .from("muscle_fatigue_logs")
      .select("muscle_group, fatigue_level")
      .eq("user_id", userId)
      .gte("logged_at", since)
      .order("fatigue_level", { ascending: false });

    if (!data || data.length === 0) return { muscles: [], accumulation: 0 };

    const hotspots = data
      .filter((r: any) => r.fatigue_level >= 70)
      .map((r: any) => r.muscle_group as string)
      .slice(0, 3);

    const accumulation = Math.round(
      data.reduce((sum: number, r: any) => sum + (r.fatigue_level ?? 0), 0) / data.length
    );

    return { muscles: hotspots, accumulation };
  } catch {
    return { muscles: [], accumulation: 0 };
  }
}

async function fetchWorkoutDays(userId: string, start: string, end: string): Promise<number> {
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

async function fetchBodymassChange(userId: string, days = 7): Promise<number | null> {
  try {
    const supabase = await createClient();
    const since = daysAgo(days + 7);
    const { data } = await (supabase as any)
      .from("health_metrics")
      .select("metric_date, weight_kg")
      .eq("user_id", userId)
      .gte("metric_date", since)
      .not("weight_kg", "is", null)
      .order("metric_date", { ascending: true });

    if (!data || data.length < 2) return null;
    const oldest = data[0].weight_kg as number;
    const newest = data[data.length - 1].weight_kg as number;
    return newest - oldest;
  } catch {
    return null;
  }
}

async function fetchImbalanceFlags(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const since = daysAgo(14);
    const { data } = await (supabase as any)
      .from("workout_sets")
      .select("muscle_group, reps, weight_kg")
      .eq("user_id", userId)
      .gte("performed_at", since);

    if (!data || data.length === 0) return [];

    const volumes: Record<string, number> = {};
    for (const s of data) {
      const mg = s.muscle_group ?? "unknown";
      volumes[mg] = (volumes[mg] ?? 0) + (s.reps ?? 0) * (s.weight_kg ?? 0);
    }

    const flags: string[] = [];

    const push = (volumes["chest"] ?? 0) + (volumes["shoulders_front"] ?? 0) + (volumes["triceps"] ?? 0);
    const pull = (volumes["back"] ?? 0) + (volumes["biceps"] ?? 0) + (volumes["rear_delts"] ?? 0);
    const lower = (volumes["quads"] ?? 0) + (volumes["hamstrings"] ?? 0) + (volumes["glutes"] ?? 0) + (volumes["calves"] ?? 0);
    const upper = push + pull;

    if (pull > 0 && push / pull > 1.5) flags.push("push_dominant");
    if (push > 0 && pull / push > 1.5) flags.push("pull_dominant");
    if (upper > 0 && lower / upper < 0.4) flags.push("upper_dominant");
    if (lower > 0 && upper / lower < 0.4) flags.push("lower_dominant");

    return flags;
  } catch {
    return [];
  }
}

async function fetchFailedProgressionCount(userId: string, days = 14): Promise<number> {
  try {
    const supabase = await createClient();
    const since = daysAgo(days);
    const { count } = await (supabase as any)
      .from("progression_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("result", "failed")
      .gte("event_date", since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function buildWeeklyAnalytics(
  userId: string,
  targetDaysPerWeek = 4
): Promise<WeeklyAnalyticsSummary> {
  const { start, end } = isoWeekBounds(0);

  const [
    readinessSeries14,
    volumeSeries28,
    sleepSeries,
    nutritionAdherence,
    fatigueData,
    workoutDays,
    bodymassChangeKg,
    imbalanceFlags,
    failedProgressions,
  ] = await Promise.all([
    fetchReadinessSeries(userId, 14),
    fetchVolumeSeries(userId, 28),
    fetchSleepSeries(userId, 7),
    fetchNutritionAdherence(userId),
    fetchFatigueHotspots(userId),
    fetchWorkoutDays(userId, start, end),
    fetchBodymassChange(userId, 7),
    fetchImbalanceFlags(userId),
    fetchFailedProgressionCount(userId, 14),
  ]);

  const readinessSeries7 = readinessSeries14.filter(
    (p) => p.date >= daysAgo(7)
  );

  const avgReadiness7d = rollingAverage(readinessSeries7, 7);
  const avgReadiness14d = rollingAverage(readinessSeries14, 14);
  const avgSleepHours = sleepSeries.length > 0
    ? sleepSeries.reduce((a, p) => a + p.value, 0) / sleepSeries.length
    : 0;

  const volumeTrend = analyzeTrend(volumeSeries28);
  const recoveryTrend = analyzeTrend(readinessSeries14);

  const weeklyVolumeSets = volumeSeries28
    .filter((p) => p.date >= start && p.date <= end)
    .reduce((a, p) => a + p.value, 0);

  const consistencyScore = scoreConsistency(workoutDays, targetDaysPerWeek);
  const recoveryScore = scoreRecoveryTrend(readinessSeries7);
  const progressionScore = scoreProgressionVelocity(volumeSeries28);
  const nutritionScore = scoreNutritionAdherence(
    (nutritionAdherence.proteinAdherencePct + nutritionAdherence.calorieAdherencePct) / 200
  );
  const compositeScore = compositeWeeklyScore({
    consistencyScore,
    recoveryScore,
    progressionScore,
    nutritionScore,
  });

  const deloadUrgency = computeDeloadUrgency({
    avgReadiness7d,
    avgReadiness14d,
    fatigueAccumulation: fatigueData.accumulation,
    failedProgressionCount: failedProgressions,
  });

  const bodymassChangeLbs =
    bodymassChangeKg !== null
      ? `${bodymassChangeKg >= 0 ? "+" : ""}${(bodymassChangeKg * 2.205).toFixed(1)} lbs`
      : null;

  return {
    periodStart: start,
    periodEnd: end,
    weeklyVolumeSets,
    volumeTrend,
    avgReadiness7d,
    avgReadiness14d,
    recoveryTrend,
    avgSleepHours,
    ...nutritionAdherence,
    workoutConsistencyPct: consistencyScore,
    workoutDaysThisWeek: workoutDays,
    fatigueHotspots: fatigueData.muscles,
    fatigueAccumulation: fatigueData.accumulation,
    bodymassChange: bodymassChangeKg,
    bodymassChangeLbs,
    consistencyScore,
    recoveryScore,
    progressionScore,
    nutritionScore,
    compositeScore,
    deloadUrgency,
    plateauFlags: [],
    imbalanceFlags,
  };
}

/** Compress a WeeklyAnalyticsSummary into a compact JSON for AI prompts. */
export function compressForAI(summary: WeeklyAnalyticsSummary): Record<string, unknown> {
  return {
    period: `${summary.periodStart} → ${summary.periodEnd}`,
    volume_sets: summary.weeklyVolumeSets,
    volume_change_pct: `${summary.volumeTrend.deltaPct >= 0 ? "+" : ""}${summary.volumeTrend.deltaPct.toFixed(1)}%`,
    recovery_trend: summary.recoveryTrend.direction,
    avg_readiness_7d: Math.round(summary.avgReadiness7d),
    avg_sleep_hrs: parseFloat(summary.avgSleepHours.toFixed(1)),
    protein_adherence_pct: summary.proteinAdherencePct,
    calorie_adherence_pct: summary.calorieAdherencePct,
    fatigue_hotspots: summary.fatigueHotspots,
    bodyweight_change: summary.bodymassChangeLbs ?? "no data",
    consistency_pct: summary.workoutConsistencyPct,
    deload_urgency: summary.deloadUrgency,
    imbalance_flags: summary.imbalanceFlags,
    plateau_flags: summary.plateauFlags,
    composite_score: summary.compositeScore,
  };
}
