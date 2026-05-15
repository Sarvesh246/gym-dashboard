/**
 * Plateau detection service — fully deterministic.
 * AI only explains what this layer finds.
 */

import { createClient } from "@/lib/supabase/server";
import { isStagnant, linearSlope, rollingAverage, type TrendPoint } from "@/lib/analytics/trends";

export type PlateauType = "strength" | "bodyweight" | "recovery" | "progression";
export type PlateauSeverity = "mild" | "moderate" | "severe";

export interface PlateauDetection {
  detected: boolean;
  type: PlateauType;
  affectedMetric: string;
  severity: PlateauSeverity;
  durationWeeks: number;
  context: Record<string, unknown>;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── Strength plateau ─────────────────────────────────────────────────────────
// Stagnant e1RM or total volume across the last 3+ weeks.

async function detectStrengthPlateau(userId: string): Promise<PlateauDetection | null> {
  try {
    const supabase = await createClient();
    const since = daysAgo(28);
    const { data } = await (supabase as any)
      .from("workout_sessions")
      .select("session_date, total_volume_kg")
      .eq("user_id", userId)
      .gte("session_date", since)
      .order("session_date", { ascending: true });

    if (!data || data.length < 8) return null;

    const points: TrendPoint[] = data.map((r: any) => ({
      date: r.session_date,
      value: r.total_volume_kg ?? 0,
    }));

    if (!isStagnant(points, 4)) return null;

    const slope = linearSlope(points);
    const severity: PlateauSeverity =
      Math.abs(slope) < 0.5 ? "severe" : Math.abs(slope) < 2 ? "moderate" : "mild";

    return {
      detected: true,
      type: "strength",
      affectedMetric: "total_volume_kg",
      severity,
      durationWeeks: Math.ceil(points.length / 3),
      context: {
        avg_volume: Math.round(rollingAverage(points, 7)),
        slope: parseFloat(slope.toFixed(2)),
        data_points: points.length,
      },
    };
  } catch {
    return null;
  }
}

// ─── Bodyweight plateau ───────────────────────────────────────────────────────
// Weight hasn't changed meaningfully in 3+ weeks (goal-dependent).

async function detectBodyweightPlateau(userId: string): Promise<PlateauDetection | null> {
  try {
    const supabase = await createClient();
    const since = daysAgo(28);
    const { data } = await (supabase as any)
      .from("health_metrics")
      .select("metric_date, weight_kg")
      .eq("user_id", userId)
      .gte("metric_date", since)
      .not("weight_kg", "is", null)
      .order("metric_date", { ascending: true });

    if (!data || data.length < 5) return null;

    const points: TrendPoint[] = data.map((r: any) => ({
      date: r.metric_date,
      value: r.weight_kg as number,
    }));

    // 2% threshold for bodyweight (meaningful change)
    if (!isStagnant(points, 2)) return null;

    const durationWeeks = Math.ceil(points.length / 7);
    const severity: PlateauSeverity =
      durationWeeks >= 4 ? "severe" : durationWeeks >= 3 ? "moderate" : "mild";

    return {
      detected: true,
      type: "bodyweight",
      affectedMetric: "weight_kg",
      severity,
      durationWeeks,
      context: {
        avg_weight_kg: parseFloat(rollingAverage(points, 7).toFixed(1)),
        data_points: points.length,
      },
    };
  } catch {
    return null;
  }
}

// ─── Recovery plateau ─────────────────────────────────────────────────────────
// Readiness declining or stagnant despite stable/reduced training load.

async function detectRecoveryPlateau(userId: string): Promise<PlateauDetection | null> {
  try {
    const supabase = await createClient();
    const since = daysAgo(21);
    const { data } = await (supabase as any)
      .from("recovery_snapshots")
      .select("snapshot_date, readiness_score")
      .eq("user_id", userId)
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: true });

    if (!data || data.length < 6) return null;

    const points: TrendPoint[] = data.map((r: any) => ({
      date: r.snapshot_date,
      value: r.readiness_score ?? 0,
    }));

    const slope = linearSlope(points);
    const avgReadiness = rollingAverage(points, 7);

    // Declining AND low absolute readiness
    const declining = slope < -0.5;
    const suppressed = avgReadiness < 65;

    if (!declining && !suppressed) return null;

    const severity: PlateauSeverity =
      avgReadiness < 50 ? "severe" : avgReadiness < 60 ? "moderate" : "mild";

    return {
      detected: true,
      type: "recovery",
      affectedMetric: "readiness_score",
      severity,
      durationWeeks: Math.ceil(points.length / 7),
      context: {
        avg_readiness_7d: Math.round(avgReadiness),
        slope_per_day: parseFloat(slope.toFixed(2)),
        declining,
        suppressed,
      },
    };
  } catch {
    return null;
  }
}

// ─── Progression plateau ──────────────────────────────────────────────────────
// Multiple failed progression attempts on the same lift.

async function detectProgressionPlateau(userId: string): Promise<PlateauDetection | null> {
  try {
    const supabase = await createClient();
    const since = daysAgo(21);
    const { data } = await (supabase as any)
      .from("progression_events")
      .select("exercise_name, result, event_date")
      .eq("user_id", userId)
      .gte("event_date", since);

    if (!data || data.length === 0) return null;

    const failed: Record<string, number> = {};
    for (const e of data) {
      if (e.result === "failed") {
        failed[e.exercise_name] = (failed[e.exercise_name] ?? 0) + 1;
      }
    }

    const worstExercise = Object.entries(failed).sort((a, b) => b[1] - a[1])[0];
    if (!worstExercise || worstExercise[1] < 2) return null;

    const [exercise, count] = worstExercise;
    const severity: PlateauSeverity =
      count >= 4 ? "severe" : count >= 3 ? "moderate" : "mild";

    return {
      detected: true,
      type: "progression",
      affectedMetric: exercise,
      severity,
      durationWeeks: Math.ceil(count / 1.5),
      context: {
        exercise,
        failed_attempts: count,
        all_failures: failed,
      },
    };
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface PlateauScanResult {
  hasAnyPlateau: boolean;
  plateaus: PlateauDetection[];
  primaryPlateau: PlateauDetection | null;
}

export async function scanForPlateaus(userId: string): Promise<PlateauScanResult> {
  const [strength, bodyweight, recovery, progression] = await Promise.all([
    detectStrengthPlateau(userId),
    detectBodyweightPlateau(userId),
    detectRecoveryPlateau(userId),
    detectProgressionPlateau(userId),
  ]);

  const plateaus = [strength, bodyweight, recovery, progression].filter(
    (p): p is PlateauDetection => p !== null && p.detected
  );

  // Prioritize: severe > moderate > mild, recovery/progression > bodyweight > strength
  const severityOrder: Record<PlateauSeverity, number> = { severe: 3, moderate: 2, mild: 1 };
  const typeOrder: Record<PlateauType, number> = { recovery: 4, progression: 3, bodyweight: 2, strength: 1 };

  plateaus.sort((a, b) => {
    const sev = severityOrder[b.severity] - severityOrder[a.severity];
    return sev !== 0 ? sev : typeOrder[b.type] - typeOrder[a.type];
  });

  return {
    hasAnyPlateau: plateaus.length > 0,
    plateaus,
    primaryPlateau: plateaus[0] ?? null,
  };
}

/** Persist a detected plateau to the DB (deduplicates by type + status=active). */
export async function persistPlateauIfNew(
  userId: string,
  plateau: PlateauDetection
): Promise<void> {
  try {
    const supabase = await createClient();

    // Check if same type already active
    const { data: existing } = await (supabase as any)
      .from("plateau_events")
      .select("id")
      .eq("user_id", userId)
      .eq("plateau_type", plateau.type)
      .eq("status", "active")
      .limit(1);

    if (existing && existing.length > 0) return;

    await (supabase as any).from("plateau_events").insert({
      user_id: userId,
      plateau_type: plateau.type,
      affected_metric: plateau.affectedMetric,
      severity: plateau.severity,
      duration_weeks: plateau.durationWeeks,
      context: plateau.context,
      status: "active",
    });
  } catch {
    // Non-critical — plateau detection still works without persistence
  }
}
