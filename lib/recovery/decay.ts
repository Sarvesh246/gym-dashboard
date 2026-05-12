/**
 * Recovery decay helpers — call these to project forward or apply time-based
 * decay to stored muscle/systemic states without a full recalculation.
 */

import type { MuscleState, SystemicRecovery } from "./types";
import { RECOVERY_DECAY_RATES } from "./constants";
import { clamp, classifyRecoveryTier } from "./scoring";

// ─── Soreness proxy ───────────────────────────────────────────────────────────
// DOMS typically peaks ~24–36 h post-exercise then declines by ~96 h.

export function calculateSorenessProxy(
  strain_score: number,
  hours_since_trained: number
): number {
  if (strain_score <= 0 || hours_since_trained <= 0) return 0;

  const PEAK_HOURS  = 36;
  const CLEAR_HOURS = 96;

  if (hours_since_trained < PEAK_HOURS) {
    // Rising phase: 0 → strain_score over 36 h
    return (hours_since_trained / PEAK_HOURS) * strain_score;
  }

  // Declining phase: linear descent from peak to 0 by CLEAR_HOURS
  const decay = Math.max(
    0,
    1 - (hours_since_trained - PEAK_HOURS) / (CLEAR_HOURS - PEAK_HOURS)
  );
  return strain_score * decay;
}

// ─── Per-muscle decay application ────────────────────────────────────────────

/**
 * Given a stored MuscleState record and the current time, return updated
 * recovery_score, fatigue_score and soreness_score without touching the DB.
 * Useful for in-memory projections and visualisations.
 */
export function applyMuscleDecay(
  state: MuscleState,
  nowMs = Date.now()
): { recovery_score: number; fatigue_score: number; soreness_score: number } {
  if (!state.last_trained_at) {
    return { recovery_score: 100, fatigue_score: 0, soreness_score: 0 };
  }

  const hoursSince = (nowMs - new Date(state.last_trained_at).getTime()) / 3_600_000;

  // Choose decay speed from stored strain magnitude
  let decayKey: keyof typeof RECOVERY_DECAY_RATES;
  if (state.strain_score > 75)      decayKey = "very_slow";
  else if (state.strain_score > 50) decayKey = "slow";
  else if (state.strain_score > 25) decayKey = "moderate";
  else                              decayKey = "fast";

  const k = RECOVERY_DECAY_RATES[decayKey];
  const remainingFatigue = state.strain_score * Math.exp(-k * hoursSince);

  const recovery_score = clamp(100 - remainingFatigue, 0, 100);
  const fatigue_score  = clamp(remainingFatigue, 0, 100);
  const soreness_score = calculateSorenessProxy(state.strain_score, hoursSince);

  return { recovery_score, fatigue_score, soreness_score };
}

// ─── Systemic decay application ───────────────────────────────────────────────

/**
 * Project systemic fatigue forward in time without DB access.
 * Systemic fatigue decays with a slow half-life (~48 h) when at rest.
 */
export function applySystemicDecay(
  stored: SystemicRecovery,
  nowMs = Date.now()
): { systemic_fatigue: number; readiness_score: number } {
  const hoursSince = (nowMs - new Date(stored.updated_at).getTime()) / 3_600_000;

  if (hoursSince <= 0) {
    return {
      systemic_fatigue: stored.systemic_fatigue,
      readiness_score:  stored.readiness_score,
    };
  }

  const k = RECOVERY_DECAY_RATES.slow; // 50 % systemic recovery at 48 h
  const decayedFatigue = stored.systemic_fatigue * Math.exp(-k * hoursSince);
  const systemic_fatigue = clamp(decayedFatigue, 0, 100);

  // Simple readiness projection: invert systemic, apply stored modifiers
  const base = 100 - systemic_fatigue;
  const modifiers = stored.sleep_modifier + stored.stress_modifier + stored.hrv_modifier;
  const readiness_score = clamp(base + modifiers * 0.3, 0, 100);

  return { systemic_fatigue, readiness_score };
}

// ─── Recovery trend ───────────────────────────────────────────────────────────

/**
 * Returns a trend direction number: positive = improving, negative = declining.
 * Compares the average of the last 3 readiness snapshots vs. the 3 before those.
 */
export function computeRecoveryTrend(recentScores: number[]): number {
  if (recentScores.length < 4) return 0;

  const half = Math.floor(recentScores.length / 2);
  const older = recentScores.slice(0, half);
  const newer = recentScores.slice(-half);

  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const avgNewer = newer.reduce((a, b) => a + b, 0) / newer.length;

  return clamp(avgNewer - avgOlder, -10, 10);
}

// ─── Readiness modifier from muscle state ────────────────────────────────────

/**
 * Derives the readiness_modifier (−1.0 → +1.0) for a muscle based on its
 * current recovery score.  Fully recovered muscles contribute positively;
 * depleted muscles pull the global score down.
 */
export function muscleReadinessModifier(recovery_score: number): number {
  // Centre at 70 (baseline), scale ±1.0
  return clamp((recovery_score - 70) / 30, -1, 1);
}

// ─── Recovery tier from muscle state ─────────────────────────────────────────

export { classifyRecoveryTier } from "./scoring";
