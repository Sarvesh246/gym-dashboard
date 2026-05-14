// Nutrition service: goals, logs, summaries, and aggregations

import { createClient } from "@/lib/supabase/server";
import {
  NutritionGoals,
  NutritionLog,
  DailyNutritionSummary,
  CreateGoalsInput,
  LogFoodInput,
  ActivityLevel,
  GoalStrategy,
} from "@/lib/nutrition/types";
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  calculateDailyAdherence,
  calculateWeeklyAdherence,
  calculateHydrationTarget,
} from "@/services/macros";

/**
 * Get user's nutrition goals
 */
export async function getUserNutritionGoals(userId: string): Promise<NutritionGoals | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("nutrition_goals")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Create or update user's nutrition goals
 * Calculates targets based on profile and goal strategy
 */
export async function createNutritionGoals(
  userId: string,
  input: CreateGoalsInput,
  profile: { weight_kg: number; height_cm: number; age: number; sex: "male" | "female" }
): Promise<NutritionGoals | null> {
  try {
    const supabase = await createClient();

    // Calculate targets
    const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.sex);
    const activity_level = (input.activity_level || "moderate") as ActivityLevel;
    const tdee = calculateTDEE(bmr, activity_level);

    const calorie_target = input.calorie_override || tdee;
    const macros = calculateMacroTargets(profile.weight_kg, calorie_target, input.strategy, "moderate");
    const hydration_target = calculateHydrationTarget(profile.weight_kg, activity_level);

    // Upsert goals
    const { data, error } = await (supabase as any)
      .from("nutrition_goals")
      .upsert(
        {
          user_id: userId,
          calorie_target,
          protein_target: macros.protein_g,
          carb_target: macros.carbs_g,
          fat_target: macros.fat_g,
          fiber_target: macros.fiber_g,
          hydration_target_ml: hydration_target,
          goal_strategy: input.strategy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get all food entries for a specific date
 */
export async function getDailyNutritionLog(userId: string, date: string): Promise<NutritionLog[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("logged_at", date)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Log a single food entry
 */
export async function logFoodEntry(userId: string, entry: LogFoodInput): Promise<NutritionLog | null> {
  try {
    const supabase = await createClient();
    const logged_at = entry.logged_at || new Date().toISOString().split("T")[0];

    const { data, error } = await (supabase as any)
      .from("nutrition_logs")
      .insert({
        user_id: userId,
        logged_at,
        meal_type: entry.meal_type,
        food_name: entry.food_name,
        serving_size: entry.serving_size,
        serving_unit: entry.serving_unit,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        fiber_g: entry.fiber_g || null,
        sugar_g: entry.sugar_g || null,
        sodium_mg: entry.sodium_mg || null,
        hydration_ml: entry.hydration_ml || 0,
        source_type: entry.source_type || "custom",
        external_food_id: entry.external_food_id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Update a food entry
 */
export async function updateFoodEntry(
  userId: string,
  entryId: string,
  updates: Partial<NutritionLog>
): Promise<NutritionLog | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("nutrition_logs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Delete a food entry
 */
export async function deleteFoodEntry(userId: string, entryId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("nutrition_logs")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get daily summary with adherence score
 */
export async function getDailyNutritionSummary(
  userId: string,
  date: string
): Promise<DailyNutritionSummary | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("daily_nutrition_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get past 7 days of nutrition summaries
 */
export async function get7DayNutritionHistory(userId: string): Promise<DailyNutritionSummary[]> {
  try {
    const supabase = await createClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split("T")[0];

    const { data, error } = await (supabase as any)
      .from("daily_nutrition_summary")
      .select("*")
      .eq("user_id", userId)
      .gte("date", dateString)
      .order("date", { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Recalculate daily summary with adherence score
 * (Called after food entries change)
 */
export async function updateDailySummary(userId: string, date: string): Promise<DailyNutritionSummary | null> {
  try {
    const supabase = await createClient();

    // Get logs for the day
    const logs = await getDailyNutritionLog(userId, date);
    const goals = await getUserNutritionGoals(userId);
    if (!goals) return null;

    // Aggregate totals
    const calories = logs.reduce((sum, log) => sum + log.calories, 0);
    const protein_g = logs.reduce((sum, log) => sum + log.protein_g, 0);
    const carbs_g = logs.reduce((sum, log) => sum + log.carbs_g, 0);
    const fat_g = logs.reduce((sum, log) => sum + log.fat_g, 0);
    const fiber_g = logs.reduce((sum, log) => sum + (log.fiber_g || 0), 0);
    const hydration_ml = logs.reduce((sum, log) => sum + (log.hydration_ml || 0), 0);

    // Calculate adherence
    const summary_for_adherence: DailyNutritionSummary = {
      id: "",
      user_id: userId,
      date,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      hydration_ml,
      adherence_score: 0,
      created_at: "",
      updated_at: "",
    };
    const adherence = calculateDailyAdherence(summary_for_adherence, goals);

    // Upsert summary
    const { data, error } = await (supabase as any)
      .from("daily_nutrition_summary")
      .upsert(
        {
          user_id: userId,
          date,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          fiber_g,
          hydration_ml,
          adherence_score: adherence.overall_score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get weekly adherence stats
 */
export async function getWeeklyAdherenceStats(userId: string): Promise<{
  protein_adherence: number;
  calorie_adherence: number;
  overall_score: number;
  consistency: number;
} | null> {
  try {
    const summaries = await get7DayNutritionHistory(userId);
    const goals = await getUserNutritionGoals(userId);

    if (!goals || summaries.length === 0) return null;

    const adherence = calculateWeeklyAdherence(summaries, goals);
    return adherence;
  } catch {
    return null;
  }
}
