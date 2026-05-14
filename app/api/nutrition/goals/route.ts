// GET /api/nutrition/goals - Get user's nutrition goals
// PUT /api/nutrition/goals - Create/update nutrition goals

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserNutritionGoals, createNutritionGoals } from "@/services/nutrition";
import { CreateGoalsInput } from "@/lib/nutrition/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await getUserNutritionGoals(user.id);

    if (!goals) {
      return NextResponse.json({ error: "Goals not found" }, { status: 404 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("GET /api/nutrition/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: CreateGoalsInput = await req.json();

    // Get user profile for BMR calculation
    const { data: user_data } = await (supabase as any)
      .from("profiles")
      .select("weight_kg, height_cm, age, sex")
      .eq("user_id", user.id)
      .single();

    if (!user_data) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const goals = await createNutritionGoals(
      user.id,
      body,
      {
        weight_kg: user_data.weight_kg || 75,
        height_cm: user_data.height_cm || 180,
        age: user_data.age || 30,
        sex: (user_data.sex || "male") as "male" | "female",
      }
    );

    if (!goals) {
      return NextResponse.json({ error: "Failed to create goals" }, { status: 400 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("PUT /api/nutrition/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
