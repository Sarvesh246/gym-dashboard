"use client";

import { useState, useCallback, useEffect } from "react";
import { USDAFood, SavedFood } from "@/lib/nutrition/types";
import FoodCard from "./FoodCard";

interface FoodSearchProps {
  onSelectFood: (food: USDAFood, savedFoodId?: string) => void;
  isLoading?: boolean;
}

export default function FoodSearch({ onSelectFood, isLoading }: FoodSearchProps) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<USDAFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<SavedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRecent, setShowRecent] = useState(true);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setFoods([]);
        setShowRecent(true);
        return;
      }

      setSearching(true);
      setShowRecent(false);

      try {
        const response = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}&limit=15`);
        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();
        setFoods(data.foods || []);
        setRecentFoods(data.recent_foods || []);
      } catch (error) {
        console.error("Search error:", error);
        setFoods([]);
      } finally {
        setSearching(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          disabled={isLoading}
        />
        {searching && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin w-5 h-5 border-2 border-success border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Results or recent foods */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {showRecent && recentFoods.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Recent Foods</h3>
            {recentFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => {
                  if (food.serving_defaults) {
                    const usda_food: USDAFood = {
                      fdc_id: food.external_food_id || "",
                      description: food.food_name,
                      serving_size: food.serving_defaults.size,
                      serving_unit: food.serving_defaults.unit,
                      calories_per_serving: food.serving_defaults.calories,
                      protein_g: food.serving_defaults.protein_g,
                      carbs_g: food.serving_defaults.carbs_g,
                      fat_g: food.serving_defaults.fat_g,
                    };
                    onSelectFood(usda_food, food.id);
                  }
                }}
                className="w-full text-left p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors border border-border"
              >
                <div className="font-medium text-sm text-foreground">{food.food_name}</div>
                <div className="text-xs text-muted-foreground">
                  {food.serving_defaults?.calories} cal • {food.usage_count} uses
                </div>
              </button>
            ))}
          </>
        )}

        {query && foods.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mt-4">Search Results</h3>
            {foods.map((food) => (
              <FoodCard
                key={food.fdc_id}
                food={food}
                onSelect={() => onSelectFood(food)}
              />
            ))}
          </>
        )}

        {query && !searching && foods.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No foods found</p>
          </div>
        )}
      </div>
    </div>
  );
}
