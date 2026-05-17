// Foods service: USDA + OpenFoodFacts integration, search, and saved foods cache

import { createClient } from "@/lib/supabase/server";
import { USDAFood, SavedFood, SaveFoodInput } from "@/lib/nutrition/types";

// USDA FoodData Central API base URLs
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_FOOD_URL   = "https://api.nal.usda.gov/fdc/v1/food";
const USDA_API_KEY    = process.env.USDA_API_KEY ?? "DEMO_KEY";

// OpenFoodFacts (no API key, indexed by UPC barcode and by name)
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const OFF_SEARCH_URL  = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_USER_AGENT  = "GymDashboard/1.0 (nutrition tracking)";

// In-memory cache for search results (24h TTL)
const search_cache: Map<string, { data: USDAFood[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const BARCODE_RE = /^\d{6,14}$/;

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

// Map an OpenFoodFacts product object into the USDAFood shape used by the UI.
function mapOFFProduct(p: any): USDAFood | null {
  if (!p) return null;
  const code = p.code || p.id;
  if (!code) return null;
  const n = p.nutriments || {};
  const description =
    p.product_name ||
    p.product_name_en ||
    p.generic_name ||
    p.brands ||
    `Product ${code}`;

  // OFF reports per-100g (kcal in "energy-kcal_100g"); use serving values when available.
  const serving_size = num(p.serving_quantity, 100);
  const serving_unit = (p.serving_size && /\b(g|ml|oz)\b/i.exec(p.serving_size)?.[0]) || "g";
  const cal_per_100 = num(n["energy-kcal_100g"] ?? n["energy-kcal"], 0);
  const factor = serving_size > 0 ? serving_size / 100 : 1;

  return {
    fdc_id: `off:${code}`,
    description,
    serving_size: serving_size || 100,
    serving_unit,
    calories_per_serving: num(n["energy-kcal_serving"], cal_per_100 * factor),
    protein_g: num(n["proteins_serving"], num(n["proteins_100g"]) * factor),
    carbs_g: num(n["carbohydrates_serving"], num(n["carbohydrates_100g"]) * factor),
    fat_g: num(n["fat_serving"], num(n["fat_100g"]) * factor),
    fiber_g: num(n["fiber_serving"], num(n["fiber_100g"]) * factor),
    sugar_g: num(n["sugars_serving"], num(n["sugars_100g"]) * factor),
    sodium_mg: num(n["sodium_serving"], num(n["sodium_100g"]) * factor) * 1000,
  };
}

/**
 * Look up a single product by UPC/EAN barcode using OpenFoodFacts.
 * USDA FoodData Central does not support barcode lookup, so this is the only
 * reliable path for packaged-goods scanning.
 */
export async function lookupBarcode(barcode: string): Promise<USDAFood | null> {
  const code = barcode.trim();
  if (!BARCODE_RE.test(code)) return null;

  try {
    const res = await fetch(`${OFF_PRODUCT_URL}/${encodeURIComponent(code)}.json`, {
      headers: { "User-Agent": OFF_USER_AGENT },
    });
    if (!res.ok) {
      console.error(`[lookupBarcode] OFF ${res.status} for ${code}`);
      return null;
    }
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return mapOFFProduct(data.product);
  } catch (err) {
    console.error("[lookupBarcode] error:", err);
    return null;
  }
}

async function searchUSDA(query: string, limit: number): Promise<USDAFood[]> {
  try {
    // USDA's GET endpoint currently returns an HTML 404 from the FDC website,
    // but the POST endpoint with the same key works — so use POST.
    const url = `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(USDA_API_KEY)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, pageSize: Math.min(limit, 50) }),
    });
    if (!response.ok) {
      console.error(`[searchFoods] USDA ${response.status}:`, await response.text().catch(() => ""));
      return [];
    }
    const data = await response.json();
    return (data.foods || [])
      .map((food: any) => {
        const nutrients = food.foodNutrients || [];
        const get_nutrient = (name: string, default_val = 0) => {
          const nutrient = nutrients.find(
            (nx: any) => nx.nutrientName?.toLowerCase().includes(name.toLowerCase())
          );
          return nutrient?.value || default_val;
        };
        return {
          fdc_id: String(food.fdcId),
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
        } as USDAFood;
      })
      .filter((f: USDAFood) => f.fdc_id);
  } catch (err) {
    console.error("[searchFoods] USDA exception:", err);
    return [];
  }
}

async function searchOFF(query: string, limit: number): Promise<USDAFood[]> {
  try {
    const url = new URL(OFF_SEARCH_URL);
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", String(Math.min(limit, 50)));
    url.searchParams.set("fields", "code,product_name,product_name_en,generic_name,brands,serving_size,serving_quantity,nutriments");

    const res = await fetch(url.toString(), { headers: { "User-Agent": OFF_USER_AGENT } });
    if (!res.ok) {
      console.error(`[searchFoods] OFF ${res.status}`);
      return [];
    }
    const data = await res.json();
    const products: any[] = data.products || [];
    return products
      .map(mapOFFProduct)
      .filter((f): f is USDAFood => !!f && f.calories_per_serving > 0);
  } catch (err) {
    console.error("[searchFoods] OFF exception:", err);
    return [];
  }
}

/**
 * Search for foods by name. Merges USDA FoodData Central + OpenFoodFacts so we
 * still return useful results when USDA is rate-limited (DEMO_KEY) or when the
 * query matches a packaged product better than a generic ingredient.
 * If the query is numeric and looks like a barcode, falls back to barcode lookup.
 */
export async function searchFoods(query: string, limit: number = 20): Promise<{ foods: USDAFood[] }> {
  const q = query.trim();
  if (!q) return { foods: [] };

  // Cache key includes limit so a small limit doesn't poison a larger one
  const cache_key = `${q.toLowerCase()}|${limit}`;
  const cached = search_cache.get(cache_key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { foods: cached.data };
  }

  // If the query looks like a barcode, try that first — gives an exact match.
  if (BARCODE_RE.test(q)) {
    const product = await lookupBarcode(q);
    if (product) {
      const result = [product];
      search_cache.set(cache_key, { data: result, timestamp: Date.now() });
      return { foods: result };
    }
  }

  const [usda, off] = await Promise.all([
    searchUSDA(q, limit),
    searchOFF(q, Math.max(5, Math.floor(limit / 2))),
  ]);

  // USDA first (more reliable nutrient data for generic ingredients),
  // OFF second (better for branded/packaged items), deduped by fdc_id.
  const seen = new Set<string>();
  const merged: USDAFood[] = [];
  for (const f of [...usda, ...off]) {
    if (seen.has(f.fdc_id)) continue;
    seen.add(f.fdc_id);
    merged.push(f);
    if (merged.length >= limit) break;
  }

  search_cache.set(cache_key, { data: merged, timestamp: Date.now() });
  return { foods: merged };
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
  search_cache.clear();
}
