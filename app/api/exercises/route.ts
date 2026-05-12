import { getAllExercises, getExercisesByMuscle, getExercisesByPattern } from "@/lib/muscles/mapping";
import type { MuscleGroup, MovementPattern } from "@/lib/recovery/types";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const muscle    = url.searchParams.get("muscle") as MuscleGroup | null;
  const pattern   = url.searchParams.get("pattern") as MovementPattern | null;
  const equipment = url.searchParams.get("equipment");
  const search    = url.searchParams.get("q")?.toLowerCase();

  let exercises = getAllExercises();

  if (muscle) {
    exercises = exercises.filter(
      (e) =>
        e.primary_muscles.includes(muscle) ||
        e.secondary_muscles.includes(muscle)
    );
  }

  if (pattern) {
    exercises = exercises.filter((e) => e.movement_pattern === pattern);
  }

  if (equipment) {
    exercises = exercises.filter((e) =>
      e.equipment.some((eq) => eq.toLowerCase() === equipment.toLowerCase())
    );
  }

  if (search) {
    exercises = exercises.filter((e) =>
      e.name.toLowerCase().includes(search) ||
      e.primary_muscles.some((m) => m.includes(search)) ||
      e.movement_pattern.includes(search)
    );
  }

  return Response.json({ exercises });
}
