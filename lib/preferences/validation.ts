// Validation schema and functions for user preferences

import {
  PROGRESSION_AGGRESSIVENESS_OPTIONS,
  TRAINING_BIAS_OPTIONS,
  WORKOUT_SPLIT_OPTIONS,
  TRAINING_INTENSITY_OPTIONS,
  RECOVERY_SENSITIVITY_OPTIONS,
  READINESS_STRICTNESS_OPTIONS,
  CALORIE_STRATEGY_OPTIONS,
  MACRO_STRATEGY_OPTIONS,
  MEAL_REMINDER_FREQUENCY_OPTIONS,
  NUTRITION_ADHERENCE_OPTIONS,
  NOTIFICATION_FREQUENCY_OPTIONS,
  THEME_OPTIONS,
  MEASUREMENT_SYSTEM_OPTIONS,
  DASHBOARD_LAYOUT_OPTIONS,
} from './defaults';

export type ValidationError = {
  field: string;
  message: string;
};

export function validateUserPreferences(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.theme && !THEME_OPTIONS.includes(data.theme)) {
    errors.push({ field: 'theme', message: `Invalid theme: ${data.theme}` });
  }

  if (data.measurement_system && !MEASUREMENT_SYSTEM_OPTIONS.includes(data.measurement_system)) {
    errors.push({ field: 'measurement_system', message: `Invalid measurement system` });
  }

  if (data.dashboard_layout && !DASHBOARD_LAYOUT_OPTIONS.includes(data.dashboard_layout)) {
    errors.push({ field: 'dashboard_layout', message: `Invalid dashboard layout` });
  }

  if (typeof data.reduced_motion !== 'undefined' && typeof data.reduced_motion !== 'boolean') {
    errors.push({ field: 'reduced_motion', message: 'Must be a boolean' });
  }

  return errors;
}

export function validateTrainingPreferences(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.progression_aggressiveness && !PROGRESSION_AGGRESSIVENESS_OPTIONS.includes(data.progression_aggressiveness)) {
    errors.push({ field: 'progression_aggressiveness', message: 'Invalid progression aggressiveness level' });
  }

  if (data.training_bias && !TRAINING_BIAS_OPTIONS.includes(data.training_bias)) {
    errors.push({ field: 'training_bias', message: 'Invalid training bias' });
  }

  if (data.workout_split && !WORKOUT_SPLIT_OPTIONS.includes(data.workout_split)) {
    errors.push({ field: 'workout_split', message: 'Invalid workout split' });
  }

  if (data.training_intensity_preference && !TRAINING_INTENSITY_OPTIONS.includes(data.training_intensity_preference)) {
    errors.push({ field: 'training_intensity_preference', message: 'Invalid training intensity' });
  }

  if (data.hypertrophy_emphasis !== undefined) {
    const val = Number(data.hypertrophy_emphasis);
    if (isNaN(val) || val < 0 || val > 1) {
      errors.push({ field: 'hypertrophy_emphasis', message: 'Must be between 0 and 1' });
    }
  }

  if (data.strength_emphasis !== undefined) {
    const val = Number(data.strength_emphasis);
    if (isNaN(val) || val < 0 || val > 1) {
      errors.push({ field: 'strength_emphasis', message: 'Must be between 0 and 1' });
    }
  }

  if (data.cardio_emphasis !== undefined) {
    const val = Number(data.cardio_emphasis);
    if (isNaN(val) || val < 0 || val > 1) {
      errors.push({ field: 'cardio_emphasis', message: 'Must be between 0 and 1' });
    }
  }

  if (data.session_duration_preference !== undefined) {
    const val = Number(data.session_duration_preference);
    if (isNaN(val) || val < 30 || val > 120) {
      errors.push({ field: 'session_duration_preference', message: 'Must be between 30 and 120 minutes' });
    }
  }

  if (data.fatigue_sensitivity !== undefined) {
    const val = Number(data.fatigue_sensitivity);
    if (isNaN(val) || val < 0.5 || val > 2.0) {
      errors.push({ field: 'fatigue_sensitivity', message: 'Must be between 0.5 and 2.0' });
    }
  }

  if (data.soreness_sensitivity !== undefined) {
    const val = Number(data.soreness_sensitivity);
    if (isNaN(val) || val < 0.5 || val > 2.0) {
      errors.push({ field: 'soreness_sensitivity', message: 'Must be between 0.5 and 2.0' });
    }
  }

  if (data.conservative_mode_enabled !== undefined && typeof data.conservative_mode_enabled !== 'boolean') {
    errors.push({ field: 'conservative_mode_enabled', message: 'Must be a boolean' });
  }

  if (data.deload_preference && !['auto', 'manual', 'conservative'].includes(data.deload_preference)) {
    errors.push({ field: 'deload_preference', message: 'Invalid deload preference' });
  }

  return errors;
}

export function validateRecoveryPreferences(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.recovery_sensitivity && !RECOVERY_SENSITIVITY_OPTIONS.includes(data.recovery_sensitivity)) {
    errors.push({ field: 'recovery_sensitivity', message: 'Invalid recovery sensitivity level' });
  }

  if (data.readiness_strictness && !READINESS_STRICTNESS_OPTIONS.includes(data.readiness_strictness)) {
    errors.push({ field: 'readiness_strictness', message: 'Invalid readiness strictness level' });
  }

  const validateWeight = (field: string, value: any) => {
    if (value !== undefined) {
      const val = Number(value);
      if (isNaN(val) || val < 0 || val > 1) {
        errors.push({ field, message: 'Weight must be between 0 and 1' });
      }
    }
  };

  validateWeight('sleep_weighting', data.sleep_weighting);
  validateWeight('soreness_weighting', data.soreness_weighting);
  validateWeight('hrv_weighting', data.hrv_weighting);

  if (data.athlete_mode !== undefined && typeof data.athlete_mode !== 'boolean') {
    errors.push({ field: 'athlete_mode', message: 'Must be a boolean' });
  }

  return errors;
}

export function validateNutritionPreferences(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.calorie_strategy && !CALORIE_STRATEGY_OPTIONS.includes(data.calorie_strategy)) {
    errors.push({ field: 'calorie_strategy', message: 'Invalid calorie strategy' });
  }

  if (data.macro_strategy && !MACRO_STRATEGY_OPTIONS.includes(data.macro_strategy)) {
    errors.push({ field: 'macro_strategy', message: 'Invalid macro strategy' });
  }

  if (data.hydration_target !== undefined) {
    const val = Number(data.hydration_target);
    if (isNaN(val) || val < 1000 || val > 5000) {
      errors.push({ field: 'hydration_target', message: 'Hydration target must be between 1000-5000ml' });
    }
  }

  if (data.meal_reminder_frequency && !MEAL_REMINDER_FREQUENCY_OPTIONS.includes(data.meal_reminder_frequency)) {
    errors.push({ field: 'meal_reminder_frequency', message: 'Invalid meal reminder frequency' });
  }

  if (data.nutrition_adherence_strictness && !NUTRITION_ADHERENCE_OPTIONS.includes(data.nutrition_adherence_strictness)) {
    errors.push({ field: 'nutrition_adherence_strictness', message: 'Invalid nutrition adherence strictness' });
  }

  return errors;
}

export function validateNotificationPreferences(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  const booleanFields = [
    'workout_reminders',
    'missed_workout_reminders',
    'hydration_reminders',
    'recovery_warnings',
    'nutrition_alerts',
    'weekly_report_notifications',
    'streak_milestones',
    'quiet_hours_enabled',
  ];

  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors.push({ field, message: 'Must be a boolean' });
    }
  }

  if (data.notification_frequency && !NOTIFICATION_FREQUENCY_OPTIONS.includes(data.notification_frequency)) {
    errors.push({ field: 'notification_frequency', message: 'Invalid notification frequency' });
  }

  const validateTime = (field: string, value: any) => {
    if (value !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(value)) {
        errors.push({ field, message: 'Invalid time format (HH:MM)' });
      }
    }
  };

  validateTime('quiet_hours_start', data.quiet_hours_start);
  validateTime('quiet_hours_end', data.quiet_hours_end);

  return errors;
}

export function validateAllPreferences(allData: any) {
  const errors = [
    ...validateUserPreferences(allData.user_preferences || {}),
    ...validateTrainingPreferences(allData.training_preferences || {}),
    ...validateRecoveryPreferences(allData.recovery_preferences || {}),
    ...validateNutritionPreferences(allData.nutrition_preferences || {}),
    ...validateNotificationPreferences(allData.notification_preferences || {}),
  ];

  return errors;
}
