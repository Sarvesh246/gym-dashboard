import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { getRecentLoggedWorkouts } from "@/services/workouts";
import { ArrowLeft, Dumbbell, Clock, Star } from "lucide-react";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/workouts/DeleteSessionButton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function WorkoutHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await getRecentLoggedWorkouts(user.id, 30);

  return (
    <PageContainer>
      <SectionContainer className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/workouts"
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Session History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sessions.length} sessions logged
            </p>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <SectionCard title="All Sessions">
          {sessions.length === 0 ? (
            <div className="py-10 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(s.performed_at)}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {s.duration_minutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {s.duration_minutes} min
                        </span>
                      )}
                      {s.workout_rating && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star size={10} />
                          {s.workout_rating}/5
                        </span>
                      )}
                      {s.notes && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {s.notes}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {s.soreness_rating && (
                        <span className="text-xs text-muted-foreground">
                          Soreness: {s.soreness_rating}/5
                        </span>
                      )}
                      {s.energy_rating && (
                        <span className="text-xs text-muted-foreground">
                          Energy: {s.energy_rating}/5
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <DeleteSessionButton sessionId={s.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </SectionContainer>
    </PageContainer>
  );
}
