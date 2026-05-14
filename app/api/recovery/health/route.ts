import { createClient } from "@/lib/supabase/server";
import type { HealthMetricsInput } from "@/services/health";
import {
  getDailyHealthMetrics,
  logDailyHealthMetrics,
  computeNormalizedHealthScores,
} from "@/services/health";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const metrics = await getDailyHealthMetrics(user.id, date, supabase);

    if (!metrics) {
      return NextResponse.json(
        { message: "No metrics logged for this date", data: null },
        { status: 200 }
      );
    }

    const normalizedScores = computeNormalizedHealthScores(metrics as any);

    return NextResponse.json({
      metrics,
      normalized_scores: normalizedScores,
    });
  } catch (error) {
    console.error("[GET /api/recovery/health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: { date?: string; metrics: HealthMetricsInput } = await request.json();
    const date = body.date || new Date().toISOString().split("T")[0];

    const result = await logDailyHealthMetrics(user.id, date, body.metrics, supabase);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to save health metrics" },
        { status: 500 }
      );
    }

    const normalizedScores = computeNormalizedHealthScores(result as any);

    return NextResponse.json({
      success: true,
      metrics: result,
      normalized_scores: normalizedScores,
    });
  } catch (error) {
    console.error("[POST /api/recovery/health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
