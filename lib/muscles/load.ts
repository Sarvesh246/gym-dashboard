/**
 * Muscle load distribution utilities.
 * Takes workout sets and returns per-muscle strain contributions.
 */

import type { WorkoutSet, StrainOutput, MuscleGroup } from "../recovery/types";
import { calculateWorkoutStrain } from "../recovery/scoring";
import { getExercise } from "./mapping";

// ─── Aggregate muscle loads from a list of sets ───────────────────────────────

export function distributeMuscleLoad(sets: WorkoutSet[]): Partial<Record<MuscleGroup, number>> {
  // Delegate to the scoring engine — local_muscle_loads already normalised 0–100
  const dummy: StrainOutput = calculateWorkoutStrain({
    sets,
    training_level: "intermediate",
    duration_minutes: 0,
  });
  return dummy.local_muscle_loads;
}

// ─── Top muscles hit in a workout ─────────────────────────────────────────────

export function topMusclesFromSets(
  sets: WorkoutSet[],
  topN = 5
): { muscle: MuscleGroup; load: number }[] {
  const loads = distributeMuscleLoad(sets);
  return Object.entries(loads)
    .map(([muscle, load]) => ({ muscle: muscle as MuscleGroup, load: load ?? 0 }))
    .sort((a, b) => b.load - a.load)
    .slice(0, topN);
}

// ─── Validate that exercise IDs exist in the library ─────────────────────────

export function validateExerciseIds(sets: WorkoutSet[]): string[] {
  const missing: string[] = [];
  for (const s of sets) {
    if (!getExercise(s.exercise_id)) missing.push(s.exercise_id);
  }
  return missing;
}

// ─── Estimate recovery time for the primary load ─────────────────────────────

/**
 * Returns estimated hours until the most stressed muscle reaches 80 % recovery.
 * Uses the inverse of the decay formula: t = −ln(0.2) / k
 * (0.2 = 20 % remaining fatigue out of strain = 80 % recovered)
 */
export function estimatedRecoveryHours(strain_score: number): number {
  if (strain_score <= 0) return 0;

  let k: number;
  if (strain_score > 75)      k = Math.log(2) / 72;
  else if (strain_score > 50) k = Math.log(2) / 48;
  else if (strain_score > 25) k = Math.log(2) / 36;
  else                         k = Math.log(2) / 20;

  // t = −ln(remaining_fraction / strain) / k
  // 80 % recovered → remaining fatigue = 0.20 × strain
  return Math.ceil(-Math.log(0.20) / k);
}

// ─── Weekly volume summary per muscle ────────────────────────────────────────

export interface WeeklyMuscleSummary {
  muscle: MuscleGroup;
  total_sets: number;
  total_load: number;
  frequency: number; // workouts that touched this muscle
}

export function buildWeeklyMuscleSummary(
  workoutLoads: Partial<Record<MuscleGroup, number>>[]
): WeeklyMuscleSummary[] {
  const accumulator: Record<string, { sets: number; load: number; freq: number }> = {};

  for (const loads of workoutLoads) {
    for (const [muscle, load] of Object.entries(loads)) {
      if (!accumulator[muscle]) {
        accumulator[muscle] = { sets: 0, load: 0, freq: 0 };
      }
      accumulator[muscle].load += load ?? 0;
      accumulator[muscle].freq += 1;
    }
  }

  return Object.entries(accumulator).map(([muscle, data]) => ({
    muscle: muscle as MuscleGroup,
    total_sets: data.sets,
    total_load: data.load,
    frequency: data.freq,
  }));
}
