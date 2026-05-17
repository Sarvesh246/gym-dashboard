"use server";

import { createClient } from "@/lib/supabase/server";
import { saveGeneratedWorkout } from "@/services/workouts";
import { generateWorkout } from "@/lib/training/generator";
import { getSystemicRecovery } from "@/services/recovery";
import { getMuscleStates } from "@/services/muscles";
import { MIN_MUSCLE_RECOVERY_TO_TRAIN } from "@/lib/training/constants";
import { fetchWgerExercises } from "@/lib/wger/client";
import { getCurrentUserRole } from "@/lib/saas/rbac";
import type { GeneratorInput, SplitType, WorkoutDay } from "@/lib/training/types";
import type { MuscleGroup } from "@/lib/recovery/types";

export async function generateAndSaveWorkout(
  split_type: SplitType,
  workout_day: WorkoutDay
): Promise<{ workoutId: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { workoutId: null, error: "Unauthorized" };

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("training_level, primary_goal, equipment, workout_days_per_week")
      .eq("user_id", user.id)
      .single();

    const [systemic, muscleStates] = await Promise.all([
      getSystemicRecovery(user.id),
      getMuscleStates(user.id),
    ]);

    const availableMuscles: MuscleGroup[] = muscleStates.length > 0
      ? muscleStates
          .filter((ms) => ms.recovery_score >= MIN_MUSCLE_RECOVERY_TO_TRAIN)
          .map((ms) => ms.muscle_group)
      : [];

    const input: GeneratorInput = {
      user_id:            user.id,
      training_level:     profile?.training_level ?? "intermediate",
      goal:               profile?.primary_goal ?? "general_fitness",
      split_type,
      workout_day,
      equipment:          profile?.equipment ?? [],
      available_muscles:  availableMuscles,
      systemic_readiness: systemic?.readiness_score ?? 70,
      days_per_week:      profile?.workout_days_per_week ?? 3,
    };

    const generated = generateWorkout(input);
    const workoutId = await saveGeneratedWorkout(user.id, generated);

    return { workoutId };
  } catch (err) {
    return { workoutId: null, error: "Failed to generate workout" };
  }
}

export async function syncWgerExercises(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const role = await getCurrentUserRole();
    if (role !== "admin") {
      return { success: false, error: "Admin only" };
    }

    console.log("[syncWgerExercises] Starting fetch from WGER API...");
    const exercises = await fetchWgerExercises();

    if (exercises.length === 0) {
      return { success: false, error: "No exercises fetched from WGER" };
    }

    console.log(`[syncWgerExercises] Fetched ${exercises.length} exercises, upserting...`);

    const rows = exercises.map((e) => ({
      wger_id:              e.id,
      name:                 e.name,
      description:          e.description || null,
      equipment_ids:        e.equipment || [],
      muscle_ids:           e.muscles || [],
      secondary_muscle_ids: e.muscles_secondary || [],
      images:               e.images || [],
      synced_at:            new Date().toISOString(),
    }));

    // Upsert in batches (Supabase has limits)
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await (supabase as any)
        .from("wger_exercises")
        .upsert(batch, { onConflict: "wger_id" });

      if (error) {
        console.error(`[syncWgerExercises] Batch ${i / batchSize + 1} failed:`, error);
        return { success: false, error: `Upsert failed: ${error.message}` };
      }
    }

    console.log(`[syncWgerExercises] Successfully synced ${exercises.length} exercises`);
    return { success: true, count: exercises.length };
  } catch (err) {
    console.error("[syncWgerExercises]", err);
    return { success: false, error: "Sync failed" };
  }
}
