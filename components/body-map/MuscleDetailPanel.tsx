"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";
import {
  getMuscleFillColor,
  getRecoveryTier,
  getMuscleTrainingReadiness,
} from "@/lib/body-map/visualization";

// ─── Props ─────────────────────────────────────────────────────────────────────

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
  /**
   * "sheet"  → mobile bottom sheet (fixed, slides up with backdrop)
   * "inline" → desktop side panel (rendered in document flow, no fixed)
   */
  variant?: "sheet" | "inline";
}

type ScoreMode = "current" | "raw";

// ─── Animations ───────────────────────────────────────────────────────────────

const sheetVariants = {
  hidden:  { y: "100%",   opacity: 0 },
  visible: { y: 0,        opacity: 1 },
  exit:    { y: "100%",   opacity: 0 },
};

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};

const inlineVariants = {
  hidden:  { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: 8 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MuscleDetailPanel: React.FC<MuscleDetailPanelProps> = ({
  isOpen,
  muscle,
  muscleData,
  onClose,
  exerciseHistory = [],
  imbalanceInfo,
  variant = "sheet",
}) => {
  const [scoreMode, setScoreMode] = useState<ScoreMode>("current");

  // Inline variant: always rendered, content fades in/out
  if (variant === "inline") {
    return (
      <AnimatePresence mode="wait">
        {isOpen && muscle && muscleData[muscle] ? (
          <motion.div
            key={muscle}
            variants={inlineVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full"
          >
            <PanelContent
              muscle={muscle}
              muscleData={muscleData}
              onClose={onClose}
              exerciseHistory={exerciseHistory}
              imbalanceInfo={imbalanceInfo}
              scoreMode={scoreMode}
              onScoreModeChange={setScoreMode}
              showCloseButton
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center text-center p-8"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-xl">💪</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Select a muscle</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Click any muscle on the map to view its recovery data
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Sheet variant: mobile bottom sheet overlay
  if (!muscle || !muscleData[muscle]) return null;

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
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom sheet */}
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.32, type: "spring", stiffness: 260, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="overflow-y-auto flex-1">
              <PanelContent
                muscle={muscle}
                muscleData={muscleData}
                onClose={onClose}
                exerciseHistory={exerciseHistory}
                imbalanceInfo={imbalanceInfo}
                scoreMode={scoreMode}
                onScoreModeChange={setScoreMode}
                showCloseButton
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Shared panel content ─────────────────────────────────────────────────────

interface PanelContentProps {
  muscle: MuscleGroup;
  muscleData: BodyMapData;
  onClose: () => void;
  exerciseHistory: Array<{
    exerciseName: string;
    date: string;
    sets: number;
    reps: number;
  }>;
  imbalanceInfo?: MuscleDetailPanelProps["imbalanceInfo"];
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  showCloseButton?: boolean;
}

function PanelContent({
  muscle,
  muscleData,
  onClose,
  exerciseHistory,
  imbalanceInfo,
  scoreMode,
  onScoreModeChange,
  showCloseButton,
}: PanelContentProps) {
  const data   = muscleData[muscle];
  const region = MUSCLE_REGIONS[muscle];

  if (!data) return null;

  const tier      = getRecoveryTier(data.recovery_score ?? 0);
  const tierColor = getMuscleFillColor(tier);

  const recoveryScore = scoreMode === "current" ? data.recovery_score : data.raw_recovery_score;
  const fatigueScore  = scoreMode === "current" ? data.fatigue_score  : data.raw_fatigue_score;
  const strainScore   = scoreMode === "current" ? data.strain_score   : data.raw_strain_score;

  const fmt = (n: number | null | undefined) => Math.round(n ?? 0);

  return (
    <div>
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-card border-b border-border/60 px-4 sm:px-6 py-4"
        style={{ borderBottomColor: tierColor + "22" }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: tierColor }}
            />
            <h2 className="text-lg font-semibold truncate">{region?.label}</h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tierColor + "22", color: tierColor }}
            >
              {tier === "green"
                ? "Recovered"
                : tier === "yellow"
                ? "Moderate"
                : tier === "orange"
                ? "Fatigued"
                : "Overloaded"}
            </span>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Score mode toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["current", "raw"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onScoreModeChange(mode)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                scoreMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "current" ? "With Decay" : "Raw"}
            </button>
          ))}
        </div>
        {scoreMode === "current" ? (
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Time-decay applied since last session
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            Direct scores from last workout
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-4 space-y-6">

        {/* Recovery metrics */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recovery Status
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Recovery" value={fmt(recoveryScore)} unit="%" color={tierColor} />
            <MetricCard label="Fatigue"  value={fmt(fatigueScore)}  unit="%" color={tierColor} />
            <MetricCard label="Strain"   value={fmt(strainScore)}   unit="%" color={tierColor} />
            <MetricCard label="Soreness" value={fmt(data.soreness_score)} unit="%" color={tierColor} />
          </div>
        </section>

        {/* Training load */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Training Load
          </h3>
          <div className="space-y-1.5">
            <LoadRow label="Weekly Volume"    value={`${data.weekly_volume ?? 0} sets`} />
            <LoadRow label="Weekly Frequency" value={`${data.weekly_frequency ?? 0} sessions`} />
            {(data.hypertrophy_load ?? 0) > 0 && (
              <LoadRow
                label="Hypertrophy Load"
                value={Math.round(data.hypertrophy_load ?? 0).toString()}
              />
            )}
          </div>
        </section>

        {/* Last trained */}
        {data.last_trained_at && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Last Trained
            </h3>
            <p className="text-sm">{formatDate(new Date(data.last_trained_at))}</p>
          </section>
        )}

        {/* Exercise history */}
        {exerciseHistory.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Recent Exercises
            </h3>
            <div className="space-y-1.5">
              {exerciseHistory.map((ex, idx) => (
                <div key={idx} className="flex items-start justify-between p-2.5 rounded-lg bg-muted text-sm gap-2">
                  <span className="font-medium truncate flex-1">{ex.exerciseName}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {ex.sets}×{ex.reps} · {formatDate(new Date(ex.date))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Imbalance warning */}
        {imbalanceInfo && (
          <section className="p-4 rounded-xl border border-orange-200/70 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20">
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1.5">
              Imbalance Detected
            </h3>
            <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
              {imbalanceInfo.pairLabel}
            </p>
            <div className="flex gap-3 text-xs text-orange-700 dark:text-orange-300 mb-2">
              <span>Severity: <strong className="capitalize">{imbalanceInfo.severity}</strong></span>
              <span>Ratio: <strong>{imbalanceInfo.ratio.toFixed(2)}:1</strong></span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {imbalanceInfo.recommendation}
            </p>
          </section>
        )}

        {/* Training readiness */}
        <section className="p-4 rounded-xl border border-border/60 bg-muted/40">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Training Readiness
          </h3>
          <p className="text-sm">
            {getMuscleTrainingReadiness(recoveryScore ?? 0, fatigueScore ?? 0)}
          </p>
        </section>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <div className="p-3 rounded-xl bg-muted">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function LoadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default MuscleDetailPanel;
