import { createClient } from "@/lib/supabase/server";
import { getRecoverySnapshots, getRecoverySnapshot } from "@/services/readiness";
import { calculateRecoveryTrend, detectRecoveryPatterns, predictRecoveryTimeline } from "@/lib/recovery/trends";
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
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today);

    if (range === "7d") {
      startDate.setDate(today.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(today.getDate() - 30);
    } else if (range === "90d") {
      startDate.setDate(today.getDate() - 90);
    } else if (range === "all") {
      startDate.setDate(today.getDate() - 365);  // 1 year fallback
    }

    const startDateStr = startDate.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // Fetch snapshots
    const snapshots = await getRecoverySnapshots(user.id, startDateStr, todayStr);

    if (snapshots.length === 0) {
      return NextResponse.json({
        snapshots: [],
        trends: null,
        patterns: [],
        baseline_readiness: null,
        estimated_recovery_time: null,
      });
    }

    // Analyze trends and patterns
    const trend = calculateRecoveryTrend(snapshots);
    const patterns = detectRecoveryPatterns(snapshots);
    const baselineReadiness = snapshots.reduce((sum, s) => sum + s.readiness_score, 0) / snapshots.length;
    const currentReadiness = snapshots[0].readiness_score;
    const estimatedRecoveryTime = predictRecoveryTimeline(currentReadiness, snapshots);

    return NextResponse.json({
      snapshots,
      trends: trend ? { ...trend } : null,
      patterns: patterns.map((p) => ({
        pattern: p.pattern,
        confidence: p.confidence,
        duration_days: p.duration_days,
      })),
      baseline_readiness: Math.round(baselineReadiness),
      estimated_recovery_time: currentReadiness >= 85 ? 0 : estimatedRecoveryTime,
    });
  } catch (error) {
    console.error("[GET /api/recovery/history] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
