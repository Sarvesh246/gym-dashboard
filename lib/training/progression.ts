/**
 * Deterministic auto-progression engine.
 * Decides whether to increase, maintain, or reduce load for next session.
 * No AI — pure rule-based logic with clear rationale strings.
 */

import {
  PROGRESSION_THRESHOLDS,
  WEIGHT_INCREMENTS,
  HIGH_CNS_EXERCISES,
  READINESS_GATES,
} from "./constants";
import type {
  ProgressionInput,
  ProgressionRecommendation,
  DifficultyTier,
} from "./types";
import type { MovementPattern } from "@/lib/recovery/types";
import { getExercise } from "@/lib/muscles/mapping";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function liftCategory(pattern: MovementPattern): "lower_body" | "upper_compound" | "isolation" {
  if (pattern === "squat" || pattern === "hinge") return "lower_body";
  if (
    pattern === "horizontal_push" ||
    pattern === "horizontal_pull" ||
    pattern === "vertical_push" ||
    pattern === "vertical_pull"
  ) return "upper_compound";
  return "isolation";
}

function averageRpe(sets: ProgressionInput["sets_performed"]): number {
  const withRpe = sets.filter((s) => s.rpe !== null && s.rpe !== undefined);
  if (withRpe.length === 0) return 7.5; // assume moderate if not reported
  return withRpe.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / withRpe.length;
}

function completionRatio(sets: ProgressionInput["sets_performed"]): number {
  if (sets.length === 0) return 0;
  const completed = sets.filter((s) => !s.failed).length;
  return completed / sets.length;
}

function topSetReps(sets: ProgressionInput["sets_performed"]): number {
  const completed = sets.filter((s) => !s.failed);
  if (completed.length === 0) return 0;
  return Math.max(...completed.map((s) => s.reps));
}

// ─── Main progression function ────────────────────────────────────────────────

export function calculateProgression(
  input: ProgressionInput
): ProgressionRecommendation {
  const {
    exercise_id,
    training_level,
    current_weight,
    target_rep_min,
    target_rep_max,
    target_rpe,
    sets_performed,
    readiness_score,
    systemic_fatigue,
    recent_soreness,
  } = input;

  const exercise = getExercise(exercise_id);
  const pattern: MovementPattern = exercise?.movement_pattern ?? "isolation_push";
  const category = liftCategory(pattern);
  const increment = WEIGHT_INCREMENTS[category][training_level];

  const avgRpe = averageRpe(sets_performed);
  const completionRate = completionRatio(sets_performed);
  const maxReps = topSetReps(sets_performed);
  const isHighCns = HIGH_CNS_EXERCISES.has(exercise_id);

  // ─── Fatigue suppression ─────────────────────────────────────────────────

  const isSystemicallyFatigued = systemic_fatigue > 70;
  const isLowReadiness = readiness_score < READINESS_GATES.reduced_volume;
  const isHighSoreness = recent_soreness >= 4;
  const isFatigued = isSystemicallyFatigued || isLowReadiness || isHighSoreness;

  if (isFatigued) {
    const rationale = isSystemicallyFatigued
      ? "Systemic fatigue is high — maintain current load to allow recovery"
      : isLowReadiness
      ? "Readiness is low today — hold load and focus on execution"
      : "Muscle soreness is high — maintain load and let recovery catch up";

    return {
      exercise_id,
      recommended_weight: current_weight,
      weight_delta: 0,
      rep_target_min: target_rep_min,
      rep_target_max: target_rep_max,
      rpe_target: Math.min(target_rpe, 7.0),
      rationale,
      action: "maintain",
    };
  }

  // ─── Insufficient completion ──────────────────────────────────────────────

  if (completionRate < PROGRESSION_THRESHOLDS.completion_ratio_min) {
    const rationale = "Could not complete most sets — reduce load slightly to build consistency";
    const reduction = training_level === "beginner" ? increment : increment * 2;
    return {
      exercise_id,
      recommended_weight: Math.max(0, current_weight - reduction),
      weight_delta: -reduction,
      rep_target_min: target_rep_min,
      rep_target_max: target_rep_max,
      rpe_target: target_rpe,
      rationale,
      action: "reduce",
    };
  }

  // ─── Too hard (RPE too high) ──────────────────────────────────────────────

  if (avgRpe >= PROGRESSION_THRESHOLDS.too_hard_rpe) {
    const rationale = `Average RPE ${avgRpe.toFixed(1)} is too high — maintain current weight and focus on better execution`;
    return {
      exercise_id,
      recommended_weight: current_weight,
      weight_delta: 0,
      rep_target_min: target_rep_min,
      rep_target_max: target_rep_max,
      rpe_target: target_rpe,
      rationale,
      action: "maintain",
    };
  }

  // ─── Strong performance: increase weight ─────────────────────────────────

  const hitTopOfRange = maxReps >= target_rep_max;
  const easyRpe = avgRpe <= PROGRESSION_THRESHOLDS.easy_rpe_cutoff;
  const progressRpe = avgRpe <= PROGRESSION_THRESHOLDS.progress_rpe_cutoff;

  // Beginners progress more conservatively
  const progressionMultiplier = training_level === "beginner" ? 0.5 : 1.0;

  if (hitTopOfRange && easyRpe) {
    // Weight increase
    const delta = increment * progressionMultiplier;
    const rationale = `Hit top of rep range (${maxReps}) with RPE ${avgRpe.toFixed(1)} — ready to increase weight`;
    return {
      exercise_id,
      recommended_weight: current_weight + delta,
      weight_delta: delta,
      rep_target_min: target_rep_min,
      rep_target_max: target_rep_max,
      rpe_target: target_rpe,
      rationale,
      action: "increase",
    };
  }

  // ─── Double progression: increase reps within range ───────────────────────

  if (hitTopOfRange && progressRpe) {
    // Try reps first, then weight next session
    const rationale = `Hit top of rep range with moderate RPE ${avgRpe.toFixed(1)} — target more reps next session, then increase weight`;
    return {
      exercise_id,
      recommended_weight: current_weight,
      weight_delta: 0,
      rep_target_min: target_rep_min + 1,
      rep_target_max: target_rep_max + 1,
      rpe_target: target_rpe,
      rationale,
      action: "maintain",
    };
  }

  // ─── Stable: stay at current load ─────────────────────────────────────────

  const rationale =
    maxReps < target_rep_min
      ? `Reps below target range — work up to ${target_rep_min}–${target_rep_max} before adding weight`
      : `On track — continue building consistency at this load`;

  return {
    exercise_id,
    recommended_weight: current_weight,
    weight_delta: 0,
    rep_target_min: target_rep_min,
    rep_target_max: target_rep_max,
    rpe_target: target_rpe,
    rationale,
    action: "maintain",
  };
}

// ─── Batch progression for a full workout ────────────────────────────────────

export function calculateWorkoutProgression(
  inputs: ProgressionInput[]
): ProgressionRecommendation[] {
  return inputs.map(calculateProgression);
}
