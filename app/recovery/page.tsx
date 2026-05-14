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
import { mockSleepData, mockHRVData } from "@/lib/mock-data";
import {
  getSystemicRecovery,
  computeSystemicRecoveryFromProfile,
} from "@/services/recovery";
import { getBodyMapData } from "@/services/muscles";
import { computeReadiness, getProfileModifiers } from "@/services/readiness";
import type { BodyMapData, ReadinessOutput } from "@/lib/recovery/types";
import { SLEEP_QUALITY_SCORE } from "@/lib/recovery/constants";

export default async function RecoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch recovery data (all fallback-safe) ──────────────────────────────────
  const [systemic, bodyMap, readiness, profileModifiers] = await Promise.all([
    getSystemicRecovery(user.id),
    getBodyMapData(user.id),
    computeReadiness(user.id),
    getProfileModifiers(user.id),
  ]);

  const readinessScore = Math.round(readiness.readiness_score);
  const sleepScore     = profileModifiers.sleep_quality_score;
  // Derive an approximate HRV value (normalised score → ms estimate)
  const estimatedHRV   = Math.round(40 + (sleepScore / 100) * 30);
  const restingHR      = 62;

  // Fallback body map when tables are empty (pre-migration)
  const bodyMapDisplay: BodyMapData =
    Object.keys(bodyMap).length > 0
      ? bodyMap
      : {
          chest:       { recovery_score: 91, fatigue_score: 9,  strain_score: 8,  soreness_score: 5,  tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          front_delts: { recovery_score: 50, fatigue_score: 50, strain_score: 45, soreness_score: 38, tier: "orange", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          biceps:      { recovery_score: 88, fatigue_score: 12, strain_score: 10, soreness_score: 8,  tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          core:        { recovery_score: 67, fatigue_score: 33, strain_score: 28, soreness_score: 22, tier: "yellow", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          quads:       { recovery_score: 81, fatigue_score: 19, strain_score: 16, soreness_score: 12, tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          calves:      { recovery_score: 90, fatigue_score: 10, strain_score: 8,  soreness_score: 5,  tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          lats:        { recovery_score: 75, fatigue_score: 25, strain_score: 22, soreness_score: 18, tier: "yellow", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          upper_back:  { recovery_score: 78, fatigue_score: 22, strain_score: 20, soreness_score: 15, tier: "yellow", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          glutes:      { recovery_score: 82, fatigue_score: 18, strain_score: 15, soreness_score: 12, tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          hamstrings:  { recovery_score: 84, fatigue_score: 16, strain_score: 14, soreness_score: 10, tier: "green",  last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          triceps:     { recovery_score: 79, fatigue_score: 21, strain_score: 18, soreness_score: 14, tier: "yellow", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
          side_delts:  { recovery_score: 72, fatigue_score: 28, strain_score: 25, soreness_score: 20, tier: "yellow", last_trained_at: null, weekly_frequency: 0, weekly_volume: 0 },
        };

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
          hrvScore={estimatedHRV}
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
            value={Math.round(sleepScore)}
            unit="%"
            icon="Moon"
            color="accent"
            animateValue
          />
          <MetricCard
            label="Est. HRV"
            value={estimatedHRV}
            unit="ms"
            icon="Heart"
            color="success"
            animateValue
          />
          <MetricCard
            label="Systemic Load"
            value={Math.round(systemic?.systemic_fatigue ?? 30)}
            unit="%"
            icon="Brain"
            color="accent"
            animateValue
          />
        </div>
      </SectionContainer>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="Sleep Analysis" subtitle="Last 14 nights" padding={false}>
          <div className="px-5 pb-5 pt-1">
            <ChartPlaceholder
              type="line"
              data={mockSleepData}
              dataKey="hours"
              color="primary"
              height={130}
              showXAxis
            />
          </div>
        </SectionCard>

        <SectionCard title="HRV Trend" subtitle="Last 14 days" padding={false}>
          <div className="px-5 pb-5 pt-1">
            <ChartPlaceholder
              type="area"
              data={mockHRVData}
              dataKey="value"
              color="success"
              height={130}
              showXAxis
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
        <MuscleStateGrid bodyMap={bodyMapDisplay} />
      </div>
    </PageContainer>
  );
}
