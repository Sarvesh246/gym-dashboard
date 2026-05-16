// Default settings and configurations for all preference categories

export const DEFAULT_USER_PREFERENCES = {
  theme: 'system' as const,
  reduced_motion: false,
  measurement_system: 'imperial' as const,
  dashboard_layout: 'standard' as const,
  dashboard_cards: [],
  notification_preferences: {
    workout_reminders: true,
    nutrition_reminders: false,
    recovery_warnings: true,
    weekly_reports: true,
    hydration_reminders: false,
    streak_reminders: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  },
};

export const DEFAULT_TRAINING_PREFERENCES = {
  progression_aggressiveness: 'balanced' as const,
  training_bias: 'balanced' as const,
  hypertrophy_emphasis: 0.33,
  strength_emphasis: 0.33,
  cardio_emphasis: 0.34,
  workout_split: 'push_pull_legs' as const,
  session_duration_preference: 60,
  training_intensity_preference: 'balanced' as const,
  conservative_mode_enabled: false,
  fatigue_sensitivity: 1.0,
  soreness_sensitivity: 1.0,
  deload_preference: 'auto' as const,
};

export const DEFAULT_RECOVERY_PREFERENCES = {
  recovery_sensitivity: 'balanced' as const,
  sleep_weighting: 0.35,
  soreness_weighting: 0.35,
  hrv_weighting: 0.3,
  readiness_strictness: 'balanced' as const,
  athlete_mode: false,
};

export const DEFAULT_NUTRITION_PREFERENCES = {
  calorie_strategy: 'maintenance' as const,
  macro_strategy: 'balanced' as const,
  hydration_target: 3000,
  meal_reminder_frequency: 'thrice_daily' as const,
  nutrition_adherence_strictness: 'flexible' as const,
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  workout_reminders: true,
  missed_workout_reminders: true,
  hydration_reminders: false,
  recovery_warnings: true,
  nutrition_alerts: false,
  weekly_report_notifications: true,
  streak_milestones: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  notification_frequency: 'normal' as const,
};

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
export const MEASUREMENT_SYSTEM_OPTIONS = ['metric', 'imperial'] as const;
export const DASHBOARD_LAYOUT_OPTIONS = ['standard', 'compact', 'expanded'] as const;

export const PROGRESSION_AGGRESSIVENESS_OPTIONS = ['conservative', 'balanced', 'aggressive'] as const;
export const TRAINING_BIAS_OPTIONS = ['aesthetics', 'strength', 'endurance', 'recovery', 'balanced'] as const;
export const WORKOUT_SPLIT_OPTIONS = ['push_pull_legs', 'upper_lower', 'full_body', 'balanced'] as const;
export const TRAINING_INTENSITY_OPTIONS = ['light', 'balanced', 'intense'] as const;

export const RECOVERY_SENSITIVITY_OPTIONS = ['low', 'balanced', 'high'] as const;
export const READINESS_STRICTNESS_OPTIONS = ['lenient', 'balanced', 'strict'] as const;

export const CALORIE_STRATEGY_OPTIONS = ['deficit', 'maintenance', 'surplus'] as const;
export const MACRO_STRATEGY_OPTIONS = ['high_protein', 'low_carb', 'balanced', 'keto'] as const;
export const MEAL_REMINDER_FREQUENCY_OPTIONS = ['none', 'once_daily', 'twice_daily', 'thrice_daily'] as const;
export const NUTRITION_ADHERENCE_OPTIONS = ['flexible', 'balanced', 'strict'] as const;

export const NOTIFICATION_FREQUENCY_OPTIONS = ['minimal', 'normal', 'frequent'] as const;

export const WEARABLE_PROVIDERS = ['garmin', 'apple_health', 'fitbit', 'polar', 'wahoo'] as const;
export const WEARABLE_PROVIDER_NAMES: Record<typeof WEARABLE_PROVIDERS[number], string> = {
  garmin: 'Garmin Connect',
  apple_health: 'Apple Health',
  fitbit: 'Fitbit',
  polar: 'Polar',
  wahoo: 'Wahoo',
};

// Progression aggressiveness modifiers for deterministic engines
export const PROGRESSION_MULTIPLIERS = {
  conservative: { load_increase: 0.75, threshold: 1.25 },
  balanced: { load_increase: 1.0, threshold: 1.0 },
  aggressive: { load_increase: 1.3, threshold: 0.8 },
} as const;

// Recovery sensitivity modifiers
export const RECOVERY_SENSITIVITY_MODIFIERS = {
  low: { readiness_drop: 0.7, fatigue_accumulation: 0.8 },
  balanced: { readiness_drop: 1.0, fatigue_accumulation: 1.0 },
  high: { readiness_drop: 1.3, fatigue_accumulation: 1.2 },
} as const;

// Training bias multipliers for volume allocation
export const TRAINING_BIAS_MULTIPLIERS = {
  aesthetics: { hypertrophy: 1.4, strength: 0.8, cardio: 0.8 },
  strength: { hypertrophy: 0.9, strength: 1.5, cardio: 0.6 },
  endurance: { hypertrophy: 0.6, strength: 0.8, cardio: 1.6 },
  recovery: { hypertrophy: 0.85, strength: 0.85, cardio: 1.2 },
  balanced: { hypertrophy: 1.0, strength: 1.0, cardio: 1.0 },
} as const;

// Export data type options
export const EXPORT_DATA_TYPES = {
  workouts: 'Workout History',
  nutrition: 'Nutrition History',
  recovery: 'Recovery Data',
  body_metrics: 'Body Measurements',
  analytics: 'Analytics Summary',
} as const;

// Export format options
export const EXPORT_FORMAT_OPTIONS = ['json', 'csv'] as const;
