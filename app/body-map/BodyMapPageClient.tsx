"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import BodyMapCanvas from "@/components/body-map/BodyMapCanvas";
import MuscleDetailPanel from "@/components/body-map/MuscleDetailPanel";
import MuscleFilterControls from "@/components/body-map/MuscleFilterControls";
import ImbalanceSummary from "@/components/body-map/ImbalanceSummary";
import MuscleLegend from "@/components/body-map/MuscleLegend";
import MuscleOverlay from "@/components/body-map/MuscleOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = "7d" | "14d" | "30d";

interface BodyMapResponse {
  muscleData: BodyMapData;
  imbalances: {
    flag: string | null;
    imbalancedPairs: Array<{
      pairLabel: string;
      ratio: number;
      severity: "mild" | "moderate" | "severe";
      recommendation: string;
    }>;
  };
  overworkedMuscles: MuscleGroup[];
  undertrainedMuscles: MuscleGroup[];
  systemicReadiness: {
    readiness_score: number;
    systemic_fatigue: number;
    recovery_tier: string;
  };
  generatedAt: string;
  timeRange: string;
}

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d":  "7 days",
  "14d": "14 days",
  "30d": "30 days",
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Body Map Page — visual muscle intelligence platform.
 *
 * Layout:
 *  Desktop (lg+): Two-column — body map canvas + inline side panel
 *  Mobile:        Single column + bottom sheet overlay on muscle tap
 */
export function BodyMapPageClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [timeRange, setTimeRange] = useState<TimeRange>(
    (searchParams.get("range") as TimeRange) || "7d"
  );
  const [selectedMuscle, setSelectedMuscle]   = useState<MuscleGroup | null>(null);
  const [hoveredMuscle,  setHoveredMuscle]    = useState<MuscleGroup | null>(null);
  const [hasInteracted,  setHasInteracted]    = useState(false);
  const [data,           setData]             = useState<BodyMapResponse | null>(null);
  const [isLoading,      setIsLoading]        = useState(true);
  const [error,          setError]            = useState<string | null>(null);

  // Cache per time range
  const cache = useRef<Partial<Record<TimeRange, BodyMapResponse>>>({});

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchBodyMapData = useCallback(async (range: TimeRange) => {
    if (cache.current[range]) {
      setData(cache.current[range]!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/body-map?range=${range}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch muscle recovery data");
      const result: BodyMapResponse = await res.json();
      cache.current[range] = result;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBodyMapData(timeRange);
  }, [timeRange, fetchBodyMapData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setSelectedMuscle(null);
    const params = new URLSearchParams();
    params.set("range", newRange);
    router.push(`/body-map?${params.toString()}`, { scroll: false });
  };

  const handleMuscleClick = useCallback((muscle: MuscleGroup) => {
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
    setHasInteracted(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedMuscle(null);
  }, []);

  // ─── Find imbalance info for selected muscle ───────────────────────────────

  const selectedImbalanceInfo = selectedMuscle && data
    ? data.imbalances.imbalancedPairs.find((pair) =>
        pair.pairLabel.toLowerCase().includes(selectedMuscle.replace(/_/g, " ").split(" ")[0])
      )
    : undefined;

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-muted-foreground text-sm">Loading muscle recovery map…</p>
          <LoadingState />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          message={error}
          retry={
            <button
              onClick={() => fetchBodyMapData(timeRange)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          }
        />
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <ErrorState message="No muscle data found. Log a workout to get started." />
      </PageContainer>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <div className="py-6 space-y-8">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-1 text-center"
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Muscle Recovery Map
            </h1>
            <p className="text-sm text-muted-foreground">
              Last {RANGE_LABELS[timeRange]} training load distribution
            </p>
          </motion.div>

          {/* ── Filter controls ── */}
          <MuscleFilterControls
            selectedRange={timeRange}
            onRangeChange={handleRangeChange}
            isLoading={isLoading}
          />

          {/* ── Main content: two-column on desktop ── */}
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">

            {/* Left column — canvas + legend + readiness strip */}
            <div className="space-y-4">

              {/* Canvas card */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
                <BodyMapCanvas
                  muscleData={data.muscleData}
                  onMuscleClick={handleMuscleClick}
                  onMuscleHover={setHoveredMuscle}
                  selectedMuscle={selectedMuscle}
                />

                {/* Canvas overlay — hint / selected chip */}
                <MuscleOverlay
                  selectedMuscle={selectedMuscle}
                  muscleData={data.muscleData}
                  hasInteracted={hasInteracted}
                />

                {/* Inline hover strip (desktop only — shows tooltip info below SVG) */}
                <div className="hidden lg:block mt-4 min-h-[3rem]">
                  {hoveredMuscle && data.muscleData[hoveredMuscle] && (
                    <motion.div
                      key={hoveredMuscle}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/60 border border-border/40"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: (() => {
                            const tier = data.muscleData[hoveredMuscle]?.tier ?? "green";
                            const map: Record<string, string> = {
                              green: "#22C55E", yellow: "#F59E0B",
                              orange: "#F97316", red: "#EF4444",
                            };
                            return map[tier] || "#9CA3AF";
                          })(),
                        }}
                      />
                      <span className="text-sm font-medium">
                        {MUSCLE_LABELS[hoveredMuscle]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Recovery {Math.round(data.muscleData[hoveredMuscle]?.recovery_score ?? 0)}%
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 sm:px-6">
                <MuscleLegend compact />
              </div>

              {/* Systemic readiness strip */}
              <ReadinessStrip systemicReadiness={data.systemicReadiness} />
            </div>

            {/* Right column — desktop inline detail panel */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden min-h-[460px]">
                <MuscleDetailPanel
                  isOpen={!!selectedMuscle}
                  muscle={selectedMuscle}
                  muscleData={data.muscleData}
                  onClose={handleClosePanel}
                  imbalanceInfo={selectedImbalanceInfo}
                  variant="inline"
                />
              </div>
            </div>
          </div>

          {/* ── Training balance (full width) ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-4">Training Balance</h2>
            <ImbalanceSummary
              muscleData={data.muscleData}
              overworkedMuscles={data.overworkedMuscles}
              undertrainedMuscles={data.undertrainedMuscles}
              imbalances={data.imbalances.imbalancedPairs}
            />
          </div>

        </div>
      </PageContainer>

      {/* ── Mobile bottom sheet (lg:hidden) ── */}
      <div className="lg:hidden">
        <MuscleDetailPanel
          isOpen={!!selectedMuscle}
          muscle={selectedMuscle}
          muscleData={data.muscleData}
          onClose={handleClosePanel}
          imbalanceInfo={selectedImbalanceInfo}
          variant="sheet"
        />
      </div>
    </div>
  );
}

// ─── Readiness strip ──────────────────────────────────────────────────────────

function ReadinessStrip({
  systemicReadiness,
}: {
  systemicReadiness: BodyMapResponse["systemicReadiness"];
}) {
  const tier = systemicReadiness.recovery_tier;
  const tierColorClass =
    tier === "green"  ? "text-green-500"  :
    tier === "yellow" ? "text-yellow-500" :
    tier === "orange" ? "text-orange-500" : "text-red-500";

  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Readiness</p>
            <p className={`text-xl font-bold tabular-nums ${tierColorClass}`}>
              {Math.round(systemicReadiness.readiness_score)}
              <span className="text-sm font-normal text-muted-foreground ml-0.5">/100</span>
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground text-right">Systemic Fatigue</p>
          <p className="text-xl font-bold tabular-nums text-right text-orange-500">
            {Math.round(systemicReadiness.systemic_fatigue)}
            <span className="text-sm font-normal text-muted-foreground ml-0.5">/100</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground text-right">Status</p>
          <p className={`text-sm font-semibold capitalize text-right ${tierColorClass}`}>
            {tier}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Muscle label map ─────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest:       "Chest",
  upper_chest: "Upper Chest",
  front_delts: "Front Delts",
  side_delts:  "Side Delts",
  rear_delts:  "Rear Delts",
  triceps:     "Triceps",
  biceps:      "Biceps",
  forearms:    "Forearms",
  upper_back:  "Upper Back",
  lats:        "Lats",
  traps:       "Traps",
  lower_back:  "Lower Back",
  core:        "Core",
  glutes:      "Glutes",
  quads:       "Quads",
  hamstrings:  "Hamstrings",
  calves:      "Calves",
};
