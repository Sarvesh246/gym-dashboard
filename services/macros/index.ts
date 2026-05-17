// Macro and nutrition target calculations (deterministic, no AI)

import {
  ActivityLevel,
  GoalStrategy,
  MacroAdherence,
  MacroTargets,
  DailyNutritionSummary,
  NutritionGoals,
  WeeklyNutritionAdherence,
} from "@/lib/nutrition/types";
import {
  ACTIVITY_MULTIPLIERS,
  MACRO_TARGETS_BY_GOAL,
  CALORIE_ADJUSTMENTS_BY_GOAL,
  CARB_VOLUME_SCALARS,
  HYDRATION_MULTIPLIER,
  MINIMUM_DAILY_FIBER,
  ADHERENCE_WEIGHTS,
  BMR_COEFFICIENTS,
  MACRO_CALORIES,
} from "@/lib/nutrition/constants";
import { calculateNutritionRecoveryModifier } from "@/lib/nutrition/adherence";

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor formula
 * @param weight_kg Weight in kilograms
 * @param height_cm Height in centimeters
 * @param age Age in years
 * @param sex "male" or "female"
 * @returns BMR in kcal
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: "male" | "female"
): number {
  const coeffs = BMR_COEFFICIENTS[sex];
  const bmr =
    weight_kg * coeffs.weight +
    height_cm * coeffs.height -
    age * 5 +
    coeffs.constant;
  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure
 * @param bmr Basal Metabolic Rate
 * @param activity_level Activity level multiplier
 * @returns TDEE in kcal
 */
export function calculateTDEE(bmr: number, activity_level: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate macro targets for a given strategy
 * @param weight_kg Bodyweight in kg
 * @param tdee Total Daily Energy Expenditure
 * @param strategy Goal strategy
 * @param training_volume Optional training volume modifier ("low" | "moderate" | "high")
 * @returns MacroTargets with protein, carbs, fat, and calories
 */
export function calculateMacroTargets(
  weight_kg: number,
  tdee: number,
  strategy: GoalStrategy,
  training_volume: "low" | "moderate" | "high" = "moderate"
): MacroTargets {
  // Get calorie target from strategy
  const calorie_adjustment = CALORIE_ADJUSTMENTS_BY_GOAL[strategy];
  const calorie_target = tdee + calorie_adjustment;

  // Get macro targets (g/kg) from strategy
  const macro_spec = MACRO_TARGETS_BY_GOAL[strategy];
  const protein_g = Math.round(weight_kg * macro_spec.protein_max);
  const fat_g = Math.round(weight_kg * macro_spec.fat_max);

  // Carbs: remainder of calories after protein and fat. Clamp to >=0 so
  // aggressive cuts with high protein never produce negative carb targets.
  const protein_calories = protein_g * MACRO_CALORIES.protein;
  const fat_calories = fat_g * MACRO_CALORIES.fat;
  const carb_calories = Math.max(0, calorie_target - protein_calories - fat_calories);
  let carbs_g = Math.round(carb_calories / MACRO_CALORIES.carbs);

  // Scale carbs based on training volume
  const carb_scalar = CARB_VOLUME_SCALARS[training_volume];
  carbs_g = Math.max(0, Math.round(carbs_g * carb_scalar));

  // Recalculate calories based on actual macro targets
  const actual_calories = Math.round(
    protein_g * MACRO_CALORIES.protein +
      carbs_g * MACRO_CALORIES.carbs +
      fat_g * MACRO_CALORIES.fat
  );

  return {
    protein_g,
    carbs_g,
    fat_g,
    calories: actual_calories,
    fiber_g: MINIMUM_DAILY_FIBER,
  };
}

/**
 * Adjust macros based on training volume
 * @param baseMacros Base macro targets
 * @param training_volume Training volume level
 * @returns Adjusted MacroTargets
 */
export function adjustMacrosForVolume(
  baseMacros: MacroTargets,
  training_volume: "low" | "moderate" | "high"
): MacroTargets {
  const scalar = CARB_VOLUME_SCALARS[training_volume];
  const adjusted_carbs = Math.round(baseMacros.carbs_g * scalar);
  const adjusted_calories = Math.round(
    baseMacros.protein_g * MACRO_CALORIES.protein +
      adjusted_carbs * MACRO_CALORIES.carbs +
      baseMacros.fat_g * MACRO_CALORIES.fat
  );

  return {
    ...baseMacros,
    carbs_g: adjusted_carbs,
    calories: adjusted_calories,
  };
}

/**
 * Calculate daily adherence to goals
 * @param summary Daily nutrition summary
 * @param goals User's nutrition goals
 * @returns MacroAdherence with per-macro and overall scores
 */
export function calculateDailyAdherence(
  summary: DailyNutritionSummary,
  goals: NutritionGoals
): MacroAdherence {
  // Calculate adherence as percentage of goal
  const protein_adherence = Math.min(100, Math.round((summary.protein_g / goals.protein_target) * 100));
  const calorie_adherence = Math.min(100, Math.round((summary.calories / goals.calorie_target) * 100));
  const carb_adherence = Math.min(100, Math.round((summary.carbs_g / goals.carb_target) * 100));
  const fat_adherence = Math.min(100, Math.round((summary.fat_g / goals.fat_target) * 100));

  // Overall score: weighted average
  const overall_score = Math.round(
    protein_adherence * ADHERENCE_WEIGHTS.protein +
      calorie_adherence * ADHERENCE_WEIGHTS.calories +
      carb_adherence * ADHERENCE_WEIGHTS.carbs +
      fat_adherence * ADHERENCE_WEIGHTS.fat
  );

  return {
    protein_adherence,
    carb_adherence,
    fat_adherence,
    calorie_adherence,
    overall_score,
  };
}

/**
 * Calculate 7-day rolling average adherence
 * @param summaries Daily summaries for past 7 days
 * @param goals User's nutrition goals
 * @returns WeeklyNutritionAdherence with rolling average and consistency
 */
export function calculateWeeklyAdherence(
  summaries: DailyNutritionSummary[],
  goals: NutritionGoals
): WeeklyNutritionAdherence {
  if (summaries.length === 0) {
    return {
      protein_adherence: 0,
      calorie_adherence: 0,
      overall_score: 0,
      consistency: 0,
    };
  }

  // Calculate adherence for each day
  const daily_adherences = summaries.map((s) => calculateDailyAdherence(s, goals));

  // Rolling 7-day average
  const protein_adherence = Math.round(
    daily_adherences.reduce((sum, a) => sum + a.protein_adherence, 0) / daily_adherences.length
  );
  const calorie_adherence = Math.round(
    daily_adherences.reduce((sum, a) => sum + a.calorie_adherence, 0) / daily_adherences.length
  );
  const overall_score = Math.round(
    daily_adherences.reduce((sum, a) => sum + a.overall_score, 0) / daily_adherences.length
  );

  // Consistency: measure day-to-day variance in overall scores
  const mean_score = overall_score;
  const variance = daily_adherences.reduce((sum, a) => {
    const diff = a.overall_score - mean_score;
    return sum + diff * diff;
  }, 0) / daily_adherences.length;
  const std_dev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - std_dev); // Higher is more consistent

  return {
    protein_adherence,
    calorie_adherence,
    overall_score,
    consistency: Math.round(consistency),
  };
}

/**
 * Determine if nutrition is sufficient (for recovery modifier).
 * Thin alias over the canonical implementation in lib/nutrition/adherence
 * so workout-finalize and readiness paths use identical logic.
 * @param weeklyAdherence 7-day adherence scores
 * @returns Recovery modifier (-10 to +5)
 */
export function calculateRecoveryModifier(weeklyAdherence: WeeklyNutritionAdherence): number {
  return calculateNutritionRecoveryModifier(weeklyAdherence);
}

/**
 * Calculate hydration target (in ml)
 * @param weight_kg Bodyweight in kg
 * @param activity_level Activity level (affects multiplier)
 * @returns Hydration target in ml
 */
export function calculateHydrationTarget(weight_kg: number, activity_level: ActivityLevel): number {
  const base = weight_kg * HYDRATION_MULTIPLIER;
  // High activity may benefit from +500ml extra
  const activity_bonus = activity_level === "very_active" || activity_level === "extremely_active" ? 500 : 0;
  return Math.round(base + activity_bonus + 1000); // 1000ml base + scaled + bonus
}
