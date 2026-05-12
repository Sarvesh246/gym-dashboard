import { createClient } from "@/lib/supabase/server";
import {
  createLoggedWorkout,
  finalizeLoggedWorkout,
  getRecentLoggedWorkouts,
} from "@/services/workouts";
import { updateAllExercisePerformances } from "@/services/performance";
import { persistStrainLog } from "@/services/recovery";
import { applyWorkoutStrainToMuscles } from "@/services/muscles";
import { calculateWorkoutStrain } from "@/lib/recovery/scoring";
import type { WorkoutSet } from "@/lib/recovery/types";

// GET — recent sessions for the dashboard
export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getRecentLoggedWorkouts(user.id, 10);
  return Response.json({ sessions });
}

// POST — start a new session
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { workout_id } = body as { workout_id?: string };

    const loggedWorkoutId = await createLoggedWorkout(user.id, workout_id ?? null);
    if (!loggedWorkoutId) {
      return Response.json({ error: "Failed to start session" }, { status: 500 });
    }

    return Response.json({ logged_workout_id: loggedWorkoutId });
  } catch {
    return Response.json({ error: "Failed to start session" }, { status: 500 });
  }
}
