"use client";

import React from "react";
import { AlertCircle, TrendingDown, CheckCircle } from "lucide-react";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";
import { getMuscleFillColor, getRecoveryTier } from "@/lib/body-map/visualization";

interface ImbalanceSummaryProps {
  muscleData: BodyMapData;
  overworkedMuscles: MuscleGroup[];
  undertrainedMuscles: MuscleGroup[];
  imbalances?: Array<{
    pairLabel: string;
    ratio: number;
    severity: "mild" | "moderate" | "severe";
    recommendation: string;
  }>;
}

/**
 * Summary section showing muscle imbalances and training recommendations
 * Displayed at bottom of body map page
 */
export const ImbalanceSummary: React.FC<ImbalanceSummaryProps> = ({
  muscleData,
  overworkedMuscles,
  undertrainedMuscles,
  imbalances = [],
}) => {
  const hasIssues =
    overworkedMuscles.length > 0 ||
    undertrainedMuscles.length > 0 ||
    imbalances.length > 0;

  if (!hasIssues) {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Balanced Training Load
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200">
              Your muscle recovery is well-balanced. Continue with your current training approach.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Imbalance Alerts */}
      {imbalances.map((imbalance, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-orange-300 dark:border-orange-700/50 bg-orange-50 dark:bg-orange-900/20 p-4 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">
                {imbalance.pairLabel}
              </h3>
              <div className="text-sm text-orange-800 dark:text-orange-300 mb-2 space-y-1">
                <p>
                  <span className="capitalize font-medium">{imbalance.severity}</span> imbalance
                  detected (Ratio: {imbalance.ratio.toFixed(2)}:1)
                </p>
              </div>
              <p className="text-sm text-orange-800 dark:text-orange-300">
                {imbalance.recommendation}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Overworked Muscles */}
      {overworkedMuscles.length > 0 && (
        <div className="rounded-2xl border border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 p-4 sm:p-6">
          <h3 className="font-semibold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Overworked Muscles
          </h3>
          <div className="space-y-2">
            {overworkedMuscles.map((muscle) => (
              <OverworkedMuscleItem
                key={muscle}
                muscle={muscle}
                muscleData={muscleData}
              />
            ))}
          </div>
          <p className="text-xs text-red-700 dark:text-red-400 mt-3">
            These muscles show low recovery scores. Consider reducing volume or intensity until
            recovery improves.
          </p>
        </div>
      )}

      {/* Undertrained Muscles */}
      {undertrainedMuscles.length > 0 && (
        <div className="rounded-2xl border border-blue-300 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            Undertrained Muscles
          </h3>
          <div className="space-y-2">
            {undertrainedMuscles.map((muscle) => (
              <UndertrainedMuscleItem
                key={muscle}
                muscle={muscle}
                muscleData={muscleData}
              />
            ))}
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
            These muscles have low weekly volume. Consider adding more volume or frequency to
            stimulus growth.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Overworked muscle list item
 */
function OverworkedMuscleItem({
  muscle,
  muscleData,
}: {
  muscle: MuscleGroup;
  muscleData: BodyMapData;
}) {
  const data = muscleData[muscle];
  const region = MUSCLE_REGIONS[muscle];
  const recoveryScore = data?.recovery_score ?? 0;
  const tier = getRecoveryTier(recoveryScore);
  const color = getMuscleFillColor(tier);

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-red-100/70 dark:bg-red-800/25">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-red-900 dark:text-red-200">
          {region?.label}
        </span>
      </div>
      <span className="text-xs text-red-700 dark:text-red-400">
        Recovery: {Math.round(recoveryScore)}%
      </span>
    </div>
  );
}

/**
 * Undertrained muscle list item
 */
function UndertrainedMuscleItem({
  muscle,
  muscleData,
}: {
  muscle: MuscleGroup;
  muscleData: BodyMapData;
}) {
  const data = muscleData[muscle];
  const region = MUSCLE_REGIONS[muscle];
  const weeklyVolume = data?.weekly_volume ?? 0;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-100/70 dark:bg-blue-800/25">
      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
        {region?.label}
      </span>
      <span className="text-xs text-blue-700 dark:text-blue-400">
        {weeklyVolume} sets / week
      </span>
    </div>
  );
}

export default ImbalanceSummary;
