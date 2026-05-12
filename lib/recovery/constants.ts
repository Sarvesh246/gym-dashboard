import type { RecoveryTier, MovementPattern } from "./types";

// ─── Recovery tier thresholds ────────────────────────────────────────────────

export const RECOVERY_TIER_THRESHOLDS: Record<
  RecoveryTier,
  { min: number; max: number; label: string; color: string }
> = {
  green:  { min: 85, max: 100, label: "Ready",    color: "#22C55E" },
  yellow: { min: 65, max: 84,  label: "Moderate", color: "#F59E0B" },
  orange: { min: 40, max: 64,  label: "Reduced",  color: "#F97316" },
  red:    { min: 0,  max: 39,  label: "Fatigued", color: "#EF4444" },
} as const;

// ─── Recovery decay rates ─────────────────────────────────────────────────────
// k in: recovery(t) = 100 − (strain × e^(−k × t))
// k = ln(2) / half_life_hours  ↔  50 % recovered at half_life_hours

export const RECOVERY_DECAY_RATES = {
  fast:      Math.log(2) / 20, // 50 % at 20 h — light isolation
  moderate:  Math.log(2) / 36, // 50 % at 36 h — compound moderate
  slow:      Math.log(2) / 48, // 50 % at 48 h — compound heavy
  very_slow: Math.log(2) / 72, // 50 % at 72 h — CNS-dominant
} as const;

export type DecaySpeed = keyof typeof RECOVERY_DECAY_RATES;

// ─── Score weights ─────────────────────────────────────────────────────────────

export const READINESS_WEIGHTS = {
  systemic_fatigue:    0.40,
  sleep:               0.25,
  strain_accumulation: 0.20,
  stress:              0.10,
  avg_muscle_recovery: 0.05,
} as const;

export const SYSTEMIC_FATIGUE_WEIGHTS = {
  weekly_volume:     0.30,
  cns_load:          0.35,
  consecutive_days:  0.20,
  sleep_debt:        0.15,
} as const;

// ─── Training level modifiers ──────────────────────────────────────────────────
// Beginners accumulate less absolute load → effective recovery is faster

export const TRAINING_LEVEL_MODIFIERS: Record<string, number> = {
  beginner:     1.15, // +15 % effective recovery speed
  intermediate: 1.00,
  advanced:     0.90, // −10 % (higher absolute loads)
  returning:    1.05,
} as const;

// ─── CNS load factors per movement pattern ────────────────────────────────────
// Scale: 0.0 (no CNS cost) → 1.0 (max CNS cost)

export const CNS_LOAD_FACTORS: Record<MovementPattern, number> = {
  hinge:            1.00, // deadlift — highest
  squat:            0.90,
  carry:            0.60,
  horizontal_push:  0.50,
  horizontal_pull:  0.50,
  vertical_push:    0.45,
  vertical_pull:    0.45,
  core:             0.25,
  isolation_push:   0.20,
  isolation_pull:   0.20,
  cardio:           0.15,
} as const;

// ─── Weekly volume limits ──────────────────────────────────────────────────────

export const WEEKLY_SET_LIMITS = {
  total_moderate: 60,  // > 60 sets/week triggers volume fatigue
  total_high:     90,
  per_muscle_moderate: 12,
  per_muscle_high:     20,
} as const;

// ─── Strain normalisation ──────────────────────────────────────────────────────
// Max expected 7-day accumulated raw strain value → maps to 100

export const MAX_7DAY_STRAIN_ACCUMULATION = 500;

// ─── RPE → intensity multipliers ──────────────────────────────────────────────

export const RPE_MULTIPLIERS: Record<number, number> = {
  5:  0.30,
  6:  0.42,
  7:  0.55,
  8:  0.70,
  9:  0.85,
  10: 1.00,
} as const;

export const DEFAULT_RPE = 7;

// ─── Triadic modifiers for profile-derived inputs ────────────────────────────

export const SLEEP_QUALITY_SCORE: Record<string, number> = {
  low:    30,
  medium: 65,
  high:   90,
} as const;

export const STRESS_LEVEL_SCORE: Record<string, number> = {
  low:    90,
  medium: 60,
  high:   25,
} as const;

// ─── Consecutive training day thresholds ──────────────────────────────────────

export const CONSECUTIVE_DAY_PENALTY = 5; // readiness points lost per day beyond 3

// ─── Soreness proxy: hours until soreness peaks then declines ─────────────────
// DOMS typically peaks at 24–48 h post-exercise

export const SORENESS_PEAK_HOURS = 36;
export const SORENESS_CLEAR_HOURS = 96;

// ─── Primary / secondary muscle load distribution ────────────────────────────

export const PRIMARY_MUSCLE_SHARE   = 1.00;
export const SECONDARY_MUSCLE_SHARE = 0.45;
