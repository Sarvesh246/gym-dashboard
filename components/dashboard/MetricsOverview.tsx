"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { mockMetrics } from "@/lib/mock-data";

export interface WearableSnapshot {
  sleep_duration?: number | null;
  sleep_quality?: number | null;
  hrv?: number | null;
  resting_heart_rate?: number | null;
  daily_steps?: number | null;
  active_calories?: number | null;
  provider?: string | null;
}

interface Props {
  metrics: typeof mockMetrics;
  wearableSnapshot?: WearableSnapshot | null;
  readinessScore?: number | null;
}

export function MetricsOverview({ metrics, wearableSnapshot, readinessScore }: Props) {
  const sleepHours = wearableSnapshot?.sleep_duration ?? metrics.sleep.hours;
  const sleepScore = wearableSnapshot?.sleep_quality ?? metrics.sleep.score;
  const recoveryScore = readinessScore ?? metrics.recoveryScore;
  const hasWearableSleep = !!wearableSnapshot?.sleep_duration;
  const hasWearableRecovery = readinessScore != null;
  const providerLabel = wearableSnapshot?.provider
    ? wearableSnapshot.provider.charAt(0).toUpperCase() + wearableSnapshot.provider.slice(1)
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        label="Recovery Score"
        value={recoveryScore}
        unit="%"
        icon="Zap"
        color="success"
        trend="up"
        trendLabel={hasWearableRecovery && providerLabel ? providerLabel : "+4"}
      />
      <MetricCard
        label="Calories Left"
        value={metrics.calories.remaining}
        unit="kcal"
        icon="Flame"
        color="accent"
        trend="flat"
      />
      <MetricCard
        label="Protein"
        value={metrics.protein.consumed}
        unit="g"
        secondaryValue={`of ${metrics.protein.goal}g goal`}
        icon="Beef"
        color="warning"
        trend="down"
        trendLabel="-38g"
      />
      <MetricCard
        label="Sleep"
        value={sleepHours}
        unit="h"
        secondaryValue={
          hasWearableSleep && providerLabel
            ? `Score: ${sleepScore} · ${providerLabel}`
            : `Score: ${sleepScore}`
        }
        icon="Moon"
        color="success"
        trend="up"
        trendLabel={hasWearableSleep ? "Live" : "+0.4h"}
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
