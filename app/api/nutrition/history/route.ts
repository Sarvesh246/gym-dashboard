// GET /api/nutrition/history - Rolling nutrition history + adherence trends

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get7DayNutritionHistory, getUserNutritionGoals } from "@/services/nutrition";
import { get7DayHydrationHistory } from "@/services/hydration/core";
import { calculateWeeklyAdherence, calculateDailyAdherence } from "@/lib/nutrition/adherence";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [summaries, goals, hydration_history] = await Promise.all([
      get7DayNutritionHistory(user.id),
      getUserNutritionGoals(user.id),
      get7DayHydrationHistory(user.id),
    ]);

    if (!goals) {
      return NextResponse.json({ error: "Nutrition goals not set" }, { status: 404 });
    }

    const weekly_adherence = calculateWeeklyAdherence(summaries, goals);

    const daily_details = summaries.map((s) => ({
      ...s,
      adherence: calculateDailyAdherence(s, goals),
    }));

    return NextResponse.json({
      summaries: daily_details,
      goals,
      weekly_adherence,
      hydration_history,
    });
  } catch (error) {
    console.error("GET /api/nutrition/history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
