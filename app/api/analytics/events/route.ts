/**
 * POST /api/analytics/events
 * Client-side telemetry ingestion endpoint.
 *
 * Body: { event_name: string; properties?: Record<string, unknown> }
 *
 * All events are tied to the authenticated user server-side.
 * Client cannot spoof user_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/lib/saas/tenantResolver";
import { trackEvent } from "@/services/saas/analyticsService";

const ALLOWED_EVENTS = new Set([
  "onboarding_completed",
  "first_workout_logged",
  "workout_frequency_milestone",
  "nutrition_streak",
  "recovery_check_in",
  "wearable_connected",
  "wearable_first_sync",
  "ai_insight_viewed",
  "report_viewed",
  "body_map_interacted",
  "settings_updated",
  "data_exported",
  "offline_sync_completed",
  "page_viewed",
  "feature_used",
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { event_name?: string; properties?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = body.event_name?.trim();
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json(
      { error: "Unknown or missing event_name" },
      { status: 400 }
    );
  }

  const tenant = await resolveTenant(user.id);
  const tenantId = tenant.isSaasMode ? tenant.tenantId : null;

  // Fire-and-forget — response is immediate
  trackEvent(user.id, tenantId, eventName, body.properties ?? {});

  return NextResponse.json({ ok: true });
}
