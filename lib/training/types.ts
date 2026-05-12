import type { MuscleGroup, MovementPattern } from "@/lib/recovery/types";

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type SplitType =
  | "push_pull_legs"
  | "upper_lower"
  | "full_body"
  | "bro_split"
  | "hybrid"
  | "custom";

export type WorkoutDay =
  | "push" | "pull" | "legs"
  | "upper" | "lower"
  | "chest_triceps" | "back_biceps" | "shoulders" | "legs_glutes"
  | "full_body_a" | "full_body_b" | "full_body_c"
  | "custom";

export type DifficultyTier = "beginner" | "intermediate" | "advanced";

export type ProgressionType =
  | "double_progression"   // increase reps first, then weight
  | "linear"               // add weight each session
  | "rpe_based";           // adjust based on RPE target

export type ProgressionTrend =
  | "progressing"
  | "stable"
  | "regressing"
  | "deloading";

export type TrainingGoal = "strength" | "hypertrophy" | "endurance" | "general_fitness";

// ─── DB row shapes ─────────────────────────────────────────────────────────────

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  split_type: SplitType;
  workout_day: WorkoutDay | null;
  estimated_duration: number;
  target_muscles: MuscleGroup[];
  difficulty_tier: DifficultyTier;
  generated_by_ai: boolean;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  target_rpe: number;
  rest_seconds: number;
  notes: string | null;
  progression_type: ProgressionType;
}

export interface LoggedWorkout {
  id: string;
  user_id: string;
  workout_id: string | null;
  performed_at: string;
  duration_minutes: number | null;
  workout_rating: number | null;   // 1–5
  soreness_rating: number | null;  // 1–5
  energy_rating: number | null;    // 1–5
  notes: string | null;
  created_at: string;
}

export interface LoggedSet {
  id: string;
  logged_workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;           // kg
  rpe: number | null;
  completed: boolean;
  failed: boolean;
  created_at: string;
}

export interface ExercisePerformanceHistory {
  id: string;
  user_id: string;
  exercise_id: string;
  best_weight: number;
  best_volume: number;
  estimated_1rm: number;
  rolling_volume_average: number;
  last_performed_at: string | null;
  progression_trend: ProgressionTrend;
  updated_at: string;
}

// ─── Rich / hydrated types (UI) ───────────────────────────────────────────────

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithMeta[];
}

export interface WorkoutExerciseWithMeta extends WorkoutExercise {
  exercise_name: string;
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  movement_pattern: MovementPattern;
  fatigue_factor: number;
  equipment: string[];
  performance?: ExercisePerformanceHistory | null;
}

// ─── Session state (client-side, not persisted in this shape) ─────────────────

export interface ActiveSetEntry {
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  completed: boolean;
  failed: boolean;
}

export interface ActiveExerciseState {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  target_rpe: number;
  rest_seconds: number;
  sets: ActiveSetEntry[];
  isExpanded: boolean;
  lastPerformance: ExercisePerformanceHistory | null;
}

export interface ActiveWorkoutSession {
  logged_workout_id: string;
  workout_id: string | null;
  workout_name: string;
  started_at: string;
  exercises: ActiveExerciseState[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  isComplete: boolean;
}

// ─── Workout generation ────────────────────────────────────────────────────────

export interface GeneratorInput {
  user_id: string;
  training_level: DifficultyTier;
  goal: TrainingGoal;
  split_type: SplitType;
  workout_day: WorkoutDay;
  equipment: string[];
  available_muscles: MuscleGroup[];          // muscles that are recovered enough to train
  systemic_readiness: number;                // 0–100
  days_per_week: number;
}

export interface GeneratorOutput {
  name: string;
  split_type: SplitType;
  workout_day: WorkoutDay;
  estimated_duration: number;
  difficulty_tier: DifficultyTier;
  target_muscles: MuscleGroup[];
  exercises: GeneratedExercise[];
}

export interface GeneratedExercise {
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  target_rpe: number;
  rest_seconds: number;
  progression_type: ProgressionType;
}

// ─── Progression ──────────────────────────────────────────────────────────────

export interface ProgressionInput {
  exercise_id: string;
  training_level: DifficultyTier;
  current_weight: number;           // kg
  target_rep_min: number;
  target_rep_max: number;
  target_rpe: number;
  sets_performed: {
    reps: number;
    rpe: number | null;
    failed: boolean;
  }[];
  readiness_score: number;          // 0–100
  systemic_fatigue: number;         // 0–100
  recent_soreness: number;          // 1–5 from post-workout
}

export interface ProgressionRecommendation {
  exercise_id: string;
  recommended_weight: number;
  weight_delta: number;             // positive = increase, negative = decrease
  rep_target_min: number;
  rep_target_max: number;
  rpe_target: number;
  rationale: string;
  action: "increase" | "maintain" | "reduce" | "deload";
}

// ─── Performance metrics ──────────────────────────────────────────────────────

export interface SessionVolumeMetrics {
  total_volume: number;             // sets × reps × weight
  total_sets: number;
  exercises_trained: number;
  estimated_duration_minutes: number;
  muscles_trained: MuscleGroup[];
}

export interface WeeklyVolumeMetrics {
  total_volume: number;
  total_sessions: number;
  avg_session_volume: number;
  muscles_trained: Partial<Record<MuscleGroup, number>>;  // muscle → sets
  training_frequency: number;
}
