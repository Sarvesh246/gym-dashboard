// Training personalization engine - applies user preferences to deterministic systems

import { PROGRESSION_MULTIPLIERS, RECOVERY_SENSITIVITY_MODIFIERS, TRAINING_BIAS_MULTIPLIERS } from '@/lib/preferences/defaults';

export interface PersonalizationModifiers {
  progression: {
    load_increase: number;
    threshold: number;
  };
  recovery: {
    readiness_drop: number;
    fatigue_accumulation: number;
  };
  training_bias: {
    hypertrophy: number;
    strength: number;
    cardio: number;
  };
}

/**
 * Calculate progression modifiers based on user's aggressiveness setting
 * These modify load increase amounts and progression thresholds
 */
export function getProgressionModifiers(
  aggressiveness: 'conservative' | 'balanced' | 'aggressive'
): PersonalizationModifiers['progression'] {
  return PROGRESSION_MULTIPLIERS[aggressiveness];
}

/**
 * Calculate recovery modifiers based on user's recovery sensitivity setting
 * These affect readiness drops and fatigue accumulation
 */
export function getRecoveryModifiers(
  sensitivity: 'low' | 'balanced' | 'high'
): PersonalizationModifiers['recovery'] {
  return RECOVERY_SENSITIVITY_MODIFIERS[sensitivity];
}

/**
 * Get training bias multipliers for volume allocation
 * Used to adjust recommended volume in each training modality
 */
export function getTrainingBiasMultipliers(
  bias: 'aesthetics' | 'strength' | 'endurance' | 'recovery' | 'balanced'
): PersonalizationModifiers['training_bias'] {
  return TRAINING_BIAS_MULTIPLIERS[bias];
}

/**
 * Calculate personalized load increase based on progression aggressiveness
 * Input: base load increase (e.g., 5.0 lbs)
 * Output: personalized load increase
 */
export function personalizeLoadIncrease(baseIncrease: number, aggressiveness: 'conservative' | 'balanced' | 'aggressive'): number {
  const multiplier = PROGRESSION_MULTIPLIERS[aggressiveness].load_increase;
  return baseIncrease * multiplier;
}

/**
 * Calculate personalized progression threshold
 * Used by deterministic system to decide when to increase load
 * Lower threshold = more aggressive progression
 */
export function personalizeProgressionThreshold(
  baseThreshold: number,
  aggressiveness: 'conservative' | 'balanced' | 'aggressive'
): number {
  const multiplier = PROGRESSION_MULTIPLIERS[aggressiveness].threshold;
  return baseThreshold * multiplier;
}

/**
 * Calculate readiness drop for a session based on recovery sensitivity
 * Higher sensitivity = larger drops in readiness
 */
export function personalizeReadinessDrop(
  baseReadinessDrop: number,
  sensitivity: 'low' | 'balanced' | 'high'
): number {
  const multiplier = RECOVERY_SENSITIVITY_MODIFIERS[sensitivity].readiness_drop;
  return baseReadinessDrop * multiplier;
}

/**
 * Calculate fatigue accumulation rate based on recovery sensitivity
 * Higher sensitivity = slower fatigue decay
 */
export function personalizeFatigueAccumulation(
  baseAccumulation: number,
  sensitivity: 'low' | 'balanced' | 'high'
): number {
  const multiplier = RECOVERY_SENSITIVITY_MODIFIERS[sensitivity].fatigue_accumulation;
  return baseAccumulation * multiplier;
}

/**
 * Personalize volume allocation based on training bias
 * Used to adjust recommended sets/reps in each modality
 */
export function personalizeVolumeAllocation(
  baseHypertrophy: number,
  baseStrength: number,
  baseCardio: number,
  bias: 'aesthetics' | 'strength' | 'endurance' | 'recovery' | 'balanced'
): {
  hypertrophy: number;
  strength: number;
  cardio: number;
} {
  const multipliers = TRAINING_BIAS_MULTIPLIERS[bias];
  return {
    hypertrophy: baseHypertrophy * multipliers.hypertrophy,
    strength: baseStrength * multipliers.strength,
    cardio: baseCardio * multipliers.cardio,
  };
}

/**
 * Get all modifiers at once for a given set of preferences
 */
export function getAllModifiers(
  progressionAggressiveness: 'conservative' | 'balanced' | 'aggressive',
  recoverySensitivity: 'low' | 'balanced' | 'high',
  trainingBias: 'aesthetics' | 'strength' | 'endurance' | 'recovery' | 'balanced'
): PersonalizationModifiers {
  return {
    progression: getProgressionModifiers(progressionAggressiveness),
    recovery: getRecoveryModifiers(recoverySensitivity),
    training_bias: getTrainingBiasMultipliers(trainingBias),
  };
}

/**
 * Apply all personalization to a training recommendation
 */
export function applyPersonalization(
  baseRecommendation: {
    loadIncrease: number;
    progressionThreshold: number;
    readinessDrop: number;
    baseVolume: { hypertrophy: number; strength: number; cardio: number };
  },
  progressionAggressiveness: 'conservative' | 'balanced' | 'aggressive',
  recoverySensitivity: 'low' | 'balanced' | 'high',
  trainingBias: 'aesthetics' | 'strength' | 'endurance' | 'recovery' | 'balanced'
) {
  const modifiers = getAllModifiers(progressionAggressiveness, recoverySensitivity, trainingBias);

  return {
    loadIncrease: baseRecommendation.loadIncrease * modifiers.progression.load_increase,
    progressionThreshold: baseRecommendation.progressionThreshold * modifiers.progression.threshold,
    readinessDrop: baseRecommendation.readinessDrop * modifiers.recovery.readiness_drop,
    volume: {
      hypertrophy: baseRecommendation.baseVolume.hypertrophy * modifiers.training_bias.hypertrophy,
      strength: baseRecommendation.baseVolume.strength * modifiers.training_bias.strength,
      cardio: baseRecommendation.baseVolume.cardio * modifiers.training_bias.cardio,
    },
  };
}
