"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecoverySnapshot } from "@/services/readiness";

interface TrendChartProps {
  snapshots: RecoverySnapshot[];
  title?: string;
  description?: string;
}

export function TrendChart({ snapshots, title = "Readiness Trend", description = "7-day readiness trajectory" }: TrendChartProps) {
  // Reverse snapshots for chronological order (oldest to newest)
  const data = [...snapshots].reverse().map((snapshot) => ({
    date: new Date(snapshot.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    readiness: snapshot.readiness_score,
    fatigue: snapshot.systemic_fatigue,
    tier: snapshot.recovery_tier,
  }));

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "green":
        return "#22C55E";
      case "yellow":
        return "#F59E0B";
      case "orange":
        return "#F97316";
      case "red":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const avgReadiness = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.readiness, 0) / data.length) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis domain={[0, 100]} className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
                formatter={(value, name) => {
                  if (name === "readiness") return [`${value}/100`, "Readiness"];
                  return [value, name];
                }}
              />
              <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={70} stroke="var(--muted-foreground)" strokeDasharray="3 3" opacity={0.5} />
              <Area type="monotone" dataKey="readiness" stroke="#8B5CF6" fill="url(#colorReadiness)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm border-t pt-4">
          <div>
            <p className="text-muted-foreground text-xs">Average</p>
            <p className="font-semibold">{avgReadiness}/100</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Peak</p>
            <p className="font-semibold">{Math.max(...data.map((d) => d.readiness))}/100</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Low</p>
            <p className="font-semibold">{Math.min(...data.map((d) => d.readiness))}/100</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
