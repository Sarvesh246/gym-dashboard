"use client";

import { useState } from "react";
import { NutritionLog, MealType } from "@/lib/nutrition/types";

interface MealTimelineProps {
  logs: NutritionLog[];
  onDeleteLog?: (logId: string) => void;
  onEditLog?: (log: NutritionLog) => void;
}

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const mealLabels: Record<MealType, string> = {
  breakfast: "🍳 Breakfast",
  lunch: "🍽️ Lunch",
  dinner: "🍷 Dinner",
  snack: "🥜 Snack",
};

export default function MealTimeline({
  logs,
  onDeleteLog,
  onEditLog,
}: MealTimelineProps) {
  const [expanded, setExpanded] = useState<Record<MealType, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snack: true,
  });

  // Group logs by meal type
  const mealsByType: Record<MealType, NutritionLog[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  logs.forEach((log) => {
    if (mealsByType[log.meal_type]) {
      mealsByType[log.meal_type].push(log);
    }
  });

  const toggleMeal = (mealType: MealType) => {
    setExpanded((prev) => ({
      ...prev,
      [mealType]: !prev[mealType],
    }));
  };

  return (
    <div className="space-y-3">
      {mealOrder.map((mealType) => {
        const mealLogs = mealsByType[mealType];
        if (mealLogs.length === 0) return null;

        const totals = mealLogs.reduce(
          (acc, log) => ({
            calories: acc.calories + log.calories,
            protein: acc.protein + log.protein_g,
            carbs: acc.carbs + log.carbs_g,
            fat: acc.fat + log.fat_g,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return (
          <div key={mealType} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleMeal(mealType)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <h3 className="font-semibold text-gray-900">{mealLabels[mealType]}</h3>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-semibold text-gray-900">
                    {Math.round(totals.calories)} kcal
                  </div>
                  <div className="text-xs text-gray-600">
                    P: {Math.round(totals.protein)}g | C: {Math.round(totals.carbs)}g | F: {Math.round(totals.fat)}g
                  </div>
                </div>
                <span className="text-gray-600 text-lg">
                  {expanded[mealType] ? "▼" : "▶"}
                </span>
              </div>
            </button>

            {/* Meal items */}
            {expanded[mealType] && (
              <div className="space-y-2 p-3 bg-white">
                {mealLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {log.food_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {log.serving_size} {log.serving_unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs">
                        <div className="font-semibold text-gray-900">
                          {Math.round(log.calories)}
                        </div>
                        <div className="text-gray-600">kcal</div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditLog && (
                          <button
                            onClick={() => onEditLog(log)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            ✎
                          </button>
                        )}
                        {onDeleteLog && (
                          <button
                            onClick={() => onDeleteLog(log.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {Object.values(mealsByType).every((logs) => logs.length === 0) && (
        <div className="text-center py-8 text-gray-600">
          <p className="text-sm">No meals logged yet</p>
        </div>
      )}
    </div>
  );
}
