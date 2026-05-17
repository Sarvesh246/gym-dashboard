"use server";

import { createClient } from "@/lib/supabase/server";
import { saveGeneratedWorkout, upsertLoggedSet, finalizeLoggedWorkout } from "@/services/workouts";
import { generateWorkout } from "@/lib/training/generator";
import { getSystemicRecovery } from "@/services/recovery";
import { getMuscleStates } from "@/services/muscles";
import { MIN_MUSCLE_RECOVERY_TO_TRAIN } from "@/lib/training/constants";
import { fetchWgerExercises } from "@/lib/wger/client";
import { getCurrentUserRole } from "@/lib/saas/rbac";
import { updateAllExercisePerformances } from "@/services/performance";
import { persistStrainLog, upsertSystemicRecovery, getSystemicRecovery as getSystemic } from "@/services/recovery";
import { applyWorkoutStrainToMuscles } from "@/services/muscles";
import { calculateWorkoutStrain } from "@/lib/recovery/scoring";
import type { GeneratorInput, SplitType, WorkoutDay } from "@/lib/training/types";
import type { MuscleGroup } from "@/lib/recovery/types";
import type { WorkoutSet } from "@/lib/recovery/types";

export type ManualSet = {
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

export async function saveManualWorkout(input: {
  performed_at: string;
  duration_minutes: number | null;
  workout_rating: number | null;
  soreness_rating: number | null;
  energy_rating: number | null;
  notes: string | null;
  sets: ManualSet[];
}): Promise<{ sessionId: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { sessionId: null, error: "Unauthorized" };

    // Create the logged_workout row with the chosen date
    const { data: lw, error: lwErr } = await (supabase as any)
      .from("logged_workouts")
      .insert({
        user_id:      user.id,
        workout_id:   null,
        performed_at: input.performed_at,
        created_at:   new Date().toISOString(),
      })
      .select("id")
      .single();

    if (lwErr || !lw) return { sessionId: null, error: "Failed to create session" };
    const sessionId: string = lw.id;

    // Insert all sets
    await Promise.all(
      input.sets.map((s) =>
        upsertLoggedSet(sessionId, {
          exercise_id: s.exercise_id,
          set_number:  s.set_number,
          weight:      s.weight,
          reps:        s.reps,
          rpe:         s.rpe,
          completed:   true,
          failed:      false,
        })
      )
    );

    // Finalize with metadata
    await finalizeLoggedWorkout(sessionId, user.id, {
      duration_minutes: input.duration_minutes ?? 0,
      workout_rating:   input.workout_rating,
      soreness_rating:  input.soreness_rating,
      energy_rating:    input.energy_rating,
      notes:            input.notes,
    });

    // Fire-and-forget: update performance history & strain
    updateAllExercisePerformances(user.id, sessionId).catch(() => {});

    if (input.sets.length > 0) {
      try {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("training_level")
          .eq("user_id", user.id)
          .single();

        const trainingLevel = profile?.training_level ?? "intermediate";
        const byExercise = new Map<string, ManualSet[]>();
        for (const s of input.sets) {
          const arr = byExercise.get(s.exercise_id) ?? [];
          arr.push(s);
          byExercise.set(s.exercise_id, arr);
        }

        const workoutSets: WorkoutSet[] = Array.from(byExercise.entries()).map(
          ([exerciseId, sets]) => ({
            exercise_id: exerciseId,
            sets:        sets.length,
            reps:        Math.round(sets.reduce((a, s) => a + (s.reps ?? 0), 0) / sets.length),
            weight_kg:   Math.round(sets.reduce((a, s) => a + (s.weight ?? 0), 0) / sets.length),
            rpe:         sets[0].rpe ?? undefined,
          })
        );

        const strain = calculateWorkoutStrain({
          sets:             workoutSets,
          training_level:   trainingLevel,
          duration_minutes: input.duration_minutes ?? 45,
        });

        const finishedAt = new Date().toISOString();
        await Promise.all([
          persistStrainLog(user.id, sessionId, strain),
          applyWorkoutStrainToMuscles(user.id, strain.local_muscle_loads, finishedAt),
        ]);

        const existing = await getSystemic(user.id);
        const newAccumulation = Math.min(1000, (existing?.strain_accumulation ?? 0) + strain.estimated_strain);
        await upsertSystemicRecovery(user.id, {
          systemic_fatigue:    Math.min(100, (existing?.systemic_fatigue ?? 0) + strain.systemic_load * 0.3),
          strain_accumulation: newAccumulation,
          recovery_tier:       existing?.recovery_tier ?? "green",
          nutrient_modifier:   0,
        });
      } catch {
        // Recovery update is non-critical
      }
    }

    return { sessionId };
  } catch (err) {
    console.error("[saveManualWorkout]", err);
    return { sessionId: null, error: "Failed to save workout" };
  }
}

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
