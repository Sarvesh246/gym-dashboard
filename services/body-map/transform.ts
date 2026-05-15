/**
 * Body Map Transform Layer
 * Converts raw muscle recovery data into display-ready UI state.
 * Pure functions only — no DB calls, no business logic, no side effects.
 */

import type { BodyMapData, MuscleGroup, RecoveryTier } from "@/lib/recovery/types";
import {
  getRecoveryTier,
  getMuscleFillColor,
  getFatigueOpacity,
} from "@/lib/body-map/visualization";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";

// ─── Display state for a single muscle ────────────────────────────────────────

export interface MuscleDisplayState {
  muscle: MuscleGroup;
  label: string;
  tier: RecoveryTier | "gray";
  fillColor: string;
  /** 0–1 opacity driven by fatigue score */
  fillOpacity: number;
  recoveryScore: number;
  fatigueScore: number;
  strainScore: number;
  sorenessScore: number;
  weeklyVolume: number;
  weeklyFrequency: number;
  lastTrainedAt: string | null;
  hasData: boolean;
  /** Recovery < 40 — suggest reduced volume */
  isOverworked: boolean;
  /** Weekly volume < 5 sets — muscle is under-stimulated */
  isUndertrained: boolean;
}

// ─── Imbalance flag (push/pull, quad/hamstring, etc.) ─────────────────────────

export interface ImbalanceFlag {
  pairLabel: string;
  ratio: number;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscle: MuscleGroup;
}

// ─── Full transformed payload for the UI ──────────────────────────────────────

export interface BodyMapUIPayload {
  muscleStates: Partial<Record<MuscleGroup, MuscleDisplayState>>;
  overworkedMuscles: MuscleGroup[];
  undertrainedMuscles: MuscleGroup[];
  imbalanceFlags: ImbalanceFlag[];
  averageRecovery: number;
  topFatiguedMuscle: MuscleGroup | null;
}

// ─── Imbalance pair definitions ───────────────────────────────────────────────

const IMBALANCE_PAIRS: Array<{
  primary: MuscleGroup;
  secondary: MuscleGroup;
  label: string;
}> = [
  { primary: "chest",      secondary: "upper_back", label: "Push vs Pull (Chest vs Back)" },
  { primary: "quads",      secondary: "hamstrings", label: "Leg Balance (Quads vs Hamstrings)" },
  { primary: "biceps",     secondary: "triceps",    label: "Arm Balance (Biceps vs Triceps)" },
  { primary: "front_delts",secondary: "rear_delts", label: "Shoulder Balance (Front vs Rear)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function clampScore(score: number | undefined | null): number {
  if (score == null) return 0;
  return Math.max(0, Math.min(100, score));
}

// ─── Single-muscle transform ──────────────────────────────────────────────────

export function getMuscleDisplayState(
  muscle: MuscleGroup,
  bodyMapData: BodyMapData
): MuscleDisplayState {
  const raw = bodyMapData[muscle];
  const region = MUSCLE_REGIONS[muscle];
  const hasData = !!raw;

  const recoveryScore  = clampScore(raw?.recovery_score  ?? (hasData ? 0 : 100));
  const fatigueScore   = clampScore(raw?.fatigue_score   ?? 0);
  const strainScore    = clampScore(raw?.strain_score    ?? 0);
  const sorenessScore  = clampScore(raw?.soreness_score  ?? 0);
  const weeklyVolume   = raw?.weekly_volume   ?? 0;
  const weeklyFrequency= raw?.weekly_frequency?? 0;

  const tier       = hasData ? getRecoveryTier(recoveryScore) : "gray";
  const fillColor  = getMuscleFillColor(tier);
  const fillOpacity = getFatigueOpacity(fatigueScore);

  return {
    muscle,
    label:          region?.label ?? muscle.replace(/_/g, " "),
    tier,
    fillColor,
    fillOpacity,
    recoveryScore,
    fatigueScore,
    strainScore,
    sorenessScore,
    weeklyVolume,
    weeklyFrequency,
    lastTrainedAt:  raw?.last_trained_at ?? null,
    hasData,
    isOverworked:   hasData && recoveryScore < 40,
    isUndertrained: weeklyVolume < 5,
  };
}

// ─── Full body-map transform ──────────────────────────────────────────────────

export function transformBodyMapData(
  bodyMapData: BodyMapData,
  muscles: MuscleGroup[]
): BodyMapUIPayload {
  const muscleStates: Partial<Record<MuscleGroup, MuscleDisplayState>> = {};
  const overworkedMuscles: MuscleGroup[] = [];
  const undertrainedMuscles: MuscleGroup[] = [];

  let totalRecovery = 0;
  let muscleCount = 0;
  let topFatiguedMuscle: MuscleGroup | null = null;
  let topFatigueScore = -1;

  for (const muscle of muscles) {
    const state = getMuscleDisplayState(muscle, bodyMapData);
    muscleStates[muscle] = state;

    if (state.hasData) {
      totalRecovery += state.recoveryScore;
      muscleCount++;
    }

    if (state.isOverworked)   overworkedMuscles.push(muscle);
    if (state.isUndertrained) undertrainedMuscles.push(muscle);

    if (state.fatigueScore > topFatigueScore) {
      topFatigueScore = state.fatigueScore;
      topFatiguedMuscle = muscle;
    }
  }

  return {
    muscleStates,
    overworkedMuscles,
    undertrainedMuscles,
    imbalanceFlags: detectImbalanceFlags(bodyMapData),
    averageRecovery: muscleCount > 0 ? totalRecovery / muscleCount : 100,
    topFatiguedMuscle,
  };
}

// ─── Imbalance detection (visual-only, reads weekly_volume ratios) ─────────────

function detectImbalanceFlags(bodyMapData: BodyMapData): ImbalanceFlag[] {
  const flags: ImbalanceFlag[] = [];

  for (const pair of IMBALANCE_PAIRS) {
    const p = bodyMapData[pair.primary];
    const s = bodyMapData[pair.secondary];
    if (!p || !s) continue;

    const pVol = p.weekly_volume ?? 0;
    const sVol = s.weekly_volume ?? 0;
    if (pVol === 0 && sVol === 0) continue;
    if (sVol === 0) continue; // avoid divide by zero

    const ratio = pVol / sVol;

    let severity: "mild" | "moderate" | "severe" | null = null;
    if      (ratio > 3.5 || ratio < 0.29) severity = "severe";
    else if (ratio > 2.5 || ratio < 0.40) severity = "moderate";
    else if (ratio > 2.0 || ratio < 0.50) severity = "mild";
    if (!severity) continue;

    const overMuscle  = ratio > 1 ? pair.primary   : pair.secondary;
    const underMuscle = ratio > 1 ? pair.secondary  : pair.primary;
    const overLabel   = overMuscle.replace(/_/g, " ");
    const underLabel  = underMuscle.replace(/_/g, " ");

    const rec: Record<typeof severity, string> = {
      severe:   `Critical imbalance — significantly reduce ${overLabel} training and increase ${underLabel}.`,
      moderate: `Moderate imbalance — gradually shift volume toward ${underLabel}.`,
      mild:     `Mild imbalance — consider adding sets to ${underLabel}.`,
    };

    flags.push({
      pairLabel:      pair.label,
      ratio,
      severity,
      recommendation: rec[severity],
      primaryMuscle:  pair.primary,
      secondaryMuscle: pair.secondary,
    });
  }

  return flags;
}

// ─── Normalise API imbalances (from /api/body-map) into ImbalanceFlag[] ────────

export function normalizeApiImbalances(
  apiImbalances: Array<{
    pairLabel: string;
    ratio: number;
    severity: "mild" | "moderate" | "severe";
    recommendation: string;
  }>
): ImbalanceFlag[] {
  return apiImbalances.map((i) => ({
    ...i,
    primaryMuscle:   "chest" as MuscleGroup, // placeholder — API doesn't return muscles
    secondaryMuscle: "upper_back" as MuscleGroup,
  }));
}
