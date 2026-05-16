/**
 * Yearly report orchestration.
 * Aggregates data across all months of a year for long-term trend analysis.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getYearlyBreakdown,
  type YearlyBreakdown,
  type MonthlySnapshot,
} from "@/services/analytics/history";
import { compareMetrics } from "@/lib/reports/comparisons";
import { formatMonth } from "@/lib/reports/formatting";
import type { StoredInsight } from "@/services/reports/weekly";
import type { Milestone } from "@/services/reports/monthly";
import {
  generateCoachingInsight,
  parseInsightResponse,
  GeminiError,
} from "@/services/ai/gemini";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface YearlyReport {
  year: number;
  generatedAt: string;
  // Summary
  totalWorkouts: number;
  avgReadiness: number;
  avgSleepHours: number;
  avgCalorieAdherencePct: number;
  avgProteinAdherencePct: number;
  weightChangeLbs: string | null;
  // Monthly breakdown for charts
  monthlyBreakdown: Array<{
    yearMonth: string;
    label: string;
    workouts: number;
    avgReadiness: number;
    consistencyPct: number;
    avgCalorieAdherence: number;
    avgProteinAdherence: number;
    avgWeightKg: number | null;
  }>;
  // Comparison with prior year summary (if data exists)
  vsLastYear: {
    workouts: ReturnType<typeof compareMetrics>;
    readiness: ReturnType<typeof compareMetrics>;
  } | null;
  // Insights
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
  milestones: Milestone[];
  // Top months
  peakReadinessMonth: string | null;
  bestConsistencyMonth: string | null;
  aiGenerated: boolean;
  cached: boolean;
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────

const COOLDOWN_HOURS = 12;

async function fetchCachedYearlyReport(
  userId: string,
  year: number
): Promise<YearlyReport | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_type", "yearly_summary")
      .eq("period_start", `${year}-01-01`)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    const age = (Date.now() - new Date(data.generated_at).getTime()) / (1000 * 60 * 60);
    if (age > COOLDOWN_HOURS) return null;

    return data.compressed_context?.report as YearlyReport ?? null;
  } catch {
    return null;
  }
}

async function storeYearlyReport(userId: string, report: YearlyReport): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any).from("ai_reports").insert({
      user_id: userId,
      report_type: "yearly_summary",
      period_start: `${report.year}-01-01`,
      period_end: `${report.year}-12-31`,
      summary: report.summary,
      insights: report.insights,
      recommendations: report.recommendations,
      compressed_context: { report },
      trigger_reason: "yearly_report",
      confidence_level: "medium",
      is_cached: false,
    });
  } catch {
    // Non-critical
  }
}

// ─── Milestone detection ──────────────────────────────────────────────────────

function detectYearlyMilestones(breakdown: YearlyBreakdown): Milestone[] {
  const milestones: Milestone[] = [];

  if (breakdown.totalWorkouts >= 150) {
    milestones.push({ label: "Elite training volume", value: `${breakdown.totalWorkouts} sessions this year`, type: "record" });
  } else if (breakdown.totalWorkouts >= 100) {
    milestones.push({ label: "Century milestone", value: `${breakdown.totalWorkouts}+ sessions logged`, type: "achievement" });
  }

  if (breakdown.avgReadiness >= 75) {
    milestones.push({ label: "Excellent annual recovery", value: `${Math.round(breakdown.avgReadiness)}/100 avg readiness`, type: "achievement" });
  }

  if (breakdown.peakReadinessMonth) {
    milestones.push({
      label: "Peak recovery month",
      value: formatMonth(breakdown.peakReadinessMonth),
      type: "milestone",
    });
  }

  if (breakdown.bestConsistencyMonth) {
    milestones.push({
      label: "Most consistent month",
      value: formatMonth(breakdown.bestConsistencyMonth),
      type: "milestone",
    });
  }

  if (breakdown.weightChange !== null && Math.abs(breakdown.weightChange) >= 2) {
    const direction = breakdown.weightChange > 0 ? "gained" : "lost";
    const lbs = Math.abs(breakdown.weightChange * 2.205).toFixed(1);
    milestones.push({ label: `Body composition shift`, value: `${direction} ${lbs} lbs this year`, type: "milestone" });
  }

  return milestones.slice(0, 5);
}

// ─── Fallback insights ────────────────────────────────────────────────────────

function buildYearlyFallback(breakdown: YearlyBreakdown): {
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
} {
  const insights: StoredInsight[] = [];
  const recommendations: StoredInsight[] = [];

  if (breakdown.avgReadiness >= 75) {
    insights.push({ text: `Recovery averaged ${Math.round(breakdown.avgReadiness)}/100 — a strong foundation for performance.`, type: "observation", priority: "low" });
  } else if (breakdown.avgReadiness < 60) {
    insights.push({ text: `Average readiness of ${Math.round(breakdown.avgReadiness)}/100 suggests recovery was a limiting factor this year.`, type: "warning", priority: "high" });
    recommendations.push({ text: "Prioritize sleep quality and fatigue management next year.", type: "recommendation", priority: "high" });
  }

  if (breakdown.avgProteinAdherence < 0.75) {
    insights.push({ text: `Protein adherence averaged ${Math.round(breakdown.avgProteinAdherence * 100)}% — consistent nutrition is a growth area.`, type: "warning", priority: "medium" });
  }

  const summary =
    breakdown.totalWorkouts >= 100
      ? `Exceptional year — ${breakdown.totalWorkouts} sessions logged with ${Math.round(breakdown.avgReadiness)}/100 average readiness.`
      : breakdown.totalWorkouts >= 50
      ? `Solid year with ${breakdown.totalWorkouts} sessions. Building on this foundation will accelerate progress.`
      : `A foundational year — ${breakdown.totalWorkouts} sessions logged. Focus on consistency as the primary driver next year.`;

  return { summary, insights, recommendations };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateYearlyReport(
  userId: string,
  year: number,
  forceRefresh = false
): Promise<YearlyReport> {
  if (!forceRefresh) {
    const cached = await fetchCachedYearlyReport(userId, year);
    if (cached) return { ...cached, cached: true };
  }

  const [breakdown, prevBreakdown] = await Promise.all([
    getYearlyBreakdown(userId, year),
    getYearlyBreakdown(userId, year - 1),
  ]);

  const monthlyBreakdown = breakdown.months.map((s: MonthlySnapshot) => ({
    yearMonth: s.yearMonth,
    label: formatMonth(s.yearMonth).split(" ")[0], // "January" → "Jan"
    workouts: s.totalWorkouts,
    avgReadiness: Math.round(s.avgReadiness),
    consistencyPct: s.consistencyPct,
    avgCalorieAdherence: Math.round(s.avgCalorieAdherence * 100),
    avgProteinAdherence: Math.round(s.avgProteinAdherence * 100),
    avgWeightKg: s.avgWeightKg,
  }));

  // Year-over-year comparison (only meaningful if prev year has data)
  const prevHasData = prevBreakdown.totalWorkouts > 0 || prevBreakdown.avgReadiness > 0;
  const vsLastYear = prevHasData
    ? {
        workouts: compareMetrics(breakdown.totalWorkouts, prevBreakdown.totalWorkouts),
        readiness: compareMetrics(breakdown.avgReadiness, prevBreakdown.avgReadiness),
      }
    : null;

  const milestones = detectYearlyMilestones(breakdown);

  const weightChangeLbs =
    breakdown.weightChange !== null
      ? `${breakdown.weightChange >= 0 ? "+" : ""}${(breakdown.weightChange * 2.205).toFixed(1)} lbs`
      : null;

  // Attempt AI enrichment
  const geminiEnabled = !!process.env.GEMINI_API_KEY;
  let summary = "";
  let insights: StoredInsight[] = [];
  let recommendations: StoredInsight[] = [];
  let aiGenerated = false;

  if (geminiEnabled) {
    try {
      const context = JSON.stringify({
        year,
        total_workouts: breakdown.totalWorkouts,
        avg_readiness: Math.round(breakdown.avgReadiness),
        avg_sleep_hrs: breakdown.avgSleepHours.toFixed(1),
        calorie_adherence_pct: Math.round(breakdown.avgCalorieAdherence * 100),
        protein_adherence_pct: Math.round(breakdown.avgProteinAdherence * 100),
        weight_change: weightChangeLbs ?? "no data",
        peak_recovery_month: breakdown.peakReadinessMonth,
        best_consistency_month: breakdown.bestConsistencyMonth,
        vs_last_year: vsLastYear
          ? {
              workouts: vsLastYear.workouts.deltaPct.toFixed(1) + "%",
              readiness: vsLastYear.readiness.deltaPct.toFixed(1) + "%",
            }
          : null,
      });

      const systemPrompt = `You are a thoughtful sports performance analyst. Review this athlete's full year of training data and provide a concise annual assessment. Be insightful, calm, and focused on the most meaningful patterns.`;
      const userPrompt = `Yearly report:\n${context}\n\nProvide:\n1. A 1–2 sentence summary of the year.\n2. 2–3 most meaningful observations.\n3. 2 strategic recommendations for next year.`;

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
    const fallback = buildYearlyFallback(breakdown);
    summary = fallback.summary;
    insights = fallback.insights;
    recommendations = fallback.recommendations;
  }

  const report: YearlyReport = {
    year,
    generatedAt: new Date().toISOString(),
    totalWorkouts: breakdown.totalWorkouts,
    avgReadiness: breakdown.avgReadiness,
    avgSleepHours: breakdown.avgSleepHours,
    avgCalorieAdherencePct: Math.round(breakdown.avgCalorieAdherence * 100),
    avgProteinAdherencePct: Math.round(breakdown.avgProteinAdherence * 100),
    weightChangeLbs,
    monthlyBreakdown,
    vsLastYear,
    summary,
    insights,
    recommendations,
    milestones,
    peakReadinessMonth: breakdown.peakReadinessMonth,
    bestConsistencyMonth: breakdown.bestConsistencyMonth,
    aiGenerated,
    cached: false,
  };

  await storeYearlyReport(userId, report);
  return report;
}
