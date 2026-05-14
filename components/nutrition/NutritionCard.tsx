"use client";

import { DailyNutritionSummary, NutritionGoals, MacroAdherence } from "@/lib/nutrition/types";
import { calculateDailyAdherence } from "@/services/macros";
import { useRouter } from "next/navigation";
import MacroRings from "./MacroRings";

interface NutritionCardProps {
  summary: DailyNutritionSummary;
  goals: NutritionGoals;
}

export default function NutritionCard({ summary, goals }: NutritionCardProps) {
  const router = useRouter();
  const adherence = calculateDailyAdherence(summary, goals);

  const remaining = {
    calories: Math.max(0, goals.calorie_target - summary.calories),
    protein: Math.max(0, goals.protein_target - summary.protein_g),
    carbs: Math.max(0, goals.carb_target - summary.carbs_g),
    fat: Math.max(0, goals.fat_target - summary.fat_g),
  };

  return (
    <div
      className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/50 p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push("/nutrition")}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nutrition</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{summary.date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {Math.round(summary.calories)}{" "}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {Math.round(remaining.calories)} left
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <MacroRings summary={summary} goals={goals} size="sm" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2">
          <div className="font-semibold text-amber-700 dark:text-amber-400">{Math.round(summary.protein_g)}g</div>
          <div className="text-gray-600 dark:text-gray-400">Protein</div>
          <div className="text-gray-500 dark:text-gray-500">{Math.round(adherence.protein_adherence)}%</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2">
          <div className="font-semibold text-blue-700 dark:text-blue-400">{Math.round(summary.carbs_g)}g</div>
          <div className="text-gray-600 dark:text-gray-400">Carbs</div>
          <div className="text-gray-500 dark:text-gray-500">{Math.round(adherence.carb_adherence)}%</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2">
          <div className="font-semibold text-orange-700 dark:text-orange-400">{Math.round(summary.fat_g)}g</div>
          <div className="text-gray-600 dark:text-gray-400">Fat</div>
          <div className="text-gray-500 dark:text-gray-500">{Math.round(adherence.fat_adherence)}%</div>
        </div>
      </div>

      <button
        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/nutrition");
        }}
      >
        Log Food
      </button>
    </div>
  );
}
