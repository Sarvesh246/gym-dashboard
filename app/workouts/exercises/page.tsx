import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { ExerciseSearch } from "@/components/workouts/ExerciseSearch";
import { ArrowLeft, BookOpen, Zap } from "lucide-react";
import Link from "next/link";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if WGER has been synced
  const { count: wgerCount } = await (supabase as any)
    .from("wger_exercises")
    .select("id", { count: "exact", head: true });

  const hasWger = (wgerCount ?? 0) > 0;

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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Exercise Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasWger ? `Browse 1400+ exercises from WGER` : "40 core exercises (+ 1400 more available)"}
            </p>
          </div>
        </div>
      </SectionContainer>

      {!hasWger && (
        <SectionContainer className="mb-6">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
            <Zap size={16} className="text-blue-500 mt-1 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Unlock 1400+ exercises from WGER
              </p>
              <p className="text-xs text-muted-foreground">
                Currently using 40 core exercises. Admin can import the complete WGER database (~1400 exercises) for more variety.
              </p>
              <Link
                href="/admin/sync"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                <BookOpen size={12} />
                Go to WGER Sync
              </Link>
            </div>
          </div>
        </SectionContainer>
      )}

      <SectionContainer>
        <SectionCard title="Exercises">
          <ExerciseSearch />
        </SectionCard>
      </SectionContainer>
    </PageContainer>
  );
}
