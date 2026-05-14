// GET /api/nutrition/logs - Get daily nutrition log with summary
// POST /api/nutrition/logs - Log a food entry

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyNutritionLog,
  logFoodEntry,
  getDailyNutritionSummary,
  updateDailySummary,
} from "@/services/nutrition";
import { incrementSavedFoodUsage } from "@/services/foods";
import { LogFoodInput } from "@/lib/nutrition/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get date from query params, default to today
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Fetch logs and summary for the date
    const logs = await getDailyNutritionLog(user.id, date);
    const summary = await getDailyNutritionSummary(user.id, date);

    return NextResponse.json({ logs, summary });
  } catch (error) {
    console.error("GET /api/nutrition/logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: LogFoodInput & { saved_food_id?: string } = await req.json();

    // Log the food entry
    const log = await logFoodEntry(user.id, body);
    if (!log) {
      return NextResponse.json({ error: "Failed to log food" }, { status: 400 });
    }

    // Update daily summary (trigger will also fire in DB)
    const logged_at = body.logged_at || new Date().toISOString().split("T")[0];
    await updateDailySummary(user.id, logged_at);

    // If this food was from saved foods, increment its usage count
    if (body.saved_food_id) {
      await incrementSavedFoodUsage(user.id, body.saved_food_id);
    }

    // Fetch updated summary
    const summary = await getDailyNutritionSummary(user.id, logged_at);

    return NextResponse.json({ log, summary }, { status: 201 });
  } catch (error) {
    console.error("POST /api/nutrition/logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
