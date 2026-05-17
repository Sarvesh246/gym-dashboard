import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { getLoggedWorkoutWithSets } from "@/services/workouts";
import { getExercise } from "@/lib/muscles/mapping";
import { ArrowLeft, Clock, Star, Dumbbell, Zap, Activity, Flame } from "lucide-react";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/workouts/DeleteSessionButton";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function RatingDots({ value, max = 5 }: { value: number | null; max?: number }) {
  if (!value) return null;
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < value ? "bg-primary" : "bg-muted-foreground/20"}`}
        />
      ))}
    </span>
  );
}

export default async function SessionDetailPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const data = await getLoggedWorkoutWithSets(id, user.id);
  if (!data) redirect("/workouts/history");

  const { workout, sets } = data;

  // Group sets by exercise
  const byExercise = new Map<string, typeof sets>();
  for (const s of sets) {
    const arr = byExercise.get(s.exercise_id) ?? [];
    arr.push(s);
    byExercise.set(s.exercise_id, arr);
  }

  const completedSets = sets.filter((s) => s.completed && !s.failed);
  const totalVolume = completedSets.reduce(
    (acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0),
    0
  );

  return (
    <PageContainer>
      <SectionContainer className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/workouts/history"
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {formatDate(workout.performed_at)}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Session details</p>
            </div>
          </div>
          <DeleteSessionButton sessionId={workout.id} redirectAfter="/workouts/history" />
        </div>
      </SectionContainer>

      {/* Summary stats */}
      <SectionContainer>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {workout.duration_minutes && (
            <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={12} />
                <span className="text-xs">Duration</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{workout.duration_minutes} min</p>
            </div>
          )}
          {totalVolume > 0 && (
            <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell size={12} />
                <span className="text-xs">Volume</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${totalVolume}kg`}
              </p>
            </div>
          )}
          {workout.workout_rating && (
            <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Star size={12} />
                <span className="text-xs">Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-foreground">{workout.workout_rating}/5</p>
                <RatingDots value={workout.workout_rating} />
              </div>
            </div>
          )}
          {completedSets.length > 0 && (
            <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity size={12} />
                <span className="text-xs">Sets</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{completedSets.length}</p>
            </div>
          )}
        </div>
      </SectionContainer>

      {/* Ratings */}
      {(workout.soreness_rating || workout.energy_rating) && (
        <SectionContainer>
          <SectionCard title="How you felt">
            <div className="flex flex-col gap-3">
              {workout.soreness_rating && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap size={14} />
                    Soreness
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingDots value={workout.soreness_rating} />
                    <span className="text-sm font-medium">{workout.soreness_rating}/5</span>
                  </div>
                </div>
              )}
              {workout.energy_rating && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flame size={14} className="text-muted-foreground" />
                    Energy
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingDots value={workout.energy_rating} />
                    <span className="text-sm font-medium">{workout.energy_rating}/5</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </SectionContainer>
      )}

      {/* Notes */}
      {workout.notes && (
        <SectionContainer>
          <SectionCard title="Notes">
            <p className="text-sm text-foreground leading-relaxed">{workout.notes}</p>
          </SectionCard>
        </SectionContainer>
      )}

      {/* Exercises */}
      {byExercise.size > 0 && (
        <SectionContainer>
          <SectionCard title="Exercises">
            <div className="space-y-4">
              {Array.from(byExercise.entries()).map(([exerciseId, exSets]) => {
                const ex = getExercise(exerciseId);
                const name = ex?.name ?? exerciseId;
                const completed = exSets.filter((s) => s.completed && !s.failed);

                return (
                  <div key={exerciseId}>
                    <p className="text-sm font-semibold text-foreground mb-2">{name}</p>
                    <div className="space-y-1.5">
                      {exSets.map((s) => (
                        <div
                          key={s.id}
                          className={`flex items-center gap-3 text-xs rounded-lg px-3 py-2 ${
                            s.failed
                              ? "bg-destructive/10 text-destructive"
                              : s.completed
                              ? "bg-muted/50 text-foreground"
                              : "bg-muted/30 text-muted-foreground line-through"
                          }`}
                        >
                          <span className="w-12 shrink-0 text-muted-foreground">
                            Set {s.set_number}
                          </span>
                          {s.weight != null && (
                            <span className="font-medium">{s.weight} kg</span>
                          )}
                          {s.reps != null && (
                            <span className="text-muted-foreground">× {s.reps} reps</span>
                          )}
                          {s.rpe != null && (
                            <span className="ml-auto text-muted-foreground">RPE {s.rpe}</span>
                          )}
                          {s.failed && (
                            <span className="ml-auto font-medium">Failed</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {completed.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {completed.length} of {exSets.length} sets completed
                        {completed[0].weight != null &&
                          ` · ${completed.reduce((a, s) => a + (s.reps ?? 0) * (s.weight ?? 0), 0)} kg total volume`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </SectionContainer>
      )}

      {byExercise.size === 0 && (
        <SectionContainer>
          <SectionCard title="Exercises">
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No sets were logged for this session</p>
            </div>
          </SectionCard>
        </SectionContainer>
      )}
    </PageContainer>
  );
}
