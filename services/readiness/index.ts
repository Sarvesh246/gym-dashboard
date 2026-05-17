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
import {
  getDailyHealthMetricsWithDefaults,
  computeNormalizedHealthScores,
} from "@/services/health";
import { getWeeklyAdherenceStats, getUserNutritionGoals } from "@/services/nutrition";
import { getDailyHydrationTotal, calculateHydrationReadinessModifier } from "@/services/hydration/core";
import { calculateNutritionRecoveryModifier } from "@/lib/nutrition/adherence";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoverySnapshot {
  id: number;
  user_id: string;
  snapshot_date: string;
  readiness_score: number;
  systemic_fatigue: number;
  avg_muscle_recovery: number;
  recovery_tier: string;
  training_recommendation: string;
  weekly_strain_accumulation: number;
  key_suppressors: string[];
  created_at: string;
}

// ─── Main readiness computation ───────────────────────────────────────────────

export async function computeReadiness(userId: string): Promise<ReadinessOutput> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];  // YYYY-MM-DD

  // 1. Fetch systemic state (or compute from profile if not stored)
  const systemic = await getSystemicRecovery(userId);

  const { systemic_fatigue, sleep_modifier, stress_modifier } =
    systemic ?? (await computeSystemicRecoveryFromProfile(userId));

  // 2. Fetch daily health metrics with profile fallbacks (NEW)
  const profileModifiers = await getProfileModifiers(userId);
  const healthMetrics = await getDailyHealthMetricsWithDefaults(
    userId,
    today,
    {
      sleepQuality: profileModifiers.sleep_quality_score >= 70 ? "high" : profileModifiers.sleep_quality_score >= 55 ? "medium" : "low",
      stressLevel: profileModifiers.stress_score <= 40 ? "low" : profileModifiers.stress_score <= 60 ? "medium" : "high",
    },
    supabase
  );

  // 3. Compute normalized health scores (NEW)
  const healthScores = computeNormalizedHealthScores(healthMetrics as any);

  // 4. Fetch muscle average recovery
  const avgMuscleRecovery = await getAverageMuscleRecovery(userId);

  // 5. Fetch 7-day strain accumulation
  const strainAccumulation = await get7DayStrainAccumulation(userId);

  // 6. Estimate consecutive training days
  const consecutiveDays = await estimateConsecutiveDays(userId);

  // 7. Calculate readiness with daily health data (prioritize logged metrics)
  const result = calculateReadiness({
    systemic_fatigue,
    sleep_quality_score:      healthScores.sleep_quality_score,  // now from daily metrics
    stress_score:             healthScores.stress_score,  // now from daily metrics
    hrv_score:                healthScores.hrv_score,  // now from daily metrics
    strain_accumulation:      strainAccumulation,
    avg_muscle_recovery:      avgMuscleRecovery,
    consecutive_training_days: consecutiveDays,
  });

  // 8. Apply nutrition + hydration modifiers (deterministic, moderate effect)
  const [weeklyNutritionAdherence, hydrationToday] = await Promise.all([
    getWeeklyAdherenceStats(userId).catch(() => null),
    getDailyHydrationTotal(userId, today).catch(() => 0),
  ]);

  let nutrition_modifier = 0;
  let hydration_modifier = 0;

  if (weeklyNutritionAdherence) {
    nutrition_modifier = calculateNutritionRecoveryModifier(weeklyNutritionAdherence);
  }

  const goalsRes = await getUserNutritionGoals(userId).catch(() => null);
  const hydration_target = goalsRes?.hydration_target_ml ?? 2500;
  hydration_modifier = calculateHydrationReadinessModifier(hydrationToday, hydration_target);

  const total_modifier = nutrition_modifier + hydration_modifier;
  const adjusted_readiness = Math.max(0, Math.min(100, result.readiness_score + total_modifier));
  const adjusted_result = { ...result, readiness_score: adjusted_readiness };

  // 9. Persist back so the systemic record is up to date
  await upsertSystemicRecovery(userId, {
    readiness_score:     adjusted_readiness,
    systemic_fatigue,
    sleep_modifier:      sleep_modifier ?? 0,
    stress_modifier:     stress_modifier ?? 0,
    hrv_modifier:        systemic?.hrv_modifier ?? 0,
    strain_accumulation: strainAccumulation,
    recovery_tier:       adjusted_result.tier,
  });

  // 10. Persist recovery snapshot for trend analysis (NEW)
  await persistRecoverySnapshot(userId, today, adjusted_result, strainAccumulation, {
    systemic_fatigue,
    avg_muscle_recovery: avgMuscleRecovery,
  });

  return adjusted_result;
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

// ─── Recovery snapshot persistence (NEW) ──────────────────────────────────────

/**
 * Persist daily recovery snapshot for trend analysis.
 * Idempotent: same date = upsert, not duplicate.
 */
export async function persistRecoverySnapshot(
  userId: string,
  date: string,
  readinessOutput: ReadinessOutput,
  weeklyStrain: number,
  context?: { systemic_fatigue: number; avg_muscle_recovery: number }
): Promise<RecoverySnapshot | null> {
  try {
    const supabase = await createClient();
    const payload = {
      user_id: userId,
      snapshot_date: date,
      readiness_score: readinessOutput.readiness_score,
      systemic_fatigue: Math.round(context?.systemic_fatigue ?? 0),
      avg_muscle_recovery: Math.round(context?.avg_muscle_recovery ?? 0),
      recovery_tier: readinessOutput.tier,
      training_recommendation: readinessOutput.training_recommendation,
      weekly_strain_accumulation: weeklyStrain,
      key_suppressors: readinessOutput.suppression_factors,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_snapshots")
      .upsert(payload, { onConflict: "user_id,snapshot_date" })
      .select()
      .single();

    if (error) {
      console.error("[persistRecoverySnapshot] Error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[persistRecoverySnapshot] Exception:", err);
    return null;
  }
}

/**
 * Fetch recovery snapshot for a specific date.
 */
export async function getRecoverySnapshot(userId: string, date: string): Promise<RecoverySnapshot | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_snapshots")
      .select("*")
      .eq("user_id", userId)
      .eq("snapshot_date", date)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[getRecoverySnapshot] Error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[getRecoverySnapshot] Exception:", err);
    return null;
  }
}

/**
 * Fetch recovery snapshots for a date range (e.g., last 30 days).
 */
export async function getRecoverySnapshots(
  userId: string,
  startDate: string,
  endDate: string
): Promise<RecoverySnapshot[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_snapshots")
      .select("*")
      .eq("user_id", userId)
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: false });

    if (error) {
      console.error("[getRecoverySnapshots] Error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[getRecoverySnapshots] Exception:", err);
    return [];
  }
}
