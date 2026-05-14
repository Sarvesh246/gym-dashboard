"use client";

import { useEffect, useState } from "react";
import { DailyNutritionSummary, NutritionGoals, NutritionLog } from "@/lib/nutrition/types";
import MacroRings from "@/components/nutrition/MacroRings";
import MealTimeline from "@/components/nutrition/MealTimeline";
import FoodLogger from "@/components/nutrition/FoodLogger";
import BarcodeScanner from "@/components/nutrition/BarcodeScanner";

export default function NutritionPage() {
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const goalsRes = await fetch("/api/nutrition/goals");
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          setGoals(goalsData.goals);
        }

        const logsRes = await fetch(`/api/nutrition/logs?date=${selectedDate}`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
          setSummary(logsData.summary);
        }
      } catch (error) {
        console.error("Load nutrition data error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Delete this food entry?")) return;

    try {
      const response = await fetch(`/api/nutrition/logs/${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLogs(logs.filter((log) => log.id !== logId));
      }
    } catch (error) {
      console.error("Delete log error:", error);
    }
  };

  const handleLogSuccess = () => {
    const reloadData = async () => {
      const logsRes = await fetch(`/api/nutrition/logs?date=${selectedDate}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setSummary(logsData.summary);
      }
    };
    reloadData();
  };

  const today = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === today;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nutrition</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(today)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isToday
                  ? "bg-success text-white"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-success border-t-transparent rounded-full" />
          </div>
        ) : summary && goals ? (
          <>
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Progress</h2>
              <div className="flex justify-center">
                <MacroRings summary={summary} goals={goals} size="lg" />
              </div>

              <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {Math.round(summary.calories)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">of {goals.calorie_target} kcal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {Math.round(summary.protein_g)}g
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">of {Math.round(goals.protein_target)}g</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(summary.carbs_g)}g
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">of {Math.round(goals.carb_target)}g</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {Math.round(summary.fat_g)}g
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">of {Math.round(goals.fat_target)}g</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setLoggerOpen(true)}
                className="flex-1 px-4 py-3 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-colors"
              >
                + Log Food
              </button>
              <button
                onClick={() => setScannerOpen(true)}
                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
              >
                📷 Scan
              </button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meals</h2>
              <MealTimeline logs={logs} onDeleteLog={handleDeleteLog} />
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground mb-4">Set up your nutrition goals to get started</p>
            <a
              href="/nutrition/setup"
              className="inline-block px-4 py-2 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-colors"
            >
              Set Goals
            </a>
          </div>
        )}
      </div>

      <FoodLogger
        isOpen={loggerOpen}
        onClose={() => setLoggerOpen(false)}
        onLogSuccess={handleLogSuccess}
      />

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={async (barcode) => {
          try {
            const response = await fetch("/api/foods/barcode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ barcode_string: barcode }),
            });

            if (response.ok) {
              setScannerOpen(false);
              handleLogSuccess();
            } else {
              alert("Food not found");
            }
          } catch (error) {
            console.error("Barcode scan error:", error);
            alert("Failed to scan barcode");
          }
        }}
      />
    </div>
  );
}
