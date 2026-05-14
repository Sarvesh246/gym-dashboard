"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import BodyMapCanvas from "@/components/body-map/BodyMapCanvas";
import MuscleDetailPanel from "@/components/body-map/MuscleDetailPanel";
import MuscleFilterControls from "@/components/body-map/MuscleFilterControls";
import ImbalanceSummary from "@/components/body-map/ImbalanceSummary";
import MuscleTooltip from "@/components/body-map/MuscleTooltip";

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

/**
 * Body Map Page Client Component
 * Manages:
 * - Time range filter state
 * - Selected muscle detail panel
 * - Hovering muscle tooltip
 * - Data fetching and caching
 * - Responsive layout (desktop side panel vs mobile bottom sheet)
 */
export function BodyMapPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [timeRange, setTimeRange] = useState<TimeRange>(
    (searchParams.get("range") as TimeRange) || "7d"
  );
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [data, setData] = useState<BodyMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch body map data
  const fetchBodyMapData = useCallback(async (range: TimeRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/body-map?range=${range}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch body map data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching body map data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and when time range changes
  useEffect(() => {
    fetchBodyMapData(timeRange);
  }, [timeRange, fetchBodyMapData]);

  // Update URL when time range changes
  const handleRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    // Update URL query param
    const params = new URLSearchParams();
    params.set("range", newRange);
    router.push(`/body-map?${params.toString()}`, { scroll: false });
  };

  const handleMuscleClick = (muscle: MuscleGroup) => {
    setSelectedMuscle(muscle);
  };

  const handleClosePanel = () => {
    setSelectedMuscle(null);
  };

  if (isLoading && !data) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Loading your muscle recovery map...</p>
          <LoadingState />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          message={error || "Failed to load body map"}
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
        <ErrorState message="No muscle recovery data found. Log a workout to get started." />
      </PageContainer>
    );
  }

  // Find imbalance info for selected muscle
  const selectedImbalanceInfo = selectedMuscle
    ? data.imbalances.imbalancedPairs.find(
        (pair) =>
          pair.pairLabel.toLowerCase().includes(selectedMuscle) ||
          selectedMuscle.includes("_")
      )
    : undefined;

  return (
    <PageContainer>
      <div className="space-y-8 py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Muscle Recovery Map</h1>
          <p className="text-muted-foreground">
            Last {timeRange === "7d" ? "7" : timeRange === "14d" ? "14" : "30"} days training load distribution
          </p>
        </div>

        {/* Filter Controls */}
        <MuscleFilterControls
          selectedRange={timeRange}
          onRangeChange={handleRangeChange}
          isLoading={isLoading}
        />

        {/* Body Map Canvas */}
        <SectionCard title="Your Muscles">
          <div className="flex justify-center">
            <BodyMapCanvas
              muscleData={data.muscleData}
              onMuscleClick={handleMuscleClick}
              onMuscleHover={setHoveredMuscle}
              selectedMuscle={selectedMuscle}
            />
          </div>

          {/* Hover Tooltip */}
          {hoveredMuscle && (
            <MuscleTooltip
              muscle={hoveredMuscle}
              muscleData={data.muscleData}
              position={{ x: 0, y: 0 }} // Position handled by component
            />
          )}
        </SectionCard>

        {/* Imbalance Summary */}
        <SectionCard title="Training Balance">
          <ImbalanceSummary
            muscleData={data.muscleData}
            overworkedMuscles={data.overworkedMuscles}
            undertrainedMuscles={data.undertrainedMuscles}
            imbalances={data.imbalances.imbalancedPairs}
          />
        </SectionCard>

        {/* Systemic Recovery Info */}
        <SectionCard title="Overall Readiness">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Readiness</div>
              <div className="text-2xl font-bold text-primary">
                {Math.round(data.systemicReadiness.readiness_score)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">/ 100</div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Systemic Fatigue</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round(data.systemicReadiness.systemic_fatigue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">/ 100</div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <div className="text-lg font-bold capitalize">
                {data.systemicReadiness.recovery_tier}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Detail Panel */}
      <MuscleDetailPanel
        isOpen={!!selectedMuscle}
        muscle={selectedMuscle}
        muscleData={data.muscleData}
        onClose={handleClosePanel}
        imbalanceInfo={selectedImbalanceInfo}
      />
    </PageContainer>
  );
}
