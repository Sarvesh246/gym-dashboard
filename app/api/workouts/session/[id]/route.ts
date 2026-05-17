import { createClient } from "@/lib/supabase/server";
import {
  getLoggedWorkoutWithSets,
  finalizeLoggedWorkout,
  upsertLoggedSet,
  deleteLoggedWorkout,
} from "@/services/workouts";
import { updateAllExercisePerformances } from "@/services/performance";
import { persistStrainLog, upsertSystemicRecovery, getSystemicRecovery } from "@/services/recovery";
import { applyWorkoutStrainToMuscles, getMuscleStates } from "@/services/muscles";
import { getWeeklyAdherenceStats } from "@/services/nutrition";
import { calculateWorkoutStrain } from "@/lib/recovery/scoring";
import { calculateRecoveryModifier } from "@/services/macros";
import { buildSessionMetrics } from "@/lib/training/volume";
import type { WorkoutSet } from "@/lib/recovery/types";
import type { LoggedSet } from "@/lib/training/types";

// GET — fetch session data
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getLoggedWorkoutWithSets(id, user.id);
  if (!session) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ session });
}

// POST — log a set
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const set = body.set as Omit<LoggedSet, "id" | "logged_workout_id" | "created_at">;

  const setId = await upsertLoggedSet(id, set);
  return Response.json({ set_id: setId });
}

// PATCH — finalize session (post-workout ratings + trigger recovery update)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      duration_minutes,
      workout_rating,
      soreness_rating,
      energy_rating,
      notes,
      started_at,
    } = body as {
      duration_minutes: number;
      workout_rating: number | null;
      soreness_rating: number | null;
      energy_rating: number | null;
      notes: string | null;
      started_at: string;
    };

    const ok = await finalizeLoggedWorkout(id, user.id, {
      duration_minutes,
      workout_rating,
      soreness_rating,
      energy_rating,
      notes,
    });

    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

    // Fire-and-forget: update performance history
    updateAllExercisePerformances(user.id, id).catch(() => {});

    // Build strain and update recovery engine
    const session = await getLoggedWorkoutWithSets(id, user.id);
    if (session && session.sets.length > 0) {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("training_level")
        .eq("user_id", user.id)
        .single();

      const trainingLevel = profile?.training_level ?? "intermediate";

      // Group sets by exercise for strain calculation
      const byExercise = new Map<string, LoggedSet[]>();
      for (const s of session.sets) {
        if (!s.completed || s.failed) continue;
        const arr = byExercise.get(s.exercise_id) ?? [];
        arr.push(s);
        byExercise.set(s.exercise_id, arr);
      }

      const workoutSets: WorkoutSet[] = Array.from(byExercise.entries()).map(
        ([exerciseId, sets]) => ({
          exercise_id: exerciseId,
          sets:        sets.length,
          reps:        Math.round(sets.reduce((s, x) => s + (x.reps ?? 0), 0) / sets.length),
          weight_kg:   Math.round(sets.reduce((s, x) => s + (x.weight ?? 0), 0) / sets.length),
          rpe:         sets[0].rpe ?? undefined,
        })
      );

      if (workoutSets.length > 0) {
        const strain = calculateWorkoutStrain({
          sets:             workoutSets,
          training_level:   trainingLevel,
          duration_minutes: duration_minutes ?? 45,
        });

        const finishedAt = new Date().toISOString();

        await Promise.all([
          persistStrainLog(user.id, id, strain),
          applyWorkoutStrainToMuscles(user.id, strain.local_muscle_loads, finishedAt),
        ]);

        // Fetch nutrition adherence and calculate recovery modifier
        let nutritionModifier = 0;
        try {
          const weeklyAdherence = await getWeeklyAdherenceStats(user.id);
          if (weeklyAdherence) {
            nutritionModifier = calculateRecoveryModifier(weeklyAdherence);
          }
        } catch (nutritionErr) {
          // Nutrition data may not exist yet; continue without it
          console.log("Nutrition data not available for recovery modifier");
        }

        // Update systemic fatigue
        const existing = await getSystemicRecovery(user.id);
        const newAccumulation = Math.min(
          1000,
          (existing?.strain_accumulation ?? 0) + strain.estimated_strain
        );
        await upsertSystemicRecovery(user.id, {
          systemic_fatigue:     Math.min(100, (existing?.systemic_fatigue ?? 0) + strain.systemic_load * 0.3),
          strain_accumulation:  newAccumulation,
          recovery_tier:        existing?.recovery_tier ?? "green",
          nutrient_modifier:    nutritionModifier,
        });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/workouts/session/:id]", err);
    return Response.json({ error: "Failed to finalize session" }, { status: 500 });
  }
}

// DELETE — remove a logged session
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteLoggedWorkout(id, user.id);
  return Response.json({ success: ok });
}
