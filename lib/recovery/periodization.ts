/**
 * Periodization and deload planning logic.
 * Deterministic functions for recommending deload weeks based on
 * cumulative fatigue, training load, and recovery patterns.
 */

import type { RecoverySnapshot } from "@/services/readiness";
import { calculateRecoveryTrend, detectRecoveryPatterns, classifyTrendDirection } from "./trends";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeloadRecommendation {
  deload_recommended: boolean;
  deload_intensity_pct: number;  // 50%, 60%, or 70% of normal volume
  start_date: string;  // suggested start date
  duration_days: number;  // typically 7
  rationale: string;
  pattern_detected: string | null;  // 'chronic_fatigue', 'overreaching', etc.
  days_recommended_rest_before_deload: number;  // 0-3 days active recovery first
}

export interface OverreachingDetection {
  is_overreaching: boolean;
  confidence: number;  // 0-1
  duration_days: number;
  required_recovery_days: number;
  earliest_resume_date: string;
}

// ─── Deload Recommendation Logic ──────────────────────────────────────────────

/**
 * Determine if deload is recommended based on cumulative fatigue.
 * Rules:
 * - 7-day strain > 400 AND declining readiness → deload (very fatigued)
 * - 7-day strain > 350 AND readiness < 60 → deload (moderately fatigued)
 * - 28-day avg strain > 350 → consider deload (chronically loaded)
 * - Readiness plateau < 55 for 5+ days → deload (recovery blocked)
 */
export function shouldRecommendDeload(
  last7DayStrain: number,
  last28DayStrain: number,
  currentReadiness: number,
  snapshots: RecoverySnapshot[]
): boolean {
  // Rule 1: Very high recent strain
  if (last7DayStrain > 400) {
    const trend = calculateRecoveryTrend(snapshots);
    if (!trend || trend.velocity <= 0) {
      // Strain high AND not recovering = DELOAD
      return true;
    }
  }

  // Rule 2: High strain + low readiness
  if (last7DayStrain > 350 && currentReadiness < 60) {
    return true;
  }

  // Rule 3: Chronic high load (28-day average)
  const avg28Day = last28DayStrain / 4;
  if (avg28Day > 350) {
    return true;
  }

  // Rule 4: Recovery plateau at low readiness
  if (snapshots.length >= 5) {
    const recentScores = snapshots.slice(0, 5).map((s) => s.readiness_score);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = calculateRecoveryTrend(snapshots);

    if (avgRecent < 55 && trend && Math.abs(trend.velocity) < 0.3) {
      // Recovery stuck at low level = DELOAD to reset
      return true;
    }
  }

  return false;
}

/**
 * Calculate recommended deload intensity (% of normal volume).
 * Higher strain = lower intensity.
 * - 50%: severe fatigue (strain 450+, readiness <40)
 * - 60%: moderate fatigue (strain 350-450, readiness 40-60)
 * - 70%: mild fatigue (strain 300-350, readiness 60-75)
 */
export function calculateDeloadIntensity(
  last7DayStrain: number,
  currentReadiness: number
): 50 | 60 | 70 {
  if (last7DayStrain >= 450 || currentReadiness < 40) {
    return 50;  // aggressive deload
  }

  if (last7DayStrain >= 350 || currentReadiness < 60) {
    return 60;  // moderate deload
  }

  return 70;  // light deload
}

/**
 * Generate full deload recommendation with rationale and timeline.
 */
export function getDeloadRecommendation(
  last7DayStrain: number,
  last28DayStrain: number,
  currentReadiness: number,
  snapshots: RecoverySnapshot[],
  todayDate: string
): DeloadRecommendation {
  const shouldDeload = shouldRecommendDeload(last7DayStrain, last28DayStrain, currentReadiness, snapshots);

  if (!shouldDeload) {
    return {
      deload_recommended: false,
      deload_intensity_pct: 100,
      start_date: "",
      duration_days: 0,
      rationale: "Recovery is adequate; no deload needed at this time.",
      pattern_detected: null,
      days_recommended_rest_before_deload: 0,
    };
  }

  const intensity = calculateDeloadIntensity(last7DayStrain, currentReadiness);
  const patterns = detectRecoveryPatterns(snapshots);
  const primaryPattern = patterns.length > 0 ? patterns[0].pattern : null;

  // Suggest deload to start today or in 1-3 days (depends on readiness)
  let daysBeforeDeload = 0;
  let rationale = "";

  if (primaryPattern === "chronic_fatigue") {
    daysBeforeDeload = 1;  // 1 day active recovery, then deload
    rationale = `Chronic fatigue detected (${primaryPattern}). Recommend 1 day of active recovery, then ${intensity}% deload.`;
  } else if (primaryPattern === "overreaching") {
    daysBeforeDeload = 0;
    rationale = `Overreaching pattern detected. Deload immediately at ${intensity}% volume.`;
  } else if (last7DayStrain > 450) {
    daysBeforeDeload = 0;
    rationale = `Extreme accumulated strain (${Math.round(last7DayStrain)} units in 7 days). Deload at ${intensity}% immediately.`;
  } else if (currentReadiness < 40) {
    daysBeforeDeload = 0;
    rationale = `Critical readiness level (${currentReadiness}/100). Deload at ${intensity}% immediately.`;
  } else {
    daysBeforeDeload = 1;
    rationale = `High training load and declining recovery. Recommend ${intensity}% deload.`;
  }

  // Calculate deload start date
  const deloadStart = new Date(todayDate);
  deloadStart.setDate(deloadStart.getDate() + daysBeforeDeload);

  return {
    deload_recommended: true,
    deload_intensity_pct: intensity,
    start_date: deloadStart.toISOString().split("T")[0],
    duration_days: 7,
    rationale,
    pattern_detected: primaryPattern,
    days_recommended_rest_before_deload: daysBeforeDeload,
  };
}

// ─── Overreaching Detection ──────────────────────────────────────────────────

/**
 * Detect if user is in an overreaching state.
 * Overreaching = readiness declining for 5+ days despite adequate sleep,
 * indicating accumulated fatigue from training.
 *
 * Returns confidence (0-1) and required recovery time.
 */
export function detectOverreachingPattern(
  snapshots: RecoverySnapshot[],
  recentSleepQualityAvg: number
): OverreachingDetection {
  if (snapshots.length < 7) {
    return {
      is_overreaching: false,
      confidence: 0,
      duration_days: 0,
      required_recovery_days: 0,
      earliest_resume_date: new Date().toISOString().split("T")[0],
    };
  }

  const recentScores = snapshots.slice(0, 7).map((s) => s.readiness_score);
  const trend = calculateRecoveryTrend(snapshots.slice(0, 7));

  if (!trend) {
    return {
      is_overreaching: false,
      confidence: 0,
      duration_days: 0,
      required_recovery_days: 0,
      earliest_resume_date: new Date().toISOString().split("T")[0],
    };
  }

  // Overreaching signature:
  // 1. Declining readiness (negative velocity)
  // 2. Sleep is adequate (not the cause)
  // 3. Duration 5+ days
  // 4. Not in emergency state (readiness still 40+)

  const isDeclining = trend.velocity < -0.5;
  const sleepIsAdequate = recentSleepQualityAvg >= 65;
  const notCritical = recentScores[0] >= 40;  // current readiness

  const isOverreaching = isDeclining && sleepIsAdequate && notCritical;

  if (!isOverreaching) {
    return {
      is_overreaching: false,
      confidence: 0,
      duration_days: 0,
      required_recovery_days: 0,
      earliest_resume_date: new Date().toISOString().split("T")[0],
    };
  }

  // Confidence: how strongly overreaching?
  // -1.0 velocity + adequate sleep = high confidence
  const confidence = Math.min(1.0, Math.abs(trend.velocity) / 1.0);

  // Recovery time: estimate days to return to 80+ readiness
  const currentReadiness = recentScores[0];
  const recoveryNeeded = Math.max(0, 80 - currentReadiness);
  const recoveryRate = 2.5;  // ~2.5 points/day with deload
  const requiredDays = Math.ceil(recoveryNeeded / recoveryRate);

  const earliestResume = new Date();
  earliestResume.setDate(earliestResume.getDate() + requiredDays);

  return {
    is_overreaching: true,
    confidence,
    duration_days: 7,
    required_recovery_days: requiredDays,
    earliest_resume_date: earliestResume.toISOString().split("T")[0],
  };
}

/**
 * Estimate how long until deload can be ended and normal training resumed.
 * Based on readiness trend and recovery patterns.
 */
export function estimateDeloadDuration(
  currentReadiness: number,
  targetReadiness: number = 75
): number {
  if (currentReadiness >= targetReadiness) {
    return 7;  // start deload anyway (prophylactic)
  }

  const gap = targetReadiness - currentReadiness;
  const dailyImprovement = 3.0;  // ~3 points/day during deload

  return Math.max(7, Math.ceil(gap / dailyImprovement));
}

/**
 * Suggest training focus during deload.
 * E.g., "Reduce compound lifts, maintain skill work, prioritize weak points."
 */
export function getDeloadTrainingFocus(
  pattern: string | null,
  currentReadiness: number
): string {
  if (currentReadiness < 40) {
    return "Active recovery only: light walking, mobility, stretching. Minimal resistance training.";
  }

  if (pattern === "chronic_fatigue") {
    return "Reduce volume by 40-50%. Focus on movement quality and weak points. Avoid maximal efforts.";
  }

  if (pattern === "overreaching") {
    return "Cut frequency in half. Maintain skill work but reduce sets per exercise. Emphasize sleep and nutrition.";
  }

  return "Reduce volume to 60-70% of normal. Maintain compound patterns but with lighter weights. Focus on weak points.";
}
