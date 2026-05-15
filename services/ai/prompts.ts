/**
 * Prompt orchestration: selects template, compresses context, builds final prompt.
 * Keeps tokens minimal by stripping zero-value fields from context.
 */

import {
  COACH_SYSTEM_PROMPT,
  buildPrompt,
} from "@/lib/ai/templates";
import type { WeeklyAnalyticsSummary } from "@/services/analytics/core";
import { compressForAI } from "@/services/analytics/core";
import type { PlateauDetection } from "@/services/analytics/plateaus";

export type InsightPromptType =
  | "weekly_summary"
  | "plateau_explanation"
  | "deload_suggestion"
  | "imbalance";

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
  promptType: InsightPromptType;
}

/** Remove zero/null/empty fields to minimize token count. */
function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "number" && v === 0) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (v === "no data") return false;
      return true;
    })
  );
}

/** Rough token estimator: ~4 chars per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildWeeklySummaryPrompt(summary: WeeklyAnalyticsSummary): PromptPackage {
  const compressed = compressForAI(summary);
  const stripped = stripEmpty(compressed);
  const userPrompt = buildPrompt("weekly_summary", stripped);
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    estimatedTokens: estimateTokens(COACH_SYSTEM_PROMPT + userPrompt),
    promptType: "weekly_summary",
  };
}

export function buildPlateauPrompt(
  plateau: PlateauDetection,
  recentReadiness: number,
  recentVolumeChange: string
): PromptPackage {
  const context = stripEmpty({
    plateau_type: plateau.type,
    affected_metric: plateau.affectedMetric,
    severity: plateau.severity,
    duration_weeks: plateau.durationWeeks,
    avg_readiness: recentReadiness,
    volume_change: recentVolumeChange,
    ...plateau.context,
  });
  const userPrompt = buildPrompt("plateau_explanation", context);
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    estimatedTokens: estimateTokens(COACH_SYSTEM_PROMPT + userPrompt),
    promptType: "plateau_explanation",
  };
}

export function buildDeloadPrompt(summary: WeeklyAnalyticsSummary): PromptPackage {
  const context = stripEmpty({
    avg_readiness_7d: Math.round(summary.avgReadiness7d),
    avg_readiness_14d: Math.round(summary.avgReadiness14d),
    readiness_trend: summary.recoveryTrend.direction,
    fatigue_accumulation: summary.fatigueAccumulation,
    fatigue_hotspots: summary.fatigueHotspots,
    deload_urgency: summary.deloadUrgency,
    weekly_volume_sets: summary.weeklyVolumeSets,
    avg_sleep_hrs: summary.avgSleepHours > 0 ? parseFloat(summary.avgSleepHours.toFixed(1)) : null,
  });
  const userPrompt = buildPrompt("deload_suggestion", context);
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    estimatedTokens: estimateTokens(COACH_SYSTEM_PROMPT + userPrompt),
    promptType: "deload_suggestion",
  };
}

export function buildImbalancePrompt(
  imbalanceFlags: string[],
  fatigueHotspots: string[]
): PromptPackage {
  const context = stripEmpty({
    imbalance_flags: imbalanceFlags,
    fatigue_hotspots: fatigueHotspots,
  });
  const userPrompt = buildPrompt("imbalance", context);
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    estimatedTokens: estimateTokens(COACH_SYSTEM_PROMPT + userPrompt),
    promptType: "imbalance",
  };
}
