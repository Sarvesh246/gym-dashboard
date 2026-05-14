"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";
import {
  getMuscleFillColor,
  getRecoveryTier,
  getMuscleTrainingReadiness,
} from "@/lib/body-map/visualization";

interface MuscleDetailPanelProps {
  isOpen: boolean;
  muscle: MuscleGroup | null;
  muscleData: BodyMapData;
  onClose: () => void;
  exerciseHistory?: Array<{
    exerciseName: string;
    date: string;
    sets: number;
    reps: number;
  }>;
  imbalanceInfo?: {
    pairLabel: string;
    ratio: number;
    severity: "mild" | "moderate" | "severe";
    recommendation: string;
  };
}

type ScoreMode = "current" | "raw";

/**
 * Detail panel that slides in from right (desktop) or bottom (mobile)
 * Shows comprehensive muscle metrics, exercise history, and recommendations
 */
export const MuscleDetailPanel: React.FC<MuscleDetailPanelProps> = ({
  isOpen,
  muscle,
  muscleData,
  onClose,
  exerciseHistory = [],
  imbalanceInfo,
}) => {
  const [scoreMode, setScoreMode] = useState<ScoreMode>("current");

  if (!muscle || !muscleData[muscle]) {
    return null;
  }

  const data = muscleData[muscle];
  const region = MUSCLE_REGIONS[muscle];
  const tier = getRecoveryTier(data.recovery_score ?? 0);
  const tierColor = getMuscleFillColor(tier);

  // Get scores based on mode
  const recoveryScore = scoreMode === "current" ? data.recovery_score : data.raw_recovery_score;
  const fatigueScore = scoreMode === "current" ? data.fatigue_score : data.raw_fatigue_score;
  const strainScore = scoreMode === "current" ? data.strain_score : data.raw_strain_score;

  const formattedRecoveryScore = Math.round(recoveryScore ?? 0);
  const formattedFatigueScore = Math.round(fatigueScore ?? 0);
  const formattedStrainScore = Math.round(strainScore ?? 0);

  const panelVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md bg-card border-l border-border overflow-y-auto"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 bg-card border-b border-border p-4 sm:p-6"
              style={{ borderBottomColor: tierColor + "22" }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tierColor }}
                  />
                  <h2 className="text-xl font-semibold">{region?.label}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScoreMode("current")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    scoreMode === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Current
                </button>
                <button
                  onClick={() => setScoreMode("raw")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    scoreMode === "raw"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Raw
                </button>
              </div>
              {scoreMode === "current" && (
                <p className="text-xs text-muted-foreground mt-2">
                  With time-decay applied since last training
                </p>
              )}
              {scoreMode === "raw" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Scores from last workout session (no decay)
                </p>
              )}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Recovery Metrics Grid */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Recovery Status
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Recovery"
                    value={formattedRecoveryScore}
                    unit="%"
                    color={tierColor}
                  />
                  <MetricCard
                    label="Fatigue"
                    value={formattedFatigueScore}
                    unit="%"
                    color={tierColor}
                  />
                  <MetricCard
                    label="Strain"
                    value={formattedStrainScore}
                    unit="%"
                    color={tierColor}
                  />
                  <MetricCard
                    label="Soreness"
                    value={Math.round(data.soreness_score ?? 0)}
                    unit="%"
                    color={tierColor}
                  />
                </div>
              </section>

              {/* Training Load */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Training Load (Last 7 Days)
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Weekly Volume</span>
                    <span className="font-semibold">{data.weekly_volume ?? 0} sets</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Weekly Frequency</span>
                    <span className="font-semibold">{data.weekly_frequency ?? 0} sessions</span>
                  </div>
                  {data.hypertrophy_load !== undefined && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Hypertrophy Load</span>
                      <span className="font-semibold">
                        {Math.round(data.hypertrophy_load)}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Last Trained */}
              {data.last_trained_at && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Last Trained
                  </h3>
                  <p className="text-sm">
                    {formatDate(new Date(data.last_trained_at))}
                  </p>
                </section>
              )}

              {/* Exercise History */}
              {exerciseHistory.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Recent Exercises
                  </h3>
                  <div className="space-y-2">
                    {exerciseHistory.map((exercise, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted text-sm">
                        <div className="font-medium">{exercise.exerciseName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {exercise.sets}×{exercise.reps} • {formatDate(new Date(exercise.date))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Imbalance Warning */}
              {imbalanceInfo && (
                <section className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20">
                  <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    ⚠️ Muscle Imbalance Detected
                  </h3>
                  <p className="text-xs text-orange-800 dark:text-orange-200 mb-3">
                    {imbalanceInfo.pairLabel}
                  </p>
                  <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1 mb-3">
                    <p>Severity: <strong className="capitalize">{imbalanceInfo.severity}</strong></p>
                    <p>Ratio: <strong>{imbalanceInfo.ratio.toFixed(2)}:1</strong></p>
                  </div>
                  <p className="text-xs text-orange-800 dark:text-orange-200">
                    {imbalanceInfo.recommendation}
                  </p>
                </section>
              )}

              {/* Training Recommendation */}
              <section className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 Training Readiness
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {getMuscleTrainingReadiness(recoveryScore ?? 0, fatigueScore ?? 0)}
                </p>
              </section>

              {/* Future Actions */}
              <div className="pt-4 border-t border-border">
                <button className="w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  View full muscle history →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Metric card component
 */
function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

export default MuscleDetailPanel;
