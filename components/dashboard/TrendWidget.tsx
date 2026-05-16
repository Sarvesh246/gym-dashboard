"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { CHART_COLORS, TOOLTIP_STYLE } from "@/lib/charts/config";

interface SparklinePoint {
  name: string;
  value: number;
}

interface TrendWidgetProps {
  title: string;
  metric: string;
  days?: number;
  color?: keyof typeof CHART_COLORS;
  unit?: string;
  reportHref?: string;
}

function directionStyle(first: number | null, last: number | null): string {
  if (first === null || last === null) return "text-muted-foreground";
  if (last > first * 1.02) return "text-[color:var(--color-success)]";
  if (last < first * 0.98) return "text-[color:var(--color-destructive)]";
  return "text-muted-foreground";
}

function arrow(first: number | null, last: number | null): string {
  if (first === null || last === null) return "→";
  if (last > first * 1.02) return "↑";
  if (last < first * 0.98) return "↓";
  return "→";
}

export function TrendWidget({
  title,
  metric,
  days = 14,
  color = "primary",
  unit = "",
  reportHref,
}: TrendWidgetProps) {
  const [data, setData] = useState<SparklinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/analytics/trends?metrics=${metric}&days=${days}&smooth=true`);
        if (!res.ok) return;
        const json = await res.json();
        const series: Array<{ date: string; value: number }> =
          json.trends?.[metric]?.series ?? [];
        if (!cancelled) {
          setData(
            series.map((p) => ({
              name: p.date.slice(5), // "MM-DD"
              value: parseFloat(p.value.toFixed(1)),
            }))
          );
        }
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [metric, days]);

  const first = data[0]?.value ?? null;
  const last = data[data.length - 1]?.value ?? null;
  const stroke = CHART_COLORS[color];

  const inner = (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {last !== null && (
          <span className={`text-xs font-semibold ${directionStyle(first, last)}`}>
            {arrow(first, last)} {last}{unit}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : data.length < 2 ? (
        <div className="h-12 flex items-center justify-center text-xs text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={48}>
          <LineChart data={data} margin={{ top: 2, right: 2, left: -40, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={1.5}
              dot={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid hsl(var(--color-border))", background: "hsl(var(--color-card))" }}
              itemStyle={{ color: "hsl(var(--color-foreground))" }}
              formatter={(v) => [`${v}${unit}`, title]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  if (reportHref) {
    return <Link href={reportHref} className="block">{inner}</Link>;
  }
  return inner;
}
