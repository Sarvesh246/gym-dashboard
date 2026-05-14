"use client";

import { useState, useEffect } from "react";
import { USDAFood } from "@/lib/nutrition/types";

interface ServingSizeAdjusterProps {
  food: USDAFood;
  onUpdate: (food: Partial<USDAFood>) => void;
}

export default function ServingSizeAdjuster({ food, onUpdate }: ServingSizeAdjusterProps) {
  const [servings, setServings] = useState(1);
  const [customSize, setCustomSize] = useState(food.serving_size);
  const [unit, setUnit] = useState(food.serving_unit);

  const units = [
    { value: "g", label: "grams" },
    { value: "oz", label: "ounces" },
    { value: "cup", label: "cups" },
    { value: "tbsp", label: "tbsp" },
    { value: "unit", label: "unit" },
  ];

  // Calculate adjusted macros
  const multiplier = servings * (customSize / food.serving_size);

  useEffect(() => {
    onUpdate({
      calories_per_serving: food.calories_per_serving * multiplier,
      protein_g: food.protein_g * multiplier,
      carbs_g: food.carbs_g * multiplier,
      fat_g: food.fat_g * multiplier,
      serving_size: customSize,
      serving_unit: unit,
    });
  }, [servings, customSize, unit]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Adjust Serving Size</h3>

      {/* Servings slider/input */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Servings
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setServings(Math.max(0.5, servings - 0.5))}
            className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded text-sm font-medium"
          >
            −
          </button>
          <input
            type="number"
            value={servings}
            onChange={(e) => setServings(Math.max(0.5, parseFloat(e.target.value) || 1))}
            className="flex-1 px-3 py-2 border border-input bg-background text-foreground rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            step="0.5"
            min="0.5"
            max="10"
          />
          <button
            onClick={() => setServings(servings + 0.5)}
            className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded text-sm font-medium"
          >
            +
          </button>
        </div>
      </div>

      {/* Custom size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Size
          </label>
          <input
            type="number"
            value={customSize}
            onChange={(e) => setCustomSize(parseFloat(e.target.value) || 100)}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            step="0.5"
            min="0.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Unit
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {units.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Preview</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <div className="font-bold text-foreground">{Math.round(food.calories_per_serving * multiplier)}</div>
            <div className="text-muted-foreground">kcal</div>
          </div>
          <div>
            <div className="font-bold text-amber-600">{Math.round(food.protein_g * multiplier)}g</div>
            <div className="text-muted-foreground">protein</div>
          </div>
          <div>
            <div className="font-bold text-primary">{Math.round(food.carbs_g * multiplier)}g</div>
            <div className="text-muted-foreground">carbs</div>
          </div>
          <div>
            <div className="font-bold text-orange-500">{Math.round(food.fat_g * multiplier)}g</div>
            <div className="text-muted-foreground">fat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
