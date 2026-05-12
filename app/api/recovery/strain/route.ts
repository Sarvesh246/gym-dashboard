import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateWorkoutStrain } from "@/lib/recovery/scoring";
import { validateExerciseIds } from "@/lib/muscles/load";
import { persistStrainLog } from "@/services/recovery";
import { applyWorkoutStrainToMuscles } from "@/services/muscles";
import type { StrainInput } from "@/lib/recovery/types";

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body as StrainInput & { workout_id?: string };

  if (!Array.isArray(input.sets) || input.sets.length === 0) {
    return Response.json({ error: "sets array is required" }, { status: 400 });
  }

  const unknownExercises = validateExerciseIds(input.sets);
  if (unknownExercises.length > 0) {
    return Response.json(
      { error: `Unknown exercise IDs: ${unknownExercises.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const strain = calculateWorkoutStrain({
      sets:            input.sets,
      training_level:  input.training_level ?? "intermediate",
      duration_minutes: input.duration_minutes ?? 60,
    });

    const workoutId = input.workout_id ?? crypto.randomUUID();
    const trainedAt  = new Date().toISOString();

    await Promise.all([
      persistStrainLog(user.id, workoutId, strain),
      applyWorkoutStrainToMuscles(user.id, strain.local_muscle_loads, trainedAt),
    ]);

    return Response.json({
      workout_id:       workoutId,
      estimated_strain: strain.estimated_strain,
      systemic_load:    strain.systemic_load,
      cns_load:         strain.cns_load,
      recovery_impact:  strain.recovery_impact,
      total_volume:     strain.total_volume,
      local_muscle_loads: strain.local_muscle_loads,
    });
  } catch (err) {
    console.error("[POST /api/recovery/strain]", err);
    return Response.json({ error: "Failed to process strain log" }, { status: 500 });
  }
}
