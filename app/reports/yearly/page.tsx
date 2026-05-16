"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { YearlyReport } from "@/services/reports/yearly";
import type { StoredInsight } from "@/services/reports/weekly";
import { formatDeltaPct } from "@/lib/reports/formatting";
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, GRID_STYLE, CHART_COLORS } from "@/lib/charts/config";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
      {delta && <div className="text-xs text-muted-foreground mt-0.5">{delta}</div>}
    </div>
  );
}

function InsightCard({ insight }: { insight: StoredInsight }) {
  const styles: Record<StoredInsight["type"], string> = {
    warning: "border-l-[color:var(--color-warning)] bg-[color:var(--color-warning)]/5",
    recommendation: "border-l-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5",
    observation: "border-l-[color:var(--color-muted-foreground)] bg-[color:var(--color-muted)]/40",
  };
  const dots: Record<StoredInsight["priority"], string> = {
    high: "bg-[color:var(--color-destructive)]",
    medium: "bg-[color:var(--color-warning)]",
    low: "bg-[color:var(--color-muted-foreground)]",
  };
  const typeLabel: Record<StoredInsight["type"], string> = {
    warning: "Warning",
    recommendation: "Recommendation",
    observation: "Observation",
  };
  return (
    <div className={`border-l-2 rounded-r-lg px-4 py-3 ${styles[insight.type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[insight.priority]}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {typeLabel[insight.type]}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
    </div>
  );
}

function MilestoneRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-base shrink-0 mt-0.5">🏆</span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium">{value}</p>
      </div>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      <div className="px-2 py-4">{children}</div>
    </div>
  );
}

function DeltaBadge({ deltaPct, direction }: { deltaPct: number; direction: "up" | "down" | "flat" }) {
  if (direction === "flat") return null;
  const positive = direction === "up";
  return (
    <span className={`text-xs font-medium ml-2 ${positive ? "text-[color:var(--color-success)]" : "text-[color:var(--color-destructive)]"}`}>
      {formatDeltaPct(deltaPct)} YoY
    </span>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function YearlyReportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const year = parseInt(params.get("year") ?? String(new Date().getFullYear()), 10);

  const [report, setReport] = useState<YearlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = `/api/reports/yearly?year=${year}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing {year}…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">{error ?? "No report available"}</p>
          <button onClick={() => load()} className="text-sm text-primary underline">Try again</button>
        </div>
      </div>
    );
  }

  const allInsights = [...report.insights, ...report.recommendations];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground text-xl">←</button>
            <div>
              <h1 className="text-base font-semibold text-foreground">{year} Year in Review</h1>
              <p className="text-xs text-muted-foreground">Long-term performance analysis</p>
            </div>
          </div>
          <button
            onClick={() => load(true)}
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
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year in Review</span>
              {!report.aiGenerated && <span className="text-xs text-muted-foreground opacity-60">· deterministic</span>}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
          </motion.div>
        )}

        {/* Summary cards */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.05 }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Year Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Total Workouts"
              value={String(report.totalWorkouts)}
              delta={
                report.vsLastYear?.workouts.isSignificant
                  ? `${formatDeltaPct(report.vsLastYear.workouts.deltaPct)} vs ${year - 1}`
                  : undefined
              }
            />
            <SummaryCard
              label="Avg Readiness"
              value={`${Math.round(report.avgReadiness)}/100`}
              delta={
                report.vsLastYear?.readiness.isSignificant
                  ? `${formatDeltaPct(report.vsLastYear.readiness.deltaPct)} vs ${year - 1}`
                  : undefined
              }
            />
            <SummaryCard
              label="Avg Sleep"
              value={report.avgSleepHours > 0 ? `${report.avgSleepHours.toFixed(1)} hrs` : "—"}
            />
            <SummaryCard
              label="Calorie Adherence"
              value={`${report.avgCalorieAdherencePct}%`}
            />
            <SummaryCard
              label="Protein Adherence"
              value={`${report.avgProteinAdherencePct}%`}
            />
            {report.weightChangeLbs && (
              <SummaryCard
                label="Weight Change"
                value={report.weightChangeLbs}
                delta="year-over-year"
              />
            )}
          </div>
        </motion.div>

        {/* Monthly workouts chart */}
        {report.monthlyBreakdown.some((m) => m.workouts > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.1 }}>
            <ChartSection title="Monthly Workout Count">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={report.monthlyBreakdown} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} />
                  <YAxis tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Sessions"]} />
                  <Bar dataKey="workouts" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {/* Monthly readiness chart */}
        {report.monthlyBreakdown.some((m) => m.avgReadiness > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.12 }}>
            <ChartSection title="Monthly Average Readiness">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={report.monthlyBreakdown} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Readiness"]} />
                  <Line type="monotone" dataKey="avgReadiness" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.success, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {/* Monthly nutrition adherence */}
        {report.monthlyBreakdown.some((m) => m.avgCalorieAdherence > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.14 }}>
            <ChartSection title="Monthly Nutrition Adherence (%)">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={report.monthlyBreakdown} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avgCalorieAdherence" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} name="Calories %" />
                  <Line type="monotone" dataKey="avgProteinAdherence" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} strokeDasharray="4 4" name="Protein %" />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {/* Bodyweight trend */}
        {report.monthlyBreakdown.some((m) => m.avgWeightKg !== null) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.16 }}>
            <ChartSection title="Monthly Avg Bodyweight (kg)">
              <ResponsiveContainer width="100%" height={110}>
                <LineChart
                  data={report.monthlyBreakdown.filter((m) => m.avgWeightKg !== null)}
                  margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
                >
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} />
                  <YAxis domain={["auto", "auto"]} tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="avgWeightKg" stroke={CHART_COLORS.muted} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.muted, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {/* Insights */}
        {allInsights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.18 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Insights</h2>
            <div className="space-y-2">
              {allInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
            </div>
          </motion.div>
        )}

        {/* Milestones */}
        {report.milestones.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.2 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Milestones
            </h2>
            <div className="bg-card border border-border rounded-xl px-4 py-1 divide-y divide-border">
              {report.milestones.map((m, i) => (
                <MilestoneRow key={i} label={m.label} value={m.value} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
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

export default function YearlyReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <YearlyReportContent />
    </Suspense>
  );
}
