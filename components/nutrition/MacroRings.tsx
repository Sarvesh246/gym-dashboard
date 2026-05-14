"use client";

import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";

interface MacroRingsProps {
  summary: DailyNutritionSummary;
  goals: NutritionGoals;
  size?: "sm" | "lg";
}

export default function MacroRings({ summary, goals, size = "lg" }: MacroRingsProps) {
  const sizeClasses = size === "sm" ? "w-12 h-12" : "w-24 h-24";
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = size === "sm" ? 20 : 36;

  const calculateProgress = (actual: number, target: number) => {
    return Math.min(100, (actual / target) * 100);
  };

  const protein_progress = calculateProgress(summary.protein_g, goals.protein_target);
  const carbs_progress = calculateProgress(summary.carbs_g, goals.carb_target);
  const fat_progress = calculateProgress(summary.fat_g, goals.fat_target);
  const calories_progress = calculateProgress(summary.calories, goals.calorie_target);

  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = (protein_progress / 100) * circumference;

  if (size === "sm") {
    return (
      <div className="flex gap-2">
        {[
          { progress: protein_progress, color: "#b45309", label: "P" },
          { progress: carbs_progress, color: "#1e40af", label: "C" },
          { progress: fat_progress, color: "#ea580c", label: "F" },
        ].map((item, idx) => (
          <div key={idx} className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
              <circle
                cx="25"
                cy="25"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (item.progress / 100) * circumference}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circles */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth * 1.5} />

          {/* Protein (top) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#b45309"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (protein_progress / 100) * circumference}
            strokeLinecap="round"
            style={{
              transform: "rotate(0deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.3s ease",
            }}
          />

          {/* Carbs (right) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1e40af"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (carbs_progress / 100) * circumference}
            strokeLinecap="round"
            style={{
              transform: "rotate(120deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.3s ease",
            }}
          />

          {/* Fat (left) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#ea580c"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (fat_progress / 100) * circumference}
            strokeLinecap="round"
            style={{
              transform: "rotate(240deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.3s ease",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-bold text-foreground">{Math.round(summary.calories)}</div>
          <div className="text-xs text-muted-foreground">kcal</div>
        </div>
      </div>
    </div>
  );
}
