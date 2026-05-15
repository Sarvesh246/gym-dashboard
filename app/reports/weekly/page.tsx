"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { WeeklyReport, StoredInsight } from "@/services/reports/weekly";

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? "text-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
      : score >= 60
      ? "text-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10"
      : "text-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10";
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${color}`}>
      <div className="text-2xl font-bold tabular-nums">{score}</div>
      <div className="text-xs mt-0.5 opacity-70 font-medium">{label}</div>
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: StoredInsight }) {
  const styles: Record<StoredInsight["type"], string> = {
    warning: "border-l-[color:var(--color-warning)] bg-[color:var(--color-warning)]/5",
    recommendation: "border-l-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5",
    observation: "border-l-[color:var(--color-muted-foreground)] bg-[color:var(--color-muted)]/40",
  };
  const labels: Record<StoredInsight["type"], string> = {
    warning: "Warning",
    recommendation: "Recommendation",
    observation: "Observation",
  };
  const priorityDot: Record<StoredInsight["priority"], string> = {
    high: "bg-[color:var(--color-destructive)]",
    medium: "bg-[color:var(--color-warning)]",
    low: "bg-[color:var(--color-muted-foreground)]",
  };

  return (
    <div className={`border-l-2 rounded-r-lg px-4 py-3 ${styles[insight.type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[insight.priority]}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {labels[insight.type]}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
    </div>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Sparkline chart ──────────────────────────────────────────────────────────

function TrendMini({
  data,
  color,
  label,
}: {
  data: { name: string; value: number }[];
  color: string;
  label: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">No data</div>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
      <ResponsiveContainer width="100%" height={64}>
        <LineChart data={data} margin={{ top: 2, right: 4, left: -24, bottom: 2 }}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "4px 8px" }}
            formatter={(v) => [typeof v === "number" ? v.toFixed(1) : v, label]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Deload urgency badge ──────────────────────────────────────────────────────

function DeloadBadge({ urgency }: { urgency: 0 | 1 | 2 | 3 }) {
  if (urgency === 0) return null;
  const config: Record<1 | 2 | 3, { label: string; cls: string }> = {
    1: { label: "Monitor fatigue", cls: "bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)]" },
    2: { label: "Deload suggested", cls: "bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]" },
    3: { label: "Deload strongly recommended", cls: "bg-[color:var(--color-destructive)] text-white" },
  };
  const { label, cls } = config[urgency as 1 | 2 | 3];
  return (
    <div className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-center ${cls}`}>
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeeklyReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = forceRefresh ? "/api/reports/weekly?refresh=true" : "/api/reports/weekly";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing your week…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">{error ?? "No report available"}</p>
          <button
            onClick={() => loadReport()}
            className="text-sm text-primary underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { analytics } = report;
  const readinessTrend = [
    { name: "14d", value: analytics.avgReadiness14d },
    { name: "7d", value: analytics.avgReadiness7d },
  ];

  const allInsights = [...report.insights, ...report.recommendations];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">Weekly Report</h1>
              <p className="text-xs text-muted-foreground">
                {report.periodStart} – {report.periodEnd}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadReport(true)}
            disabled={refreshing}
            className="text-xs text-primary disabled:opacity-40 font-medium"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-6">

        {/* AI Summary */}
        {report.summary && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coach Summary
              </span>
              {report.cached && (
                <span className="text-xs text-muted-foreground opacity-60">· cached</span>
              )}
              {!report.aiGenerated && (
                <span className="text-xs text-muted-foreground opacity-60">· deterministic</span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
          </div>
        )}

        {/* Deload urgency */}
        {analytics.deloadUrgency > 0 && (
          <DeloadBadge urgency={analytics.deloadUrgency as 0 | 1 | 2 | 3} />
        )}

        {/* Score grid */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Performance Scores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ScoreBadge score={analytics.compositeScore} label="Overall" />
            <ScoreBadge score={analytics.consistencyScore} label="Consistency" />
            <ScoreBadge score={analytics.recoveryScore} label="Recovery" />
            <ScoreBadge score={analytics.nutritionScore} label="Nutrition" />
          </div>
        </div>

        {/* Trend charts */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Trends
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TrendMini
              data={[
                { name: "14d avg", value: parseFloat(analytics.avgReadiness14d.toFixed(1)) },
                { name: "7d avg", value: parseFloat(analytics.avgReadiness7d.toFixed(1)) },
              ]}
              color="hsl(var(--color-primary))"
              label="Readiness"
            />
            <TrendMini
              data={[
                { name: "Prev", value: parseFloat(analytics.volumeTrend.previous.toFixed(0)) },
                { name: "Now", value: parseFloat(analytics.volumeTrend.current.toFixed(0)) },
              ]}
              color="hsl(var(--color-success))"
              label="Volume (sets)"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stats
            </span>
          </div>
          <div className="px-4">
            <StatRow
              label="Workout days"
              value={analytics.workoutDaysThisWeek}
              sub={`of ${Math.round(analytics.workoutConsistencyPct / 25)} target`}
            />
            <StatRow
              label="Avg readiness"
              value={`${Math.round(analytics.avgReadiness7d)}/100`}
            />
            <StatRow
              label="Avg sleep"
              value={
                analytics.avgSleepHours > 0
                  ? `${analytics.avgSleepHours.toFixed(1)} hrs`
                  : "No data"
              }
            />
            <StatRow label="Protein adherence" value={`${analytics.proteinAdherencePct}%`} />
            <StatRow label="Calorie adherence" value={`${analytics.calorieAdherencePct}%`} />
            {analytics.bodymassChangeLbs && (
              <StatRow label="Bodyweight change" value={analytics.bodymassChangeLbs} />
            )}
            {analytics.fatigueHotspots.length > 0 && (
              <StatRow
                label="Fatigue hotspots"
                value={analytics.fatigueHotspots.join(", ")}
              />
            )}
          </div>
        </div>

        {/* Volume direction */}
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Volume trend</span>
          <div className="flex items-center gap-2">
            <span
              className={
                analytics.volumeTrend.direction === "up"
                  ? "text-[color:var(--color-success)]"
                  : analytics.volumeTrend.direction === "down"
                  ? "text-[color:var(--color-destructive)]"
                  : "text-[color:var(--color-muted-foreground)]"
              }
            >
              {analytics.volumeTrend.direction === "up"
                ? "↑"
                : analytics.volumeTrend.direction === "down"
                ? "↓"
                : "→"}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {analytics.volumeTrend.deltaPct >= 0 ? "+" : ""}
              {analytics.volumeTrend.deltaPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Plateau flags */}
        {analytics.plateauFlags.length > 0 && (
          <div className="bg-[color:var(--color-destructive)]/5 border border-[color:var(--color-destructive)]/20 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-destructive)] mb-2">
              Plateaus Detected
            </p>
            {analytics.plateauFlags.map((flag) => (
              <p key={flag} className="text-sm text-foreground capitalize">
                {flag.replace(":", " — ").replace(/_/g, " ")}
              </p>
            ))}
          </div>
        )}

        {/* Imbalance flags */}
        {analytics.imbalanceFlags.length > 0 && (
          <div className="bg-[color:var(--color-warning)]/5 border border-[color:var(--color-warning)]/20 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-warning)] mb-2">
              Volume Imbalance
            </p>
            {analytics.imbalanceFlags.map((flag) => (
              <p key={flag} className="text-sm text-foreground capitalize">
                {flag.replace(/_/g, " → ")}
              </p>
            ))}
          </div>
        )}

        {/* Insights + Recommendations */}
        {allInsights.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Coaching Insights
            </h2>
            <div className="space-y-2">
              {allInsights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Footer metadata */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground opacity-50">
            Generated {new Date(report.generatedAt).toLocaleString()}
            {report.aiGenerated ? " · AI-enhanced" : " · Deterministic"}
          </p>
        </div>
      </div>
    </div>
  );
}
