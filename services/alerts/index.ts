/**
 * Recovery alerts system.
 * Generates daily alerts for readiness changes, fatigue, deload recommendations, etc.
 * Users can dismiss alerts to manage dashboard clutter.
 */

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import type { ReadinessOutput } from "@/lib/recovery/types";
import type { RecoverySnapshot } from "@/services/readiness";
import { detectOverreachingPattern } from "@/lib/recovery/periodization";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType =
  | "readiness_drop"
  | "high_fatigue"
  | "deload_recommended"
  | "training_suppressed"
  | "recovery_spike"
  | "injury_flag";

export type AlertSeverity = "info" | "caution" | "warning";

export interface RecoveryAlert {
  id: number;
  user_id: string;
  alert_date: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  muscle_specific: string[] | null;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

// ─── Alert Generation ─────────────────────────────────────────────────────────

/**
 * Alert threshold constants.
 */
const READINESS_DROP_THRESHOLD = 15;  // alert if drops >15 points in 24h
const HIGH_FATIGUE_THRESHOLD = 75;  // alert if systemic_fatigue > 75
const FATIGUE_THRESHOLD_DAYS = 3;  // for 3+ consecutive days
const DELOAD_STRAIN_THRESHOLD = 400;  // 7-day strain > 400
const TRAINING_SUPPRESSED_READINESS = 45;  // orange tier (orange + red)

/**
 * Check for readiness drop alert.
 * Alert if: readiness dropped >15 points in last 24 hours.
 */
export function checkReadinessDrop(
  currentReadiness: number,
  previousDayReadiness: number | null
): { alert: boolean; message: string } {
  if (previousDayReadiness === null) {
    return { alert: false, message: "" };
  }

  const drop = previousDayReadiness - currentReadiness;

  if (drop > READINESS_DROP_THRESHOLD) {
    return {
      alert: true,
      message: `Readiness dropped ${Math.round(drop)} points overnight. Check sleep, stress, and training volume.`,
    };
  }

  return { alert: false, message: "" };
}

/**
 * Check for high fatigue alert.
 * Alert if: systemic_fatigue > 75 for 3+ consecutive days.
 */
export function checkHighFatigue(
  currentFatigue: number,
  recentSnapshots: RecoverySnapshot[]
): { alert: boolean; message: string } {
  if (recentSnapshots.length < FATIGUE_THRESHOLD_DAYS) {
    return { alert: false, message: "" };
  }

  const recentFatigues = recentSnapshots
    .slice(0, FATIGUE_THRESHOLD_DAYS)
    .map((s) => s.systemic_fatigue);

  const allHigh = recentFatigues.every((f) => f > HIGH_FATIGUE_THRESHOLD);

  if (allHigh && currentFatigue > HIGH_FATIGUE_THRESHOLD) {
    return {
      alert: true,
      message: `Systemic fatigue critically high (${Math.round(currentFatigue)}/100) for ${FATIGUE_THRESHOLD_DAYS}+ days. Prioritize sleep and reduce volume.`,
    };
  }

  return { alert: false, message: "" };
}

/**
 * Check for training suppressed alert.
 * Alert if: readiness < 45 (orange/red tier).
 */
export function checkTrainingSuppressed(readiness: number): {
  alert: boolean;
  message: string;
  severity: AlertSeverity;
} {
  if (readiness >= TRAINING_SUPPRESSED_READINESS) {
    return { alert: false, message: "", severity: "info" };
  }

  const severity = readiness < 35 ? "warning" : "caution";
  const message =
    readiness < 35
      ? `CRITICAL: Readiness at ${readiness}/100. Rest and recovery strongly recommended. Minimal training only.`
      : `Readiness suppressed (${readiness}/100). Training should be limited; consider active recovery.`;

  return { alert: true, message, severity };
}

/**
 * Check for deload recommendation alert.
 * Alert if: 7-day strain > 400 AND readiness declining OR readiness < 60.
 */
export function checkDeloadRecommended(
  last7DayStrain: number,
  currentReadiness: number,
  recentSnapshots: RecoverySnapshot[]
): { alert: boolean; message: string } {
  if (last7DayStrain <= DELOAD_STRAIN_THRESHOLD || currentReadiness >= 65) {
    return { alert: false, message: "" };
  }

  // Only alert if strain is truly high AND readiness is low
  if (last7DayStrain > DELOAD_STRAIN_THRESHOLD || currentReadiness < 55) {
    return {
      alert: true,
      message: `Deload recommended. Accumulated strain is high (${Math.round(last7DayStrain)} units). Reduce volume to 60-70% and prioritize recovery.`,
    };
  }

  return { alert: false, message: "" };
}

/**
 * Check for recovery spike alert (celebration!).
 * Alert if: readiness jumped >20 points in last 24 hours.
 */
export function checkRecoverySpikeAlert(
  currentReadiness: number,
  previousDayReadiness: number | null
): { alert: boolean; message: string } {
  if (previousDayReadiness === null) {
    return { alert: false, message: "" };
  }

  const jump = currentReadiness - previousDayReadiness;

  if (jump > 20) {
    return {
      alert: true,
      message: `Great recovery! Readiness jumped ${Math.round(jump)} points. You're ready for progressive overload.`,
    };
  }

  return { alert: false, message: "" };
}

/**
 * Check for injury flags alert.
 * Alert if: user has flagged an injury in daily_health_metrics.
 */
export function checkInjuryFlags(
  injuryFlags: Array<{ muscle_group: string; note: string; since_date: string }> | null
): { alert: boolean; message: string; muscles: string[] } {
  if (!injuryFlags || injuryFlags.length === 0) {
    return { alert: false, message: "", muscles: [] };
  }

  const muscles = injuryFlags.map((f) => f.muscle_group);
  const muscleList = muscles.join(", ");
  const message = `Injury flagged: ${muscleList}. Readiness suppressed. Modify training and consider PT/medical evaluation.`;

  return { alert: true, message, muscles };
}

// ─── Database Operations ──────────────────────────────────────────────────────

/**
 * Generate daily alerts for a user based on current recovery state.
 * Returns array of new alerts to be created.
 */
export async function generateDailyAlerts(
  userId: string,
  currentReadiness: ReadinessOutput,
  currentFatigue: number,
  last7DayStrain: number,
  previousSnapshot: RecoverySnapshot | null,
  recentSnapshots: RecoverySnapshot[],
  injuryFlags: Array<{ muscle_group: string; note: string; since_date: string }> | null,
  recentSleepQualityAvg: number
): Promise<Array<{ type: AlertType; severity: AlertSeverity; message: string; muscles?: string[] }>> {
  const alerts: Array<{ type: AlertType; severity: AlertSeverity; message: string; muscles?: string[] }> = [];

  // ─── Readiness drop ───────────────────────────────────────────────────────
  const dropCheck = checkReadinessDrop(
    currentReadiness.readiness_score,
    previousSnapshot?.readiness_score ?? null
  );
  if (dropCheck.alert) {
    alerts.push({
      type: "readiness_drop",
      severity: "caution",
      message: dropCheck.message,
    });
  }

  // ─── High fatigue ─────────────────────────────────────────────────────────
  const fatigueCheck = checkHighFatigue(currentFatigue, recentSnapshots);
  if (fatigueCheck.alert) {
    alerts.push({
      type: "high_fatigue",
      severity: "warning",
      message: fatigueCheck.message,
    });
  }

  // ─── Training suppressed ──────────────────────────────────────────────────
  const suppressedCheck = checkTrainingSuppressed(currentReadiness.readiness_score);
  if (suppressedCheck.alert) {
    alerts.push({
      type: "training_suppressed",
      severity: suppressedCheck.severity,
      message: suppressedCheck.message,
    });
  }

  // ─── Deload recommended ───────────────────────────────────────────────────
  const deloadCheck = checkDeloadRecommended(last7DayStrain, currentReadiness.readiness_score, recentSnapshots);
  if (deloadCheck.alert) {
    alerts.push({
      type: "deload_recommended",
      severity: "caution",
      message: deloadCheck.message,
    });
  }

  // ─── Recovery spike (celebrate!) ──────────────────────────────────────────
  const spikeCheck = checkRecoverySpikeAlert(
    currentReadiness.readiness_score,
    previousSnapshot?.readiness_score ?? null
  );
  if (spikeCheck.alert) {
    alerts.push({
      type: "recovery_spike",
      severity: "info",
      message: spikeCheck.message,
    });
  }

  // ─── Injury flags ─────────────────────────────────────────────────────────
  const injuryCheck = checkInjuryFlags(injuryFlags);
  if (injuryCheck.alert) {
    alerts.push({
      type: "injury_flag",
      severity: "warning",
      message: injuryCheck.message,
      muscles: injuryCheck.muscles,
    });
  }

  // ─── Overreaching detection ───────────────────────────────────────────────
  const overreach = detectOverreachingPattern(recentSnapshots, recentSleepQualityAvg);
  if (overreach.is_overreaching && overreach.confidence > 0.6) {
    alerts.push({
      type: "deload_recommended",
      severity: "warning",
      message: `Overreaching detected (${Math.round(overreach.confidence * 100)}% confidence). Recommend ${overreach.required_recovery_days}-${overreach.required_recovery_days + 7} day recovery phase.`,
    });
  }

  return alerts;
}

/**
 * Create alert in database.
 */
export async function createAlert(
  userId: string,
  date: string,
  type: AlertType,
  severity: AlertSeverity,
  message: string,
  muscles: string[] | null,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<RecoveryAlert | null> {
  try {
    const payload = {
      user_id: userId,
      alert_date: date,
      alert_type: type,
      severity,
      message,
      muscle_specific: muscles,
      dismissed: false,
      dismissed_at: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_alerts")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[createAlert] Error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[createAlert] Exception:", err);
    return null;
  }
}

/**
 * Fetch active (not dismissed) alerts for a user.
 */
export async function getActiveAlerts(
  userId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<RecoveryAlert[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("alert_date", { ascending: false });

    if (error) {
      console.error("[getActiveAlerts] Error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[getActiveAlerts] Exception:", err);
    return [];
  }
}

/**
 * Fetch all alerts (including dismissed) for a date range.
 */
export async function getAlertsForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<RecoveryAlert[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_alerts")
      .select("*")
      .eq("user_id", userId)
      .gte("alert_date", startDate)
      .lte("alert_date", endDate)
      .order("alert_date", { ascending: false });

    if (error) {
      console.error("[getAlertsForDateRange] Error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[getAlertsForDateRange] Exception:", err);
    return [];
  }
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(
  alertId: number,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<RecoveryAlert | null> {
  try {
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("recovery_alerts")
      .update({
        dismissed: true,
        dismissed_at: now,
      })
      .eq("id", alertId)
      .select()
      .single();

    if (error) {
      console.error("[dismissAlert] Error:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[dismissAlert] Exception:", err);
    return null;
  }
}

/**
 * Clear dismissed alerts older than X days (cleanup function).
 */
export async function clearOldDismissedAlerts(
  userId: string,
  daysToKeep: number = 30,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from("recovery_alerts")
      .delete()
      .eq("user_id", userId)
      .eq("dismissed", true)
      .lt("dismissed_at", cutoffISO);

    if (error) {
      console.error("[clearOldDismissedAlerts] Error:", error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("[clearOldDismissedAlerts] Exception:", err);
    return 0;
  }
}
