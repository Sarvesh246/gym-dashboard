"use client";

import { useState, useEffect, useCallback } from "react";
import { HYDRATION_PRESETS_ML } from "@/lib/nutrition/conversions";

interface HydrationTrackerProps {
  date?: string;
  onUpdate?: (total_ml: number) => void;
}

interface HydrationState {
  total_ml: number;
  target_ml: number;
  remaining_ml: number;
  percentage: number;
}

const PRESET_AMOUNTS = [200, 250, 350, 500, 750, 1000];

export default function HydrationTracker({ date, onUpdate }: HydrationTrackerProps) {
  const [state, setState] = useState<HydrationState>({
    total_ml: 0,
    target_ml: 2500,
    remaining_ml: 2500,
    percentage: 0,
  });
  const [customAmount, setCustomAmount] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const today = date ?? new Date().toISOString().split("T")[0];

  const loadHydration = useCallback(async () => {
    try {
      const res = await fetch(`/api/hydration?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setState({
          total_ml: data.total_ml,
          target_ml: data.target_ml,
          remaining_ml: data.remaining_ml,
          percentage: data.percentage,
        });
        onUpdate?.(data.total_ml);
      }
    } catch {
      // silently fail
    }
  }, [today, onUpdate]);

  useEffect(() => {
    loadHydration();
  }, [loadHydration]);

  const logWater = async (amount_ml: number) => {
    if (isLogging) return;
    setIsLogging(true);

    // Optimistic update
    setState((prev) => {
      const next_total = prev.total_ml + amount_ml;
      return {
        total_ml: next_total,
        target_ml: prev.target_ml,
        remaining_ml: Math.max(0, prev.target_ml - next_total),
        percentage: Math.min(100, Math.round((next_total / prev.target_ml) * 100)),
      };
    });

    try {
      const res = await fetch("/api/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml }),
      });

      if (res.ok) {
        const data = await res.json();
        setState({
          total_ml: data.total_ml,
          target_ml: data.target_ml,
          remaining_ml: data.remaining_ml,
          percentage: data.percentage,
        });
        onUpdate?.(data.total_ml);
      } else {
        // Revert optimistic update
        await loadHydration();
      }
    } catch {
      await loadHydration();
    } finally {
      setIsLogging(false);
      setCustomAmount("");
      setShowCustom(false);
    }
  };

  const handleCustomAdd = () => {
    const ml = parseInt(customAmount, 10);
    if (ml > 0 && ml <= 2000) {
      logWater(ml);
    }
  };

  const { total_ml, target_ml, percentage } = state;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Hydration</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(total_ml)}
              <span className="text-xs"> / {target_ml}ml</span>
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                background:
                  percentage >= 100
                    ? "var(--color-success)"
                    : percentage >= 70
                    ? "#3b82f6"
                    : percentage >= 40
                    ? "#60a5fa"
                    : "#93c5fd",
              }}
            />
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-500 w-12 text-right">
          {percentage}%
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESET_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => logWater(ml)}
            disabled={isLogging}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
          >
            +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted text-muted-foreground hover:bg-accent transition-colors"
        >
          Custom
        </button>
      </div>

      {/* Custom entry */}
      {showCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            placeholder="Amount in ml"
            min="1"
            max="2000"
            className="flex-1 px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <button
            onClick={handleCustomAdd}
            disabled={!customAmount || parseInt(customAmount) <= 0}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
