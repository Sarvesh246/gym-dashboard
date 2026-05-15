// GET /api/hydration - Today's hydration total + logs
// POST /api/hydration - Log water intake
// DELETE /api/hydration/[id] - handled in [id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  logHydration,
  getDailyHydrationLogs,
  getDailyHydrationTotal,
} from "@/services/hydration/core";
import { getUserNutritionGoals } from "@/services/nutrition";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const [logs, total_ml, goals] = await Promise.all([
      getDailyHydrationLogs(user.id, date),
      getDailyHydrationTotal(user.id, date),
      getUserNutritionGoals(user.id),
    ]);

    const target_ml = goals?.hydration_target_ml ?? 2500;

    return NextResponse.json({
      date,
      logs,
      total_ml,
      target_ml,
      remaining_ml: Math.max(0, target_ml - total_ml),
      percentage: Math.min(100, Math.round((total_ml / target_ml) * 100)),
    });
  } catch (error) {
    console.error("GET /api/hydration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { amount_ml, logged_at } = body;

    if (!amount_ml || amount_ml <= 0) {
      return NextResponse.json({ error: "amount_ml must be a positive number" }, { status: 400 });
    }

    const log = await logHydration(user.id, amount_ml, logged_at);
    if (!log) {
      return NextResponse.json({ error: "Failed to log hydration" }, { status: 400 });
    }

    const date = (logged_at ?? new Date().toISOString()).split("T")[0];
    const [total_ml, goals] = await Promise.all([
      getDailyHydrationTotal(user.id, date),
      getUserNutritionGoals(user.id),
    ]);

    const target_ml = goals?.hydration_target_ml ?? 2500;

    return NextResponse.json(
      {
        log,
        total_ml,
        target_ml,
        remaining_ml: Math.max(0, target_ml - total_ml),
        percentage: Math.min(100, Math.round((total_ml / target_ml) * 100)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/hydration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
