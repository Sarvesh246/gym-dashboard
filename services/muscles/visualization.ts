/**
 * Muscle Visualization Service
 * Merges workout + recovery + strain data into a display-ready payload.
 * Server-side only.
 */

import { getBodyMapData } from "@/services/muscles";
import { getSystemicRecovery } from "@/services/recovery";
import { BODY_MAP_MUSCLES } from "@/lib/body-map/mapping";
import { transformBodyMapData } from "@/services/body-map/transform";
import type { MuscleGroup, BodyMapData } from "@/lib/recovery/types";
import type { BodyMapUIPayload } from "@/services/body-map/transform";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemicContext {
  readiness_score: number;
  systemic_fatigue: number;
  recovery_tier: string;
  strain_accumulation: number;
}

export interface MuscleVisualizationPayload {
  muscleData: BodyMapData;
  systemicContext: SystemicContext;
  uiPayload: BodyMapUIPayload;
  generatedAt: string;
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

/**
 * Fetches and merges all data needed to render the body map.
 * Calls muscle service + systemic recovery in parallel for fast response.
 */
export async function getMuscleVisualizationPayload(
  userId: string
): Promise<MuscleVisualizationPayload> {
  const [muscleData, systemic] = await Promise.all([
    getBodyMapData(userId),
    getSystemicRecovery(userId),
  ]);

  const uiPayload = transformBodyMapData(
    muscleData,
    BODY_MAP_MUSCLES as MuscleGroup[]
  );

  return {
    muscleData,
    systemicContext: {
      readiness_score:    systemic?.readiness_score    ?? 0,
      systemic_fatigue:   systemic?.systemic_fatigue   ?? 0,
      recovery_tier:      systemic?.recovery_tier      ?? "green",
      strain_accumulation: systemic?.strain_accumulation ?? 0,
    },
    uiPayload,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Builds a heatmap-optimised dataset (muscle → intensity 0–1).
 * Intensity 1 = most fatigued, 0 = fully recovered.
 */
export function buildHeatmapDataset(
  muscleData: BodyMapData,
  muscles: MuscleGroup[]
): Partial<Record<MuscleGroup, number>> {
  const heatmap: Partial<Record<MuscleGroup, number>> = {};

  for (const muscle of muscles) {
    const data = muscleData[muscle];
    if (!data) {
      heatmap[muscle] = 0;
      continue;
    }
    // Intensity derived from fatigue (not recovery) — high fatigue = high heat
    const fatigue = Math.max(0, Math.min(100, data.fatigue_score ?? 0));
    heatmap[muscle] = fatigue / 100;
  }

  return heatmap;
}

/**
 * Returns per-muscle summary rows sorted by recovery score ascending
 * (most fatigued first), useful for tables or priority lists.
 */
export function rankMusclesByFatigue(
  muscleData: BodyMapData,
  muscles: MuscleGroup[]
): Array<{ muscle: MuscleGroup; recoveryScore: number; fatigueScore: number }> {
  return muscles
    .map((muscle) => ({
      muscle,
      recoveryScore: muscleData[muscle]?.recovery_score ?? 100,
      fatigueScore:  muscleData[muscle]?.fatigue_score  ?? 0,
    }))
    .sort((a, b) => a.recoveryScore - b.recoveryScore);
}
