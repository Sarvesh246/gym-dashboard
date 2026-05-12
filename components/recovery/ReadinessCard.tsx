import type { ReadinessOutput, RecoveryTier } from "@/lib/recovery/types";
import { RECOVERY_TIER_THRESHOLDS } from "@/lib/recovery/constants";
import { trainingRecommendationLabel } from "@/lib/recovery/recommendations";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { Zap, Moon, Activity, Brain } from "lucide-react";

interface ReadinessCardProps {
  readiness: ReadinessOutput;
  sleepScore: number;
  hrvScore: number;
  restingHR: number;
}

const TIER_CHIP_VARIANT: Record<RecoveryTier, "success" | "warning" | "danger" | "accent"> = {
  green:  "success",
  yellow: "warning",
  orange: "accent",
  red:    "danger",
};

const TIER_STROKE: Record<RecoveryTier, string> = {
  green:  "#22C55E",
  yellow: "#F59E0B",
  orange: "#F97316",
  red:    "#EF4444",
};

export function ReadinessCard({ readiness, sleepScore, hrvScore, restingHR }: ReadinessCardProps) {
  const { readiness_score, tier, training_recommendation } = readiness;
  const circumference = 2 * Math.PI * 42;
  const dashOffset    = circumference * (1 - readiness_score / 100);
  const tierInfo      = RECOVERY_TIER_THRESHOLDS[tier];
  const stroke        = TIER_STROKE[tier];
  const chipVariant   = TIER_CHIP_VARIANT[tier];

  return (
    <SectionCard>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${dashOffset}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">
              {Math.round(readiness_score)}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <h2 className="text-xl font-bold text-foreground">Recovery Score</h2>
            <StatusChip label={tierInfo.label} variant={chipVariant} />
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Training recommendation:{" "}
            <span className="font-medium text-foreground">
              {trainingRecommendationLabel(training_recommendation)}
            </span>
          </p>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat icon={<Moon size={14} />} label="Sleep" value={`${sleepScore}%`} />
            <Stat icon={<Activity size={14} />} label="HRV" value={`${hrvScore}ms`} />
            <Stat icon={<Zap size={14} />} label="Resting HR" value={`${restingHR}`} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
        {icon}
      </div>
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
