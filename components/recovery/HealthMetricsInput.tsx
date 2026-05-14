"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HealthMetricsInput } from "@/services/health";

interface HealthMetricsFormProps {
  onSubmit: (metrics: HealthMetricsInput) => Promise<void>;
  isLoading?: boolean;
}

export function HealthMetricsInput({ onSubmit, isLoading = false }: HealthMetricsFormProps) {
  const [sleepHours, setSleepHours] = useState<number | "">(7);
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [hrvScore, setHrvScore] = useState<number | "">(60);
  const [hydrationScore, setHydrationScore] = useState<number>(70);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await onSubmit({
        sleep_hours: sleepHours !== "" ? Number(sleepHours) : undefined,
        sleep_quality: sleepQuality ? sleepQuality : undefined,
        stress_level: stressLevel ? stressLevel : undefined,
        hrv_score: hrvScore !== "" ? Number(hrvScore) : undefined,
        hydration_score: hydrationScore ? hydrationScore : undefined,
      });
      setSuccess(true);
      // Reset form
      setSleepHours(7);
      setSleepQuality(7);
      setStressLevel(5);
      setHrvScore(60);
      setHydrationScore(70);
    } catch (err) {
      setError((err as Error).message || "Failed to save metrics");
    }
  }

  return (
    <SectionCard title="Daily Health Log" subtitle="Track your sleep, stress, and biometric data to improve recovery scoring">
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sleep Hours */}
          <div className="space-y-2">
            <Label htmlFor="sleep-hours" className="text-sm font-medium">
              Sleep Hours: {sleepHours !== "" ? sleepHours.toFixed(1) : "—"}
            </Label>
            <Input
              id="sleep-hours"
              type="number"
              min="0"
              max="16"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="7.0"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Optimal: 7–9 hours</p>
          </div>

          {/* Sleep Quality */}
          <div className="space-y-2">
            <Label htmlFor="sleep-quality" className="text-sm font-medium">
              Sleep Quality: {sleepQuality}/10
            </Label>
            <input
              id="sleep-quality"
              type="range"
              min={1}
              max={10}
              step={1}
              value={sleepQuality}
              onChange={(e) => setSleepQuality(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {sleepQuality <= 3 ? "Poor sleep 😴" : sleepQuality <= 6 ? "Okay sleep 🙂" : "Good sleep 😴"}
            </p>
          </div>

          {/* Stress Level */}
          <div className="space-y-2">
            <Label htmlFor="stress-level" className="text-sm font-medium">
              Stress Level: {stressLevel}/10
            </Label>
            <input
              id="stress-level"
              type="range"
              min={1}
              max={10}
              step={1}
              value={stressLevel}
              onChange={(e) => setStressLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {stressLevel <= 3 ? "Low stress ✅" : stressLevel <= 6 ? "Moderate stress ⚠️" : "High stress ⚠️"}
            </p>
          </div>

          {/* HRV Score */}
          <div className="space-y-2">
            <Label htmlFor="hrv-score" className="text-sm font-medium">
              HRV Score (optional): {hrvScore !== "" ? hrvScore : "—"}
            </Label>
            <Input
              id="hrv-score"
              type="number"
              min="0"
              max="100"
              step="1"
              value={hrvScore}
              onChange={(e) => setHrvScore(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="60"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">0–100 (higher = better recovery capacity)</p>
          </div>

          {/* Hydration Score */}
          <div className="space-y-2">
            <Label htmlFor="hydration-score" className="text-sm font-medium">
              Hydration Score: {hydrationScore}/100
            </Label>
            <input
              id="hydration-score"
              type="range"
              min={0}
              max={100}
              step={10}
              value={hydrationScore}
              onChange={(e) => setHydrationScore(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Rate your daily hydration intake</p>
          </div>

          {/* Error */}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {/* Success */}
          {success && <div className="text-sm text-green-600">Health metrics saved successfully ✓</div>}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Health Metrics"}
          </Button>
        </form>
    </SectionCard>
  );
}
