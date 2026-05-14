// GET /api/nutrition/summary - Get nutrition summary and adherence

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyNutritionSummary, get7DayNutritionHistory, getUserNutritionGoals, getWeeklyAdherenceStats } from "@/services/nutrition";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date");
    const days = searchParams.get("days");

    // Get goals
    const goals = await getUserNutritionGoals(user.id);
    if (!goals) {
      return NextResponse.json({ error: "Nutrition goals not set" }, { status: 404 });
    }

    // If specific date requested
    if (date) {
      const summary = await getDailyNutritionSummary(user.id, date);
      if (!summary) {
        return NextResponse.json({ error: "No data for this date" }, { status: 404 });
      }
      return NextResponse.json({ summary, goals });
    }

    // If range requested (default: last 7 days)
    const summaries = await get7DayNutritionHistory(user.id);
    const adherence = await getWeeklyAdherenceStats(user.id);

    return NextResponse.json({ summaries, goals, adherence });
  } catch (error) {
    console.error("GET /api/nutrition/summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
