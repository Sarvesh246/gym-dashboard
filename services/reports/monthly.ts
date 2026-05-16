/**
 * Monthly report orchestration.
 * Aggregates a full month of data, compares to prior month,
 * detects significant changes, and optionally enriches with AI.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getMonthlySnapshot,
  type MonthlySnapshot,
} from "@/services/analytics/history";
import {
  buildPeriodSummary,
  monthBounds,
  previousMonth,
  fetchReadinessSeries,
  fetchVolumeSeries,
  fetchWeightSeries,
  smoothSeries,
} from "@/services/trends/core";
import { compareMetrics, extractChangeHighlights } from "@/lib/reports/comparisons";
import { describeChange } from "@/lib/reports/comparisons";
import type { StoredInsight } from "@/services/reports/weekly";
import {
  generateCoachingInsight,
  parseInsightResponse,
  GeminiError,
} from "@/services/ai/gemini";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Milestone {
  label: string;
  value: string;
  type: "streak" | "record" | "achievement" | "milestone";
}

export interface MonthlyReport {
  yearMonth: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  // Summary metrics
  totalWorkouts: number;
  avgReadiness: number;
  avgSleepHours: number;
  avgCalorieAdherencePct: number;
  avgProteinAdherencePct: number;
  consistencyPct: number;
  // Comparison with previous month
  vsLastMonth: {
    workouts: ReturnType<typeof compareMetrics>;
    readiness: ReturnType<typeof compareMetrics>;
    calorieAdherence: ReturnType<typeof compareMetrics>;
    proteinAdherence: ReturnType<typeof compareMetrics>;
    sleep: ReturnType<typeof compareMetrics>;
  };
  // What changed
  positiveChanges: string[];
  regressions: string[];
  // Chart series
  readinessSeries: Array<{ date: string; value: number }>;
  volumeSeries: Array<{ date: string; value: number }>;
  weightSeries: Array<{ date: string; value: number }>;
  // Insights
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
  milestones: Milestone[];
  aiGenerated: boolean;
  cached: boolean;
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────

const COOLDOWN_HOURS = 6;

async function fetchCachedMonthlyReport(
  userId: string,
  yearMonth: string
): Promise<MonthlyReport | null> {
  try {
    const supabase = await createClient();
    const periodStart = `${yearMonth}-01`;
    const { data } = await (supabase as any)
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_type", "monthly_summary")
      .eq("period_start", periodStart)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    const age = (Date.now() - new Date(data.generated_at).getTime()) / (1000 * 60 * 60);
    if (age > COOLDOWN_HOURS) return null;

    return data.compressed_context?.report as MonthlyReport ?? null;
  } catch {
    return null;
  }
}

async function storeMonthlyReport(userId: string, report: MonthlyReport): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any).from("ai_reports").insert({
      user_id: userId,
      report_type: "monthly_summary",
      period_start: report.periodStart,
      period_end: report.periodEnd,
      summary: report.summary,
      insights: report.insights,
      recommendations: report.recommendations,
      compressed_context: { report },
      trigger_reason: "monthly_report",
      confidence_level: "medium",
      is_cached: false,
    });
  } catch {
    // Non-critical
  }
}

// ─── Milestone detection ──────────────────────────────────────────────────────

function detectMilestones(
  snapshot: MonthlySnapshot,
  prevSnapshot: MonthlySnapshot | null
): Milestone[] {
  const milestones: Milestone[] = [];

  if (snapshot.totalWorkouts >= 20) {
    milestones.push({ label: "High-volume month", value: `${snapshot.totalWorkouts} sessions`, type: "achievement" });
  } else if (snapshot.totalWorkouts >= 12) {
    milestones.push({ label: "Consistent training month", value: `${snapshot.totalWorkouts} sessions`, type: "milestone" });
  }

  if (snapshot.avgReadiness >= 80) {
    milestones.push({ label: "Excellent recovery month", value: `${Math.round(snapshot.avgReadiness)}/100 avg readiness`, type: "record" });
  }

  if (snapshot.avgProteinAdherence >= 0.9) {
    milestones.push({ label: "Strong protein consistency", value: `${Math.round(snapshot.avgProteinAdherence * 100)}% adherence`, type: "achievement" });
  }

  if (prevSnapshot && snapshot.avgReadiness > prevSnapshot.avgReadiness + 10) {
    milestones.push({
      label: "Recovery breakthrough",
      value: `+${Math.round(snapshot.avgReadiness - prevSnapshot.avgReadiness)} points vs last month`,
      type: "milestone",
    });
  }

  if (prevSnapshot && snapshot.totalWorkouts > prevSnapshot.totalWorkouts + 4) {
    milestones.push({
      label: "Training frequency increase",
      value: `+${snapshot.totalWorkouts - prevSnapshot.totalWorkouts} sessions vs last month`,
      type: "achievement",
    });
  }

  return milestones.slice(0, 4);
}

// ─── Fallback insights ────────────────────────────────────────────────────────

function buildFallbackInsights(snapshot: MonthlySnapshot, changes: ReturnType<typeof extractChangeHighlights>): {
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
} {
  const insights: StoredInsight[] = [];
  const recommendations: StoredInsight[] = [];

  if (snapshot.avgReadiness < 60) {
    insights.push({ text: `Average readiness this month was low at ${Math.round(snapshot.avgReadiness)}/100.`, type: "warning", priority: "high" });
  }
  if (snapshot.avgProteinAdherence < 0.75) {
    insights.push({ text: `Protein adherence averaged ${Math.round(snapshot.avgProteinAdherence * 100)}% — below the 75% target.`, type: "warning", priority: "medium" });
  }

  for (const c of changes.regressions.slice(0, 2)) {
    recommendations.push({ text: `Focus on improving ${c.label.toLowerCase()} this coming month.`, type: "recommendation", priority: "medium" });
  }

  const score = Math.round((snapshot.avgReadiness + snapshot.consistencyPct) / 2);
  const summary =
    score >= 75
      ? `Strong month overall — recovery averaged ${Math.round(snapshot.avgReadiness)}/100 with ${snapshot.totalWorkouts} sessions logged.`
      : score >= 55
      ? `Mixed month — ${snapshot.totalWorkouts} sessions logged with room to improve recovery and consistency.`
      : `Challenging month — focus on recovery and building consistency going forward.`;

  return { summary, insights, recommendations };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateMonthlyReport(
  userId: string,
  year: number,
  month: number,
  forceRefresh = false
): Promise<MonthlyReport> {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const { start, end } = monthBounds(year, month);

  if (!forceRefresh) {
    const cached = await fetchCachedMonthlyReport(userId, yearMonth);
    if (cached) return { ...cached, cached: true };
  }

  const prev = previousMonth(year, month);
  const [snapshot, prevSnapshot] = await Promise.all([
    getMonthlySnapshot(userId, year, month, false),
    getMonthlySnapshot(userId, prev.year, prev.month),
  ]);

  // Chart series (smoothed)
  const [rawReadiness, rawVolume, rawWeight] = await Promise.all([
    fetchReadinessSeries(userId, start, end),
    fetchVolumeSeries(userId, start, end),
    fetchWeightSeries(userId, start, end),
  ]);

  const readinessSeries = smoothSeries(rawReadiness, 5);
  const volumeSeries = rawVolume; // raw is fine for bar-style
  const weightSeries = smoothSeries(rawWeight, 3);

  // Comparisons
  const vsLastMonth = {
    workouts: compareMetrics(snapshot.totalWorkouts, prevSnapshot.totalWorkouts),
    readiness: compareMetrics(snapshot.avgReadiness, prevSnapshot.avgReadiness),
    calorieAdherence: compareMetrics(
      snapshot.avgCalorieAdherence * 100,
      prevSnapshot.avgCalorieAdherence * 100
    ),
    proteinAdherence: compareMetrics(
      snapshot.avgProteinAdherence * 100,
      prevSnapshot.avgProteinAdherence * 100
    ),
    sleep: compareMetrics(snapshot.avgSleepHours, prevSnapshot.avgSleepHours),
  };

  const changes = extractChangeHighlights([
    { label: "Workout frequency", comparison: vsLastMonth.workouts, higherIsBetter: true, unit: "sessions" },
    { label: "Recovery score", comparison: vsLastMonth.readiness, higherIsBetter: true, unit: "/100" },
    { label: "Calorie adherence", comparison: vsLastMonth.calorieAdherence, higherIsBetter: true, unit: "%" },
    { label: "Protein adherence", comparison: vsLastMonth.proteinAdherence, higherIsBetter: true, unit: "%" },
    { label: "Sleep", comparison: vsLastMonth.sleep, higherIsBetter: true, unit: "hrs" },
  ]);

  const positiveChanges = changes.positives.map(describeChange);
  const regressions = changes.regressions.map(describeChange);
  const milestones = detectMilestones(snapshot, prevSnapshot);

  // Attempt AI enrichment
  const geminiEnabled = !!process.env.GEMINI_API_KEY;
  let summary = "";
  let insights: StoredInsight[] = [];
  let recommendations: StoredInsight[] = [];
  let aiGenerated = false;

  if (geminiEnabled) {
    try {
      const context = JSON.stringify({
        month: yearMonth,
        workouts: snapshot.totalWorkouts,
        avg_readiness: Math.round(snapshot.avgReadiness),
        consistency_pct: snapshot.consistencyPct,
        avg_sleep_hrs: snapshot.avgSleepHours.toFixed(1),
        calorie_adherence_pct: Math.round(snapshot.avgCalorieAdherence * 100),
        protein_adherence_pct: Math.round(snapshot.avgProteinAdherence * 100),
        vs_last_month: {
          workouts: vsLastMonth.workouts.deltaPct.toFixed(1) + "%",
          readiness: vsLastMonth.readiness.deltaPct.toFixed(1) + "%",
        },
        positive_changes: positiveChanges,
        regressions,
      });

      const systemPrompt = `You are a concise sports performance coach. Analyze this athlete's monthly training data and provide 2–3 key insights and 1–2 practical recommendations. Be calm, analytical, and specific. No fluff.`;
      const userPrompt = `Monthly report context:\n${context}\n\nProvide:\n1. A 1-sentence summary of the month.\n2. 2-3 key observations (each 1 sentence).\n3. 1-2 actionable recommendations for next month.`;

      const aiResponse = await generateCoachingInsight(systemPrompt, userPrompt);
      const parsed = parseInsightResponse(aiResponse.text);

      summary = parsed.summary;
      insights = parsed.insights.map((t) => ({ text: t, type: "observation" as const, priority: "medium" as const }));
      recommendations = parsed.recommendations.map((t) => ({ text: t, type: "recommendation" as const, priority: "medium" as const }));
      aiGenerated = true;
    } catch (err) {
      if (!(err instanceof GeminiError)) throw err;
    }
  }

  if (!aiGenerated) {
    const fallback = buildFallbackInsights(snapshot, changes);
    summary = fallback.summary;
    insights = fallback.insights;
    recommendations = fallback.recommendations;
  }

  const report: MonthlyReport = {
    yearMonth,
    periodStart: start,
    periodEnd: end,
    generatedAt: new Date().toISOString(),
    totalWorkouts: snapshot.totalWorkouts,
    avgReadiness: snapshot.avgReadiness,
    avgSleepHours: snapshot.avgSleepHours,
    avgCalorieAdherencePct: Math.round(snapshot.avgCalorieAdherence * 100),
    avgProteinAdherencePct: Math.round(snapshot.avgProteinAdherence * 100),
    consistencyPct: snapshot.consistencyPct,
    vsLastMonth,
    positiveChanges,
    regressions,
    readinessSeries,
    volumeSeries,
    weightSeries,
    summary,
    insights,
    recommendations,
    milestones,
    aiGenerated,
    cached: false,
  };

  await storeMonthlyReport(userId, report);
  return report;
}
