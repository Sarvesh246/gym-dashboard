/**
 * Historical analytics: snapshot generation and normalization.
 * Supports caching precomputed aggregates in analytics_snapshots.
 */

import { createClient } from "@/lib/supabase/server";
import {
  buildPeriodSummary,
  monthBounds,
  monthsInYear,
  type PeriodSummary,
} from "@/services/trends/core";

// ─── Snapshot cache helpers ───────────────────────────────────────────────────

async function loadSnapshot(
  userId: string,
  type: "daily" | "weekly" | "monthly" | "yearly",
  date: string
): Promise<Record<string, unknown> | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("analytics_snapshots")
      .select("metric_payload, updated_at")
      .eq("user_id", userId)
      .eq("snapshot_type", type)
      .eq("snapshot_date", date)
      .single();

    if (!data) return null;

    // Snapshots older than 6 hours are stale
    const age = (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60);
    if (age > 6) return null;

    return data.metric_payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function saveSnapshot(
  userId: string,
  type: "daily" | "weekly" | "monthly" | "yearly",
  date: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any)
      .from("analytics_snapshots")
      .upsert(
        {
          user_id: userId,
          snapshot_type: type,
          snapshot_date: date,
          metric_payload: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,snapshot_type,snapshot_date" }
      );
  } catch {
    // Non-critical
  }
}

// ─── Monthly snapshot ─────────────────────────────────────────────────────────

export interface MonthlySnapshot extends PeriodSummary {
  yearMonth: string; // "YYYY-MM"
  consistencyPct: number; // workout days / days in period * 100
}

export async function getMonthlySnapshot(
  userId: string,
  year: number,
  month: number,
  useCache = true
): Promise<MonthlySnapshot> {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const cacheDate = `${yearMonth}-01`;

  if (useCache) {
    const cached = await loadSnapshot(userId, "monthly", cacheDate);
    if (cached) return cached as unknown as MonthlySnapshot;
  }

  const { start, end } = monthBounds(year, month);
  const summary = await buildPeriodSummary(userId, start, end);

  const daysInPeriod =
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1;
  const consistencyPct = daysInPeriod > 0
    ? Math.round((summary.totalWorkouts / daysInPeriod) * 100 * (7 / 1))
    : 0;

  const snapshot: MonthlySnapshot = {
    ...summary,
    yearMonth,
    consistencyPct: Math.min(100, consistencyPct),
  };

  await saveSnapshot(userId, "monthly", cacheDate, snapshot as unknown as Record<string, unknown>);
  return snapshot;
}

// ─── Yearly breakdown ─────────────────────────────────────────────────────────

export interface YearlyBreakdown {
  year: number;
  months: MonthlySnapshot[];
  totalWorkouts: number;
  avgReadiness: number;
  avgSleepHours: number;
  avgCalorieAdherence: number;
  avgProteinAdherence: number;
  weightChange: number | null; // kg
  peakReadinessMonth: string | null;
  bestConsistencyMonth: string | null;
}

export async function getYearlyBreakdown(
  userId: string,
  year: number
): Promise<YearlyBreakdown> {
  const monthLabels = monthsInYear(year);

  const snapshots = await Promise.all(
    monthLabels.map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return getMonthlySnapshot(userId, y, m);
    })
  );

  const nonEmpty = snapshots.filter((s) => s.totalWorkouts > 0 || s.avgReadiness > 0);

  const totalWorkouts = snapshots.reduce((a, s) => a + s.totalWorkouts, 0);

  const avgReadiness =
    nonEmpty.length > 0
      ? nonEmpty.reduce((a, s) => a + s.avgReadiness, 0) / nonEmpty.length
      : 0;

  const sleepMonths = snapshots.filter((s) => s.avgSleepHours > 0);
  const avgSleepHours =
    sleepMonths.length > 0
      ? sleepMonths.reduce((a, s) => a + s.avgSleepHours, 0) / sleepMonths.length
      : 0;

  const calMonths = snapshots.filter((s) => s.avgCalorieAdherence > 0);
  const avgCalorieAdherence =
    calMonths.length > 0
      ? calMonths.reduce((a, s) => a + s.avgCalorieAdherence, 0) / calMonths.length
      : 0;

  const protMonths = snapshots.filter((s) => s.avgProteinAdherence > 0);
  const avgProteinAdherence =
    protMonths.length > 0
      ? protMonths.reduce((a, s) => a + s.avgProteinAdherence, 0) / protMonths.length
      : 0;

  // Weight change: first vs last available weight
  const weightSnapshots = snapshots.filter((s) => s.avgWeightKg !== null);
  const weightChange =
    weightSnapshots.length >= 2
      ? (weightSnapshots[weightSnapshots.length - 1].avgWeightKg ?? 0) -
        (weightSnapshots[0].avgWeightKg ?? 0)
      : null;

  const peakReadiness = nonEmpty.reduce(
    (best, s) => (s.avgReadiness > (best?.avgReadiness ?? 0) ? s : best),
    nonEmpty[0] ?? null
  );

  const bestConsistency = nonEmpty.reduce(
    (best, s) => (s.consistencyPct > (best?.consistencyPct ?? 0) ? s : best),
    nonEmpty[0] ?? null
  );

  return {
    year,
    months: snapshots,
    totalWorkouts,
    avgReadiness,
    avgSleepHours,
    avgCalorieAdherence,
    avgProteinAdherence,
    weightChange,
    peakReadinessMonth: peakReadiness?.yearMonth ?? null,
    bestConsistencyMonth: bestConsistency?.yearMonth ?? null,
  };
}
