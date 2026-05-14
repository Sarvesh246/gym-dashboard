"use client";

import { useEffect, useState } from "react";
import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";
import NutritionCard from "@/components/nutrition/NutritionCard";

export default function NutritionWidget() {
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split("T")[0];

        const [goalsRes, logsRes] = await Promise.all([
          fetch("/api/nutrition/goals"),
          fetch(`/api/nutrition/logs?date=${today}`),
        ]);

        if (!goalsRes.ok || !logsRes.ok) {
          setError("Nutrition data not available");
          setIsLoading(false);
          return;
        }

        const [goalsData, logsData] = await Promise.all([
          goalsRes.json(),
          logsRes.json(),
        ]);

        setGoals(goalsData.goals);
        setSummary(logsData.summary);
      } catch (err) {
        console.error("Load nutrition widget error:", err);
        setError("Failed to load nutrition data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return <div className="rounded-xl bg-muted animate-pulse h-48" />;
  }

  if (error || !goals || !summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              Nutrition Tracking
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Set up nutrition goals to track your daily intake
            </p>
            <a
              href="/nutrition"
              className="inline-block px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              Set Up Nutrition
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <NutritionCard summary={summary} goals={goals} />;
}
