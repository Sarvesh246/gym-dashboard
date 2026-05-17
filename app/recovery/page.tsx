import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ReadinessCard } from "@/components/recovery/ReadinessCard";
import { MuscleStateGrid } from "@/components/recovery/MuscleStateGrid";
import { RecommendationsList } from "@/components/recovery/RecommendationsList";
import { WearableStatusCard } from "@/components/recovery/WearableStatusCard";
import {
  getSystemicRecovery,
} from "@/services/recovery";
import { getBodyMapData } from "@/services/muscles";
import { computeReadiness, getProfileModifiers } from "@/services/readiness";

export default async function RecoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // ── Fetch recovery data (real or empty — no synthetic fallbacks) ─────────────
  const [systemic, bodyMap, readiness, profileModifiers, wearableResult, wearableHistoryResult] = await Promise.all([
    getSystemicRecovery(user.id),
    getBodyMapData(user.id),
    computeReadiness(user.id),
    getProfileModifiers(user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("wearable_health_metrics")
      .select("sleep_quality, hrv, resting_heart_rate, metric_date")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("wearable_health_metrics")
      .select("metric_date, sleep_duration, hrv")
      .eq("user_id", user.id)
      .gte("metric_date", fourteenDaysAgo)
      .order("metric_date", { ascending: true }),
  ]);

  const latestWearable = (wearableResult as {
    data: { sleep_quality: number | null; hrv: number | null; resting_heart_rate: number | null } | null;
  }).data;
  const wearableHistory = ((wearableHistoryResult as {
    data: Array<{ metric_date: string; sleep_duration: number | null; hrv: number | null }> | null;
  }).data) ?? [];

  const sleepChartData = wearableHistory
    .filter((r) => r.sleep_duration != null)
    .map((r) => ({
      date: new Date(r.metric_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: r.sleep_duration as number,
    }));
  const hrvChartData = wearableHistory
    .filter((r) => r.hrv != null)
    .map((r) => ({
      date: new Date(r.metric_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: r.hrv as number,
    }));

  const readinessScore = Math.round(readiness.readiness_score);
  // Sleep score: prefer logged wearable data, else profile-derived (treated as estimate)
  const sleepScore   = latestWearable?.sleep_quality ?? profileModifiers.sleep_quality_score;
  const hrvScore     = latestWearable?.hrv ?? null;
  const restingHR    = latestWearable?.resting_heart_rate ?? null;
  const hasBodyMapData = Object.keys(bodyMap).length > 0;

  // Readiness breakdown items derived from computed scores
  const readinessBreakdown = [
    { label: "Sleep Quality",    value: Math.round(sleepScore),                       color: "bg-success" },
    { label: "Systemic Load",    value: Math.round(100 - (systemic?.systemic_fatigue ?? 30)), color: "bg-warning" },
    { label: "Muscle Readiness", value: Math.round(readiness.readiness_score),        color: "bg-primary" },
    { label: "Stress Tolerance", value: Math.round(100 - profileModifiers.stress_score), color: "bg-success" },
  ];

  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Recovery</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multidimensional body restoration analysis
        </p>
      </SectionContainer>

      {/* Readiness hero card */}
      <SectionContainer>
        <ReadinessCard
          readiness={readiness}
          sleepScore={sleepScore}
          hrvScore={hrvScore}
          restingHR={restingHR}
        />
      </SectionContainer>

      {/* Metrics grid */}
      <SectionContainer title="Recovery Markers">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Readiness"
            value={readinessScore}
            unit="%"
            icon="Zap"
            color="success"
            animateValue
          />
          <MetricCard
            label="Sleep Quality"
            value={sleepScore == null ? "—" : Math.round(sleepScore)}
            unit={sleepScore == null ? undefined : "%"}
            icon="Moon"
            color="accent"
            animateValue
          />
          <MetricCard
            label="HRV"
            value={hrvScore == null ? "—" : Math.round(hrvScore)}
            unit={hrvScore == null ? undefined : "ms"}
            icon="Heart"
            color="success"
            animateValue
          />
          <MetricCard
            label="Systemic Load"
            value={systemic ? Math.round(systemic.systemic_fatigue ?? 0) : "—"}
            unit={systemic ? "%" : undefined}
            icon="Brain"
            color="accent"
            animateValue
          />
        </div>
      </SectionContainer>

      {/* Wearable Status */}
      <SectionContainer>
        <WearableStatusCard />
      </SectionContainer>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="Sleep Analysis" subtitle="Last 14 nights" padding={false}>
          <div className="px-5 pb-5 pt-1">
            <ChartPlaceholder
              type="line"
              data={sleepChartData}
              dataKey="hours"
              color="primary"
              height={130}
              showXAxis
              emptyLabel="Connect a wearable to see sleep history"
            />
          </div>
        </SectionCard>

        <SectionCard title="HRV Trend" subtitle="Last 14 days" padding={false}>
          <div className="px-5 pb-5 pt-1">
            <ChartPlaceholder
              type="area"
              data={hrvChartData}
              dataKey="value"
              color="success"
              height={130}
              showXAxis
              emptyLabel="Connect a wearable to see HRV history"
            />
          </div>
        </SectionCard>
      </div>

      {/* Readiness breakdown + muscle map */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Readiness breakdown */}
        <div className="space-y-4">
          <SectionCard
            title="Readiness Breakdown"
            subtitle="Computed from your profile and training history"
          >
            <div className="space-y-3">
              {readinessBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-36 shrink-0">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${Math.max(0, Math.min(100, item.value))}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Recommendations */}
          <RecommendationsList
            recommendations={readiness.recommendations}
            training_recommendation={readiness.training_recommendation}
            suppression_factors={readiness.suppression_factors}
          />
        </div>

        {/* Muscle recovery map */}
        {hasBodyMapData ? (
          <MuscleStateGrid bodyMap={bodyMap} />
        ) : (
          <SectionCard title="Muscle Recovery Map">
            <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground text-center px-4">
              Log a workout to start tracking per-muscle recovery.
            </div>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
