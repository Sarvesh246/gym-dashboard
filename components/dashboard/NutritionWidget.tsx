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
    return <div className="rounded-lg bg-gray-100 animate-pulse h-48" />;
  }

  if (error || !goals || !summary) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-900">
          {error || "Set up nutrition goals to track your daily intake"}
        </p>
        <a
          href="/nutrition"
          className="inline-block mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded transition-colors"
        >
          Go to Nutrition
        </a>
      </div>
    );
  }

  return <NutritionCard summary={summary} goals={goals} />;
}
