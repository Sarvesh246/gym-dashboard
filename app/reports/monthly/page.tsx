"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MonthlyReport } from "@/services/reports/monthly";
import type { StoredInsight } from "@/services/reports/weekly";
import { formatMonth, shortDate, formatDeltaPct } from "@/lib/reports/formatting";
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, GRID_STYLE, CHART_COLORS } from "@/lib/charts/config";

// ─── Small components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, deltaText, deltaUp }: {
  label: string; value: string; sub?: string; deltaText?: string; deltaUp?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {deltaText && (
        <div className={`text-xs font-medium mt-1 ${deltaUp ? "text-[color:var(--color-success)]" : "text-[color:var(--color-destructive)]"}`}>
          {deltaText} vs last month
        </div>
      )}
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
  const labels: Record<StoredInsight["type"], string> = {
    warning: "Warning",
    recommendation: "Recommendation",
    observation: "Observation",
  };
  return (
    <div className={`border-l-2 rounded-r-lg px-4 py-3 ${styles[insight.type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[insight.priority]}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {labels[insight.type]}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
    </div>
  );
}

function ChangeItem({ text, positive }: { text: string; positive: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
      <span className={`mt-0.5 text-base leading-none shrink-0 ${positive ? "text-[color:var(--color-success)]" : "text-[color:var(--color-destructive)]"}`}>
        {positive ? "↑" : "↓"}
      </span>
      <p className="text-sm text-foreground leading-snug">{text}</p>
    </div>
  );
}

function MilestoneChip({ label, value }: { label: string; value: string }) {
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

// ─── Main page content ────────────────────────────────────────────────────────

function MonthlyReportContent() {
  const router = useRouter();
  const params = useSearchParams();

  const now = new Date();
  const year = parseInt(params.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(params.get("month") ?? String(now.getMonth() + 1), 10);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = `/api/reports/monthly?year=${year}&month=${month}${refresh ? "&refresh=true" : ""}`;
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
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing {month}/{year}…</p>
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

  const readinessData = report.readinessSeries.map((p) => ({
    name: shortDate(p.date),
    value: parseFloat(p.value.toFixed(1)),
  }));

  const volumeData = report.volumeSeries.map((p) => ({
    name: shortDate(p.date),
    value: p.value,
  }));

  const weightData = report.weightSeries.map((p) => ({
    name: shortDate(p.date),
    value: parseFloat(p.value.toFixed(1)),
  }));

  const hasChanges = report.positiveChanges.length + report.regressions.length > 0;
  const allInsights = [...report.insights, ...report.recommendations];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground text-xl">←</button>
            <div>
              <h1 className="text-base font-semibold text-foreground">Monthly Report</h1>
              <p className="text-xs text-muted-foreground">{formatMonth(`${year}-${String(month).padStart(2, "0")}`)}</p>
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

        {/* Summary */}
        {report.summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Summary</span>
              {report.cached && <span className="text-xs text-muted-foreground opacity-60">· cached</span>}
              {!report.aiGenerated && <span className="text-xs text-muted-foreground opacity-60">· deterministic</span>}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
          </motion.div>
        )}

        {/* Summary metric grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.05 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Workouts"
              value={String(report.totalWorkouts)}
              sub="sessions this month"
              deltaText={report.vsLastMonth.workouts.isSignificant ? formatDeltaPct(report.vsLastMonth.workouts.deltaPct) : undefined}
              deltaUp={report.vsLastMonth.workouts.direction === "up"}
            />
            <MetricCard
              label="Avg Readiness"
              value={`${Math.round(report.avgReadiness)}/100`}
              deltaText={report.vsLastMonth.readiness.isSignificant ? formatDeltaPct(report.vsLastMonth.readiness.deltaPct) : undefined}
              deltaUp={report.vsLastMonth.readiness.direction === "up"}
            />
            <MetricCard
              label="Consistency"
              value={`${report.consistencyPct}%`}
              sub="workout frequency"
            />
            <MetricCard
              label="Avg Sleep"
              value={report.avgSleepHours > 0 ? `${report.avgSleepHours.toFixed(1)} hrs` : "No data"}
              deltaText={report.vsLastMonth.sleep.isSignificant ? formatDeltaPct(report.vsLastMonth.sleep.deltaPct) : undefined}
              deltaUp={report.vsLastMonth.sleep.direction === "up"}
            />
            <MetricCard
              label="Calorie Adherence"
              value={`${report.avgCalorieAdherencePct}%`}
              deltaText={report.vsLastMonth.calorieAdherence.isSignificant ? formatDeltaPct(report.vsLastMonth.calorieAdherence.deltaPct) : undefined}
              deltaUp={report.vsLastMonth.calorieAdherence.direction === "up"}
            />
            <MetricCard
              label="Protein Adherence"
              value={`${report.avgProteinAdherencePct}%`}
              deltaText={report.vsLastMonth.proteinAdherence.isSignificant ? formatDeltaPct(report.vsLastMonth.proteinAdherence.deltaPct) : undefined}
              deltaUp={report.vsLastMonth.proteinAdherence.direction === "up"}
            />
          </div>
        </motion.div>

        {/* Charts */}
        {readinessData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.1 }}>
            <ChartSection title="Readiness Trend">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={readinessData} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Readiness"]} />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {volumeData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.12 }}>
            <ChartSection title="Training Volume (Sets per Session)">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={volumeData} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Sets"]} />
                  <Bar dataKey="value" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {weightData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.14 }}>
            <ChartSection title="Bodyweight">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={weightData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={AXIS_TICK_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartSection>
          </motion.div>
        )}

        {/* What changed */}
        {hasChanges && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.16 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">What Changed</h2>
            <div className="bg-card border border-border rounded-xl px-4 py-1 divide-y divide-border">
              {report.positiveChanges.map((t, i) => <ChangeItem key={i} text={t} positive />)}
              {report.regressions.map((t, i) => <ChangeItem key={i} text={t} positive={false} />)}
            </div>
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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Milestones</h2>
            <div className="bg-card border border-border rounded-xl px-4 py-1 divide-y divide-border">
              {report.milestones.map((m, i) => <MilestoneChip key={i} label={m.label} value={m.value} />)}
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

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MonthlyReportContent />
    </Suspense>
  );
}
