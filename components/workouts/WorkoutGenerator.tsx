"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Zap, ChevronRight, Loader2 } from "lucide-react";
import { SPLIT_LABELS, SPLIT_DAYS, WORKOUT_DAY_LABELS } from "@/lib/training/constants";
import type { SplitType, WorkoutDay } from "@/lib/training/types";

interface Props {
  defaultSplit?: SplitType;
  readinessScore?: number;
}

export function WorkoutGenerator({ defaultSplit = "push_pull_legs", readinessScore = 75 }: Props) {
  const router = useRouter();
  const [split, setSplit] = useState<SplitType>(defaultSplit);
  const [day, setDay] = useState<WorkoutDay>(SPLIT_DAYS[defaultSplit][0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSplitChange = (s: SplitType) => {
    setSplit(s);
    setDay(SPLIT_DAYS[s][0]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/workouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ split_type: split, workout_day: day, save: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.workout_id) throw new Error(data.error ?? "Generation failed");
      router.push(`/workouts/session/${data.workout_id}?new=1`);
    } catch (err) {
      setError("Failed to generate workout. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const readinessTier =
    readinessScore >= 70 ? "green" : readinessScore >= 45 ? "yellow" : "red";

  const readinessBadge = {
    green:  { label: "Ready", color: "text-green-500 bg-green-500/10" },
    yellow: { label: "Reduced load", color: "text-yellow-500 bg-yellow-500/10" },
    red:    { label: "Low readiness", color: "text-red-400 bg-red-400/10" },
  }[readinessTier];

  return (
    <div className="space-y-4">
      {/* Readiness banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
        <Zap size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Readiness:</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${readinessBadge.color}`}>
          {readinessScore}% · {readinessBadge.label}
        </span>
      </div>

      {/* Split selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Split</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SPLIT_LABELS) as SplitType[]).map((s) => (
            <button
              key={s}
              onClick={() => handleSplitChange(s)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                split === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {SPLIT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Day selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Day</label>
        <div className="flex flex-wrap gap-2">
          {SPLIT_DAYS[split].map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                day === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {WORKOUT_DAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Dumbbell size={16} />
            Generate Workout
            <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
