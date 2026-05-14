"use client";

import { useEffect, useState } from "react";
import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";
import { calculateDailyAdherence } from "@/services/macros";
import { useRouter } from "next/navigation";

export default function NutritionHistoryPage() {
  const [summaries, setSummaries] = useState<DailyNutritionSummary[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const goalsRes = await fetch("/api/nutrition/goals");
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          setGoals(goalsData.goals);
        }

        const summariesRes = await fetch("/api/nutrition/summary?days=30");
        if (summariesRes.ok) {
          const summariesData = await summariesRes.json();
          setSummaries(summariesData.summaries || []);
        }
      } catch (error) {
        console.error("Load history error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nutrition History</h1>
              <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : summaries.length > 0 && goals ? (
          <div className="space-y-2">
            {summaries.map((summary) => {
              const adherence = calculateDailyAdherence(summary, goals);
              return (
                <button
                  key={summary.id}
                  onClick={() => router.push(`/nutrition?date=${summary.date}`)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-emerald-300 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {new Date(summary.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {Math.round(summary.calories)} kcal • P: {Math.round(summary.protein_g)}g • C:{" "}
                        {Math.round(summary.carbs_g)}g • F: {Math.round(summary.fat_g)}g
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-700">
                        {Math.round(adherence.overall_score)}%
                      </div>
                      <div className="text-xs text-gray-600">adherence</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
