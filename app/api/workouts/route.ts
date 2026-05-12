import { createClient } from "@/lib/supabase/server";
import { getUserWorkouts } from "@/services/workouts";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const workouts = await getUserWorkouts(user.id);
    return Response.json({ workouts });
  } catch {
    return Response.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}
