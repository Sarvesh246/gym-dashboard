"use client";

import { USDAFood } from "@/lib/nutrition/types";

interface FoodCardProps {
  food: USDAFood;
  onSelect: (food: USDAFood) => void;
}

export default function FoodCard({ food, onSelect }: FoodCardProps) {
  return (
    <button
      onClick={() => onSelect(food)}
      className="w-full text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {food.description}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {food.serving_size}
            {food.serving_unit}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-semibold text-sm text-gray-900">
            {Math.round(food.calories_per_serving)}
          </div>
          <div className="text-xs text-gray-600">kcal</div>
        </div>
      </div>

      <div className="flex gap-3 mt-2 text-xs">
        <div className="text-amber-700 font-medium">
          {Math.round(food.protein_g)}g P
        </div>
        <div className="text-blue-700 font-medium">
          {Math.round(food.carbs_g)}g C
        </div>
        <div className="text-orange-700 font-medium">
          {Math.round(food.fat_g)}g F
        </div>
      </div>
    </button>
  );
}
