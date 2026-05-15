// Nutrition adherence scoring — deterministic, pure functions

import { DailyNutritionSummary, NutritionGoals, MacroAdherence, WeeklyNutritionAdherence } from "./types";
import { ADHERENCE_WEIGHTS } from "./constants";

/**
 * Score a single macro as a percentage of goal.
 * Clamped 0–100; exceeding goal is not rewarded beyond 100.
 */
function scoreMacro(actual: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Calculate daily macro adherence against goals.
 * Returns per-macro percentages and a weighted overall score.
 */
export function calculateDailyAdherence(
  summary: Pick<DailyNutritionSummary, "calories" | "protein_g" | "carbs_g" | "fat_g">,
  goals: Pick<NutritionGoals, "calorie_target" | "protein_target" | "carb_target" | "fat_target">
): MacroAdherence {
  const protein_adherence = scoreMacro(summary.protein_g, goals.protein_target);
  const calorie_adherence = scoreMacro(summary.calories, goals.calorie_target);
  const carb_adherence = scoreMacro(summary.carbs_g, goals.carb_target);
  const fat_adherence = scoreMacro(summary.fat_g, goals.fat_target);

  const overall_score = Math.round(
    protein_adherence * ADHERENCE_WEIGHTS.protein +
    calorie_adherence * ADHERENCE_WEIGHTS.calories +
    carb_adherence * ADHERENCE_WEIGHTS.carbs +
    fat_adherence * ADHERENCE_WEIGHTS.fat
  );

  return { protein_adherence, calorie_adherence, carb_adherence, fat_adherence, overall_score };
}

/**
 * Calculate 7-day rolling average adherence and day-to-day consistency.
 */
export function calculateWeeklyAdherence(
  summaries: DailyNutritionSummary[],
  goals: NutritionGoals
): WeeklyNutritionAdherence {
  if (summaries.length === 0) {
    return { protein_adherence: 0, calorie_adherence: 0, overall_score: 0, consistency: 0 };
  }

  const daily = summaries.map((s) => calculateDailyAdherence(s, goals));
  const n = daily.length;

  const protein_adherence = Math.round(daily.reduce((s, a) => s + a.protein_adherence, 0) / n);
  const calorie_adherence = Math.round(daily.reduce((s, a) => s + a.calorie_adherence, 0) / n);
  const overall_score = Math.round(daily.reduce((s, a) => s + a.overall_score, 0) / n);

  const variance = daily.reduce((s, a) => {
    const diff = a.overall_score - overall_score;
    return s + diff * diff;
  }, 0) / n;
  const consistency = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  return { protein_adherence, calorie_adherence, overall_score, consistency };
}

/**
 * Calculate calorie adherence score (0-100).
 */
export function scoreCalorieAdherence(calories: number, target: number): number {
  return scoreMacro(calories, target);
}

/**
 * Calculate protein adherence score (0-100).
 */
export function scoreProteinAdherence(protein_g: number, target_g: number): number {
  return scoreMacro(protein_g, target_g);
}

/**
 * Calculate hydration adherence score (0-100).
 * Exceeding target by >50% is not rewarded.
 */
export function scoreHydrationAdherence(hydration_ml: number, target_ml: number): number {
  if (target_ml <= 0) return 100;
  const ratio = hydration_ml / target_ml;
  if (ratio >= 1.5) return 100;
  return Math.min(100, Math.round(ratio * 100));
}

/**
 * Nutrition recovery modifier (-10 to +5).
 * Determines how this week's nutrition affects readiness.
 */
export function calculateNutritionRecoveryModifier(
  adherence: WeeklyNutritionAdherence
): number {
  const { protein_adherence, calorie_adherence, overall_score } = adherence;

  if (calorie_adherence < 80) return -10; // under-eating — insufficient energy
  if (calorie_adherence > 130) return -3; // over-eating — sluggish
  if (protein_adherence < 80) return -5;  // low protein — impairs muscle repair

  if (overall_score > 90) return 5;       // excellent nutrition
  return 0;
}
