// Deterministic scoring functions for progression, consistency, and adherence.
// All outputs are 0–100 scores unless otherwise noted.

import type { TrendPoint } from "./trends";
import { linearSlope, rollingAverage } from "./trends";

/** Score training consistency (0–100) based on workout frequency vs target. */
export function scoreConsistency(
  workoutDaysThisWeek: number,
  targetDaysPerWeek: number
): number {
  if (targetDaysPerWeek <= 0) return 100;
  return Math.min(100, Math.round((workoutDaysThisWeek / targetDaysPerWeek) * 100));
}

/**
 * Score progression velocity (0–100).
 * Positive slope = progressing, flat = stagnant, negative = declining.
 * Uses 4-week volume or e1RM trend.
 */
export function scoreProgressionVelocity(points: TrendPoint[]): number {
  if (points.length < 2) return 50;
  const slope = linearSlope(points);
  const mean = rollingAverage(points, points.length);
  if (mean === 0) return 50;
  const pctSlope = (slope / mean) * 100;
  // Map -5% to +5% per step → 0–100
  const clamped = Math.max(-5, Math.min(5, pctSlope));
  return Math.round(((clamped + 5) / 10) * 100);
}

/** Score recovery trend (0–100). Based on 7-day rolling readiness average. */
export function scoreRecoveryTrend(readinessPoints: TrendPoint[]): number {
  if (readinessPoints.length === 0) return 50;
  const avg = rollingAverage(readinessPoints, 7);
  return Math.min(100, Math.max(0, Math.round(avg)));
}

/** Score nutrition adherence (0–100). Input: adherence fraction 0–1. */
export function scoreNutritionAdherence(adherenceFraction: number): number {
  return Math.min(100, Math.max(0, Math.round(adherenceFraction * 100)));
}

/**
 * Composite weekly performance score (0–100).
 * Weighted: consistency 30%, recovery 30%, progression 20%, nutrition 20%.
 */
export function compositeWeeklyScore(input: {
  consistencyScore: number;
  recoveryScore: number;
  progressionScore: number;
  nutritionScore: number;
}): number {
  return Math.round(
    input.consistencyScore * 0.3 +
      input.recoveryScore * 0.3 +
      input.progressionScore * 0.2 +
      input.nutritionScore * 0.2
  );
}

/** Classify a score into a tier label. */
export function classifyScoreTier(
  score: number
): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/** Deload urgency: returns 0–3 based on recovery suppression and fatigue signals. */
export function computeDeloadUrgency(input: {
  avgReadiness7d: number;
  avgReadiness14d: number;
  fatigueAccumulation: number;
  failedProgressionCount: number;
}): 0 | 1 | 2 | 3 {
  let score = 0;
  if (input.avgReadiness7d < 50) score += 2;
  else if (input.avgReadiness7d < 65) score += 1;
  if (input.avgReadiness7d < input.avgReadiness14d - 10) score += 1;
  if (input.fatigueAccumulation > 75) score += 1;
  if (input.failedProgressionCount >= 3) score += 1;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}
