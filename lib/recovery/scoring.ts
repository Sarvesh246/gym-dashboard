/**
 * Pure, deterministic scoring functions for the recovery engine.
 * No I/O, no side-effects — safe to call from anywhere.
 */

import type {
  MuscleRecoveryInput,
  ReadinessInput,
  ReadinessOutput,
  StrainInput,
  StrainOutput,
  RecoveryTier,
  TrainingRecommendation,
} from "./types";
import {
  RECOVERY_TIER_THRESHOLDS,
  RECOVERY_DECAY_RATES,
  READINESS_WEIGHTS,
  TRAINING_LEVEL_MODIFIERS,
  RPE_MULTIPLIERS,
  DEFAULT_RPE,
  CONSECUTIVE_DAY_PENALTY,
  MAX_7DAY_STRAIN_ACCUMULATION,
  SECONDARY_MUSCLE_SHARE,
  PRIMARY_MUSCLE_SHARE,
} from "./constants";
import { getExercise } from "../muscles/mapping";
import { buildRecommendations, resolveTrainingRecommendation } from "./recommendations";

// ─── Primitives ───────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

// ─── Tier classification ──────────────────────────────────────────────────────

export function classifyRecoveryTier(score: number): RecoveryTier {
  const s = clamp(score, 0, 100);
  if (s >= RECOVERY_TIER_THRESHOLDS.green.min)  return "green";
  if (s >= RECOVERY_TIER_THRESHOLDS.yellow.min) return "yellow";
  if (s >= RECOVERY_TIER_THRESHOLDS.orange.min) return "orange";
  return "red";
}

// ─── Recovery decay ───────────────────────────────────────────────────────────

/**
 * Computes how recovered a muscle is given time elapsed and initial strain.
 * Model: recovery(t) = 100 − strain × e^(−k × t)
 *   - At t=0:  recovery = 100 − strain  (post-workout floor)
 *   - t → ∞:  recovery → 100
 */
export function calculateRecoveryDecay(
  initialStrain: number,
  hoursSinceTrained: number,
  decayKey: keyof typeof RECOVERY_DECAY_RATES
): number {
  if (hoursSinceTrained <= 0) return clamp(100 - initialStrain, 0, 100);
  const k = RECOVERY_DECAY_RATES[decayKey];
  const remainingFatigue = initialStrain * Math.exp(-k * hoursSinceTrained);
  return clamp(100 - remainingFatigue, 0, 100);
}

// ─── Muscle-level recovery score ─────────────────────────────────────────────

export function calculateMuscleRecovery(input: MuscleRecoveryInput): number {
  const {
    hours_since_trained,
    last_strain_score,
    weekly_frequency,
    sleep_quality_score,
    systemic_fatigue,
    training_level,
  } = input;

  // Not recently trained → fully recovered
  if (hours_since_trained <= 0 || last_strain_score <= 0) return 100;

  // Determine decay speed from strain magnitude
  let decayKey: keyof typeof RECOVERY_DECAY_RATES;
  if (last_strain_score > 75)      decayKey = "very_slow";
  else if (last_strain_score > 50) decayKey = "slow";
  else if (last_strain_score > 25) decayKey = "moderate";
  else                             decayKey = "fast";

  const base = calculateRecoveryDecay(last_strain_score, hours_since_trained, decayKey);

  // Training-level modifier: beginners recover faster effectively
  const levelMod = TRAINING_LEVEL_MODIFIERS[training_level] ?? 1.0;

  // Sleep bonus: −7.5 to +7.5 points
  const sleepBonus = (sleep_quality_score - 50) * 0.15;

  // Systemic suppression: high whole-body fatigue slows local recovery
  const systemicPenalty = systemic_fatigue * 0.10;

  // Overtraining frequency penalty: >3 sessions/week on same muscle
  const freqPenalty = Math.max(0, (weekly_frequency - 3) * 5);

  return clamp(base * levelMod + sleepBonus - systemicPenalty - freqPenalty, 0, 100);
}

// ─── Hypertrophy load ─────────────────────────────────────────────────────────

export function calculateHypertrophyLoad(
  sets: number,
  reps: number,
  weight_kg: number,
  hypertrophy_weighting: number
): number {
  // Hypertrophy is maximised in the 5–30 rep range
  const repMultiplier = reps >= 5 && reps <= 30 ? 1.0 : 0.60;
  return sets * reps * weight_kg * hypertrophy_weighting * repMultiplier;
}

// ─── Systemic fatigue ─────────────────────────────────────────────────────────

export function calculateSystemicFatigue(inputs: {
  weekly_total_sets: number;
  cns_load_7days: number;
  consecutive_training_days: number;
  sleep_hours_avg: number;
  optimal_sleep_hours?: number;
}): number {
  const {
    weekly_total_sets,
    cns_load_7days,
    consecutive_training_days,
    sleep_hours_avg,
    optimal_sleep_hours = 8,
  } = inputs;

  // Volume factor: 0→1 as sets approach the moderate threshold (60)
  const volumeFactor = clamp(weekly_total_sets / 60, 0, 1);

  // CNS factor: max expected 7-day CNS load normalised to 1
  const cnsFactor = clamp(cns_load_7days / 20, 0, 1);

  // Consecutive days: 6 consecutive days = maximum contribution
  const consecutiveFactor = clamp(consecutive_training_days / 6, 0, 1);

  // Sleep debt
  const sleepDebt = Math.max(0, optimal_sleep_hours - sleep_hours_avg);
  const sleepDebtFactor = clamp(sleepDebt / optimal_sleep_hours, 0, 1);

  const raw =
    volumeFactor    * 0.30 +
    cnsFactor       * 0.35 +
    consecutiveFactor * 0.20 +
    sleepDebtFactor * 0.15;

  return clamp(raw * 100, 0, 100);
}

// ─── Readiness score ─────────────────────────────────────────────────────────

export function calculateReadiness(input: ReadinessInput): ReadinessOutput {
  const {
    systemic_fatigue,
    sleep_quality_score,
    stress_score,
    strain_accumulation,
    avg_muscle_recovery,
    consecutive_training_days,
  } = input;

  const systemicReadiness = 100 - systemic_fatigue;
  const stressReadiness   = 100 - stress_score;
  const strainPenalty     = clamp((strain_accumulation / MAX_7DAY_STRAIN_ACCUMULATION) * 100, 0, 100);

  const base =
    systemicReadiness              * READINESS_WEIGHTS.systemic_fatigue +
    sleep_quality_score            * READINESS_WEIGHTS.sleep +
    (100 - strainPenalty)          * READINESS_WEIGHTS.strain_accumulation +
    stressReadiness                * READINESS_WEIGHTS.stress +
    avg_muscle_recovery            * READINESS_WEIGHTS.avg_muscle_recovery;

  // Flat penalty after 3+ consecutive training days
  const consecutivePenalty = Math.max(0, (consecutive_training_days - 3) * CONSECUTIVE_DAY_PENALTY);

  const readiness_score = clamp(base - consecutivePenalty, 0, 100);
  const tier = classifyRecoveryTier(readiness_score);

  const { recommendations, suppression_factors } = buildRecommendations(input, readiness_score);
  const training_recommendation = resolveTrainingRecommendation(tier, suppression_factors);

  return { readiness_score, tier, training_recommendation, recommendations, suppression_factors };
}

// ─── Workout strain ───────────────────────────────────────────────────────────

export function calculateWorkoutStrain(input: StrainInput): StrainOutput {
  const localLoads: Partial<Record<string, number>> = {};
  let totalRawStrain   = 0;
  let totalSystemicRaw = 0;
  let totalCNSRaw      = 0;
  let totalVolume      = 0;

  for (const s of input.sets) {
    const exercise = getExercise(s.exercise_id);
    if (!exercise) continue;

    const rpe = clamp(s.rpe ?? DEFAULT_RPE, 5, 10);
    const rpeMultiplier = RPE_MULTIPLIERS[rpe] ?? RPE_MULTIPLIERS[DEFAULT_RPE];
    const setRawStrain  = s.sets * s.reps * rpeMultiplier * exercise.fatigue_factor;

    totalRawStrain   += setRawStrain;
    totalSystemicRaw += setRawStrain * exercise.systemic_fatigue_factor;
    totalCNSRaw      += setRawStrain * exercise.cns_fatigue_factor;
    totalVolume      += s.sets * s.reps * s.weight_kg;

    // Distribute to primary muscles
    for (const m of exercise.primary_muscles) {
      localLoads[m] = (localLoads[m] ?? 0) + setRawStrain * PRIMARY_MUSCLE_SHARE;
    }
    // Distribute to secondary muscles
    for (const m of exercise.secondary_muscles) {
      localLoads[m] = (localLoads[m] ?? 0) + setRawStrain * SECONDARY_MUSCLE_SHARE;
    }
  }

  // Normalise to 0–100 using a calibrated reference (100 raw ≈ 100 strain)
  const normalisedStrain   = clamp((totalRawStrain   / 100) * 100, 0, 100);
  const normalisedSystemic = clamp((totalSystemicRaw / 60)  * 100, 0, 100);
  const normalisedCNS      = clamp((totalCNSRaw      / 20)  * 100, 0, 100);

  // Normalise local loads per muscle to 0–100
  const normalisedLoads: Partial<Record<string, number>> = {};
  for (const [muscle, load] of Object.entries(localLoads)) {
    normalisedLoads[muscle] = clamp(((load ?? 0) / 50) * 100, 0, 100);
  }

  // Recovery impact: the average local muscle strain expected to suppress recovery
  const loadValues = Object.values(normalisedLoads).filter((v): v is number => v !== undefined);
  const recoveryImpact =
    loadValues.length > 0
      ? loadValues.reduce((a, b) => a + b, 0) / loadValues.length
      : 0;

  return {
    estimated_strain: normalisedStrain,
    systemic_load:    normalisedSystemic,
    cns_load:         normalisedCNS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    local_muscle_loads: normalisedLoads as any,
    recovery_impact:  recoveryImpact,
    total_volume:     totalVolume,
  };
}
