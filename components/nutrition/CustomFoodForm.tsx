"use client";

import { useState } from "react";

interface CustomFoodFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (food: CustomFoodResult) => void;
}

export interface CustomFoodResult {
  id: string;
  food_name: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: number;
  serving_unit: string;
}

const SERVING_UNITS = ["g", "oz", "cup", "tbsp", "tsp", "ml", "unit", "slice", "piece"];

export default function CustomFoodForm({ isOpen, onClose, onCreated }: CustomFoodFormProps) {
  const [form, setForm] = useState({
    food_name: "",
    calories_per_serving: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    fiber_g: "",
    sugar_g: "",
    sodium_mg: "",
    serving_size: "100",
    serving_unit: "g",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!form.food_name.trim()) {
      setError("Food name is required");
      return;
    }
    if (!form.calories_per_serving || isNaN(Number(form.calories_per_serving))) {
      setError("Calories are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/nutrition/custom-foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: form.food_name.trim(),
          calories_per_serving: Number(form.calories_per_serving),
          protein_g: Number(form.protein_g) || 0,
          carbs_g: Number(form.carbs_g) || 0,
          fat_g: Number(form.fat_g) || 0,
          fiber_g: Number(form.fiber_g) || 0,
          sugar_g: Number(form.sugar_g) || 0,
          sodium_mg: Number(form.sodium_mg) || 0,
          serving_size: Number(form.serving_size) || 100,
          serving_unit: form.serving_unit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save food");
        return;
      }

      const data = await res.json();
      onCreated?.(data.food);
      onClose();

      // Reset form
      setForm({
        food_name: "",
        calories_per_serving: "",
        protein_g: "",
        carbs_g: "",
        fat_g: "",
        fiber_g: "",
        sugar_g: "",
        sodium_mg: "",
        serving_size: "100",
        serving_unit: "g",
      });
    } catch {
      setError("Failed to save food. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-foreground">Create Custom Food</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Food name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Food Name *</label>
            <input
              type="text"
              value={form.food_name}
              onChange={set("food_name")}
              placeholder="e.g. Homemade oatmeal"
              className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Serving size + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Serving Size</label>
              <input
                type="number"
                value={form.serving_size}
                onChange={set("serving_size")}
                min="0.1"
                step="0.1"
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
              <select
                value={form.serving_unit}
                onChange={set("serving_unit")}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SERVING_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calories */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Calories (kcal) *</label>
            <input
              type="number"
              value={form.calories_per_serving}
              onChange={set("calories_per_serving")}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Macros grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-amber-600 mb-1">Protein (g)</label>
              <input
                type="number"
                value={form.protein_g}
                onChange={set("protein_g")}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Carbs (g)</label>
              <input
                type="number"
                value={form.carbs_g}
                onChange={set("carbs_g")}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-orange-500 mb-1">Fat (g)</label>
              <input
                type="number"
                value={form.fat_g}
                onChange={set("fat_g")}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Optional fields */}
          <details className="border border-border rounded-lg overflow-hidden">
            <summary className="px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/40 select-none">
              Optional details (fiber, sugar, sodium)
            </summary>
            <div className="p-3 space-y-3 border-t border-border">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fiber (g)</label>
                  <input type="number" value={form.fiber_g} onChange={set("fiber_g")} placeholder="0" min="0" step="0.1"
                    className="w-full px-2 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sugar (g)</label>
                  <input type="number" value={form.sugar_g} onChange={set("sugar_g")} placeholder="0" min="0" step="0.1"
                    className="w-full px-2 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sodium (mg)</label>
                  <input type="number" value={form.sodium_mg} onChange={set("sodium_mg")} placeholder="0" min="0"
                    className="w-full px-2 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground font-medium rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !form.food_name.trim() || !form.calories_per_serving}
            className="flex-1 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm"
          >
            {isSaving ? "Saving..." : "Save Food"}
          </button>
        </div>
      </div>
    </div>
  );
}
