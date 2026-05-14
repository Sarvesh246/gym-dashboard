import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import React from "react";
import dynamic from "next/dynamic";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ThemeToggle } from "@/components/utility/ThemeToggle";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import {
  mockMetrics,
  mockWeightData,
  mockCalorieData,
  mockWorkoutVolumeData,
  mockSleepData,
  mockInsights,
  mockBodyZones,
} from "@/lib/mock-data";
import {
  Zap,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";

// Lazy load nutrition widget (client component with data fetching)
const NutritionWidget = dynamic(() => import("@/components/dashboard/NutritionWidget"), {
  loading: () => <div className="rounded-lg bg-gray-100 animate-pulse h-48" />,
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const insightIcons = {
  "trending-up": TrendingUp,
  "zap": Zap,
  "clock": Clock,
};

const insightVariantColors = {
  success: "text-success",
  warning: "text-warning",
  accent: "text-primary",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single() as { data: { onboarding_complete: boolean } | null };

  if (!profile?.onboarding_complete) redirect("/onboarding");
  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {getGreeting()}, Alex
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">{getFormattedDate()}</p>
              <StatusChip label="All systems optimal" variant="success" />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SectionContainer>

      {/* Hero Metrics */}
      <SectionContainer title="Today's Overview">
        <MetricsOverview metrics={mockMetrics} />
      </SectionContainer>

      {/* Nutrition Widget */}
      <SectionContainer title="Nutrition">
        <NutritionWidget />
      </SectionContainer>

      {/* Charts Grid */}
      <SectionContainer title="Trends">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SectionCard title="Weight Trend" subtitle="Last 30 days" padding={false}>
            <div className="px-5 pb-5 pt-1">
              <ChartPlaceholder
                type="area"
                data={mockWeightData}
                dataKey="value"
                color="primary"
                height={130}
                showXAxis
              />
            </div>
          </SectionCard>

          <SectionCard title="Calorie Intake" subtitle="This week" padding={false}>
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

          <SectionCard title="Training Volume" subtitle="Last 30 days" padding={false}>
            <div className="px-5 pb-5 pt-1">
              <ChartPlaceholder
                type="area"
                data={mockWorkoutVolumeData}
                dataKey="volume"
                color="success"
                height={130}
                showXAxis
              />
            </div>
          </SectionCard>

          <SectionCard title="Sleep Duration" subtitle="Last 14 days" padding={false}>
            <div className="px-5 pb-5 pt-1">
              <ChartPlaceholder
                type="line"
                data={mockSleepData}
                dataKey="hours"
                color="primary"
                height={130}
                showXAxis
              />
            </div>
          </SectionCard>
        </div>
      </SectionContainer>

      {/* Body Map + AI Insights row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Body Recovery Map */}
        <SectionCard title="Body Recovery Map" subtitle="Full analysis in Recovery tab">
          {(() => {
            const zoneColorMap = {
              recovered:  { fill: "rgba(34,197,94,0.15)",  stroke: "rgba(34,197,94,0.65)",  bar: "#22C55E" },
              recovering: { fill: "rgba(245,158,11,0.15)", stroke: "rgba(245,158,11,0.65)", bar: "#F59E0B" },
              fatigued:   { fill: "rgba(239,68,68,0.15)",  stroke: "rgba(239,68,68,0.65)",  bar: "#EF4444" },
            } as const;
            const zoneShapes: Record<string, React.ReactNode> = {
              shoulders: (
                <>
                  <rect x="9"  y="25" width="20" height="44" rx="10" />
                  <rect x="71" y="25" width="20" height="44" rx="10" />
                </>
              ),
              chest: <rect x="29" y="25" width="42" height="44" rx="12" />,
              arms: (
                <>
                  <rect x="7"  y="70" width="18" height="32" rx="9" />
                  <rect x="75" y="70" width="18" height="32" rx="9" />
                </>
              ),
              core: <rect x="29" y="70" width="42" height="36" rx="10" />,
              quads: (
                <>
                  <rect x="29" y="104" width="42" height="10" rx="6" />
                  <rect x="30" y="110" width="19" height="46" rx="10" />
                  <rect x="51" y="110" width="19" height="46" rx="10" />
                </>
              ),
              calves: (
                <>
                  <rect x="31" y="157" width="17" height="38" rx="9" />
                  <rect x="52" y="157" width="17" height="38" rx="9" />
                </>
              ),
            };
            return (
              <div className="flex flex-col gap-4 py-1">
                <div className="flex items-start gap-5">
                  {/* SVG Figure */}
                  <div className="w-36 h-64 shrink-0">
                    <svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      {/* Head — neutral */}
                      <circle cx="50" cy="11" r="10" fill="var(--foreground)" fillOpacity="0.1" stroke="var(--foreground)" strokeOpacity="0.25" strokeWidth="0.8" />
                      <rect x="45" y="20" width="10" height="8" rx="4" fill="var(--foreground)" fillOpacity="0.1" />
                      {/* Colored zones */}
                      {mockBodyZones.map((zone) => {
                        const c = zoneColorMap[zone.status];
                        return (
                          <g key={zone.id} fill={c.fill} stroke={c.stroke} strokeWidth="0.9">
                            {zoneShapes[zone.id]}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Score list */}
                  <div className="flex-1 flex flex-col gap-2.5 pt-1">
                    {mockBodyZones.map((zone) => {
                      const c = zoneColorMap[zone.status];
                      return (
                        <div key={zone.id} className="flex items-center gap-2">
                          <span className="text-xs text-foreground/80 w-[68px] shrink-0">{zone.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${zone.score}%`, backgroundColor: c.bar, transition: "width 0.6s ease" }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-6 text-right">{zone.score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 pt-3 border-t border-border">
                  {(["recovered", "recovering", "fatigued"] as const).map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zoneColorMap[s].bar }} />
                      <span className="text-xs text-muted-foreground capitalize">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </SectionCard>

        {/* AI Insights */}
        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Health Insights</h3>
              <p className="text-xs text-muted-foreground">Updated just now</p>
            </div>
          </div>

          <div className="space-y-3">
            {mockInsights.map((insight) => {
              const IconComp = insightIcons[insight.icon as keyof typeof insightIcons] ?? Zap;
              const iconColor = insightVariantColors[insight.variant];
              return (
                <div key={insight.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                    <IconComp size={14} />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
