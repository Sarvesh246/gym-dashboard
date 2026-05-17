/**
 * GET /api/admin/health
 * System health snapshot — admin only.
 *
 * Returns:
 *   - DB connectivity status
 *   - Recent error rate (usage events with "rate_limited" prefix)
 *   - Wearable sync health (last 24h sync counts per provider)
 *   - Feature flag summary
 *   - Usage event counts (last 24h)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/saas/rbac";
import { listFeatures } from "@/services/saas/featureFlagService";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    dbCheck,
    features,
    usageLast24h,
    rateLimitedLast24h,
    wearableSyncsLast24h,
    errorLogsLast7d,
  ] = await Promise.allSettled([
    // DB connectivity — quick probe
    (supabase as any).from("features").select("feature_key").limit(1),
    listFeatures(),
    // Usage events last 24h
    (supabase as any)
      .from("usage_events")
      .select("event_type", { count: "exact", head: true })
      .gte("created_at", since24h),
    // Rate limited events last 24h
    (supabase as any)
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .like("event_type", "rate_limited%")
      .gte("created_at", since24h),
    // Wearable syncs last 24h
    (supabase as any)
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "wearable_synced")
      .gte("created_at", since24h),
    // Admin audit logs last 7d (proxy for admin activity)
    (supabase as any)
      .from("admin_audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
  ]);

  const dbOk =
    dbCheck.status === "fulfilled" && !(dbCheck.value as any).error;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    db: { ok: dbOk },
    features: {
      total: features.status === "fulfilled" ? features.value.length : 0,
      enabled: features.status === "fulfilled"
        ? features.value.filter((f) => f.enabled_by_default).length
        : 0,
    },
    usage_last_24h: usageLast24h.status === "fulfilled"
      ? (usageLast24h.value as any).count ?? 0
      : 0,
    rate_limited_last_24h: rateLimitedLast24h.status === "fulfilled"
      ? (rateLimitedLast24h.value as any).count ?? 0
      : 0,
    wearable_syncs_last_24h: wearableSyncsLast24h.status === "fulfilled"
      ? (wearableSyncsLast24h.value as any).count ?? 0
      : 0,
    admin_actions_last_7d: errorLogsLast7d.status === "fulfilled"
      ? (errorLogsLast7d.value as any).count ?? 0
      : 0,
  });
}
