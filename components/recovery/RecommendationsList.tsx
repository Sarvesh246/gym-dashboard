import type { RecoveryRecommendation, TrainingRecommendation } from "@/lib/recovery/types";
import { trainingRecommendationLabel } from "@/lib/recovery/recommendations";
import { SectionCard } from "@/components/ui/SectionCard";
import { CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface RecommendationsListProps {
  recommendations: RecoveryRecommendation[];
  training_recommendation: TrainingRecommendation;
  suppression_factors: string[];
}

const TYPE_CONFIG = {
  positive: {
    icon: CheckCircle,
    className: "text-success",
    bg: "bg-success/8",
    border: "border-success/20",
  },
  info: {
    icon: Info,
    className: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  caution: {
    icon: AlertCircle,
    className: "text-warning",
    bg: "bg-warning/8",
    border: "border-warning/20",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/20",
  },
} as const;

const SUPPRESSION_LABELS: Record<string, string> = {
  poor_sleep:             "Poor sleep",
  high_stress:            "High stress",
  high_systemic_fatigue:  "High systemic fatigue",
  high_weekly_strain:     "Weekly strain elevated",
  consecutive_training:   "Consecutive training days",
  low_muscle_recovery:    "Low muscle recovery",
  suppressed_hrv:         "HRV suppressed",
};

export function RecommendationsList({
  recommendations,
  training_recommendation,
  suppression_factors,
}: RecommendationsListProps) {
  return (
    <SectionCard
      title="Training Intelligence"
      subtitle="Deterministic guidance — no AI required"
    >
      {/* Training recommendation banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border mb-4">
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Today&apos;s recommendation</p>
          <p className="text-sm font-semibold text-foreground">
            {trainingRecommendationLabel(training_recommendation)}
          </p>
        </div>
      </div>

      {/* Suppression factors */}
      {suppression_factors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Active suppression factors</p>
          <div className="flex flex-wrap gap-1.5">
            {suppression_factors.map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/70 border border-border"
              >
                {SUPPRESSION_LABELS[f] ?? f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation cards */}
      <div className="space-y-2">
        {recommendations.map((rec, i) => {
          const cfg = TYPE_CONFIG[rec.type];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
            >
              <Icon size={14} className={`mt-0.5 shrink-0 ${cfg.className}`} />
              <p className="text-sm text-foreground/85 leading-relaxed">{rec.message}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
