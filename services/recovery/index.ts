/**
 * Recovery service — handles all DB reads/writes for systemic recovery state.
 * Server-side only. Falls back gracefully when tables don't exist yet.
 */

import { createClient } from "@/lib/supabase/server";
import type { SystemicRecovery, StrainOutput } from "@/lib/recovery/types";
import {
  calculateSystemicFatigue,
  calculateReadiness,
  classifyRecoveryTier,
} from "@/lib/recovery/scoring";
import { applySystemicDecay } from "@/lib/recovery/decay";
import { SLEEP_QUALITY_SCORE, STRESS_LEVEL_SCORE } from "@/lib/recovery/constants";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSystemicRecovery(
  userId: string
): Promise<SystemicRecovery | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("systemic_recovery")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    // Project scores forward using time-based decay
    const projected = applySystemicDecay(data as SystemicRecovery);

    return {
      ...(data as SystemicRecovery),
      systemic_fatigue: projected.systemic_fatigue,
      readiness_score:  projected.readiness_score,
      recovery_tier:    classifyRecoveryTier(projected.readiness_score),
    };
  } catch {
    return null;
  }
}

// ─── Compute from profile ─────────────────────────────────────────────────────

export async function computeSystemicRecoveryFromProfile(userId: string): Promise<{
  systemic_fatigue: number;
  readiness_score: number;
  sleep_modifier: number;
  stress_modifier: number;
}> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("sleep_quality, stress_level, training_level, workout_days_per_week")
      .eq("user_id", userId)
      .single();

    if (!profile) return { systemic_fatigue: 30, readiness_score: 70, sleep_modifier: 0, stress_modifier: 0 };

    const sleepScore = SLEEP_QUALITY_SCORE[profile.sleep_quality ?? "medium"];
    const stressScore = STRESS_LEVEL_SCORE[profile.stress_level ?? "medium"];

    // Estimate consecutive days from weekly frequency
    const daysPerWeek: number = profile.workout_days_per_week ?? 3;
    const consecutiveDays = Math.min(Math.floor(daysPerWeek / 2), 5);

    const systemicFatigue = calculateSystemicFatigue({
      weekly_total_sets:        daysPerWeek * 18,  // estimate: 18 sets per session
      cns_load_7days:           daysPerWeek * 2,
      consecutive_training_days: consecutiveDays,
      sleep_hours_avg:          sleepScore >= 80 ? 7.5 : sleepScore >= 50 ? 6.5 : 5.5,
    });

    const readinessResult = calculateReadiness({
      systemic_fatigue:         systemicFatigue,
      sleep_quality_score:      sleepScore,
      stress_score:             100 - stressScore,
      hrv_score:                65,
      strain_accumulation:      daysPerWeek * 35,
      avg_muscle_recovery:      72,
      consecutive_training_days: consecutiveDays,
    });

    // Modifiers normalised to −20 to +20
    const sleepModifier  = ((sleepScore - 65) / 35)  * 20;
    const stressModifier = ((stressScore - 60) / 40) * 20;

    return {
      systemic_fatigue: systemicFatigue,
      readiness_score:  readinessResult.readiness_score,
      sleep_modifier:   sleepModifier,
      stress_modifier:  stressModifier,
    };
  } catch {
    return { systemic_fatigue: 30, readiness_score: 70, sleep_modifier: 0, stress_modifier: 0 };
  }
}

// ─── Write / upsert ───────────────────────────────────────────────────────────

export async function upsertSystemicRecovery(
  userId: string,
  data: Partial<Omit<SystemicRecovery, "id" | "user_id" | "updated_at">>
): Promise<void> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("systemic_recovery")
      .upsert(
        { user_id: userId, ...data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  } catch {
    // Non-fatal — table may not exist until migration is run
  }
}

// ─── Persist a workout strain log ─────────────────────────────────────────────

export async function persistStrainLog(
  userId: string,
  workoutId: string,
  strain: StrainOutput
): Promise<void> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("workout_strain_logs").insert({
      user_id:            userId,
      workout_id:         workoutId,
      total_volume:       strain.total_volume,
      estimated_strain:   strain.estimated_strain,
      systemic_load:      strain.systemic_load,
      cns_load:           strain.cns_load,
      local_muscle_loads: strain.local_muscle_loads,
      recovery_impact:    strain.recovery_impact,
      created_at:         new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }
}

// ─── 7-day strain accumulation ────────────────────────────────────────────────

export async function get7DayStrainAccumulation(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("workout_strain_logs")
      .select("estimated_strain")
      .eq("user_id", userId)
      .gte("created_at", since);

    if (!data || data.length === 0) return 0;
    return (data as { estimated_strain: number }[]).reduce(
      (sum, row) => sum + row.estimated_strain,
      0
    );
  } catch {
    return 0;
  }
}
