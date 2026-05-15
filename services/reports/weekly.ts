/**
 * Weekly report orchestration.
 * Runs analytics → checks cache → optionally calls AI → stores result.
 *
 * Caching rules:
 *   - Same week + same report_type = serve cache (no new Gemini call)
 *   - Cooldown: 6 hours minimum between regenerations even if forced
 */

import { createClient } from "@/lib/supabase/server";
import { buildWeeklyAnalytics, type WeeklyAnalyticsSummary } from "@/services/analytics/core";
import { scanForPlateaus, persistPlateauIfNew } from "@/services/analytics/plateaus";
import {
  generateCoachingInsight,
  parseInsightResponse,
  GeminiError,
} from "@/services/ai/gemini";
import {
  buildWeeklySummaryPrompt,
  buildPlateauPrompt,
  buildDeloadPrompt,
  buildImbalancePrompt,
} from "@/services/ai/prompts";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StoredInsight {
  text: string;
  type: "observation" | "warning" | "recommendation";
  priority: "high" | "medium" | "low";
}

export interface WeeklyReport {
  id?: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  analytics: WeeklyAnalyticsSummary;
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
  aiGenerated: boolean;
  cached: boolean;
  triggerReason: string;
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────

const COOLDOWN_HOURS = 6;

async function fetchCachedReport(
  userId: string,
  periodStart: string
): Promise<WeeklyReport | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_type", "weekly_summary")
      .eq("period_start", periodStart)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const generatedAt = new Date(data.generated_at);
    const hoursOld = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursOld < COOLDOWN_HOURS) {
      return {
        id: data.id,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        generatedAt: data.generated_at,
        analytics: data.compressed_context?.analytics ?? {},
        summary: data.summary,
        insights: data.insights ?? [],
        recommendations: data.recommendations ?? [],
        aiGenerated: true,
        cached: true,
        triggerReason: data.trigger_reason ?? "cached",
      } as WeeklyReport;
    }

    return null;
  } catch {
    return null;
  }
}

async function storeReport(
  userId: string,
  report: WeeklyReport
): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any).from("ai_reports").insert({
      user_id: userId,
      report_type: "weekly_summary",
      period_start: report.periodStart,
      period_end: report.periodEnd,
      summary: report.summary,
      insights: report.insights,
      recommendations: report.recommendations,
      compressed_context: { analytics: report.analytics },
      trigger_reason: report.triggerReason,
      confidence_level: "medium",
      is_cached: false,
    });
  } catch {
    // Non-critical — report still returns to caller
  }
}

// ─── Insight classifiers ───────────────────────────────────────────────────────

function classifyInsight(text: string): StoredInsight["type"] {
  const warnWords = /\b(declining|suppressed|plateau|imbalance|collapsed|failed|worsening|concern)\b/i;
  const recWords = /\b(reduce|increase|prioritize|add|deload|focus|rest|cut|adjust|consider)\b/i;
  if (recWords.test(text)) return "recommendation";
  if (warnWords.test(text)) return "warning";
  return "observation";
}

function scorePriority(insight: string, analyticsScore: number): StoredInsight["priority"] {
  const highWords = /\b(deload|plateau|severe|suppressed|failed|collapsed|critical)\b/i;
  const lowWords = /\b(slightly|minor|marginal|improving|maintained)\b/i;
  if (highWords.test(insight) || analyticsScore < 50) return "high";
  if (lowWords.test(insight) || analyticsScore > 75) return "low";
  return "medium";
}

function buildFallbackInsights(analytics: WeeklyAnalyticsSummary): {
  summary: string;
  insights: StoredInsight[];
  recommendations: StoredInsight[];
} {
  const insights: StoredInsight[] = [];
  const recommendations: StoredInsight[] = [];

  if (analytics.avgReadiness7d < 60) {
    insights.push({ text: `Average readiness is low at ${Math.round(analytics.avgReadiness7d)}/100 over the past 7 days.`, type: "warning", priority: "high" });
  }
  if (analytics.proteinAdherencePct < 75) {
    insights.push({ text: `Protein adherence is below target at ${analytics.proteinAdherencePct}%.`, type: "warning", priority: "medium" });
  }
  if (analytics.workoutConsistencyPct < 60) {
    insights.push({ text: `Training consistency is below target this week.`, type: "warning", priority: "medium" });
  }
  if (analytics.fatigueHotspots.length > 0) {
    insights.push({ text: `Elevated fatigue detected in: ${analytics.fatigueHotspots.join(", ")}.`, type: "observation", priority: "medium" });
  }
  if (analytics.deloadUrgency >= 2) {
    recommendations.push({ text: "Recovery signals suggest a deload week may be warranted.", type: "recommendation", priority: "high" });
  }
  if (analytics.imbalanceFlags.includes("push_dominant")) {
    recommendations.push({ text: "Increase pulling volume relative to pushing to address detected imbalance.", type: "recommendation", priority: "medium" });
  }

  const summary =
    analytics.compositeScore >= 75
      ? `Solid training week with a composite performance score of ${analytics.compositeScore}/100.`
      : analytics.compositeScore >= 55
      ? `Mixed training week — composite score ${analytics.compositeScore}/100. Focus on recovery and consistency.`
      : `Challenging week — composite score ${analytics.compositeScore}/100. Prioritize recovery this coming week.`;

  return { summary, insights, recommendations };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  userId: string,
  targetDaysPerWeek = 4,
  forceRefresh = false
): Promise<WeeklyReport> {
  // 1. Run deterministic analytics first
  const analytics = await buildWeeklyAnalytics(userId, targetDaysPerWeek);

  // 2. Check plateau scan and persist new ones
  const plateauScan = await scanForPlateaus(userId);
  if (plateauScan.primaryPlateau) {
    analytics.plateauFlags = plateauScan.plateaus.map((p) => `${p.type}:${p.affectedMetric}`);
    await persistPlateauIfNew(userId, plateauScan.primaryPlateau);
  }

  // 3. Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = await fetchCachedReport(userId, analytics.periodStart);
    if (cached) {
      cached.analytics = analytics; // Always freshen analytics
      return cached;
    }
  }

  // 4. Determine trigger reason
  let triggerReason = "weekly_report_ready";
  if (plateauScan.hasAnyPlateau) triggerReason = "plateau_detected";
  else if (analytics.deloadUrgency >= 2) triggerReason = "deload_threshold";
  else if (analytics.avgReadiness7d < 55) triggerReason = "recovery_decline";

  // 5. Attempt AI generation
  const geminiEnabled = !!process.env.GEMINI_API_KEY;
  if (geminiEnabled) {
    try {
      const pkg = buildWeeklySummaryPrompt(analytics);
      const aiResponse = await generateCoachingInsight(pkg.systemPrompt, pkg.userPrompt);
      const parsed = parseInsightResponse(aiResponse.text);

      // If deload urgency is high, get a separate deload assessment
      let deloadRec: StoredInsight | null = null;
      if (analytics.deloadUrgency >= 2) {
        const deloadPkg = buildDeloadPrompt(analytics);
        const deloadResponse = await generateCoachingInsight(
          deloadPkg.systemPrompt,
          deloadPkg.userPrompt
        );
        const deloadParsed = parseInsightResponse(deloadResponse.text);
        deloadRec = {
          text: deloadParsed.summary,
          type: "recommendation",
          priority: "high",
        };
      }

      const compositeScore = analytics.compositeScore;
      const allInsights: StoredInsight[] = parsed.insights.map((t) => ({
        text: t,
        type: classifyInsight(t),
        priority: scorePriority(t, compositeScore),
      }));
      const allRecs: StoredInsight[] = [
        ...parsed.recommendations.map((t) => ({
          text: t,
          type: "recommendation" as const,
          priority: scorePriority(t, compositeScore),
        })),
        ...(deloadRec ? [deloadRec] : []),
      ];

      const report: WeeklyReport = {
        periodStart: analytics.periodStart,
        periodEnd: analytics.periodEnd,
        generatedAt: new Date().toISOString(),
        analytics,
        summary: parsed.summary,
        insights: allInsights.slice(0, 3),
        recommendations: allRecs.slice(0, 3),
        aiGenerated: true,
        cached: false,
        triggerReason,
      };

      await storeReport(userId, report);
      return report;
    } catch (err) {
      if (!(err instanceof GeminiError)) throw err;
      // Fall through to deterministic fallback
    }
  }

  // 6. Deterministic fallback (no AI)
  const fallback = buildFallbackInsights(analytics);
  const report: WeeklyReport = {
    periodStart: analytics.periodStart,
    periodEnd: analytics.periodEnd,
    generatedAt: new Date().toISOString(),
    analytics,
    ...fallback,
    aiGenerated: false,
    cached: false,
    triggerReason,
  };

  await storeReport(userId, report);
  return report;
}
