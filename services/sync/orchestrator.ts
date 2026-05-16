/**
 * Sync orchestration — manages wearable data sync lifecycle
 * Handles scheduling, retries, deduplication, and error recovery
 */

import { createClient } from "@/lib/supabase/server";
import type { WearableProvider } from "@/lib/wearables/providers";
import type { SyncResult } from "@/lib/health/types";

// ─── Types ───────────────────────────────────────────────────────────────

export interface SyncLog {
  id: string;
  user_id: string;
  provider: WearableProvider;
  sync_started_at: string;
  sync_completed_at?: string;
  sync_status: "in_progress" | "completed" | "failed" | "partial";
  records_processed: number;
  error_message?: string;
  created_at: string;
}

// ─── Sync Logging ────────────────────────────────────────────────────────

/**
 * Create a new sync log entry
 */
export async function createSyncLog(
  userId: string,
  provider: WearableProvider
): Promise<SyncLog | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("wearable_sync_logs")
      .insert({
        user_id: userId,
        provider,
        sync_started_at: new Date().toISOString(),
        sync_status: "in_progress",
        records_processed: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Failed to create sync log for ${provider}:`, err);
    return null;
  }
}

/**
 * Complete a sync log with results
 */
export async function completeSyncLog(
  logId: string,
  status: "completed" | "failed" | "partial",
  recordsProcessed: number,
  errorMessage?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("wearable_sync_logs")
      .update({
        sync_completed_at: new Date().toISOString(),
        sync_status: status,
        records_processed: recordsProcessed,
        error_message: errorMessage,
      })
      .eq("id", logId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to complete sync log:", err);
    return false;
  }
}

/**
 * Get recent sync logs for a user/provider
 */
export async function getSyncLogs(
  userId: string,
  provider?: WearableProvider,
  limit: number = 10
): Promise<SyncLog[]> {
  try {
    const supabase = await createClient();
    let query = (supabase as any)
      .from("wearable_sync_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (provider) {
      query = query.eq("provider", provider);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Failed to fetch sync logs:", err);
    return [];
  }
}

/**
 * Get most recent successful sync
 */
export async function getLastSuccessfulSync(
  userId: string,
  provider: WearableProvider
): Promise<SyncLog | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("wearable_sync_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("sync_status", "completed")
      .order("sync_completed_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch (err) {
    console.error(`Failed to fetch last sync for ${provider}:`, err);
    return null;
  }
}

// ─── Sync Scheduling ─────────────────────────────────────────────────────

/**
 * Determine if a sync should be triggered
 * Returns true if:
 * - Last sync was >6 hours ago
 * - No sync has been attempted yet
 * - Last sync failed
 */
export async function shouldTriggerSync(
  userId: string,
  provider: WearableProvider
): Promise<boolean> {
  const lastSync = await getLastSuccessfulSync(userId, provider);

  if (!lastSync) {
    return true; // Never synced
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const lastSyncDate = new Date(lastSync.sync_completed_at || lastSync.sync_started_at);

  return lastSyncDate < sixHoursAgo;
}

/**
 * Check for stale data and mark connections as needing attention
 */
export async function checkSyncHealth(userId: string): Promise<{
  provider: WearableProvider;
  isStale: boolean;
  daysSinceSync: number;
}[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connections, error: connError } = await (supabase as any)
      .from("wearable_connections")
      .select("provider, last_synced_at")
      .eq("user_id", userId)
      .eq("connection_status", "connected");

    if (connError) throw connError;

    const health = (connections || []).map((conn: { provider: WearableProvider; last_synced_at: string | null }) => {
      const daysSinceSync = conn.last_synced_at
        ? Math.floor((Date.now() - new Date(conn.last_synced_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        provider: conn.provider,
        isStale: daysSinceSync > 7,
        daysSinceSync,
      };
    });

    return health;
  } catch (err) {
    console.error("Failed to check sync health:", err);
    return [];
  }
}

// ─── Data Deduplication ───────────────────────────────────────────────────

/**
 * Check if metrics for a specific date/provider already exist
 */
export async function metricsExistForDate(
  userId: string,
  provider: WearableProvider,
  metricDate: string // YYYY-MM-DD
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from("wearable_health_metrics")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("metric_date", metricDate);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (err) {
    console.error("Failed to check if metrics exist:", err);
    return false;
  }
}
