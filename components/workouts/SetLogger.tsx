"use client";

import { useState, useRef } from "react";
import { Check, X } from "lucide-react";
import type { ActiveSetEntry } from "@/lib/training/types";

interface Props {
  setNumber: number;
  targetReps: { min: number; max: number };
  suggestedWeight: number | null;
  previousEntry: { reps: number; weight: number } | null;
  onComplete: (entry: Omit<ActiveSetEntry, "set_number">) => void;
  onFail: () => void;
  isActive: boolean;
}

export function SetLogger({
  setNumber,
  targetReps,
  suggestedWeight,
  previousEntry,
  onComplete,
  onFail,
  isActive,
}: Props) {
  const [reps, setReps] = useState<string>(
    previousEntry?.reps?.toString() ?? targetReps.min.toString()
  );
  const [weight, setWeight] = useState<string>(
    suggestedWeight?.toString() ?? previousEntry?.weight?.toString() ?? ""
  );
  const [rpe, setRpe] = useState<string>("");
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const handleComplete = () => {
    onComplete({
      reps:      reps ? parseInt(reps, 10) : null,
      weight:    weight ? parseFloat(weight) : null,
      rpe:       rpe ? parseFloat(rpe) : null,
      completed: true,
      failed:    false,
    });
  };

  if (!isActive) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-muted/30 opacity-60">
        <span className="text-xs font-medium text-muted-foreground w-6">{setNumber}</span>
        <span className="text-xs text-muted-foreground flex-1">
          {targetReps.min}–{targetReps.max} reps
          {previousEntry ? ` · prev: ${previousEntry.reps}×${previousEntry.weight}kg` : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-primary w-6">Set {setNumber}</span>
        {previousEntry && (
          <span className="text-xs text-muted-foreground">
            Last: {previousEntry.reps} × {previousEntry.weight}kg
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Target: {targetReps.min}–{targetReps.max} reps
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Weight input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Weight (kg)</label>
          <input
            ref={weightRef}
            type="number"
            inputMode="decimal"
            placeholder={suggestedWeight?.toString() ?? "0"}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full h-12 rounded-xl bg-background border border-border px-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Reps input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Reps</label>
          <input
            ref={repsRef}
            type="number"
            inputMode="numeric"
            placeholder={targetReps.min.toString()}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full h-12 rounded-xl bg-background border border-border px-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* RPE (optional, compact) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">RPE (optional):</span>
        <div className="flex gap-1 flex-wrap">
          {[6, 7, 7.5, 8, 8.5, 9, 10].map((r) => (
            <button
              key={r}
              onClick={() => setRpe(rpe === r.toString() ? "" : r.toString())}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                rpe === r.toString()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-95"
        >
          <Check size={16} />
          Done
        </button>
        <button
          onClick={onFail}
          className="h-11 px-4 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition-colors"
        >
          <X size={14} />
          Fail
        </button>
      </div>
    </div>
  );
}
