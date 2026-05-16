import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestWearableMetrics } from "@/services/health/recovery-enhancement";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get latest wearable metrics
    const latest = await getLatestWearableMetrics(user.id);

    if (!latest) {
      return NextResponse.json(
        {
          metrics: null,
          message: "No wearable data available",
        },
        { status: 200 }
      );
    }

    // Optionally fetch historical data
    let historical = null;
    if (days > 0) {
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: histData } = await (supabase as any)
        .from("wearable_health_metrics")
        .select("*")
        .eq("user_id", user.id)
        .gte("metric_date", sinceDate)
        .order("metric_date", { ascending: false });

      if (histData && histData.length > 0) {
        historical = histData.map((row: Record<string, unknown>) => ({
          metric_date: row.metric_date,
          provider: row.provider,
          metrics: {
            sleep_duration: row.sleep_duration,
            sleep_quality: row.sleep_quality,
            hrv: row.hrv,
            resting_heart_rate: row.resting_heart_rate,
            stress_score: row.stress_score,
            daily_steps: row.daily_steps,
            active_calories: row.active_calories,
          },
        }));
      }
    }

    return NextResponse.json({
      latest: {
        metric_date: latest.metricDate,
        provider: latest.provider,
        metrics: latest.metrics,
      },
      historical,
    });
  } catch (err) {
    console.error("Error fetching wearable metrics:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
