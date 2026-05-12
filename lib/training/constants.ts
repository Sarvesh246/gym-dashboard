import type {
  SplitType,
  WorkoutDay,
  DifficultyTier,
  TrainingGoal,
  ProgressionType,
} from "./types";
import type { MuscleGroup, MovementPattern } from "@/lib/recovery/types";

// ─── Split definitions ────────────────────────────────────────────────────────

export const SPLIT_DAYS: Record<SplitType, WorkoutDay[]> = {
  push_pull_legs: ["push", "pull", "legs"],
  upper_lower:    ["upper", "lower"],
  full_body:      ["full_body_a", "full_body_b", "full_body_c"],
  bro_split:      ["chest_triceps", "back_biceps", "shoulders", "legs_glutes"],
  hybrid:         ["upper", "lower", "full_body_a"],
  custom:         ["custom"],
};

export const SPLIT_LABELS: Record<SplitType, string> = {
  push_pull_legs: "Push / Pull / Legs",
  upper_lower:    "Upper / Lower",
  full_body:      "Full Body",
  bro_split:      "Bro Split",
  hybrid:         "Hybrid",
  custom:         "Custom",
};

export const WORKOUT_DAY_LABELS: Record<WorkoutDay, string> = {
  push:           "Push Day",
  pull:           "Pull Day",
  legs:           "Leg Day",
  upper:          "Upper Body",
  lower:          "Lower Body",
  chest_triceps:  "Chest & Triceps",
  back_biceps:    "Back & Biceps",
  shoulders:      "Shoulders",
  legs_glutes:    "Legs & Glutes",
  full_body_a:    "Full Body A",
  full_body_b:    "Full Body B",
  full_body_c:    "Full Body C",
  custom:         "Custom",
};

// ─── Target muscles per workout day ──────────────────────────────────────────

export const DAY_TARGET_MUSCLES: Record<WorkoutDay, MuscleGroup[]> = {
  push:           ["chest", "upper_chest", "front_delts", "side_delts", "triceps"],
  pull:           ["lats", "upper_back", "rear_delts", "biceps", "traps"],
  legs:           ["quads", "hamstrings", "glutes", "calves"],
  upper:          ["chest", "upper_back", "lats", "front_delts", "side_delts", "biceps", "triceps"],
  lower:          ["quads", "hamstrings", "glutes", "calves", "core"],
  chest_triceps:  ["chest", "upper_chest", "triceps"],
  back_biceps:    ["lats", "upper_back", "rear_delts", "biceps"],
  shoulders:      ["front_delts", "side_delts", "rear_delts", "traps"],
  legs_glutes:    ["quads", "hamstrings", "glutes", "calves"],
  full_body_a:    ["chest", "lats", "quads", "glutes", "core"],
  full_body_b:    ["upper_back", "hamstrings", "front_delts", "biceps", "triceps"],
  full_body_c:    ["chest", "lats", "quads", "glutes", "side_delts", "core"],
  custom:         [],
};

// ─── Movement patterns per workout day ───────────────────────────────────────

export const DAY_MOVEMENT_PATTERNS: Record<WorkoutDay, MovementPattern[]> = {
  push:           ["horizontal_push", "vertical_push", "isolation_push"],
  pull:           ["horizontal_pull", "vertical_pull", "isolation_pull"],
  legs:           ["squat", "hinge", "isolation_push", "isolation_pull"],
  upper:          ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_push", "isolation_pull"],
  lower:          ["squat", "hinge", "isolation_push", "isolation_pull", "core"],
  chest_triceps:  ["horizontal_push", "isolation_push"],
  back_biceps:    ["horizontal_pull", "vertical_pull", "isolation_pull"],
  shoulders:      ["vertical_push", "isolation_push", "isolation_pull"],
  legs_glutes:    ["squat", "hinge", "isolation_push", "isolation_pull"],
  full_body_a:    ["horizontal_push", "vertical_pull", "squat", "core"],
  full_body_b:    ["horizontal_pull", "hinge", "vertical_push", "isolation_pull", "isolation_push"],
  full_body_c:    ["horizontal_push", "vertical_pull", "squat", "isolation_push", "core"],
  custom:         [],
};

// ─── Volume targets per training level + day type ────────────────────────────

export const VOLUME_TARGETS: Record<DifficultyTier, {
  sets_per_muscle_group: { min: number; max: number };
  total_exercises: { min: number; max: number };
  compound_first: boolean;
}> = {
  beginner: {
    sets_per_muscle_group: { min: 2, max: 3 },
    total_exercises: { min: 3, max: 5 },
    compound_first: true,
  },
  intermediate: {
    sets_per_muscle_group: { min: 3, max: 4 },
    total_exercises: { min: 4, max: 7 },
    compound_first: true,
  },
  advanced: {
    sets_per_muscle_group: { min: 4, max: 6 },
    total_exercises: { min: 5, max: 9 },
    compound_first: true,
  },
};

// ─── Rep ranges per goal + level ─────────────────────────────────────────────

export const REP_RANGES: Record<TrainingGoal, Record<"compound" | "isolation", {
  min: number;
  max: number;
  rpe: number;
  rest_seconds: number;
}>> = {
  strength: {
    compound:  { min: 3, max: 6,  rpe: 8.5, rest_seconds: 180 },
    isolation: { min: 8, max: 12, rpe: 7.5, rest_seconds: 90  },
  },
  hypertrophy: {
    compound:  { min: 6, max: 10, rpe: 7.5, rest_seconds: 120 },
    isolation: { min: 10, max: 15, rpe: 7.0, rest_seconds: 75  },
  },
  endurance: {
    compound:  { min: 12, max: 20, rpe: 6.5, rest_seconds: 60 },
    isolation: { min: 15, max: 25, rpe: 6.0, rest_seconds: 45 },
  },
  general_fitness: {
    compound:  { min: 8,  max: 12, rpe: 7.0, rest_seconds: 90 },
    isolation: { min: 10, max: 15, rpe: 6.5, rest_seconds: 60 },
  },
};

// ─── Sets per exercise per level ─────────────────────────────────────────────

export const SETS_PER_EXERCISE: Record<DifficultyTier, {
  compound: number;
  isolation: number;
}> = {
  beginner:     { compound: 3, isolation: 2 },
  intermediate: { compound: 4, isolation: 3 },
  advanced:     { compound: 4, isolation: 3 },
};

// ─── Progression rules ────────────────────────────────────────────────────────

export const PROGRESSION_THRESHOLDS = {
  // If user hit top of rep range with RPE ≤ this, increase weight
  easy_rpe_cutoff: 7.0,
  // If user hit top of rep range with RPE ≤ 8.0, increase reps next time (double progression)
  progress_rpe_cutoff: 8.0,
  // RPE ≥ this = too hard, maintain or reduce
  too_hard_rpe: 9.5,
  // Fraction of sets that must be completed to count as "performed"
  completion_ratio_min: 0.6,
};

// Weight increments (kg) by lift category
export const WEIGHT_INCREMENTS: Record<"lower_body" | "upper_compound" | "isolation", Record<DifficultyTier, number>> = {
  lower_body: {
    beginner:     2.5,
    intermediate: 2.5,
    advanced:     1.25,
  },
  upper_compound: {
    beginner:     2.5,
    intermediate: 2.5,
    advanced:     1.25,
  },
  isolation: {
    beginner:     1.25,
    intermediate: 1.25,
    advanced:     0.5,
  },
};

// High-CNS exercises (penalize fatigue more aggressively)
export const HIGH_CNS_EXERCISES = new Set([
  "barbell_back_squat",
  "front_squat",
  "conventional_deadlift",
  "overhead_press",
]);

// Compound movement patterns (non-isolation)
export const COMPOUND_PATTERNS = new Set<MovementPattern>([
  "horizontal_push",
  "horizontal_pull",
  "vertical_push",
  "vertical_pull",
  "squat",
  "hinge",
]);

// ─── Readiness thresholds for generation ──────────────────────────────────────

export const READINESS_GATES = {
  full_workout:    70,   // ≥ 70 → generate as planned
  reduced_volume:  45,   // 45–69 → reduce total exercises by 1
  minimal_workout: 30,   // 30–44 → only 2-3 compounds, low sets
  rest_day:         0,   // < 30 → recommend rest (still generate if forced)
};

// ─── Estimated 1RM formula (Epley) ───────────────────────────────────────────

// 1RM = weight × (1 + reps / 30)
export const EPLEY_CONSTANT = 30;

// ─── Recovery score required to train a muscle ───────────────────────────────

export const MIN_MUSCLE_RECOVERY_TO_TRAIN = 45; // below this = skip muscle if possible

// ─── Default progression type per movement ───────────────────────────────────

export const DEFAULT_PROGRESSION_TYPE: Record<MovementPattern, ProgressionType> = {
  horizontal_push: "double_progression",
  horizontal_pull: "double_progression",
  vertical_push:   "double_progression",
  vertical_pull:   "double_progression",
  squat:           "linear",
  hinge:           "linear",
  carry:           "linear",
  isolation_push:  "double_progression",
  isolation_pull:  "double_progression",
  core:            "double_progression",
  cardio:          "rpe_based",
};
