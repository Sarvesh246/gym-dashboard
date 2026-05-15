// GET /api/nutrition/custom-foods - List user's custom foods
// POST /api/nutrition/custom-foods - Create a custom food

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await (supabase as any)
      .from("custom_foods")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
    return NextResponse.json({ foods: data ?? [] });
  } catch (error) {
    console.error("GET /api/nutrition/custom-foods error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      food_name,
      calories_per_serving,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      serving_size,
      serving_unit,
    } = body;

    if (!food_name || calories_per_serving == null) {
      return NextResponse.json({ error: "food_name and calories_per_serving required" }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from("custom_foods")
      .insert({
        user_id: user.id,
        food_name,
        calories_per_serving: Number(calories_per_serving) || 0,
        protein_g: Number(protein_g) || 0,
        carbs_g: Number(carbs_g) || 0,
        fat_g: Number(fat_g) || 0,
        fiber_g: Number(fiber_g) || 0,
        sugar_g: Number(sugar_g) || 0,
        sodium_mg: Number(sodium_mg) || 0,
        serving_size: Number(serving_size) || 100,
        serving_unit: serving_unit || "g",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create food" }, { status: 400 });
    return NextResponse.json({ food: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/nutrition/custom-foods error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
