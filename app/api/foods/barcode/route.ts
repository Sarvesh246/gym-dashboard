// POST /api/foods/barcode - Scan barcode and auto-log food

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/services/foods";
import { logFoodEntry, updateDailySummary } from "@/services/nutrition";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { barcode_string } = body;

    if (!barcode_string) {
      return NextResponse.json({ error: "Barcode string required" }, { status: 400 });
    }

    // Search USDA for the barcode (often stored as product name)
    // In a real app, you'd have a UPC database lookup, but USDA works for many products
    const { foods } = await searchFoods(barcode_string, 1);

    if (!foods || foods.length === 0) {
      return NextResponse.json(
        { error: "Food not found", query: barcode_string },
        { status: 404 }
      );
    }

    const food = foods[0];

    // Auto-log with default serving size
    const today = new Date().toISOString().split("T")[0];
    const log = await logFoodEntry(user.id, {
      logged_at: today,
      meal_type: "snack", // default to snack for quick scans
      food_name: food.description,
      serving_size: food.serving_size,
      serving_unit: food.serving_unit,
      calories: food.calories_per_serving,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g,
      source_type: "barcode",
      external_food_id: food.fdc_id,
    });

    if (!log) {
      return NextResponse.json({ error: "Failed to log food" }, { status: 400 });
    }

    // Update daily summary
    await updateDailySummary(user.id, today);

    return NextResponse.json(
      {
        success: true,
        food: log,
        message: `Logged ${food.description}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/foods/barcode error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
