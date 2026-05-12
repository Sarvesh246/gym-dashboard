"use client";

import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { getAllExercises, MUSCLE_LABELS } from "@/lib/muscles/mapping";
import type { ExerciseLibrary, MuscleGroup, MovementPattern } from "@/lib/recovery/types";

const PATTERN_LABELS: Record<MovementPattern, string> = {
  horizontal_push: "Horizontal Push",
  horizontal_pull: "Horizontal Pull",
  vertical_push:   "Vertical Push",
  vertical_pull:   "Vertical Pull",
  squat:           "Squat",
  hinge:           "Hinge",
  carry:           "Carry",
  isolation_push:  "Isolation Push",
  isolation_pull:  "Isolation Pull",
  core:            "Core",
  cardio:          "Cardio",
};

interface Props {
  onSelect?: (exercise: ExerciseLibrary) => void;
  selectedIds?: string[];
}

export function ExerciseSearch({ onSelect, selectedIds = [] }: Props) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "">("");
  const [patternFilter, setPatternFilter] = useState<MovementPattern | "">("");

  const allExercises = useMemo(() => getAllExercises(), []);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.primary_muscles.some((m) => m.includes(q)) ||
          e.movement_pattern.includes(q)
      );
    }
    if (muscleFilter) {
      list = list.filter(
        (e) =>
          e.primary_muscles.includes(muscleFilter) ||
          e.secondary_muscles.includes(muscleFilter)
      );
    }
    if (patternFilter) {
      list = list.filter((e) => e.movement_pattern === patternFilter);
    }
    return list;
  }, [allExercises, query, muscleFilter, patternFilter]);

  const muscles = useMemo(
    () => Array.from(new Set(allExercises.flatMap((e) => e.primary_muscles))).sort(),
    [allExercises]
  );

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10 rounded-xl bg-muted border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | "")}
          className="h-8 rounded-xl bg-muted border border-border px-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All Muscles</option>
          {muscles.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </select>

        <select
          value={patternFilter}
          onChange={(e) => setPatternFilter(e.target.value as MovementPattern | "")}
          className="h-8 rounded-xl bg-muted border border-border px-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All Patterns</option>
          {(Object.keys(PATTERN_LABELS) as MovementPattern[]).map((p) => (
            <option key={p} value={p}>
              {PATTERN_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No exercises found</p>
        ) : (
          filtered.map((ex) => {
            const isSelected = selectedIds.includes(ex.id);
            return (
              <div
                key={ex.id}
                onClick={() => onSelect?.(ex)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50"
                } ${onSelect ? "cursor-pointer" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ex.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.primary_muscles.map((m) => (
                      <span
                        key={m}
                        className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded"
                      >
                        {MUSCLE_LABELS[m]}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      · {PATTERN_LABELS[ex.movement_pattern]}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-xs text-primary font-medium shrink-0">Added</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
