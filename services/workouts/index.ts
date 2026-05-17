/**
 * Workout service — DB reads/writes for workouts, workout_exercises, logged_workouts, logged_sets.
 * Server-side only. Falls back gracefully when tables don't exist.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Workout,
  WorkoutExercise,
  WorkoutWithExercises,
  WorkoutExerciseWithMeta,
  LoggedWorkout,
  LoggedSet,
  GeneratorOutput,
} from "@/lib/training/types";
import { getExercise, MUSCLE_LABELS } from "@/lib/muscles/mapping";

// ─── Read workouts ─────────────────────────────────────────────────────────────

export async function getUserWorkouts(userId: string): Promise<Workout[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Workout[];
  } catch {
    return [];
  }
}

export async function getWorkout(workoutId: string, userId: string): Promise<Workout | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("workouts")
      .select("*")
      .eq("id", workoutId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;
    return data as Workout;
  } catch {
    return null;
  }
}

export async function getWorkoutWithExercises(
  workoutId: string,
  userId: string
): Promise<WorkoutWithExercises | null> {
  try {
    const supabase = await createClient();
    const [workoutResult, exercisesResult] = await Promise.all([
      (supabase as any)
        .from("workouts")
        .select("*")
        .eq("id", workoutId)
        .eq("user_id", userId)
        .single(),
      (supabase as any)
        .from("workout_exercises")
        .select("*")
        .eq("workout_id", workoutId)
        .order("order_index", { ascending: true }),
    ]);

    if (workoutResult.error || !workoutResult.data) return null;

    const exercises: WorkoutExerciseWithMeta[] = (
      (exercisesResult.data ?? []) as WorkoutExercise[]
    ).map((we) => {
      const ex = getExercise(we.exercise_id);
      return {
        ...we,
        exercise_name:    ex?.name ?? we.exercise_id,
        primary_muscles:  ex?.primary_muscles ?? [],
        secondary_muscles: ex?.secondary_muscles ?? [],
        movement_pattern: ex?.movement_pattern ?? "isolation_push",
        fatigue_factor:   ex?.fatigue_factor ?? 0.5,
        equipment:        ex?.equipment ?? [],
        performance:      null,
      };
    });

    return { ...(workoutResult.data as Workout), exercises };
  } catch {
    return null;
  }
}

// ─── Create / save workouts ────────────────────────────────────────────────────

export async function saveGeneratedWorkout(
  userId: string,
  generated: GeneratorOutput
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: workout, error: wErr } = await (supabase as any)
      .from("workouts")
      .insert({
        user_id:            userId,
        name:               generated.name,
        split_type:         generated.split_type,
        workout_day:        generated.workout_day,
        estimated_duration: generated.estimated_duration,
        target_muscles:     generated.target_muscles,
        difficulty_tier:    generated.difficulty_tier,
        generated_by_ai:    false,
        created_at:         new Date().toISOString(),
      })
      .select("id")
      .single();

    if (wErr || !workout) return null;

    const workoutId = workout.id as string;

    const exerciseRows = generated.exercises.map((e) => ({
      workout_id:       workoutId,
      exercise_id:      e.exercise_id,
      order_index:      e.order_index,
      target_sets:      e.target_sets,
      target_rep_min:   e.target_rep_min,
      target_rep_max:   e.target_rep_max,
      target_rpe:       e.target_rpe,
      rest_seconds:     e.rest_seconds,
      notes:            null,
      progression_type: e.progression_type,
    }));

    await (supabase as any).from("workout_exercises").insert(exerciseRows);

    return workoutId;
  } catch {
    return null;
  }
}

export async function updateWorkoutExercises(
  workoutId: string,
  userId: string,
  exercises: Partial<WorkoutExercise>[]
): Promise<boolean> {
  try {
    // Verify ownership
    const supabase = await createClient();
    const { data: workout } = await (supabase as any)
      .from("workouts")
      .select("id")
      .eq("id", workoutId)
      .eq("user_id", userId)
      .single();

    if (!workout) return false;

    // Delete and re-insert for clean ordering
    await (supabase as any)
      .from("workout_exercises")
      .delete()
      .eq("workout_id", workoutId);

    if (exercises.length > 0) {
      await (supabase as any)
        .from("workout_exercises")
        .insert(exercises.map((e, i) => ({ ...e, workout_id: workoutId, order_index: i })));
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("workouts")
      .delete()
      .eq("id", workoutId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

// ─── Session (logged_workouts) ────────────────────────────────────────────────

export async function deleteLoggedWorkout(sessionId: string, userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("logged_workouts")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

export async function createLoggedWorkout(
  userId: string,
  workoutId: string | null,
  workoutName?: string
): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("logged_workouts")
      .insert({
        user_id:     userId,
        workout_id:  workoutId,
        performed_at: new Date().toISOString(),
        created_at:  new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export async function finalizeLoggedWorkout(
  loggedWorkoutId: string,
  userId: string,
  data: {
    duration_minutes: number;
    workout_rating: number | null;
    soreness_rating: number | null;
    energy_rating: number | null;
    notes: string | null;
  }
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("logged_workouts")
      .update({ ...data })
      .eq("id", loggedWorkoutId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

export async function getRecentLoggedWorkouts(
  userId: string,
  limit = 10
): Promise<LoggedWorkout[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("logged_workouts")
      .select("*")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as LoggedWorkout[];
  } catch {
    return [];
  }
}

export async function getLoggedWorkoutWithSets(
  loggedWorkoutId: string,
  userId: string
): Promise<{ workout: LoggedWorkout; sets: LoggedSet[] } | null> {
  try {
    const supabase = await createClient();
    const [wRes, sRes] = await Promise.all([
      (supabase as any)
        .from("logged_workouts")
        .select("*")
        .eq("id", loggedWorkoutId)
        .eq("user_id", userId)
        .single(),
      (supabase as any)
        .from("logged_sets")
        .select("*")
        .eq("logged_workout_id", loggedWorkoutId)
        .order("created_at", { ascending: true }),
    ]);

    if (wRes.error || !wRes.data) return null;
    return {
      workout: wRes.data as LoggedWorkout,
      sets:    (sRes.data ?? []) as LoggedSet[],
    };
  } catch {
    return null;
  }
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function upsertLoggedSet(
  loggedWorkoutId: string,
  set: Omit<LoggedSet, "id" | "logged_workout_id" | "created_at">
): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("logged_sets")
      .insert({
        logged_workout_id: loggedWorkoutId,
        ...set,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export async function updateLoggedSet(
  setId: string,
  update: Partial<Pick<LoggedSet, "reps" | "weight" | "rpe" | "completed" | "failed">>
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("logged_sets")
      .update(update)
      .eq("id", setId);
    return !error;
  } catch {
    return false;
  }
}

// ─── Streak / weekly stats ─────────────────────────────────────────────────────

export async function getWorkoutStreak(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("logged_workouts")
      .select("performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(60);

    if (!data || data.length === 0) return 0;

    const dates = (data as { performed_at: string }[])
      .map((d) => new Date(d.performed_at).toDateString())
      .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate by day

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (dates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch {
    return 0;
  }
}

export async function getWeeklyWorkoutCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await (supabase as any)
      .from("logged_workouts")
      .select("id")
      .eq("user_id", userId)
      .gte("performed_at", since);

    return data ? (data as unknown[]).length : 0;
  } catch {
    return 0;
  }
}
