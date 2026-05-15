// GET /api/nutrition/daily - Unified daily nutrition dashboard endpoint

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyNutritionLog,
  getDailyNutritionSummary,
  getUserNutritionGoals,
  updateDailySummary,
} from "@/services/nutrition";
import { getDailyHydrationTotal } from "@/services/hydration/core";
import { calculateDailyAdherence } from "@/lib/nutrition/adherence";
import { MealType } from "@/lib/nutrition/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const [logs, goals, hydration_ml] = await Promise.all([
      getDailyNutritionLog(user.id, date),
      getUserNutritionGoals(user.id),
      getDailyHydrationTotal(user.id, date),
    ]);

    if (!goals) {
      return NextResponse.json({ goals_set: false, date }, { status: 200 });
    }

    // Ensure summary is up-to-date
    let summary = await getDailyNutritionSummary(user.id, date);
    if (!summary && logs.length > 0) {
      summary = await updateDailySummary(user.id, date);
    }

    // Build empty summary if no logs yet
    const totals = summary ?? {
      id: "",
      user_id: user.id,
      date,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      hydration_ml: 0,
      adherence_score: 0,
      created_at: "",
      updated_at: "",
    };

    const adherence = calculateDailyAdherence(totals, goals);

    const remaining = {
      calories: Math.max(0, goals.calorie_target - totals.calories),
      protein_g: Math.max(0, goals.protein_target - totals.protein_g),
      carbs_g: Math.max(0, goals.carb_target - totals.carbs_g),
      fat_g: Math.max(0, goals.fat_target - totals.fat_g),
      hydration_ml: Math.max(0, (goals.hydration_target_ml ?? 2500) - hydration_ml),
    };

    // Group logs by meal
    const logs_by_meal: Record<MealType, typeof logs> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const log of logs) {
      if (logs_by_meal[log.meal_type]) {
        logs_by_meal[log.meal_type].push(log);
      }
    }

    return NextResponse.json({
      goals_set: true,
      date,
      goals,
      summary: totals,
      logs,
      logs_by_meal,
      hydration_ml,
      hydration_target_ml: goals.hydration_target_ml ?? 2500,
      adherence,
      remaining,
    });
  } catch (error) {
    console.error("GET /api/nutrition/daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
