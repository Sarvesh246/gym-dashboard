import { getExercise } from "@/lib/muscles/mapping";
import { createClient } from "@/lib/supabase/server";
import { getExerciseHistory, getExerciseRecentSets } from "@/services/performance";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const exercise = getExercise(id);

  if (!exercise) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }

  // Optionally attach performance history if user is authed
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [history, recentSets] = await Promise.all([
        getExerciseHistory(user.id, id),
        getExerciseRecentSets(user.id, id, 5),
      ]);
      return Response.json({ exercise, history, recent_sets: recentSets });
    }
  } catch {
    // Fall through
  }

  return Response.json({ exercise, history: null, recent_sets: [] });
}
