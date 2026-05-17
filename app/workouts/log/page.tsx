import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ManualWorkoutLogger } from "@/components/workouts/ManualWorkoutLogger";

export default async function LogWorkoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <PageContainer>
      <SectionContainer className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/workouts"
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Log Workout</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Record a workout you completed</p>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <ManualWorkoutLogger />
      </SectionContainer>
    </PageContainer>
  );
}
