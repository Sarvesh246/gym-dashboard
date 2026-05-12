import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { WorkoutGenerator } from "@/components/workouts/WorkoutGenerator";
import {
  getRecentLoggedWorkouts,
  getWorkoutStreak,
  getWeeklyWorkoutCount,
} from "@/services/workouts";
import { getSystemicRecovery } from "@/services/recovery";
import { Dumbbell, Plus, Clock, TrendingUp, Flame, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("training_level, primary_goal, workout_days_per_week, preferred_split")
    .eq("user_id", user.id)
    .single();

  const [recentWorkouts, streak, weeklyCount, systemic] = await Promise.all([
    getRecentLoggedWorkouts(user.id, 5),
    getWorkoutStreak(user.id),
    getWeeklyWorkoutCount(user.id),
    getSystemicRecovery(user.id),
  ]);

  const readinessScore = systemic?.readiness_score ?? 75;
  const weeklyGoal: number = profile?.workout_days_per_week ?? 3;
  const preferredSplit = profile?.preferred_split ?? "push_pull_legs";

  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Workouts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Plan and track your training</p>
          </div>
          <Link
            href="/workouts/exercises"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen size={14} />
            Exercise Library
          </Link>
        </div>
      </SectionContainer>

      {/* Quick Stats */}
      <SectionContainer title="This Week">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Streak"
            value={streak}
            unit="days"
            icon="Flame"
            color="warning"
            animateValue
          />
          <MetricCard
            label="Sessions"
            value={weeklyCount}
            secondaryValue={`of ${weeklyGoal}`}
            icon="Dumbbell"
            color="accent"
            animateValue
          />
          <MetricCard
            label="Readiness"
            value={readinessScore}
            unit="%"
            icon="TrendingUp"
            color={readinessScore >= 70 ? "success" : readinessScore >= 45 ? "warning" : "error"}
            animateValue
          />
        </div>
      </SectionContainer>

      {/* Workout Generator */}
      <SectionContainer>
        <SectionCard
          title="Generate Workout"
          subtitle="Adapted to your recovery & readiness"
        >
          <WorkoutGenerator
            defaultSplit={preferredSplit}
            readinessScore={readinessScore}
          />
        </SectionCard>
      </SectionContainer>

      {/* Recent Sessions */}
      <SectionContainer>
        <SectionCard
          title="Recent Sessions"
          subtitle="Your last 5 workouts"
          action={
            <Link
              href="/workouts/history"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              See all
              <ChevronRight size={12} />
            </Link>
          }
        >
          {recentWorkouts.length === 0 ? (
            <div className="py-8 text-center">
              <Dumbbell size={28} className="mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No sessions yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Generate a workout above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentWorkouts.map((lw) => (
                <div
                  key={lw.id}
                  className="flex items-center gap-3 rounded-xl p-3 bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(lw.performed_at)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lw.duration_minutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {lw.duration_minutes}min
                        </span>
                      )}
                      {lw.workout_rating && (
                        <span className="text-xs text-muted-foreground">
                          {"★".repeat(lw.workout_rating)}{"☆".repeat(5 - lw.workout_rating)}
                        </span>
                      )}
                    </div>
                  </div>
                  {lw.workout_id && (
                    <Link
                      href={`/workouts/session/${lw.workout_id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </SectionContainer>
    </PageContainer>
  );
}
