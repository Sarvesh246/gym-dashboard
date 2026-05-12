/**
 * Readiness service — computes and persists readiness scores, pulling together
 * systemic recovery and muscle states into a unified training recommendation.
 */

import type { ReadinessOutput } from "@/lib/recovery/types";
import { calculateReadiness } from "@/lib/recovery/scoring";
import { SLEEP_QUALITY_SCORE, STRESS_LEVEL_SCORE } from "@/lib/recovery/constants";
import {
  getSystemicRecovery,
  computeSystemicRecoveryFromProfile,
  get7DayStrainAccumulation,
  upsertSystemicRecovery,
} from "@/services/recovery";
import { getAverageMuscleRecovery } from "@/services/muscles";
import { createClient } from "@/lib/supabase/server";

// ─── Main readiness computation ───────────────────────────────────────────────

export async function computeReadiness(userId: string): Promise<ReadinessOutput> {
  // 1. Fetch systemic state (or compute from profile if not stored)
  const systemic = await getSystemicRecovery(userId);

  const { systemic_fatigue, sleep_modifier, stress_modifier } =
    systemic ?? (await computeSystemicRecoveryFromProfile(userId));

  // 2. Fetch muscle average recovery
  const avgMuscleRecovery = await getAverageMuscleRecovery(userId);

  // 3. Fetch 7-day strain accumulation
  const strainAccumulation = await get7DayStrainAccumulation(userId);

  // 4. Pull profile modifiers for sleep / stress
  const sleepScore  = systemic?.sleep_modifier !== undefined
    ? 65 + (systemic.sleep_modifier / 20) * 35
    : 65;

  const stressScore = systemic?.stress_modifier !== undefined
    ? 100 - (65 + (systemic.stress_modifier / 20) * 35)
    : 40;

  const hrvScore = systemic?.hrv_modifier !== undefined
    ? 65 + (systemic.hrv_modifier / 20) * 35
    : 65;

  // 5. Estimate consecutive training days from profile
  const consecutiveDays = await estimateConsecutiveDays(userId);

  const result = calculateReadiness({
    systemic_fatigue,
    sleep_quality_score:      sleepScore,
    stress_score:             stressScore,
    hrv_score:                hrvScore,
    strain_accumulation:      strainAccumulation,
    avg_muscle_recovery:      avgMuscleRecovery,
    consecutive_training_days: consecutiveDays,
  });

  // 6. Persist back so the systemic record is up to date
  await upsertSystemicRecovery(userId, {
    readiness_score:     result.readiness_score,
    systemic_fatigue,
    sleep_modifier:      sleep_modifier ?? 0,
    stress_modifier:     stress_modifier ?? 0,
    hrv_modifier:        systemic?.hrv_modifier ?? 0,
    strain_accumulation: strainAccumulation,
    recovery_tier:       result.tier,
  });

  return result;
}

// ─── Quick readiness (no DB write) ────────────────────────────────────────────

export async function getReadinessSnapshot(userId: string): Promise<ReadinessOutput> {
  return computeReadiness(userId);
}

// ─── Profile-derived sleep / stress scores ────────────────────────────────────

export async function getProfileModifiers(userId: string): Promise<{
  sleep_quality_score: number;
  stress_score: number;
}> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("profiles")
      .select("sleep_quality, stress_level")
      .eq("user_id", userId)
      .single();

    if (!data) return { sleep_quality_score: 65, stress_score: 40 };

    return {
      sleep_quality_score: SLEEP_QUALITY_SCORE[data.sleep_quality ?? "medium"],
      stress_score:        100 - STRESS_LEVEL_SCORE[data.stress_level ?? "medium"],
    };
  } catch {
    return { sleep_quality_score: 65, stress_score: 40 };
  }
}

// ─── Consecutive training day estimation ──────────────────────────────────────

async function estimateConsecutiveDays(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("workout_strain_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data || (data as unknown[]).length === 0) return 0;

    // Walk backwards counting consecutive calendar days that have a workout
    const dates = (data as { created_at: string }[]).map((r) =>
      new Date(r.created_at).toDateString()
    );
    const unique = [...new Set(dates)];

    let consecutive = 0;
    const today = new Date();

    for (let i = 0; i < unique.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (unique[i] === expected.toDateString()) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  } catch {
    return 0;
  }
}
