"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { mockMetrics } from "@/lib/mock-data";

interface Props {
  metrics: typeof mockMetrics;
}

export function MetricsOverview({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        label="Recovery Score"
        value={metrics.recoveryScore}
        unit="%"
        icon="Zap"
        color="success"
        trend="up"
        trendLabel="+4"
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
        label="Sleep Score"
        value={metrics.sleep.hours}
        unit="h"
        secondaryValue={`Score: ${metrics.sleep.score}`}
        icon="Moon"
        color="success"
        trend="up"
        trendLabel="+0.4h"
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
