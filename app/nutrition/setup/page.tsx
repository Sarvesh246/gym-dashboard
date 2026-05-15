"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoalStrategy, ActivityLevel } from "@/lib/nutrition/types";

const STRATEGIES: { value: GoalStrategy; label: string; description: string }[] = [
  { value: "maintenance", label: "Maintenance", description: "Maintain current weight and body composition" },
  { value: "recomp", label: "Body Recomp", description: "Lose fat and gain muscle simultaneously" },
  { value: "lean_bulk", label: "Lean Bulk", description: "Gradual muscle gain with minimal fat gain (+300 kcal)" },
  { value: "aggressive_bulk", label: "Aggressive Bulk", description: "Maximize muscle growth (+500 kcal)" },
  { value: "slow_cut", label: "Slow Cut", description: "Gradual fat loss while preserving muscle (−300 kcal)" },
  { value: "aggressive_cut", label: "Aggressive Cut", description: "Faster fat loss, higher protein (−500 kcal)" },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary", label: "Sedentary", description: "Desk job, little or no exercise" },
  { value: "light", label: "Lightly Active", description: "Light exercise 1–3 days/week" },
  { value: "moderate", label: "Moderately Active", description: "Moderate exercise 3–5 days/week" },
  { value: "very_active", label: "Very Active", description: "Hard exercise 6–7 days/week" },
  { value: "extremely_active", label: "Extremely Active", description: "Very hard exercise + physical job" },
];

export default function NutritionSetupPage() {
  const router = useRouter();
  const [strategy, setStrategy] = useState<GoalStrategy>("maintenance");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [calorieOverride, setCalorieOverride] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          activity_level: activityLevel,
          calorie_override: calorieOverride ? Number(calorieOverride) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save goals");
        return;
      }

      router.push("/nutrition");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground text-xl font-light"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Nutrition Goals</h1>
              <p className="text-sm text-muted-foreground">Set your calorie and macro targets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Goal Strategy */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-1">Your Goal</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Targets are calculated from your profile using the Mifflin-St Jeor formula.
          </p>
          <div className="space-y-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  strategy === s.value
                    ? "border-success bg-success/5"
                    : "border-border bg-card hover:border-success/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{s.label}</span>
                  {strategy === s.value && (
                    <span className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-white text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Activity Level */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-1">Activity Level</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Used to calculate your TDEE (Total Daily Energy Expenditure).
          </p>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.value}
                onClick={() => setActivityLevel(a.value)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activityLevel === a.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{a.label}</span>
                  {activityLevel === a.value && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Calorie override */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Custom Calorie Target
            <span className="text-xs font-normal text-muted-foreground ml-2">(optional)</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Leave blank to use the calculated target based on your goal and activity level.
          </p>
          <input
            type="number"
            value={calorieOverride}
            onChange={(e) => setCalorieOverride(e.target.value)}
            placeholder="e.g. 2200"
            min="1000"
            max="6000"
            className="w-full px-4 py-3 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          {isSaving ? "Calculating targets..." : "Save & Start Tracking"}
        </button>
      </div>
    </div>
  );
}
