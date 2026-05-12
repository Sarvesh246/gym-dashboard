/**
 * Deterministic, rule-based recommendation engine.
 * No AI required — outputs human-readable guidance from score inputs.
 */

import type {
  ReadinessInput,
  RecoveryRecommendation,
  TrainingRecommendation,
  RecoveryTier,
} from "./types";
import { clamp } from "./scoring";
import { MAX_7DAY_STRAIN_ACCUMULATION } from "./constants";

// ─── Suppression factor detection ────────────────────────────────────────────

export function detectSuppressionFactors(input: ReadinessInput): string[] {
  const factors: string[] = [];

  if (input.sleep_quality_score < 50)
    factors.push("poor_sleep");

  if (input.stress_score > 70)
    factors.push("high_stress");

  if (input.systemic_fatigue > 70)
    factors.push("high_systemic_fatigue");

  if (input.strain_accumulation > MAX_7DAY_STRAIN_ACCUMULATION * 0.75)
    factors.push("high_weekly_strain");

  if (input.consecutive_training_days >= 4)
    factors.push("consecutive_training");

  if (input.avg_muscle_recovery < 55)
    factors.push("low_muscle_recovery");

  if (input.hrv_score < 40)
    factors.push("suppressed_hrv");

  return factors;
}

// ─── Rule-based recommendation builder ───────────────────────────────────────

export function buildRecommendations(
  input: ReadinessInput,
  readiness_score: number
): { recommendations: RecoveryRecommendation[]; suppression_factors: string[] } {
  const suppression_factors = detectSuppressionFactors(input);
  const recommendations: RecoveryRecommendation[] = [];

  // ── Positive signals ────────────────────────────────────────────────────────
  if (readiness_score >= 85) {
    recommendations.push({
      message: "Recovery is strong. Full-intensity training is well-supported today.",
      type: "positive",
      priority: 1,
    });
  }

  if (input.avg_muscle_recovery > 80 && input.systemic_fatigue < 35) {
    recommendations.push({
      message: "Muscle readiness is high. Good conditions for progressive overload.",
      type: "positive",
      priority: 2,
    });
  }

  // ── Sleep signals ───────────────────────────────────────────────────────────
  if (suppression_factors.includes("poor_sleep")) {
    recommendations.push({
      message: "Sleep-related recovery suppression detected. Reduce training intensity or volume today.",
      type: "warning",
      priority: 1,
    });
  } else if (input.sleep_quality_score >= 80) {
    recommendations.push({
      message: "Sleep quality is supporting recovery well.",
      type: "positive",
      priority: 4,
    });
  }

  // ── Systemic fatigue signals ─────────────────────────────────────────────────
  if (suppression_factors.includes("high_systemic_fatigue")) {
    recommendations.push({
      message: "High systemic fatigue accumulation detected. Consider a deload or active recovery session.",
      type: "warning",
      priority: 1,
    });
  } else if (input.systemic_fatigue > 50 && input.systemic_fatigue <= 70) {
    recommendations.push({
      message: "Moderate systemic fatigue building. Monitor volume this week.",
      type: "caution",
      priority: 2,
    });
  }

  // ── Stress signals ───────────────────────────────────────────────────────────
  if (suppression_factors.includes("high_stress")) {
    recommendations.push({
      message: "Elevated stress is suppressing recovery capacity. Lower-intensity work may be more beneficial today.",
      type: "caution",
      priority: 2,
    });
  }

  // ── Consecutive training days ─────────────────────────────────────────────────
  if (suppression_factors.includes("consecutive_training")) {
    recommendations.push({
      message: `${input.consecutive_training_days} consecutive training days detected. A rest or active recovery day is recommended.`,
      type: "caution",
      priority: 1,
    });
  }

  // ── Weekly strain ────────────────────────────────────────────────────────────
  if (suppression_factors.includes("high_weekly_strain")) {
    recommendations.push({
      message: "Weekly training strain is elevated. Reduce compound lift volume or add a rest day.",
      type: "warning",
      priority: 2,
    });
  }

  // ── Local muscle recovery ─────────────────────────────────────────────────────
  if (suppression_factors.includes("low_muscle_recovery")) {
    recommendations.push({
      message: "Several muscle groups are still in recovery. Prioritise exercises for recovered muscles today.",
      type: "caution",
      priority: 2,
    });
  }

  // ── HRV suppression ───────────────────────────────────────────────────────────
  if (suppression_factors.includes("suppressed_hrv")) {
    recommendations.push({
      message: "HRV is suppressed. The nervous system may not be ready for heavy loading — focus on technique or moderate effort.",
      type: "warning",
      priority: 1,
    });
  }

  // ── Generic readiness-based guidance if no strong signals ────────────────────
  if (recommendations.length === 0) {
    if (readiness_score >= 65) {
      recommendations.push({
        message: "Readiness is moderate. Train at 70–80 % of normal intensity.",
        type: "info",
        priority: 3,
      });
    } else {
      recommendations.push({
        message: "Readiness is low. Consider active recovery, mobility work, or a full rest day.",
        type: "warning",
        priority: 1,
      });
    }
  }

  // Sort by priority ascending (1 = most important)
  recommendations.sort((a, b) => a.priority - b.priority);

  return { recommendations: recommendations.slice(0, 4), suppression_factors };
}

// ─── Training recommendation tier ────────────────────────────────────────────

export function resolveTrainingRecommendation(
  tier: RecoveryTier,
  suppression_factors: string[]
): TrainingRecommendation {
  const hasSleepIssue    = suppression_factors.includes("poor_sleep");
  const hasHRVSuppressed = suppression_factors.includes("suppressed_hrv");
  const hasHighStrain    = suppression_factors.includes("high_systemic_fatigue");

  if (tier === "red")    return "rest";
  if (tier === "orange") return "active_recovery";

  // Yellow tier — apply fine-grained reduction
  if (tier === "yellow") {
    if (hasSleepIssue || hasHRVSuppressed || hasHighStrain) return "reduced_volume";
    return "moderate_intensity";
  }

  // Green tier — normally full intensity, but honour strong suppressors
  if (hasSleepIssue || hasHRVSuppressed || hasHighStrain) return "moderate_intensity";
  return "full_intensity";
}

// ─── Human-readable training label ───────────────────────────────────────────

export function trainingRecommendationLabel(rec: TrainingRecommendation): string {
  const map: Record<TrainingRecommendation, string> = {
    full_intensity:    "Full Intensity",
    moderate_intensity: "Moderate Intensity",
    reduced_volume:    "Reduced Volume",
    active_recovery:   "Active Recovery",
    rest:              "Rest Day",
  };
  return map[rec];
}

// ─── Muscle-specific recommendation ──────────────────────────────────────────

export function muscleRecommendation(recovery_score: number, muscle_label: string): string | null {
  if (recovery_score >= 85) return null; // fully recovered — no note needed
  if (recovery_score >= 65) return `${muscle_label} is still recovering. Moderate stimulus is fine.`;
  if (recovery_score >= 40) return `Reduce ${muscle_label.toLowerCase()} training volume today.`;
  return `Avoid direct ${muscle_label.toLowerCase()} training — insufficient recovery detected.`;
}
