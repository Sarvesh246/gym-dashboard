import { createClient } from "@/lib/supabase/server";
import {
  fetchReadinessSeries,
  fetchVolumeSeries,
  fetchWeightSeries,
  fetchSleepSeries,
  smoothSeries,
  daysAgo,
} from "@/services/trends/core";
import { rollingAverage } from "@/lib/analytics/trends";

const MAX_DAYS = 365;

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(MAX_DAYS, parseInt(url.searchParams.get("days") ?? "30", 10));
  const metrics = (url.searchParams.get("metrics") ?? "readiness,volume,weight,sleep").split(",");
  const smooth = url.searchParams.get("smooth") !== "false";

  const start = daysAgo(days);
  const end = new Date().toISOString().split("T")[0];

  try {
    const result: Record<string, unknown> = {};

    const fetches: Promise<void>[] = [];

    if (metrics.includes("readiness")) {
      fetches.push(
        fetchReadinessSeries(user.id, start, end).then((s) => {
          const series = smooth ? smoothSeries(s, 7) : s;
          result.readiness = {
            series,
            rollingAvg7: rollingAverage(s, 7),
            rollingAvg30: rollingAverage(s, 30),
          };
        })
      );
    }

    if (metrics.includes("volume")) {
      fetches.push(
        fetchVolumeSeries(user.id, start, end).then((s) => {
          result.volume = {
            series: s,
            total: s.reduce((a, p) => a + p.value, 0),
            rollingAvg7: rollingAverage(s, 7),
          };
        })
      );
    }

    if (metrics.includes("weight")) {
      fetches.push(
        fetchWeightSeries(user.id, start, end).then((s) => {
          const series = smooth ? smoothSeries(s, 5) : s;
          result.weight = {
            series,
            latest: s.at(-1)?.value ?? null,
            earliest: s.at(0)?.value ?? null,
          };
        })
      );
    }

    if (metrics.includes("sleep")) {
      fetches.push(
        fetchSleepSeries(user.id, start, end).then((s) => {
          result.sleep = {
            series: s,
            rollingAvg7: rollingAverage(s, 7),
          };
        })
      );
    }

    await Promise.all(fetches);

    return Response.json({ trends: result, start, end, days });
  } catch {
    return Response.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}
