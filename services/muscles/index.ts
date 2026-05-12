/**
 * Muscle service — per-muscle state reads, writes, and body-map aggregation.
 * Server-side only. Gracefully returns computed defaults when tables are empty.
 */

import { createClient } from "@/lib/supabase/server";
import type { MuscleState, MuscleGroup, BodyMapData } from "@/lib/recovery/types";
import { BODY_MAP_MUSCLES, MUSCLE_LABELS } from "@/lib/muscles/mapping";
import {
  applyMuscleDecay,
  muscleReadinessModifier,
  classifyRecoveryTier,
} from "@/lib/recovery/decay";
import { calculateMuscleRecovery } from "@/lib/recovery/scoring";

// ─── Read all muscle states ───────────────────────────────────────────────────

export async function getMuscleStates(userId: string): Promise<MuscleState[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("muscle_states")
      .select("*")
      .eq("user_id", userId);

    if (error || !data || (data as unknown[]).length === 0) return [];
    return data as MuscleState[];
  } catch {
    return [];
  }
}

// ─── Get a single muscle state ────────────────────────────────────────────────

export async function getMuscleState(
  userId: string,
  muscleGroup: MuscleGroup
): Promise<MuscleState | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("muscle_states")
      .select("*")
      .eq("user_id", userId)
      .eq("muscle_group", muscleGroup)
      .single();

    if (error || !data) return null;
    return data as MuscleState;
  } catch {
    return null;
  }
}

// ─── Upsert muscle state ──────────────────────────────────────────────────────

export async function upsertMuscleState(
  userId: string,
  muscleGroup: MuscleGroup,
  data: Partial<Omit<MuscleState, "id" | "user_id" | "muscle_group" | "updated_at">>
): Promise<void> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("muscle_states")
      .upsert(
        {
          user_id:      userId,
          muscle_group: muscleGroup,
          ...data,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "user_id,muscle_group" }
      );
  } catch {
    // Non-fatal
  }
}

// ─── Apply strain from a workout to affected muscles ─────────────────────────

export async function applyWorkoutStrainToMuscles(
  userId: string,
  localMuscleLoads: Partial<Record<MuscleGroup, number>>,
  trainedAt: string = new Date().toISOString()
): Promise<void> {
  const writes = Object.entries(localMuscleLoads).map(([muscle, load]) =>
    upsertMuscleState(userId, muscle as MuscleGroup, {
      strain_score:   load ?? 0,
      fatigue_score:  load ?? 0,
      recovery_score: Math.max(0, 100 - (load ?? 0)),
      last_trained_at: trainedAt,
    })
  );
  await Promise.all(writes);
}

// ─── Body map data ────────────────────────────────────────────────────────────

/**
 * Returns a body-map-ready payload for all tracked muscle groups.
 * Applies time-decay projection so scores are always fresh.
 */
export async function getBodyMapData(userId: string): Promise<BodyMapData> {
  const storedStates = await getMuscleStates(userId);
  const stateMap = new Map(storedStates.map((s) => [s.muscle_group, s]));

  const bodyMap: BodyMapData = {};

  for (const muscle of BODY_MAP_MUSCLES) {
    const stored = stateMap.get(muscle);

    if (stored) {
      // Project time-decayed scores
      const { recovery_score, fatigue_score } = applyMuscleDecay(stored);
      bodyMap[muscle] = {
        recovery_score,
        fatigue_score,
        tier:              classifyRecoveryTier(recovery_score),
        last_trained_at:   stored.last_trained_at,
        weekly_frequency:  stored.weekly_frequency,
      };
    } else {
      // No training data → fully recovered
      bodyMap[muscle] = {
        recovery_score:    100,
        fatigue_score:     0,
        tier:              "green",
        last_trained_at:   null,
        weekly_frequency:  0,
      };
    }
  }

  return bodyMap;
}

// ─── Average muscle recovery ──────────────────────────────────────────────────

export async function getAverageMuscleRecovery(userId: string): Promise<number> {
  const states = await getMuscleStates(userId);
  if (states.length === 0) return 100; // no training logged → fully recovered

  const scores = states.map((s) => applyMuscleDecay(s).recovery_score);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ─── Imbalance detection ──────────────────────────────────────────────────────

/**
 * Flags agonist/antagonist pairs that are significantly imbalanced in training
 * frequency, which can be a predictor of injury risk.
 */
export async function detectMuscleImbalances(
  userId: string
): Promise<{ muscle: MuscleGroup; label: string; concern: string }[]> {
  const states = await getMuscleStates(userId);
  const freqMap = new Map(states.map((s) => [s.muscle_group, s.weekly_frequency]));

  const flags: { muscle: MuscleGroup; label: string; concern: string }[] = [];

  const pairs: [MuscleGroup, MuscleGroup, string][] = [
    ["chest",    "upper_back",  "push/pull balance"],
    ["quads",    "hamstrings",  "anterior/posterior leg balance"],
    ["biceps",   "triceps",     "arm flexor/extensor balance"],
    ["front_delts", "rear_delts", "shoulder front/rear balance"],
  ];

  for (const [a, b, concern] of pairs) {
    const fa = freqMap.get(a) ?? 0;
    const fb = freqMap.get(b) ?? 0;
    if (fa > 0 || fb > 0) {
      const ratio = fa / Math.max(fb, 1);
      if (ratio > 2.5) {
        flags.push({ muscle: a, label: MUSCLE_LABELS[a], concern: `Over-emphasis detected — ${concern}` });
      } else if (ratio < 0.4) {
        flags.push({ muscle: b, label: MUSCLE_LABELS[b], concern: `Under-emphasis detected — ${concern}` });
      }
    }
  }

  return flags;
}
