/**
 * Progression service — orchestrates progression recommendations using DB data.
 * Server-side only.
 */

import { createClient } from "@/lib/supabase/server";
import { calculateProgression } from "@/lib/training/progression";
import { getExerciseHistory, getExerciseRecentSets } from "@/services/performance";
import { getSystemicRecovery } from "@/services/recovery";
import type { ProgressionInput, ProgressionRecommendation } from "@/lib/training/types";
import type { DifficultyTier } from "@/lib/training/types";

// ─── Get progression recommendation for one exercise ─────────────────────────

export async function getProgressionRecommendation(
  userId: string,
  exerciseId: string,
  trainingLevel: DifficultyTier,
  targetRepMin: number,
  targetRepMax: number,
  targetRpe: number
): Promise<ProgressionRecommendation | null> {
  try {
    const [history, recentSessions, systemic] = await Promise.all([
      getExerciseHistory(userId, exerciseId),
      getExerciseRecentSets(userId, exerciseId, 3),
      getSystemicRecovery(userId),
    ]);

    if (!history && recentSessions.length === 0) return null;

    const lastSession = recentSessions[0];
    if (!lastSession || lastSession.sets.length === 0) return null;

    const input: ProgressionInput = {
      exercise_id:      exerciseId,
      training_level:   trainingLevel,
      current_weight:   history?.best_weight ?? 0,
      target_rep_min:   targetRepMin,
      target_rep_max:   targetRepMax,
      target_rpe:       targetRpe,
      sets_performed:   lastSession.sets.map((s) => ({
        reps:   s.reps ?? 0,
        rpe:    s.rpe,
        failed: s.failed,
      })),
      readiness_score:  systemic?.readiness_score ?? 75,
      systemic_fatigue: systemic?.systemic_fatigue ?? 30,
      recent_soreness:  3,
    };

    return calculateProgression(input);
  } catch {
    return null;
  }
}

// ─── Batch recommendations for a full workout ─────────────────────────────────

export async function getWorkoutProgressionRecommendations(
  userId: string,
  exerciseIds: { id: string; rep_min: number; rep_max: number; rpe: number }[],
  trainingLevel: DifficultyTier
): Promise<ProgressionRecommendation[]> {
  const results = await Promise.all(
    exerciseIds.map((e) =>
      getProgressionRecommendation(userId, e.id, trainingLevel, e.rep_min, e.rep_max, e.rpe)
    )
  );
  return results.filter((r): r is ProgressionRecommendation => r !== null);
}
