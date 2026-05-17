"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DailyNutritionSummary, NutritionGoals, NutritionLog } from "@/lib/nutrition/types";
import MacroRings from "@/components/nutrition/MacroRings";
import MealTimeline from "@/components/nutrition/MealTimeline";
import FoodLogger from "@/components/nutrition/FoodLogger";
import BarcodeScanner from "@/components/nutrition/BarcodeScanner";
import HydrationTracker from "@/components/nutrition/HydrationTracker";
import CustomFoodForm from "@/components/nutrition/CustomFoodForm";

function shiftDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(date: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = shiftDate(today, -1);
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function NutritionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? today);

  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);

  const loadData = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/nutrition/daily?date=${date}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.goals_set) {
        setGoals(null);
        setSummary(null);
        setLogs([]);
        return;
      }

      setGoals(data.goals);
      setSummary(data.summary);
      setLogs(data.logs ?? []);
    } catch (err) {
      console.error("Load nutrition error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const navigateDate = (days: number) => {
    const next = shiftDate(selectedDate, days);
    // Don't navigate into the future
    if (next > today) return;
    setSelectedDate(next);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch(`/api/nutrition/logs/${logId}`, { method: "DELETE" });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== logId));
        loadData(selectedDate);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleLogSuccess = () => loadData(selectedDate);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await fetch("/api/foods/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode_string: barcode }),
      });
      setScannerOpen(false);
      if (res.ok) {
        loadData(selectedDate);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        alert(
          `No product found for barcode "${barcode}". You can search by name or add it as a custom food.`
        );
      } else {
        alert(data.error || "Barcode lookup failed.");
      }
      setLoggerOpen(true);
    } catch (err) {
      console.error("Barcode error:", err);
      setScannerOpen(false);
      alert("Barcode lookup failed. Check your connection and try again.");
    }
  };

  const isToday = selectedDate === today;
  const caloriesRemaining = goals ? Math.max(0, goals.calorie_target - (summary?.calories ?? 0)) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ‹
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground">{formatDateLabel(selectedDate)}</h1>
                {!isToday && (
                  <p className="text-xs text-muted-foreground">{selectedDate}</p>
                )}
              </div>
              <button
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
              >
                ›
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  Today
                </button>
              )}
              <a
                href="/nutrition/history"
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                History
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-success border-t-transparent rounded-full" />
          </div>
        ) : !goals ? (
          /* Goals not set */
          <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">🥗</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Start Tracking Nutrition</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set your calorie and macro targets to get started.
              </p>
            </div>
            <a
              href="/nutrition/setup"
              className="inline-block px-6 py-3 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-colors"
            >
              Set Goals
            </a>
          </div>
        ) : (
          <>
            {/* Macro overview card */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-4">
                {summary && (
                  <MacroRings summary={summary} goals={goals} size="lg" />
                )}
                <div className="flex-1 space-y-3">
                  {/* Calorie summary */}
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {Math.round(summary?.calories ?? 0)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">kcal logged</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {caloriesRemaining} remaining of {goals.calorie_target}
                    </div>
                  </div>

                  {/* Macro bars */}
                  {[
                    { label: "Protein", actual: summary?.protein_g ?? 0, target: goals.protein_target, color: "bg-amber-500" },
                    { label: "Carbs", actual: summary?.carbs_g ?? 0, target: goals.carb_target, color: "bg-blue-500" },
                    { label: "Fat", actual: summary?.fat_g ?? 0, target: goals.fat_target, color: "bg-orange-500" },
                  ].map(({ label, actual, target, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">
                          {Math.round(actual)}g
                          <span className="text-muted-foreground font-normal"> / {Math.round(target)}g</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${color}`}
                          style={{ width: `${Math.min(100, (actual / target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {isToday && (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setLoggerOpen(true)}
                  className="py-3 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  + Log Food
                </button>
                <button
                  onClick={() => setScannerOpen(true)}
                  className="py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  Scan
                </button>
                <button
                  onClick={() => setCustomFoodOpen(true)}
                  className="py-3 bg-muted hover:bg-accent text-foreground font-medium rounded-xl transition-colors text-sm"
                >
                  Custom
                </button>
              </div>
            )}

            {/* Hydration tracker */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Hydration</h2>
              <HydrationTracker date={selectedDate} />
            </div>

            {/* Meal timeline */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Meals</h2>
                {logs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{logs.length} items</span>
                )}
              </div>
              <MealTimeline logs={logs} onDeleteLog={isToday ? handleDeleteLog : undefined} />
            </div>

            {/* Navigation to goals setup */}
            <div className="text-center py-2">
              <a
                href="/nutrition/setup"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit nutrition goals
              </a>
              <span className="mx-2 text-muted-foreground">·</span>
              <a
                href="/nutrition/history"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View history
              </a>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <FoodLogger
        isOpen={loggerOpen}
        onClose={() => setLoggerOpen(false)}
        onLogSuccess={handleLogSuccess}
      />

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      <CustomFoodForm
        isOpen={customFoodOpen}
        onClose={() => setCustomFoodOpen(false)}
        onCreated={() => {
          setCustomFoodOpen(false);
          setLoggerOpen(true); // Open logger so they can immediately log the new food
        }}
      />
    </div>
  );
}

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <NutritionPageContent />
    </Suspense>
  );
}
