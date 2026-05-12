/**
 * Performance service — exercise PR tracking, 1RM history, progression trend analysis.
 * Server-side only.
 */

import { createClient } from "@/lib/supabase/server";
import type { LoggedSet, ExercisePerformanceHistory, ProgressionTrend } from "@/lib/training/types";
import {
  bestWeight,
  bestEstimated1RM,
  calculateSessionVolume,
  rollingVolumeAverage,
} from "@/lib/training/volume";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<ExercisePerformanceHistory | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("exercise_performance_history")
      .select("*")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .single();

    if (error || !data) return null;
    return data as ExercisePerformanceHistory;
  } catch {
    return null;
  }
}

export async function getAllExerciseHistory(
  userId: string
): Promise<ExercisePerformanceHistory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("exercise_performance_history")
      .select("*")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data as ExercisePerformanceHistory[];
  } catch {
    return [];
  }
}

// ─── Last N sessions for an exercise ─────────────────────────────────────────

export async function getExerciseRecentSets(
  userId: string,
  exerciseId: string,
  sessions = 5
): Promise<{ performed_at: string; sets: LoggedSet[] }[]> {
  try {
    const supabase = await createClient();

    // Get recent logged_workout ids that contain this exercise
    const { data: setData } = await (supabase as any)
      .from("logged_sets")
      .select("logged_workout_id, reps, weight, rpe, completed, failed, set_number, created_at")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(sessions * 6); // rough upper bound

    if (!setData || (setData as unknown[]).length === 0) return [];

    // Group by logged_workout_id and fetch performed_at
    const workoutIds = Array.from(
      new Set((setData as LoggedSet[]).map((s) => s.logged_workout_id))
    ).slice(0, sessions);

    const { data: workoutData } = await (supabase as any)
      .from("logged_workouts")
      .select("id, performed_at, user_id")
      .in("id", workoutIds)
      .eq("user_id", userId)
      .order("performed_at", { ascending: false });

    if (!workoutData) return [];

    return (workoutData as { id: string; performed_at: string }[]).map((w) => ({
      performed_at: w.performed_at,
      sets: (setData as (LoggedSet & { logged_workout_id: string })[])
        .filter((s) => s.logged_workout_id === w.id),
    }));
  } catch {
    return [];
  }
}

// ─── Upsert after session ─────────────────────────────────────────────────────

export async function updateExercisePerformance(
  userId: string,
  exerciseId: string,
  sessionSets: LoggedSet[],
  priorSessions: { performed_at: string; sets: LoggedSet[] }[]
): Promise<void> {
  try {
    const supabase = await createClient();

    const existing = await getExerciseHistory(userId, exerciseId);

    const sessionBestWeight = bestWeight(sessionSets);
    const sessionBest1RM    = bestEstimated1RM(sessionSets);
    const sessionVolume     = calculateSessionVolume(sessionSets);
    const allSessions       = [
      { performed_at: new Date().toISOString(), sets: sessionSets },
      ...priorSessions,
    ];
    const rolling = rollingVolumeAverage(allSessions, exerciseId);

    const newBestWeight = Math.max(sessionBestWeight, existing?.best_weight ?? 0);
    const newBest1RM    = Math.max(sessionBest1RM, existing?.estimated_1rm ?? 0);
    const newBestVol    = Math.max(sessionVolume, existing?.best_volume ?? 0);

    // Determine trend
    const prevRolling = existing?.rolling_volume_average ?? 0;
    let trend: ProgressionTrend = "stable";
    if (rolling > prevRolling * 1.05) trend = "progressing";
    else if (rolling < prevRolling * 0.9) trend = "regressing";

    await (supabase as any)
      .from("exercise_performance_history")
      .upsert(
        {
          user_id:                userId,
          exercise_id:            exerciseId,
          best_weight:            newBestWeight,
          best_volume:            newBestVol,
          estimated_1rm:          newBest1RM,
          rolling_volume_average: rolling,
          last_performed_at:      new Date().toISOString(),
          progression_trend:      trend,
          updated_at:             new Date().toISOString(),
        },
        { onConflict: "user_id,exercise_id" }
      );
  } catch {
    // Non-fatal
  }
}

// ─── Bulk update after session ────────────────────────────────────────────────

export async function updateAllExercisePerformances(
  userId: string,
  loggedWorkoutId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: sets } = await (supabase as any)
      .from("logged_sets")
      .select("*")
      .eq("logged_workout_id", loggedWorkoutId);

    if (!sets || (sets as unknown[]).length === 0) return;

    const byExercise = new Map<string, LoggedSet[]>();
    for (const s of sets as LoggedSet[]) {
      const arr = byExercise.get(s.exercise_id) ?? [];
      arr.push(s);
      byExercise.set(s.exercise_id, arr);
    }

    await Promise.all(
      Array.from(byExercise.entries()).map(async ([exerciseId, exerciseSets]) => {
        const prior = await getExerciseRecentSets(userId, exerciseId, 5);
        return updateExercisePerformance(userId, exerciseId, exerciseSets, prior);
      })
    );
  } catch {
    // Non-fatal
  }
}
