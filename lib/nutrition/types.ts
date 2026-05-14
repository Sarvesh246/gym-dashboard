// Nutrition domain types

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalStrategy = "maintenance" | "lean_bulk" | "aggressive_bulk" | "slow_cut" | "aggressive_cut" | "recomp";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "extremely_active";
export type FoodSource = "usda" | "custom" | "barcode";

// ===== Database Row Types =====

export interface NutritionGoals {
  id: string;
  user_id: string;
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  fiber_target?: number;
  hydration_target_ml?: number;
  goal_strategy: GoalStrategy;
  created_at: string;
  updated_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string; // ISO date YYYY-MM-DD
  meal_type: MealType;
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  hydration_ml?: number; // water intake in ml
  source_type?: FoodSource;
  external_food_id?: string; // USDA FDC ID
  created_at: string;
  updated_at: string;
}

export interface DailyNutritionSummary {
  id: string;
  user_id: string;
  date: string; // ISO date YYYY-MM-DD
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  hydration_ml: number;
  adherence_score: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface SavedFood {
  id: string;
  user_id: string;
  food_name: string;
  external_food_id?: string; // USDA FDC ID
  serving_defaults?: {
    size: number;
    unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

// ===== API/Calculation Types =====

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  fiber_g?: number;
}

export interface MacroAdherence {
  protein_adherence: number; // 0-100, % of goal
  carb_adherence: number;
  fat_adherence: number;
  calorie_adherence: number;
  overall_score: number; // weighted average, 0-100
}

export interface WeeklyNutritionAdherence {
  protein_adherence: number;
  calorie_adherence: number;
  overall_score: number;
  consistency: number; // day-to-day variance
}

export interface USDAFood {
  fdc_id: string;
  description: string;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

// ===== Request/Response Types =====

export interface CreateGoalsInput {
  strategy: GoalStrategy;
  activity_level?: ActivityLevel;
  calorie_override?: number;
}

export interface LogFoodInput {
  logged_at?: string; // defaults to today
  meal_type: MealType;
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  hydration_ml?: number; // water intake in ml
  source_type?: FoodSource;
  external_food_id?: string;
}

export interface SaveFoodInput {
  food_name: string;
  external_food_id?: string;
  serving_defaults: {
    size: number;
    unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

// ===== UI State Types =====

export interface ActiveMealEntry {
  food_name: string;
  external_food_id?: string;
  serving_size: number;
  serving_unit: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailyNutritionUI {
  date: string;
  summary: DailyNutritionSummary;
  goals: NutritionGoals;
  logs: NutritionLog[];
  logs_by_meal: Record<MealType, NutritionLog[]>;
  adherence: MacroAdherence;
}
