import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { Progress } from "@/components/ui/progress";
import { mockMetrics, mockCalorieData } from "@/lib/mock-data";
import { Apple, Flame, Droplets, Plus, UtensilsCrossed } from "lucide-react";

const macros = [
  { label: "Protein", value: 142, goal: 180, unit: "g", color: "bg-warning" },
  { label: "Carbs", value: 198, goal: 260, unit: "g", color: "bg-primary" },
  { label: "Fat", value: 48, goal: 70, unit: "g", color: "bg-success" },
];

const waterLog = { consumed: 1.8, goal: 3.0, unit: "L" };

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const calorieProgress = Math.round(
    (mockMetrics.calories.consumed / mockMetrics.calories.total) * 100
  );

  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Nutrition</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your fuel</p>
      </SectionContainer>

      {/* Calorie Overview */}
      <SectionContainer title="Today's Calories">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Consumed"
            value={mockMetrics.calories.consumed}
            unit="kcal"
            icon="Flame"
            color="warning"
            animateValue
          />
          <MetricCard
            label="Remaining"
            value={mockMetrics.calories.remaining}
            unit="kcal"
            icon="Apple"
            color="success"
            animateValue
          />
          <MetricCard
            label="Goal"
            value={mockMetrics.calories.total}
            unit="kcal"
            icon="Flame"
            color="neutral"
            animateValue
          />
        </div>
      </SectionContainer>

      {/* Macros */}
      <SectionContainer>
        <SectionCard title="Macronutrients" subtitle="Daily breakdown">
          <div className="space-y-4">
            {macros.map((macro) => {
              const pct = Math.round((macro.value / macro.goal) * 100);
              return (
                <div key={macro.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium text-foreground">{macro.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {macro.value}{macro.unit} / {macro.goal}{macro.unit}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-0.5">{pct}% of goal</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </SectionContainer>

      {/* Calorie Trend + Water */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
        <SectionCard title="7-Day Calorie Trend" padding={false}>
          <div className="px-5 pb-5 pt-1">
            <ChartPlaceholder
              type="bar"
              data={mockCalorieData}
              dataKey="consumed"
              color="warning"
              height={130}
              showXAxis
            />
          </div>
        </SectionCard>

        <SectionCard title="Water Intake" subtitle="Daily hydration">
          <div className="flex flex-col items-center justify-center py-4 gap-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="#3B82F6" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - waterLog.consumed / waterLog.goal)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Droplets size={18} className="text-primary mb-0.5" />
                <span className="text-lg font-bold text-foreground">{waterLog.consumed}L</span>
                <span className="text-xs text-muted-foreground">of {waterLog.goal}L</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {[250, 500].map((ml) => (
                <button
                  key={ml}
                  className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Meal Log */}
      <SectionContainer>
        <SectionCard
          title="Meal Log"
          subtitle="Today"
          action={
            <button className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus size={12} />
              Add meal
            </button>
          }
        >
          <EmptyState
            icon={UtensilsCrossed}
            title="No meals logged yet"
            description="Start logging your meals to track your daily nutrition intake."
          />
        </SectionCard>
      </SectionContainer>
    </PageContainer>
  );
}
