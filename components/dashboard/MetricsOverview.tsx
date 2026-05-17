"use client";

import { MetricCard } from "@/components/ui/MetricCard";

export interface WearableSnapshot {
  sleep_duration?: number | null;
  sleep_quality?: number | null;
  hrv?: number | null;
  resting_heart_rate?: number | null;
  daily_steps?: number | null;
  active_calories?: number | null;
  provider?: string | null;
}

interface DashboardMetrics {
  calories: { consumed: number; total: number; remaining: number };
  protein:  { consumed: number; goal: number; unit: string };
  workoutStatus: string;
  hasNutritionGoals: boolean;
}

interface Props {
  metrics: DashboardMetrics;
  wearableSnapshot?: WearableSnapshot | null;
  readinessScore?: number | null;
}

const DASH = "—";

export function MetricsOverview({ metrics, wearableSnapshot, readinessScore }: Props) {
  const hasWearableSleep    = wearableSnapshot?.sleep_duration != null;
  const hasWearableRecovery = readinessScore != null;
  const providerLabel = wearableSnapshot?.provider
    ? wearableSnapshot.provider.charAt(0).toUpperCase() + wearableSnapshot.provider.slice(1)
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        label="Recovery Score"
        value={hasWearableRecovery ? readinessScore! : DASH}
        unit={hasWearableRecovery ? "%" : undefined}
        icon="Zap"
        color="success"
        trendLabel={hasWearableRecovery && providerLabel ? providerLabel : undefined}
      />
      <MetricCard
        label="Calories Left"
        value={metrics.hasNutritionGoals ? metrics.calories.remaining : DASH}
        unit={metrics.hasNutritionGoals ? "kcal" : undefined}
        icon="Flame"
        color="accent"
      />
      <MetricCard
        label="Protein"
        value={metrics.hasNutritionGoals ? metrics.protein.consumed : DASH}
        unit={metrics.hasNutritionGoals ? "g" : undefined}
        secondaryValue={metrics.hasNutritionGoals ? `of ${metrics.protein.goal}g goal` : undefined}
        icon="Beef"
        color="warning"
      />
      <MetricCard
        label="Sleep"
        value={hasWearableSleep ? wearableSnapshot!.sleep_duration! : DASH}
        unit={hasWearableSleep ? "h" : undefined}
        secondaryValue={
          hasWearableSleep
            ? `Score: ${wearableSnapshot!.sleep_quality ?? DASH}${providerLabel ? ` · ${providerLabel}` : ""}`
            : "Connect a wearable"
        }
        icon="Moon"
        color="success"
        trendLabel={hasWearableSleep ? "Live" : undefined}
        animateValue
      />
      <MetricCard
        label="Workout"
        value={metrics.workoutStatus}
        icon="Dumbbell"
        color="neutral"
        animateValue={false}
      />
    </div>
  );
}
