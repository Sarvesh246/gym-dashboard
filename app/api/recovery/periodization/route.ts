import { createClient } from "@/lib/supabase/server";
import { getRecoverySnapshots } from "@/services/readiness";
import { getDeloadRecommendation } from "@/lib/recovery/periodization";
import { get7DayStrainAccumulation } from "@/services/recovery";
import { computeReadiness } from "@/services/readiness";
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

    const today = new Date().toISOString().split("T")[0];
    const last28Days = new Date();
    last28Days.setDate(last28Days.getDate() - 28);
    const last28DaysStr = last28Days.toISOString().split("T")[0];

    // Get readiness snapshot
    const readiness = await computeReadiness(user.id);

    // Get strain accumulation (7d and 28d)
    const strain7d = await get7DayStrainAccumulation(user.id);

    // For 28d, sum last 28 days of snapshots
    const snapshots28d = await getRecoverySnapshots(user.id, last28DaysStr, today);
    const strain28d = snapshots28d.reduce((sum, s) => sum + s.weekly_strain_accumulation, 0) / 4;  // divide by 4 weeks

    // Get recent snapshots for trend analysis
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysStr = last7Days.toISOString().split("T")[0];
    const snapshots7d = await getRecoverySnapshots(user.id, last7DaysStr, today);

    // Get deload recommendation
    const deloadRec = getDeloadRecommendation(strain7d, strain28d, readiness.readiness_score, snapshots7d, today);

    return NextResponse.json({
      deload_recommended: deloadRec.deload_recommended,
      deload_intensity_pct: deloadRec.deload_intensity_pct,
      start_date: deloadRec.start_date,
      duration_days: deloadRec.duration_days,
      rationale: deloadRec.rationale,
      pattern_detected: deloadRec.pattern_detected,
      days_recommended_rest_before_deload: deloadRec.days_recommended_rest_before_deload,
      current_readiness: readiness.readiness_score,
      weekly_strain_7d: Math.round(strain7d),
      weekly_strain_28d_avg: Math.round(strain28d),
    });
  } catch (error) {
    console.error("[GET /api/recovery/periodization] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
