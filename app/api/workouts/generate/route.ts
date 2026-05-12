import { createClient } from "@/lib/supabase/server";
import { generateWorkout } from "@/lib/training/generator";
import { saveGeneratedWorkout } from "@/services/workouts";
import { getSystemicRecovery } from "@/services/recovery";
import { getMuscleStates } from "@/services/muscles";
import { MIN_MUSCLE_RECOVERY_TO_TRAIN } from "@/lib/training/constants";
import type { GeneratorInput, SplitType, WorkoutDay, DifficultyTier, TrainingGoal } from "@/lib/training/types";
import type { MuscleGroup } from "@/lib/recovery/types";

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      split_type,
      workout_day,
      save = false,
    } = body as {
      split_type: SplitType;
      workout_day: WorkoutDay;
      save?: boolean;
    };

    // Load user profile for generation params
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("training_level, primary_goal, equipment, workout_days_per_week")
      .eq("user_id", user.id)
      .single();

    const training_level: DifficultyTier =
      (profile?.training_level as DifficultyTier) ?? "intermediate";
    const goal: TrainingGoal =
      (profile?.primary_goal as TrainingGoal) ?? "general_fitness";
    const equipment: string[] = profile?.equipment ?? [];
    const days_per_week: number = profile?.workout_days_per_week ?? 3;

    // Load recovery state to determine trainable muscles
    const [systemic, muscleStates] = await Promise.all([
      getSystemicRecovery(user.id),
      getMuscleStates(user.id),
    ]);

    const systemicReadiness = systemic?.readiness_score ?? 70;

    const availableMuscles: MuscleGroup[] = muscleStates.length > 0
      ? muscleStates
          .filter((ms) => ms.recovery_score >= MIN_MUSCLE_RECOVERY_TO_TRAIN)
          .map((ms) => ms.muscle_group)
      : ([] as MuscleGroup[]); // empty = use all (no training data yet)

    const input: GeneratorInput = {
      user_id:             user.id,
      training_level,
      goal,
      split_type,
      workout_day,
      equipment,
      available_muscles:   availableMuscles,
      systemic_readiness:  systemicReadiness,
      days_per_week,
    };

    const generated = generateWorkout(input);

    let workoutId: string | null = null;
    if (save) {
      workoutId = await saveGeneratedWorkout(user.id, generated);
    }

    return Response.json({ workout: generated, workout_id: workoutId });
  } catch (err) {
    console.error("[POST /api/workouts/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
