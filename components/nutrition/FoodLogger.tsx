"use client";

import { useState } from "react";
import { USDAFood, MealType, NutritionLog } from "@/lib/nutrition/types";
import FoodSearch from "./FoodSearch";
import ServingSizeAdjuster from "./ServingSizeAdjuster";

interface FoodLoggerProps {
  onLogSuccess?: (log: NutritionLog) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

type Step = "search" | "adjust" | "meal" | "confirming";

export default function FoodLogger({
  onLogSuccess,
  isOpen = true,
  onClose,
}: FoodLoggerProps) {
  const [step, setStep] = useState<Step>("search");
  const [selectedFood, setSelectedFood] = useState<Partial<USDAFood> | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectFood = (food: USDAFood, savedFoodId?: string) => {
    setSelectedFood({ ...food });
    setStep("adjust");
  };

  const handleAdjustFood = (adjustments: Partial<USDAFood>) => {
    setSelectedFood((prev) => ({
      ...prev,
      ...adjustments,
    }));
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/nutrition/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type: selectedMealType,
          food_name: selectedFood.description,
          serving_size: selectedFood.serving_size,
          serving_unit: selectedFood.serving_unit,
          calories: selectedFood.calories_per_serving,
          protein_g: selectedFood.protein_g,
          carbs_g: selectedFood.carbs_g,
          fat_g: selectedFood.fat_g,
          source_type: "usda",
          external_food_id: selectedFood.fdc_id,
        }),
      });

      if (!response.ok) throw new Error("Failed to log food");

      const data = await response.json();
      onLogSuccess?.(data.log);

      // Reset
      setSelectedFood(null);
      setStep("search");
      onClose?.();
    } catch (error) {
      console.error("Log food error:", error);
      alert("Failed to log food");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {step === "search" && "Log Food"}
            {step === "adjust" && "Adjust Serving"}
            {step === "meal" && "Select Meal Type"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {step === "search" && (
            <FoodSearch
              onSelectFood={handleSelectFood}
              isLoading={isSubmitting}
            />
          )}

          {step === "adjust" && selectedFood && (
            <>
              <div className="bg-success/10 border border-success/20 rounded-xl p-3">
                <div className="font-semibold text-foreground text-sm mb-1">
                  {selectedFood.description}
                </div>
              </div>

              <ServingSizeAdjuster
                food={selectedFood as USDAFood}
                onUpdate={handleAdjustFood}
              />

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setStep("search")}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("meal")}
                  className="flex-1 px-4 py-2 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === "meal" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Meal Type
                </label>
                <div className="space-y-2">
                  {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
                    (meal) => (
                      <button
                        key={meal}
                        onClick={() => setSelectedMealType(meal)}
                        className={`w-full p-3 rounded-xl font-medium transition-colors ${
                          selectedMealType === meal
                            ? "bg-success text-white"
                            : "bg-muted text-foreground hover:bg-accent"
                        }`}
                      >
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setStep("adjust")}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleLogFood}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  {isSubmitting ? "Logging..." : "Log Food"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
