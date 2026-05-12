import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithExercises, deleteWorkout, updateWorkoutExercises } from "@/services/workouts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await getWorkoutWithExercises(id, user.id);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ workout });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const ok = await updateWorkoutExercises(id, user.id, body.exercises ?? []);
  return Response.json({ success: ok });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteWorkout(id, user.id);
  return Response.json({ success: ok });
}
