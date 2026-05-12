import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithExercises } from "@/services/workouts";
import { getAllExerciseHistory } from "@/services/performance";
import { getSystemicRecovery } from "@/services/recovery";
import { WorkoutSession } from "@/components/workouts/WorkoutSession";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

export default async function WorkoutSessionPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { new: isNew } = await searchParams;

  const [workout, performanceHistory, systemic] = await Promise.all([
    getWorkoutWithExercises(id, user.id),
    getAllExerciseHistory(user.id),
    getSystemicRecovery(user.id),
  ]);

  if (!workout) redirect("/workouts");

  // Attach performance history to exercises
  const perfMap = new Map(performanceHistory.map((p) => [p.exercise_id, p]));
  const enrichedExercises = workout.exercises.map((e) => ({
    ...e,
    performance: perfMap.get(e.exercise_id) ?? null,
  }));

  return (
    <WorkoutSession
      workout={{ ...workout, exercises: enrichedExercises }}
      isNew={isNew === "1"}
      readinessScore={systemic?.readiness_score ?? 75}
    />
  );
}
