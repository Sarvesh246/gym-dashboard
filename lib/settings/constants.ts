// Settings and preferences constants

export const SENSITIVITY_THRESHOLDS = {
  progression: {
    conservative: 0.75,
    balanced: 1.0,
    aggressive: 1.3,
  },
  recovery: {
    low: 0.7,
    balanced: 1.0,
    high: 1.3,
  },
  fatigue: {
    low: 0.5,
    balanced: 1.0,
    high: 2.0,
  },
  soreness: {
    low: 0.5,
    balanced: 1.0,
    high: 2.0,
  },
} as const;

export const PROGRESSION_PROFILES = {
  conservative: {
    label: 'Conservative',
    description: 'Slower progression, lower injury risk',
    load_increase: 2.5,
    threshold_multiplier: 1.25,
    recommended_for: 'Recovery priority, beginners',
  },
  balanced: {
    label: 'Balanced',
    description: 'Steady progression, sustainable',
    load_increase: 5.0,
    threshold_multiplier: 1.0,
    recommended_for: 'Most users',
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Fast progression, requires good recovery',
    load_increase: 6.5,
    threshold_multiplier: 0.8,
    recommended_for: 'Advanced athletes',
  },
} as const;

export const TRAINING_FOCUS_PROFILES = {
  aesthetics: {
    label: 'Aesthetics',
    description: 'Maximize muscle size and definition',
    hypertrophy: 1.4,
    strength: 0.8,
    cardio: 0.8,
    rep_range: '8-12',
  },
  strength: {
    label: 'Strength',
    description: 'Build maximum strength and power',
    hypertrophy: 0.9,
    strength: 1.5,
    cardio: 0.6,
    rep_range: '3-6',
  },
  endurance: {
    label: 'Endurance',
    description: 'Build cardiovascular fitness',
    hypertrophy: 0.6,
    strength: 0.8,
    cardio: 1.6,
    rep_range: '12-20',
  },
  recovery: {
    label: 'Recovery Priority',
    description: 'Balanced approach with recovery focus',
    hypertrophy: 0.85,
    strength: 0.85,
    cardio: 1.2,
    rep_range: '8-12',
  },
  balanced: {
    label: 'Balanced',
    description: 'Equal emphasis on all qualities',
    hypertrophy: 1.0,
    strength: 1.0,
    cardio: 1.0,
    rep_range: '6-12',
  },
} as const;

export const RECOVERY_MODES = {
  low: {
    label: 'Low Sensitivity',
    description: 'Fewer readiness adjustments, push harder',
    readiness_drop_per_session: 5,
    fatigue_decay_rate: 1.2,
    recommended_for: 'Experienced athletes, high recovery capacity',
  },
  balanced: {
    label: 'Balanced',
    description: 'Standard readiness adjustments',
    readiness_drop_per_session: 10,
    fatigue_decay_rate: 1.0,
    recommended_for: 'Most users',
  },
  high: {
    label: 'High Sensitivity',
    description: 'More cautious readiness, emphasize recovery',
    readiness_drop_per_session: 15,
    fatigue_decay_rate: 0.8,
    recommended_for: 'Recovery priority, overtraining prevention',
  },
} as const;

export const WORKOUT_SPLIT_PROFILES = {
  push_pull_legs: {
    label: 'Push / Pull / Legs',
    description: 'Classic 3-day split',
    days_per_week: 3,
    ideal_frequency: 1,
    best_for: 'Balanced muscle development',
  },
  upper_lower: {
    label: 'Upper / Lower',
    description: 'Balanced 4-day split',
    days_per_week: 4,
    ideal_frequency: 2,
    best_for: 'Strength and hypertrophy',
  },
  full_body: {
    label: 'Full Body',
    description: 'Compound-focused full body sessions',
    days_per_week: 3,
    ideal_frequency: 3,
    best_for: 'Efficiency and consistency',
  },
  balanced: {
    label: 'Balanced',
    description: 'Auto-adjusted based on recovery',
    days_per_week: 'flexible',
    ideal_frequency: 'adaptive',
    best_for: 'Personalization',
  },
} as const;

export const NUTRITION_STRATEGIES = {
  deficit: {
    label: 'Calorie Deficit',
    description: 'Fat loss priority',
    deficit_range: '300-500',
    macro_adjustment: 'maintain_protein_increase_deficit',
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Maintain current weight',
    deficit_range: '0',
    macro_adjustment: 'balanced',
  },
  surplus: {
    label: 'Calorie Surplus',
    description: 'Muscle gain priority',
    surplus_range: '300-500',
    macro_adjustment: 'increase_protein_increase_carbs',
  },
} as const;

export const MACRO_STRATEGIES = {
  high_protein: {
    label: 'High Protein',
    protein: 0.5,
    carbs: 0.3,
    fat: 0.2,
    best_for: 'Muscle building',
  },
  low_carb: {
    label: 'Low Carb',
    protein: 0.4,
    carbs: 0.2,
    fat: 0.4,
    best_for: 'Fat loss',
  },
  balanced: {
    label: 'Balanced',
    protein: 0.3,
    carbs: 0.4,
    fat: 0.3,
    best_for: 'General fitness',
  },
  keto: {
    label: 'Ketogenic',
    protein: 0.3,
    carbs: 0.05,
    fat: 0.65,
    best_for: 'Advanced users, fat loss',
  },
} as const;

export const NOTIFICATION_QUIET_HOURS_DEFAULTS = {
  start: '22:00',
  end: '08:00',
  duration_hours: 10,
} as const;

export const EXPORT_BATCH_SIZE = 1000;
export const EXPORT_RETENTION_DAYS = 7;

export const SETTING_CATEGORIES = [
  'appearance',
  'preferences',
  'training',
  'progression',
  'recovery',
  'nutrition',
  'notifications',
  'wearables',
  'data',
] as const;

export const SETTING_SECTION_ORDER = [
  'Appearance',
  'Training Personalization',
  'Progression Settings',
  'Recovery Settings',
  'Nutrition Settings',
  'Notifications',
  'Wearables',
  'Data & Privacy',
] as const;
