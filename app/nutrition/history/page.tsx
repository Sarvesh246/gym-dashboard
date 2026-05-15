"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";
import { calculateDailyAdherence } from "@/lib/nutrition/adherence";

interface HistoryEntry extends DailyNutritionSummary {
  adherence: ReturnType<typeof calculateDailyAdherence>;
}

export default function NutritionHistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [weeklyAdherence, setWeeklyAdherence] = useState<{
    protein_adherence: number;
    calorie_adherence: number;
    overall_score: number;
    consistency: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/nutrition/history");
        if (res.ok) {
          const data = await res.json();
          setGoals(data.goals);
          setWeeklyAdherence(data.weekly_adherence);
          setEntries(data.summaries ?? []);
        }
      } catch (err) {
        console.error("Load history error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getAdherenceColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Nutrition History</h1>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-success border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Weekly adherence summary */}
            {weeklyAdherence && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">7-Day Average</h2>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Overall", value: weeklyAdherence.overall_score },
                    { label: "Calories", value: weeklyAdherence.calorie_adherence },
                    { label: "Protein", value: weeklyAdherence.protein_adherence },
                    { label: "Consistency", value: weeklyAdherence.consistency },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className={`text-2xl font-bold ${getAdherenceColor(value)}`}>
                        {value}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily entries */}
            {entries.length > 0 && goals ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id || entry.date}
                    onClick={() => router.push(`/nutrition?date=${entry.date}`)}
                    className="w-full text-left p-4 bg-card border border-border rounded-xl hover:border-success/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-foreground text-sm">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {Math.round(entry.calories)} kcal
                          {" · "}P: {Math.round(entry.protein_g)}g
                          {" · "}C: {Math.round(entry.carbs_g)}g
                          {" · "}F: {Math.round(entry.fat_g)}g
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        {/* Mini macro bars */}
                        <div className="hidden sm:flex flex-col gap-1 w-24">
                          {[
                            { actual: entry.protein_g, target: goals.protein_target, color: "bg-amber-500" },
                            { actual: entry.carbs_g, target: goals.carb_target, color: "bg-blue-500" },
                            { actual: entry.fat_g, target: goals.fat_target, color: "bg-orange-500" },
                          ].map((bar, i) => (
                            <div key={i} className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.color}`}
                                style={{ width: `${Math.min(100, (bar.actual / bar.target) * 100)}%` }}
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className={`text-xl font-bold ${getAdherenceColor(entry.adherence.overall_score)}`}>
                            {entry.adherence.overall_score}%
                          </div>
                          <div className="text-xs text-muted-foreground">adherence</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No data logged yet. Start tracking to see history.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
