/**
 * Deterministic workout generation engine.
 * Produces structured workouts based on profile, split, recovery state, and equipment.
 * No AI — fully rule-based and explainable.
 */

import {
  DAY_TARGET_MUSCLES,
  DAY_MOVEMENT_PATTERNS,
  VOLUME_TARGETS,
  REP_RANGES,
  SETS_PER_EXERCISE,
  COMPOUND_PATTERNS,
  READINESS_GATES,
  DEFAULT_PROGRESSION_TYPE,
  WORKOUT_DAY_LABELS,
  SPLIT_DAYS,
} from "./constants";
import {
  getAllExercises,
  getExercisesByPattern,
} from "@/lib/muscles/mapping";
import type { ExerciseLibrary, MuscleGroup, MovementPattern } from "@/lib/recovery/types";
import type {
  GeneratorInput,
  GeneratorOutput,
  GeneratedExercise,
  DifficultyTier,
  TrainingGoal,
  WorkoutDay,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCompound(pattern: MovementPattern): boolean {
  return COMPOUND_PATTERNS.has(pattern);
}

function exerciseFitsEquipment(
  exercise: ExerciseLibrary,
  available: string[]
): boolean {
  if (available.length === 0) return true; // no restriction
  if (exercise.equipment.includes("bodyweight")) return true;
  return exercise.equipment.some((eq) => available.includes(eq));
}

function exerciseTargetsAvailableMuscles(
  exercise: ExerciseLibrary,
  availableMuscles: MuscleGroup[]
): boolean {
  return exercise.primary_muscles.some((m) => availableMuscles.includes(m));
}

// Avoid two exercises with massive overlap in primary muscles
function hasRedundantOverlap(
  candidate: ExerciseLibrary,
  selected: ExerciseLibrary[]
): boolean {
  const candidatePrimaries = new Set(candidate.primary_muscles);
  for (const sel of selected) {
    const overlap = sel.primary_muscles.filter((m) => candidatePrimaries.has(m));
    if (
      overlap.length > 0 &&
      overlap.length === candidate.primary_muscles.length &&
      sel.movement_pattern === candidate.movement_pattern
    ) {
      return true; // same pattern + same primaries = redundant
    }
  }
  return false;
}

// Filter exercises within spinal/CNS load limits
function accumulatedSpinalLoad(selected: ExerciseLibrary[]): number {
  return selected.reduce(
    (sum, e) => sum + e.systemic_fatigue_factor * e.cns_fatigue_factor,
    0
  );
}

// ─── Core generator ───────────────────────────────────────────────────────────

export function generateWorkout(input: GeneratorInput): GeneratorOutput {
  const {
    training_level,
    goal,
    workout_day,
    equipment,
    available_muscles,
    systemic_readiness,
    split_type,
  } = input;

  const volumeConfig = VOLUME_TARGETS[training_level];

  // Determine readiness-adjusted exercise count
  let maxExercises = volumeConfig.total_exercises.max;
  if (systemic_readiness < READINESS_GATES.reduced_volume) {
    maxExercises = Math.max(volumeConfig.total_exercises.min, maxExercises - 2);
  }
  if (systemic_readiness < READINESS_GATES.minimal_workout) {
    maxExercises = 3;
  }

  const targetPatterns = DAY_MOVEMENT_PATTERNS[workout_day];
  const targetMuscles = DAY_TARGET_MUSCLES[workout_day];

  // Filter muscles by recovery threshold
  const trainableMuscles = available_muscles.filter((m) =>
    targetMuscles.includes(m)
  );
  const musclePool = trainableMuscles.length > 0 ? trainableMuscles : targetMuscles;

  const allExercises = getAllExercises();

  // Candidate pool: matching pattern, equipment, and muscle targets
  const candidates = allExercises.filter(
    (e) =>
      targetPatterns.includes(e.movement_pattern) &&
      exerciseFitsEquipment(e, equipment) &&
      exerciseTargetsAvailableMuscles(e, musclePool)
  );

  // Sort: compounds first (if config says so), then by hypertrophy weighting desc
  const sorted = [...candidates].sort((a, b) => {
    const aCompound = isCompound(a.movement_pattern) ? 1 : 0;
    const bCompound = isCompound(b.movement_pattern) ? 1 : 0;
    if (volumeConfig.compound_first && aCompound !== bCompound) {
      return bCompound - aCompound;
    }
    return b.hypertrophy_weighting - a.hypertrophy_weighting;
  });

  // Greedy selection: pick up to maxExercises avoiding redundancy and excessive CNS load
  const selected: ExerciseLibrary[] = [];
  const coveredPatterns = new Set<MovementPattern>();

  for (const candidate of sorted) {
    if (selected.length >= maxExercises) break;
    if (hasRedundantOverlap(candidate, selected)) continue;

    // Limit spinal + CNS load (no more than 3 heavy spinal loaders)
    const spinalLimit = training_level === "beginner" ? 1.5 : 2.5;
    if (accumulatedSpinalLoad([...selected, candidate]) > spinalLimit) continue;

    selected.push(candidate);
    coveredPatterns.add(candidate.movement_pattern);
  }

  // Ensure minimum exercises, but never exceed readiness-adjusted maxExercises
  const minTarget = Math.min(volumeConfig.total_exercises.min, maxExercises);
  if (selected.length < minTarget) {
    for (const candidate of sorted) {
      if (selected.length >= minTarget) break;
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
    }
  }

  // Build generated exercise list with sets/rep ranges
  const exercises: GeneratedExercise[] = selected.map((ex, idx) => {
    const compound = isCompound(ex.movement_pattern);
    const repConfig = REP_RANGES[goal][compound ? "compound" : "isolation"];
    const sets = SETS_PER_EXERCISE[training_level][compound ? "compound" : "isolation"];

    // Reduce sets/reps on low readiness days
    const adjustedSets =
      systemic_readiness < READINESS_GATES.reduced_volume
        ? Math.max(2, sets - 1)
        : sets;
    const adjustedRpe =
      systemic_readiness < READINESS_GATES.reduced_volume
        ? Math.min(repConfig.rpe, 7.0)
        : repConfig.rpe;

    return {
      exercise_id:      ex.id,
      exercise_name:    ex.name,
      order_index:      idx,
      target_sets:      adjustedSets,
      target_rep_min:   repConfig.min,
      target_rep_max:   repConfig.max,
      target_rpe:       adjustedRpe,
      rest_seconds:     repConfig.rest_seconds,
      progression_type: DEFAULT_PROGRESSION_TYPE[ex.movement_pattern],
    };
  });

  const totalSets = exercises.reduce((s, e) => s + e.target_sets, 0);
  const estimatedDuration = Math.round(
    exercises.reduce(
      (total, e) => total + e.target_sets * (45 + e.rest_seconds),
      0
    ) / 60
  );

  const actualTargetMuscles: MuscleGroup[] = Array.from(
    new Set(
      selected.flatMap((e) => e.primary_muscles)
    )
  );

  return {
    name:               WORKOUT_DAY_LABELS[workout_day],
    split_type,
    workout_day,
    estimated_duration: Math.max(20, estimatedDuration),
    difficulty_tier:    training_level,
    target_muscles:     actualTargetMuscles,
    exercises,
  };
}

// ─── Weekly schedule helper ───────────────────────────────────────────────────

/**
 * Returns the ordered workout days for a given split and days-per-week target.
 */
export function getWeekSchedule(
  split_type: import("./types").SplitType,
  days_per_week: number
): WorkoutDay[] {
  const available = SPLIT_DAYS[split_type];
  if (available.length === 0) return [];

  const schedule: WorkoutDay[] = [];
  for (let i = 0; i < days_per_week; i++) {
    schedule.push(available[i % available.length]);
  }
  return schedule;
}
