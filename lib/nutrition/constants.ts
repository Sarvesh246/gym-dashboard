// Nutrition constants, formulas, and configuration

import { ActivityLevel, GoalStrategy } from "./types";

// Activity level multipliers for TDEE calculation
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

// Macro targets by goal strategy (in grams per kg bodyweight)
export const MACRO_TARGETS_BY_GOAL: Record<GoalStrategy, {
  protein_min: number;
  protein_max: number;
  fat_min: number;
  fat_max: number;
}> = {
  maintenance: {
    protein_min: 1.6,
    protein_max: 1.8,
    fat_min: 0.8,
    fat_max: 1.0,
  },
  lean_bulk: {
    protein_min: 1.8,
    protein_max: 2.0,
    fat_min: 0.9,
    fat_max: 1.1,
  },
  aggressive_bulk: {
    protein_min: 1.8,
    protein_max: 2.0,
    fat_min: 1.0,
    fat_max: 1.2,
  },
  slow_cut: {
    protein_min: 1.8,
    protein_max: 2.0,
    fat_min: 0.8,
    fat_max: 1.0,
  },
  aggressive_cut: {
    protein_min: 2.0,
    protein_max: 2.2,
    fat_min: 0.8,
    fat_max: 1.0,
  },
  recomp: {
    protein_min: 1.9,
    protein_max: 2.1,
    fat_min: 0.9,
    fat_max: 1.1,
  },
};

// Calorie adjustments from TDEE by goal strategy
export const CALORIE_ADJUSTMENTS_BY_GOAL: Record<GoalStrategy, number> = {
  maintenance: 0,
  lean_bulk: 300,
  aggressive_bulk: 500,
  slow_cut: -300,
  aggressive_cut: -500,
  recomp: 0, // no adjustment; dynamically adjusted based on weight trends
};

// Carb scaling by training volume
export const CARB_VOLUME_SCALARS: Record<"low" | "moderate" | "high", number> = {
  low: 0.85,
  moderate: 1.0,
  high: 1.15,
};

// Hydration target multiplier (ml per kg bodyweight)
export const HYDRATION_MULTIPLIER = 35; // 35 ml/kg + base 1000ml

// Minimum daily fiber (g)
export const MINIMUM_DAILY_FIBER = 25;

// Adherence tolerance (±%)
export const ADHERENCE_TOLERANCE = 0.1; // ±10%

// Adherence score weights
export const ADHERENCE_WEIGHTS = {
  protein: 0.35,
  calories: 0.35,
  carbs: 0.2,
  fat: 0.1,
};

// Consistency score: acceptable daily variance in adherence
export const CONSISTENCY_THRESHOLD = 0.15; // 15% variance = good consistency

// Mifflin-St Jeor BMR formula coefficients
export const BMR_COEFFICIENTS = {
  male: { weight: 10, height: 6.25, age: -5, constant: 5 },
  female: { weight: 10, height: 6.25, age: -5, constant: -161 },
};

// Recovery modifier ranges
export const RECOVERY_NUTRITION_MODIFIERS = {
  low_protein: -5, // protein < 80% of target
  under_eating: -10, // calories < 80% of target
  over_eating: -3, // calories > 130% of target
  excellent_nutrition: 5, // adherence > 90%
};

// Serving unit conversions (to grams where applicable)
export const SERVING_CONVERSIONS: Record<string, number | null> = {
  g: 1,
  oz: 28.35,
  cup: 240, // generic cup; specific foods may vary
  tbsp: 15,
  tsp: 5,
  ml: 1, // for liquids, often 1:1 with grams
  unit: null, // cannot convert "units" to grams without food-specific data
};

// Common serving unit abbreviations
export const SERVING_UNIT_ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  ounce: "oz",
  ounces: "oz",
  cup: "cup",
  cups: "cup",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  milliliter: "ml",
  milliliters: "ml",
};

// Macro caloric values (kcal per gram)
export const MACRO_CALORIES = {
  protein: 4,
  carbs: 4,
  fat: 9,
  fiber: 2, // net carbs subtract fiber
};

// Reasonable ranges for daily macros (used for validation)
export const MACRO_RANGES = {
  min_protein_percentage: 0.2, // 20% of calories
  max_protein_percentage: 0.4, // 40% of calories
  min_fat_percentage: 0.15, // 15% of calories
  max_fat_percentage: 0.4, // 40% of calories
  min_carb_percentage: 0.15, // 15% of calories
  max_carb_percentage: 0.65, // 65% of calories
};
