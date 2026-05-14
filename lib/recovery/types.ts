export type MuscleGroup =
  | "chest"
  | "upper_chest"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "triceps"
  | "biceps"
  | "forearms"
  | "upper_back"
  | "lats"
  | "traps"
  | "lower_back"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type RecoveryTier = "green" | "yellow" | "orange" | "red";

export type TrainingRecommendation =
  | "full_intensity"
  | "moderate_intensity"
  | "reduced_volume"
  | "active_recovery"
  | "rest";

export type MovementPattern =
  | "horizontal_push"
  | "horizontal_pull"
  | "vertical_push"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "carry"
  | "isolation_push"
  | "isolation_pull"
  | "core"
  | "cardio";

// Database row types

export interface MuscleState {
  id: string;
  user_id: string;
  muscle_group: MuscleGroup;
  recovery_score: number;      // 0–100, higher = more recovered
  fatigue_score: number;       // 0–100, higher = more fatigued
  strain_score: number;        // 0–100, last session strain contribution
  soreness_score: number;      // 0–100, subjective proxy derived from strain + time
  readiness_modifier: number;  // −1.0 to +1.0
  last_trained_at: string | null;
  weekly_volume: number;       // total working sets in last 7 days
  weekly_frequency: number;    // training sessions in last 7 days
  hypertrophy_load: number;    // accumulated mechanical tension score
  imbalance_flag: boolean;
  updated_at: string;
}

export interface SystemicRecovery {
  id: string;
  user_id: string;
  readiness_score: number;     // 0–100
  systemic_fatigue: number;    // 0–100
  sleep_modifier: number;      // −20 to +20
  stress_modifier: number;     // −20 to +20
  hrv_modifier: number;        // −20 to +20
  strain_accumulation: number; // rolling 7-day strain
  recovery_trend: number;      // −10 to +10
  recovery_tier: RecoveryTier;
  nutrient_modifier?: number;  // −10 to +5 (from nutrition adherence)
  updated_at: string;
}

export interface WorkoutStrainLog {
  id: string;
  user_id: string;
  workout_id: string;
  total_volume: number;
  estimated_strain: number;
  systemic_load: number;
  cns_load: number;
  local_muscle_loads: Partial<Record<MuscleGroup, number>>;
  recovery_impact: number;
  created_at: string;
}

export interface ExerciseLibrary {
  id: string;
  name: string;
  equipment: string[];
  movement_pattern: MovementPattern;
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  fatigue_factor: number;           // 0.0–1.0
  hypertrophy_weighting: number;    // 0.0–1.0
  systemic_fatigue_factor: number;  // 0.0–1.0
  cns_fatigue_factor: number;       // 0.0–1.0
}

// Calculation input/output types

export interface WorkoutSet {
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number;
  rpe?: number; // 1–10, defaults to 7 if omitted
}

export interface StrainInput {
  sets: WorkoutSet[];
  training_level: "beginner" | "intermediate" | "advanced" | "returning";
  duration_minutes: number;
}

export interface StrainOutput {
  estimated_strain: number;
  systemic_load: number;
  cns_load: number;
  local_muscle_loads: Partial<Record<MuscleGroup, number>>;
  recovery_impact: number;
  total_volume: number;
}

export interface MuscleRecoveryInput {
  muscle_group: MuscleGroup;
  hours_since_trained: number;   // 0 = just trained
  last_strain_score: number;     // 0–100
  weekly_frequency: number;      // sessions in last 7 days
  sleep_quality_score: number;   // 0–100
  systemic_fatigue: number;      // 0–100
  training_level: "beginner" | "intermediate" | "advanced" | "returning";
}

export interface ReadinessInput {
  systemic_fatigue: number;          // 0–100
  sleep_quality_score: number;       // 0–100
  stress_score: number;              // 0–100 (higher = more stressed)
  hrv_score: number;                 // 0–100 normalized
  strain_accumulation: number;       // 7-day accumulated strain (raw sum)
  avg_muscle_recovery: number;       // average recovery score across all muscles
  consecutive_training_days: number;
}

export interface ReadinessOutput {
  readiness_score: number;
  tier: RecoveryTier;
  training_recommendation: TrainingRecommendation;
  recommendations: RecoveryRecommendation[];
  suppression_factors: string[];
}

export interface RecoveryRecommendation {
  message: string;
  type: "positive" | "info" | "caution" | "warning";
  priority: number; // 1 (highest) to 5 (lowest)
}

// Body map data for frontend visualization
export interface BodyMapMuscleData {
  // Current state (with time-decay applied)
  recovery_score: number;
  fatigue_score: number;
  strain_score: number;
  soreness_score: number;
  tier: RecoveryTier;
  // Raw scores (from last workout, no decay)
  raw_recovery_score?: number;
  raw_fatigue_score?: number;
  raw_strain_score?: number;
  // Training metadata
  last_trained_at: string | null;
  weekly_volume: number;
  weekly_frequency: number;
  hypertrophy_load?: number;
}

export type BodyMapData = Partial<Record<MuscleGroup, BodyMapMuscleData>>;

// Aggregated dashboard payload
export interface RecoveryDashboardData {
  systemic: SystemicRecovery | null;
  muscle_states: MuscleState[];
  body_map: BodyMapData;
  readiness: ReadinessOutput;
  last_computed_at: string;
}
