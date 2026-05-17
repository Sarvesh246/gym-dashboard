/**
 * Internal product analytics service.
 *
 * Purpose: understand feature adoption and user behaviour patterns.
 * NOT user-facing, NOT monetization.
 *
 * All tracking calls are async fire-and-forget.
 */

import { createClient } from "@/lib/supabase/server";

export type AnalyticsEventName =
  | "onboarding_completed"
  | "first_workout_logged"
  | "workout_frequency_milestone"
  | "nutrition_streak"
  | "recovery_check_in"
  | "wearable_connected"
  | "wearable_first_sync"
  | "ai_insight_viewed"
  | "report_viewed"
  | "body_map_interacted"
  | "feature_flag_gated"
  | "settings_updated"
  | "data_exported"
  | "offline_sync_completed";

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  event_name: string;
  properties_json: Record<string, unknown>;
  created_at: string;
}

/** Track an analytics event — fire and forget. */
export function trackEvent(
  userId: string | null,
  tenantId: string | null,
  eventName: AnalyticsEventName | string,
  properties: Record<string, unknown> = {}
): void {
  Promise.resolve().then(async () => {
    try {
      const supabase = await createClient();
      await (supabase as any).from("analytics_events").insert({
        user_id: userId,
        tenant_id: tenantId,
        event_name: eventName,
        properties_json: properties,
      });
    } catch {
      // Analytics must never affect app behaviour
    }
  });
}

/** Get recent analytics events for admin view (paginated). */
export async function getRecentAnalyticsEvents(opts: {
  limit?: number;
  offset?: number;
  eventName?: string;
  since?: string;
} = {}): Promise<{ events: AnalyticsEvent[]; total: number }> {
  const supabase = await createClient();
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;

  let query = (supabase as any)
    .from("analytics_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.eventName) query = query.eq("event_name", opts.eventName);
  if (opts.since) query = query.gte("created_at", opts.since);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { events: data ?? [], total: count ?? 0 };
}

/** Get event counts grouped by name for trend dashboards. */
export async function getEventCountsByName(sinceDays = 30): Promise<
  Array<{ event_name: string; count: number }>
> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await (supabase as any)
    .from("analytics_events")
    .select("event_name")
    .gte("created_at", since);

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const e of data ?? []) {
    counts.set(e.event_name, (counts.get(e.event_name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((a, b) => b.count - a.count);
}
