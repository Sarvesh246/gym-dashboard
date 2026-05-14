/**
 * Recovery trend analysis and pattern detection.
 * Deterministic functions for analyzing historical readiness data,
 * detecting patterns (fatigue, overreaching, recovery spikes),
 * and predicting recovery timelines.
 */

import type { RecoverySnapshot } from "@/services/readiness";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryTrend {
  velocity: number;  // daily change rate (can be negative)
  direction: "improving" | "declining" | "flat";
  baseline_avg: number;  // average over entire range
  current_vs_avg: number;  // current score - baseline (can be negative)
  trend_days: number;  // number of days in trend
}

export interface RecoveryPattern {
  pattern: "chronic_fatigue" | "overreaching" | "recovery_spike" | "plateau" | "none";
  confidence: number;  // 0.0-1.0
  start_date: string;
  end_date: string;
  duration_days: number;
}

export interface MuscleRecoveryTrend {
  muscle_group: string;
  recovery_history: number[];
  avg_recovery: number;
  peak_recovery: number;
  low_recovery: number;
  trend: RecoveryTrend | null;
  days_until_full_recovery: number;  // estimated days to reach 90+ recovery
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Calculate linear regression slope (velocity) of scores over time.
 * Positive = improving, negative = declining.
 */
export function calculateTrendVelocity(scores: number[]): number {
  if (scores.length < 2) return 0;

  const n = scores.length;
  const xs = Array.from({ length: n }, (_, i) => i);  // days [0, 1, 2, ...]
  const ys = scores;

  const x_mean = xs.reduce((a, b) => a + b, 0) / n;
  const y_mean = ys.reduce((a, b) => a + b, 0) / n;

  const numerator = xs.reduce((sum, x, i) => sum + (x - x_mean) * (ys[i] - y_mean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - x_mean) ** 2, 0);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Classify trend direction based on velocity.
 */
export function classifyTrendDirection(
  velocity: number,
  threshold = 0.5
): "improving" | "declining" | "flat" {
  if (velocity > threshold) return "improving";
  if (velocity < -threshold) return "declining";
  return "flat";
}

/**
 * Calculate average of an array.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Main trend analysis ──────────────────────────────────────────────────────

/**
 * Analyze recovery trend from historical snapshots.
 * Returns velocity (change per day), direction, and baseline comparison.
 */
export function calculateRecoveryTrend(snapshots: RecoverySnapshot[]): RecoveryTrend | null {
  if (snapshots.length < 2) return null;

  const scores = snapshots.map((s) => s.readiness_score);
  const velocity = calculateTrendVelocity(scores);
  const baseline_avg = mean(scores);
  const current_vs_avg = scores[0] - baseline_avg;  // most recent first

  return {
    velocity,
    direction: classifyTrendDirection(velocity),
    baseline_avg,
    current_vs_avg,
    trend_days: snapshots.length,
  };
}

/**
 * Detect recovery patterns (chronic fatigue, overreaching, spikes, plateaus).
 * Returns confidence (0-1) indicating pattern strength.
 */
export function detectRecoveryPatterns(snapshots: RecoverySnapshot[]): RecoveryPattern[] {
  if (snapshots.length < 3) return [];

  const patterns: RecoveryPattern[] = [];
  const scores = snapshots.map((s) => s.readiness_score);
  const trend = calculateRecoveryTrend(snapshots);

  // ─── Chronic Fatigue ──────────────────────────────────────────────────────
  // Readiness consistently low (<50) for 5+ days with declining or flat trend.
  if (snapshots.length >= 5) {
    const recentScores = scores.slice(0, 5);
    const avgRecent = mean(recentScores);
    const allLow = recentScores.every((s) => s < 60);

    if (allLow && avgRecent < 50 && trend && (trend.velocity <= 0.5)) {
      patterns.push({
        pattern: "chronic_fatigue",
        confidence: Math.min(1.0, (60 - avgRecent) / 30),  // max confidence at 30 or below
        start_date: snapshots[4].snapshot_date,
        end_date: snapshots[0].snapshot_date,
        duration_days: 5,
      });
    }
  }

  // ─── Overreaching ─────────────────────────────────────────────────────────
  // Readiness declining despite adequate sleep (recent snapshots show sleep >= 70).
  // Indicates accumulated fatigue from training.
  if (snapshots.length >= 7) {
    const recentScores = scores.slice(0, 7);
    const velocity = calculateTrendVelocity(recentScores);
    const avgRecent = mean(recentScores);

    // Declining trend with moderate fatigue = overreaching
    if (velocity < -0.5 && avgRecent >= 40 && avgRecent < 70) {
      patterns.push({
        pattern: "overreaching",
        confidence: Math.min(1.0, Math.abs(velocity) / 1.0),  // velocity of -1.0+ = high confidence
        start_date: snapshots[6].snapshot_date,
        end_date: snapshots[0].snapshot_date,
        duration_days: 7,
      });
    }
  }

  // ─── Recovery Spike ───────────────────────────────────────────────────────
  // Sudden jump in readiness (>15 points in 1-2 days) after low period.
  if (snapshots.length >= 3) {
    for (let i = 1; i < Math.min(snapshots.length, 3); i++) {
      const previous = scores[i];
      const current = scores[i - 1];
      const jump = current - previous;

      if (jump > 15 && previous < 55) {
        patterns.push({
          pattern: "recovery_spike",
          confidence: Math.min(1.0, jump / 30),  // 30+ point jump = high confidence
          start_date: snapshots[i].snapshot_date,
          end_date: snapshots[i - 1].snapshot_date,
          duration_days: i,
        });
        break;  // only one spike pattern per analysis
      }
    }
  }

  // ─── Plateau ──────────────────────────────────────────────────────────────
  // Readiness stuck in range for 5+ days (velocity near zero).
  if (snapshots.length >= 5 && trend && Math.abs(trend.velocity) < 0.2) {
    patterns.push({
      pattern: "plateau",
      confidence: 0.6 + (1 - Math.abs(trend.velocity) / 0.2) * 0.4,
      start_date: snapshots[snapshots.length - 1].snapshot_date,
      end_date: snapshots[0].snapshot_date,
      duration_days: Math.min(snapshots.length, 7),
    });
  }

  return patterns;
}

/**
 * Estimate days until full recovery (90+ readiness) based on current fatigue
 * and historical decay rate.
 */
export function predictRecoveryTimeline(
  currentReadiness: number,
  historicalSnapshots: RecoverySnapshot[]
): number {
  const target = 90;

  if (currentReadiness >= target) return 0;

  // Calculate historical decay rate from snapshots
  // Avg daily improvement when recovering
  const recentLowScores = historicalSnapshots
    .filter((s) => s.readiness_score < 70)
    .slice(0, 10);

  if (recentLowScores.length < 2) {
    // No historical data; estimate conservatively
    // ~2-3 points per day recovery rate (depends on sleep, load, etc.)
    return Math.ceil((target - currentReadiness) / 2.5);
  }

  const scores = recentLowScores.map((s) => s.readiness_score);
  const velocity = calculateTrendVelocity(scores);

  if (velocity <= 0) {
    // Not recovering historically; estimate 5-7 days (conservative)
    return 7;
  }

  // Linear projection
  const daysNeeded = (target - currentReadiness) / velocity;
  return Math.max(1, Math.ceil(daysNeeded));
}

/**
 * Aggregate recovery trend for a single muscle group.
 * Requires muscle_states snapshots over time (not yet persisted in Phase 1).
 * For Phase 1, returns null; this will be enhanced in Phase 2 with muscle snapshots.
 */
export function aggregateMuscleRecoveryTrend(
  muscleHistory: Array<{ date: string; recovery_score: number }>
): MuscleRecoveryTrend | null {
  if (muscleHistory.length === 0) return null;

  const recoveryHistory = muscleHistory.map((m) => m.recovery_score);
  const trend =
    recoveryHistory.length >= 2
      ? calculateRecoveryTrend(
          muscleHistory.map((m, i) => ({
            id: i,
            user_id: "",
            snapshot_date: m.date,
            readiness_score: m.recovery_score,
            systemic_fatigue: 0,
            avg_muscle_recovery: 0,
            recovery_tier: "yellow" as const,
            training_recommendation: "moderate_intensity" as const,
            weekly_strain_accumulation: 0,
            key_suppressors: [],
            created_at: m.date,
          }))
        )
      : null;

  return {
    muscle_group: "",  // caller provides this
    recovery_history: recoveryHistory,
    avg_recovery: mean(recoveryHistory),
    peak_recovery: Math.max(...recoveryHistory),
    low_recovery: Math.min(...recoveryHistory),
    trend,
    days_until_full_recovery: predictRecoveryTimeline(recoveryHistory[0], []),
  };
}

/**
 * Compare current readiness to historical baseline.
 * Returns how far above/below average the user currently is.
 */
export function compareToBaseline(
  currentReadiness: number,
  snapshots: RecoverySnapshot[]
): {
  percentile: number;  // 0-100 (100 = best ever)
  comparison: string;  // "above", "below", "average"
  daysAboveAverage: number;  // recent days above baseline
} {
  if (snapshots.length === 0) {
    return { percentile: 50, comparison: "average", daysAboveAverage: 0 };
  }

  const allScores = snapshots.map((s) => s.readiness_score);
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const baselineAvg = mean(allScores);

  // Percentile: where does current readiness rank?
  const percentile = Math.round(
    (sortedScores.filter((s) => s <= currentReadiness).length / sortedScores.length) * 100
  );

  const comparison =
    currentReadiness > baselineAvg + 5
      ? "above"
      : currentReadiness < baselineAvg - 5
        ? "below"
        : "average";

  // Count recent days above baseline
  const recentDaysAbove = snapshots
    .slice(0, 7)
    .filter((s) => s.readiness_score > baselineAvg).length;

  return {
    percentile,
    comparison,
    daysAboveAverage: recentDaysAbove,
  };
}
