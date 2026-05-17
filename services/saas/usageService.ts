/**
 * Usage tracking service.
 *
 * Purpose: system load understanding, feature adoption, performance monitoring.
 * NOT monetization.
 *
 * All writes are async fire-and-forget via trackUsageAsync().
 * Sync writes (trackUsage) are available for tests/admin.
 */

import { createClient } from "@/lib/supabase/server";

export type UsageEventType =
  | "ai_insight_generated"
  | "workout_generated"
  | "workout_logged"
  | "nutrition_logged"
  | "wearable_synced"
  | "report_generated"
  | "dashboard_viewed"
  | "body_map_viewed"
  | "data_exported"
  | "rate_limited";

export interface UsageEvent {
  id: string;
  user_id: string;
  tenant_id: string | null;
  event_type: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface UsageSummary {
  event_type: string;
  count: number;
  last_seen: string;
}

/** Track a usage event synchronously (awaited). */
export async function trackUsage(
  userId: string,
  tenantId: string | null,
  eventType: UsageEventType | string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  await (supabase as any).from("usage_events").insert({
    user_id: userId,
    tenant_id: tenantId,
    event_type: eventType,
    metadata_json: metadata,
  });
}

/** Track a usage event asynchronously — fire and forget, never blocks caller. */
export function trackUsageAsync(
  userId: string,
  tenantId: string | null,
  eventType: UsageEventType | string,
  metadata: Record<string, unknown> = {}
): void {
  Promise.resolve().then(async () => {
    try {
      await trackUsage(userId, tenantId, eventType, metadata);
    } catch {
      // Swallow — telemetry must never affect app behaviour
    }
  });
}

/** Get recent usage events for admin view. */
export async function getRecentUsageEvents(opts: {
  limit?: number;
  offset?: number;
  eventType?: string;
  since?: string;   // ISO timestamp
} = {}): Promise<{ events: UsageEvent[]; total: number }> {
  const supabase = await createClient();
  const limit = Math.min(opts.limit ?? 100, 500); // enforce upper bound
  const offset = opts.offset ?? 0;

  let query = (supabase as any)
    .from("usage_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.eventType) query = query.eq("event_type", opts.eventType);
  if (opts.since) query = query.gte("created_at", opts.since);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { events: data ?? [], total: count ?? 0 };
}

/** Get aggregated usage summary per event type (for admin dashboard). */
export async function getUsageSummary(sinceDays = 30): Promise<UsageSummary[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await (supabase as any).rpc("usage_summary", { since_ts: since });

  if (error) {
    // Fallback: manual aggregation if RPC doesn't exist yet
    const { data: events } = await (supabase as any)
      .from("usage_events")
      .select("event_type, created_at")
      .gte("created_at", since);

    const map = new Map<string, { count: number; last_seen: string }>();
    for (const e of events ?? []) {
      const existing = map.get(e.event_type);
      if (!existing || e.created_at > existing.last_seen) {
        map.set(e.event_type, {
          count: (existing?.count ?? 0) + 1,
          last_seen: e.created_at,
        });
      } else {
        existing.count += 1;
      }
    }
    return Array.from(map.entries())
      .map(([event_type, { count, last_seen }]) => ({ event_type, count, last_seen }))
      .sort((a, b) => b.count - a.count);
  }

  return data ?? [];
}
