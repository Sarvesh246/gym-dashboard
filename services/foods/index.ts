// Foods service: USDA API integration, search, and saved foods cache

import { createClient } from "@/lib/supabase/server";
import { USDAFood, SavedFood, SaveFoodInput } from "@/lib/nutrition/types";

// USDA FoodData Central API base URLs
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_FOOD_URL   = "https://api.nal.usda.gov/fdc/v1/food";
const USDA_API_KEY    = process.env.USDA_API_KEY ?? "DEMO_KEY";

// In-memory cache for USDA results (24h TTL)
const usda_cache: Map<string, { data: USDAFood[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search USDA FoodData Central API for foods
 * Results are cached in memory for 24 hours
 */
export async function searchFoods(query: string, limit: number = 20): Promise<{ foods: USDAFood[] }> {
  try {
    // Check memory cache first
    const cache_entry = usda_cache.get(query);
    if (cache_entry && Date.now() - cache_entry.timestamp < CACHE_TTL_MS) {
      return { foods: cache_entry.data };
    }

    // Call USDA API
    const url = new URL(USDA_SEARCH_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", Math.min(limit, 50).toString());
    url.searchParams.set("api_key", USDA_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[searchFoods] USDA API ${response.status}:`, await response.text().catch(() => ""));
      return { foods: [] };
    }

    const data = await response.json();
    const foods: USDAFood[] = (data.foods || [])
      .map((food: any) => {
        const nutrients = food.foodNutrients || [];
        const get_nutrient = (name: string, default_val = 0) => {
          const nutrient = nutrients.find(
            (n: any) => n.nutrientName?.toLowerCase().includes(name.toLowerCase())
          );
          return nutrient?.value || default_val;
        };

        return {
          fdc_id: food.fdcId,
          description: food.description,
          serving_size: food.servingSize || 100,
          serving_unit: food.servingSizeUnit || "g",
          calories_per_serving: get_nutrient("energy", 0),
          protein_g: get_nutrient("protein", 0),
          carbs_g: get_nutrient("carbohydrate", 0),
          fat_g: get_nutrient("total lipid", 0),
          fiber_g: get_nutrient("fiber", 0),
          sugar_g: get_nutrient("sugars", 0),
          sodium_mg: get_nutrient("sodium", 0),
        };
      })
      .filter((f: USDAFood) => f.fdc_id); // Remove any without FDC ID

    // Cache the results
    usda_cache.set(query, { data: foods, timestamp: Date.now() });

    return { foods };
  } catch {
    return { foods: [] };
  }
}

/**
 * Get full food details from USDA
 */
export async function getFoodDetails(fdcId: string): Promise<USDAFood | null> {
  try {
    const url = new URL(`${USDA_FOOD_URL}/${fdcId}`);
    url.searchParams.set("api_key", USDA_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const food = await response.json();
    const nutrients = food.foodNutrients || [];
    const get_nutrient = (name: string, default_val = 0) => {
      const nutrient = nutrients.find(
        (n: any) => n.nutrientName?.toLowerCase().includes(name.toLowerCase())
      );
      return nutrient?.value || default_val;
    };

    return {
      fdc_id: food.fdcId,
      description: food.description,
      serving_size: food.servingSize || 100,
      serving_unit: food.servingSizeUnit || "g",
      calories_per_serving: get_nutrient("energy", 0),
      protein_g: get_nutrient("protein", 0),
      carbs_g: get_nutrient("carbohydrate", 0),
      fat_g: get_nutrient("total lipid", 0),
      fiber_g: get_nutrient("fiber", 0),
      sugar_g: get_nutrient("sugars", 0),
      sodium_mg: get_nutrient("sodium", 0),
    };
  } catch {
    return null;
  }
}

/**
 * Get user's saved foods (favorites/recent)
 */
export async function getUserSavedFoods(userId: string): Promise<SavedFood[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("saved_foods")
      .select("*")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get user's recent foods (for quick-add)
 */
export async function getUserRecentFoods(userId: string, limit: number = 15): Promise<SavedFood[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("saved_foods")
      .select("*")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false, nullsLast: true })
      .limit(limit);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Save a food to user's saved foods
 */
export async function saveFood(userId: string, input: SaveFoodInput): Promise<SavedFood | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("saved_foods")
      .upsert(
        {
          user_id: userId,
          food_name: input.food_name,
          external_food_id: input.external_food_id || null,
          serving_defaults: input.serving_defaults,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,external_food_id" }
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
 * Delete a saved food
 */
export async function deleteSavedFood(userId: string, savedFoodId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("saved_foods")
      .delete()
      .eq("id", savedFoodId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Increment usage count for a saved food (call after logging)
 */
export async function incrementSavedFoodUsage(userId: string, savedFoodId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any)
      .from("saved_foods")
      .update({
        usage_count: { increment: 1 },
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", savedFoodId)
      .eq("user_id", userId);
  } catch {
    // Silent fail
  }
}

/**
 * Clear memory cache (for testing)
 */
export function clearFoodCache(): void {
  usda_cache.clear();
}
