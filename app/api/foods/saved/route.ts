// GET /api/foods/saved - Get user's saved foods
// POST /api/foods/saved - Save a food

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSavedFoods, saveFood } from "@/services/foods";
import { SaveFoodInput } from "@/lib/nutrition/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const foods = await getUserSavedFoods(user.id);
    return NextResponse.json({ foods });
  } catch (error) {
    console.error("GET /api/foods/saved error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: SaveFoodInput = await req.json();

    const saved = await saveFood(user.id, body);
    if (!saved) {
      return NextResponse.json({ error: "Failed to save food" }, { status: 400 });
    }

    return NextResponse.json({ food: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/foods/saved error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
