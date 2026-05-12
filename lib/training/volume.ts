/**
 * Performance metrics: volume, estimated 1RM, session summaries.
 * Pure functions — no I/O.
 */

import { EPLEY_CONSTANT } from "./constants";
import type { LoggedSet, SessionVolumeMetrics } from "./types";
import type { MuscleGroup } from "@/lib/recovery/types";
import { getExercise } from "@/lib/muscles/mapping";

// ─── 1RM estimation (Epley formula) ──────────────────────────────────────────

export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / EPLEY_CONSTANT);
}

// ─── Set volume ───────────────────────────────────────────────────────────────

export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}

// ─── Session volume from logged sets ──────────────────────────────────────────

export function calculateSessionVolume(sets: LoggedSet[]): number {
  return sets
    .filter((s) => s.completed && !s.failed && s.weight != null && s.reps != null)
    .reduce((sum, s) => sum + setVolume(s.weight!, s.reps!), 0);
}

// ─── Best set in a group ──────────────────────────────────────────────────────

export function bestEstimated1RM(sets: LoggedSet[]): number {
  const valid = sets.filter(
    (s) => s.completed && !s.failed && s.weight != null && s.reps != null
  );
  if (valid.length === 0) return 0;
  return Math.max(...valid.map((s) => estimatedOneRepMax(s.weight!, s.reps!)));
}

export function bestWeight(sets: LoggedSet[]): number {
  const valid = sets.filter((s) => s.weight != null && s.completed && !s.failed);
  if (valid.length === 0) return 0;
  return Math.max(...valid.map((s) => s.weight!));
}

// ─── Session metrics ──────────────────────────────────────────────────────────

export function buildSessionMetrics(
  sets: LoggedSet[],
  startedAt: string,
  finishedAt: string
): SessionVolumeMetrics {
  const completedSets = sets.filter((s) => s.completed);
  const totalVolume = calculateSessionVolume(sets);
  const exerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)));

  const musclesSet = new Set<MuscleGroup>();
  for (const id of exerciseIds) {
    const ex = getExercise(id);
    if (ex) {
      ex.primary_muscles.forEach((m) => musclesSet.add(m));
    }
  }

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(finishedAt).getTime();
  const durationMinutes = Math.round((endMs - startMs) / 60_000);

  return {
    total_volume: Math.round(totalVolume),
    total_sets: completedSets.length,
    exercises_trained: exerciseIds.length,
    estimated_duration_minutes: Math.max(1, durationMinutes),
    muscles_trained: Array.from(musclesSet),
  };
}

// ─── Weekly volume aggregation ────────────────────────────────────────────────

export function aggregateWeeklyVolume(
  sessions: { sets: LoggedSet[]; performed_at: string }[]
): import("./types").WeeklyVolumeMetrics {
  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;

  const recent = sessions.filter(
    (s) => new Date(s.performed_at).getTime() >= weekAgo
  );

  const muscleSets: Partial<Record<MuscleGroup, number>> = {};
  let totalVolume = 0;

  for (const session of recent) {
    totalVolume += calculateSessionVolume(session.sets);
    const exIds = new Set(session.sets.map((s) => s.exercise_id));
    for (const id of exIds) {
      const ex = getExercise(id);
      if (!ex) continue;
      const exSets = session.sets.filter((s) => s.exercise_id === id && s.completed).length;
      for (const muscle of ex.primary_muscles) {
        muscleSets[muscle] = (muscleSets[muscle] ?? 0) + exSets;
      }
    }
  }

  return {
    total_volume: Math.round(totalVolume),
    total_sessions: recent.length,
    avg_session_volume: recent.length > 0 ? Math.round(totalVolume / recent.length) : 0,
    muscles_trained: muscleSets,
    training_frequency: recent.length,
  };
}

// ─── Rolling 4-week average volume for an exercise ────────────────────────────

export function rollingVolumeAverage(
  sessions: { sets: LoggedSet[]; performed_at: string }[],
  exerciseId: string
): number {
  const now = Date.now();
  const fourWeeksAgo = now - 28 * 86_400_000;

  const relevant = sessions.filter(
    (s) =>
      new Date(s.performed_at).getTime() >= fourWeeksAgo &&
      s.sets.some((set) => set.exercise_id === exerciseId)
  );

  if (relevant.length === 0) return 0;

  const totalVol = relevant.reduce((sum, session) => {
    const exerciseSets = session.sets.filter((s) => s.exercise_id === exerciseId);
    return sum + calculateSessionVolume(exerciseSets);
  }, 0);

  return Math.round(totalVol / relevant.length);
}
