"use client";

import { Calendar, TrendingDown, AlertCircle } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PeriodizationCardProps {
  deloadRecommended: boolean;
  deloadIntensityPct: number;
  startDate: string;
  durationDays: number;
  rationale: string;
  patternDetected: string | null;
  weeklyStrain7d: number;
  weeklyStrain28dAvg: number;
}

export function PeriodizationCard({
  deloadRecommended,
  deloadIntensityPct,
  startDate,
  durationDays,
  rationale,
  patternDetected,
  weeklyStrain7d,
  weeklyStrain28dAvg,
}: PeriodizationCardProps) {
  const strainPercentage = Math.min(100, (weeklyStrain7d / 500) * 100);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const titleContent = (
    <div className="flex items-center gap-2">
      <TrendingDown className="h-5 w-5" />
      Periodization Plan
    </div>
  );

  const actionContent = deloadRecommended && (
    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
      Deload Recommended
    </Badge>
  );

  return (
    <SectionCard
      title="Periodization Plan"
      subtitle="Training load and deload recommendations"
      action={actionContent}
      className={deloadRecommended ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20" : ""}
    >
      <div className="space-y-4">
        {/* Strain gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Weekly Strain Load</span>
            <span className="text-muted-foreground">{Math.round(weeklyStrain7d)} / 500 units</span>
          </div>
          <Progress value={strainPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            28d average: ~{Math.round(weeklyStrain28dAvg)} units/week
          </p>
        </div>

        {/* Deload recommendation */}
        {deloadRecommended ? (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium">{rationale}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Start Date</p>
                    <p className="font-medium">{formatDate(startDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Duration</p>
                    <p className="font-medium">{durationDays} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Volume Target</p>
                    <p className="font-medium">{deloadIntensityPct}% of normal</p>
                  </div>
                  {patternDetected && (
                    <div>
                      <p className="text-muted-foreground text-xs">Pattern</p>
                      <p className="font-medium capitalize">{patternDetected.replace(/_/g, " ")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Deload guidance */}
            <div className="bg-background rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deload Week Focus
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Reduce compound lift volume by {100 - deloadIntensityPct}%</li>
                <li>• Maintain exercise form and movement quality</li>
                <li>• Prioritize mobility, stretching, and weak point work</li>
                <li>• Emphasis on sleep, nutrition, and stress management</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Recovery is adequate. Continue current training approach. Monitor strain and readiness for upcoming weeks.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Strain levels manageable</p>
              <p>✓ Recovery is keeping pace with training load</p>
              <p>✓ No overreaching pattern detected</p>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
