"use client";

import { CircleProgress } from "@/components/ui/circle-progress";

interface ReadinessBadgeProps {
  score: number;  // 0-100
  tier: "green" | "yellow" | "orange" | "red";
  trainingRecommendation?: string;
}

export function ReadinessBadge({ score, tier, trainingRecommendation }: ReadinessBadgeProps) {
  const tierEmoji = {
    green: "🟢",
    yellow: "🟡",
    orange: "🟠",
    red: "🔴",
  }[tier];

  const tierLabel = {
    green: "Fully Recovered",
    yellow: "Normal Training",
    orange: "Reduced Volume",
    red: "Rest Recommended",
  }[tier];

  const tierColor = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
  }[tier];

  const recommendationEmoji = {
    full_intensity: "💪",
    moderate_intensity: "⚠️",
    reduced_volume: "📉",
    active_recovery: "🚶",
    rest: "😴",
  }[trainingRecommendation as keyof typeof recommendationEmoji] || "";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      {/* Circular readiness indicator */}
      <div className="shrink-0">
        <div className="relative h-12 w-12">
          <svg className="h-12 w-12" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(score / 100) * 282.7} 282.7`}
              strokeLinecap="round"
              className={tierColor}
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
            {/* Center text */}
            <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" className={tierColor} fill="currentColor">
              {score}
            </text>
          </svg>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">Readiness</p>
        <p className={`text-sm font-semibold ${tierColor}`}>
          {tierEmoji} {tierLabel}
        </p>
        {trainingRecommendation && (
          <p className="text-xs text-muted-foreground mt-1">
            {recommendationEmoji} {trainingRecommendation.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </div>
  );
}
