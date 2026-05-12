"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info, TrendingUp } from "lucide-react";
import { SetLogger } from "./SetLogger";
import type { ActiveExerciseState, ActiveSetEntry } from "@/lib/training/types";
import { MUSCLE_LABELS } from "@/lib/muscles/mapping";

interface Props {
  exercise: ActiveExerciseState;
  isCurrentExercise: boolean;
  onSetComplete: (setIndex: number, entry: Omit<ActiveSetEntry, "set_number">) => void;
  onSetFail: (setIndex: number) => void;
  currentSetIndex: number;
}

export function ExerciseCard({
  exercise,
  isCurrentExercise,
  onSetComplete,
  onSetFail,
  currentSetIndex,
}: Props) {
  const [showHistory, setShowHistory] = useState(false);

  const completedSets = exercise.sets.filter((s) => s.completed || s.failed);
  const allDone = completedSets.length >= exercise.target_sets;

  const perf = exercise.lastPerformance;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isCurrentExercise
          ? "border-primary/40 bg-card shadow-md"
          : allDone
          ? "border-green-500/30 bg-green-500/5 opacity-80"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {allDone && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  ✓ Done
                </span>
              )}
              <h3 className="text-base font-semibold text-foreground leading-tight">
                {exercise.exercise_name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-muted-foreground">
                {exercise.target_sets} sets · {exercise.target_rep_min}–{exercise.target_rep_max} reps
              </span>
              <span className="text-xs text-muted-foreground">
                RPE {exercise.target_rpe} · {exercise.rest_seconds}s rest
              </span>
            </div>
          </div>

          {/* History toggle */}
          {perf && (
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <TrendingUp size={12} />
              {showHistory ? "Hide" : "Stats"}
            </button>
          )}
        </div>

        {/* Performance history snippet */}
        {showHistory && perf && (
          <div className="mt-3 p-3 rounded-xl bg-muted/50 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Best</p>
              <p className="text-sm font-bold text-foreground">{perf.best_weight}kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. 1RM</p>
              <p className="text-sm font-bold text-foreground">
                {Math.round(perf.estimated_1rm)}kg
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trend</p>
              <p
                className={`text-sm font-bold capitalize ${
                  perf.progression_trend === "progressing"
                    ? "text-green-500"
                    : perf.progression_trend === "regressing"
                    ? "text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {perf.progression_trend}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Set list */}
      <div className="px-4 pb-4 space-y-2">
        {Array.from({ length: exercise.target_sets }).map((_, i) => {
          const setEntry = exercise.sets[i];
          const isActiveSet = isCurrentExercise && i === currentSetIndex && !allDone;

          if (setEntry?.completed || setEntry?.failed) {
            // Completed set — show summary row
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  setEntry.failed
                    ? "bg-destructive/10 text-destructive"
                    : "bg-green-500/10 text-green-600 dark:text-green-400"
                }`}
              >
                <span className="font-medium w-6 text-xs">{i + 1}</span>
                {setEntry.failed ? (
                  <span className="flex-1 text-xs">Failed</span>
                ) : (
                  <span className="flex-1 text-xs font-medium">
                    {setEntry.reps} reps
                    {setEntry.weight != null ? ` × ${setEntry.weight}kg` : ""}
                    {setEntry.rpe != null ? ` · RPE ${setEntry.rpe}` : ""}
                  </span>
                )}
              </div>
            );
          }

          return (
            <SetLogger
              key={i}
              setNumber={i + 1}
              targetReps={{ min: exercise.target_rep_min, max: exercise.target_rep_max }}
              suggestedWeight={perf?.best_weight ?? null}
              previousEntry={null}
              onComplete={(entry) => onSetComplete(i, entry)}
              onFail={() => onSetFail(i)}
              isActive={isActiveSet}
            />
          );
        })}
      </div>
    </div>
  );
}
