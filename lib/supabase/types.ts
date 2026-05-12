export type Goal =
  | "aesthetics"
  | "fat_loss"
  | "muscle_gain"
  | "strength"
  | "hybrid";
export type Sex = "male" | "female" | "other";
export type TrainingLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "returning";
export type EquipmentAccess = "full_gym" | "home_gym" | "limited";
export type InjuryFlag =
  | "shoulders"
  | "knees"
  | "lower_back"
  | "wrists"
  | "none";
export type TriLevel = "low" | "medium" | "high";
export type SplitPreference =
  | "ppl"
  | "upper_lower"
  | "bro_split"
  | "full_body"
  | "custom";

export interface Profile {
  id: string;
  user_id: string;
  goal: Goal | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  training_level: TrainingLevel | null;
  workout_days_per_week: number | null;
  session_duration_minutes: number | null;
  preferred_days: string[] | null;
  equipment_access: EquipmentAccess | null;
  injury_flags: InjuryFlag[] | null;
  cardio_preference: TriLevel | null;
  split_preference: SplitPreference | null;
  sleep_quality: TriLevel | null;
  stress_level: TriLevel | null;
  onboarding_complete: boolean;
  onboarding_step_index: number;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">
>;

export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

// ─── Stage 3 recovery types ───────────────────────────────────────────────────

export type MuscleGroupDB =
  | "chest" | "upper_chest" | "front_delts" | "side_delts" | "rear_delts"
  | "triceps" | "biceps" | "forearms"
  | "upper_back" | "lats" | "traps" | "lower_back"
  | "core" | "glutes" | "quads" | "hamstrings" | "calves";

export type RecoveryTierDB = "green" | "yellow" | "orange" | "red";

export interface MuscleStateRow {
  id: string;
  user_id: string;
  muscle_group: MuscleGroupDB;
  recovery_score: number;
  fatigue_score: number;
  strain_score: number;
  soreness_score: number;
  readiness_modifier: number;
  last_trained_at: string | null;
  weekly_volume: number;
  weekly_frequency: number;
  hypertrophy_load: number;
  imbalance_flag: boolean;
  updated_at: string;
}

export interface SystemicRecoveryRow {
  id: string;
  user_id: string;
  readiness_score: number;
  systemic_fatigue: number;
  sleep_modifier: number;
  stress_modifier: number;
  hrv_modifier: number;
  strain_accumulation: number;
  recovery_trend: number;
  recovery_tier: RecoveryTierDB;
  updated_at: string;
}

export interface WorkoutStrainLogRow {
  id: string;
  user_id: string;
  workout_id: string;
  total_volume: number;
  estimated_strain: number;
  systemic_load: number;
  cns_load: number;
  local_muscle_loads: Record<string, number>;
  recovery_impact: number;
  created_at: string;
}

export interface ExerciseLibraryRow {
  id: string;
  name: string;
  equipment: string[];
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  fatigue_factor: number;
  hypertrophy_weighting: number;
  systemic_fatigue_factor: number;
  cns_fatigue_factor: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      muscle_states: {
        Row: MuscleStateRow;
        Insert: Omit<MuscleStateRow, "id" | "updated_at"> & { id?: string; updated_at?: string };
        Update: Partial<Omit<MuscleStateRow, "id" | "user_id">>;
        Relationships: [];
      };
      systemic_recovery: {
        Row: SystemicRecoveryRow;
        Insert: Omit<SystemicRecoveryRow, "id" | "updated_at"> & { id?: string; updated_at?: string };
        Update: Partial<Omit<SystemicRecoveryRow, "id" | "user_id">>;
        Relationships: [];
      };
      workout_strain_logs: {
        Row: WorkoutStrainLogRow;
        Insert: Omit<WorkoutStrainLogRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<WorkoutStrainLogRow, "id" | "user_id">>;
        Relationships: [];
      };
      exercise_library: {
        Row: ExerciseLibraryRow;
        Insert: ExerciseLibraryRow;
        Update: Partial<ExerciseLibraryRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
