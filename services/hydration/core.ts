// Hydration service: dedicated hydration log CRUD + aggregation

import { createClient } from "@/lib/supabase/server";
import { scoreHydrationAdherence } from "@/lib/nutrition/adherence";

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

/**
 * Log a water intake entry for the user.
 */
export async function logHydration(
  userId: string,
  amount_ml: number,
  logged_at?: string
): Promise<HydrationLog | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("hydration_logs")
      .insert({
        user_id: userId,
        amount_ml,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get all hydration logs for a given date (UTC date string YYYY-MM-DD).
 */
export async function getDailyHydrationLogs(
  userId: string,
  date: string
): Promise<HydrationLog[]> {
  try {
    const supabase = await createClient();
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;

    const { data, error } = await (supabase as any)
      .from("hydration_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lte("logged_at", end)
      .order("logged_at", { ascending: false });

    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Sum hydration intake for a date (ml).
 */
export async function getDailyHydrationTotal(
  userId: string,
  date: string
): Promise<number> {
  const logs = await getDailyHydrationLogs(userId, date);
  return logs.reduce((sum, l) => sum + l.amount_ml, 0);
}

/**
 * Delete a hydration log entry.
 */
export async function deleteHydrationLog(
  userId: string,
  logId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("hydration_logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get 7-day hydration totals (array of { date, total_ml }).
 */
export async function get7DayHydrationHistory(
  userId: string
): Promise<{ date: string; total_ml: number }[]> {
  try {
    const supabase = await createClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await (supabase as any)
      .from("hydration_logs")
      .select("logged_at, amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", sevenDaysAgo.toISOString());

    if (error || !data) return [];

    // Group by date
    const byDate: Record<string, number> = {};
    for (const row of data) {
      const date = row.logged_at.split("T")[0];
      byDate[date] = (byDate[date] ?? 0) + row.amount_ml;
    }

    return Object.entries(byDate)
      .map(([date, total_ml]) => ({ date, total_ml }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Hydration readiness modifier (-5 to 0).
 * Dehydration reduces readiness; meeting target has no bonus (neutral).
 */
export function calculateHydrationReadinessModifier(
  hydration_ml: number,
  target_ml: number
): number {
  const score = scoreHydrationAdherence(hydration_ml, target_ml);
  if (score < 50) return -5; // severely dehydrated
  if (score < 70) return -3; // moderately dehydrated
  if (score < 85) return -1; // slightly under
  return 0;                   // meeting target — no penalty
}
