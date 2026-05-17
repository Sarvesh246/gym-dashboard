/**
 * API Gateway — unified enforcement layer for all API routes.
 *
 * Responsibilities (in order):
 *   1. Authentication validation
 *   2. Tenant resolution
 *   3. Feature flag check (optional — per route)
 *   4. Rate limiting (soft — returns 429 but logs + continues for core flows)
 *   5. Usage event logging (async, non-blocking)
 *
 * Usage:
 *   export const GET = withGateway({ feature: "reports" }, async (req, ctx) => { ... })
 *   export const POST = withGateway({}, async (req, ctx) => { ... })
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant, type TenantContext } from "./tenantResolver";
import { isFeatureEnabled, type FeatureKey } from "./featureFlags";

export interface GatewayContext {
  userId: string;
  tenant: TenantContext;
}

interface GatewayOptions {
  /** If set, checks this feature flag before executing the handler. */
  feature?: FeatureKey;
  /** Rate limit key (defaults to route + userId). Window: 1 hour. */
  rateLimit?: {
    key: string;        // e.g. "ai_insights"
    maxPerHour: number;
  };
  /** Set true to skip usage event logging for this route. */
  skipUsageLog?: boolean;
  /** Usage event type label (defaults to rateLimit.key or feature). */
  usageEventType?: string;
}

type GatewayHandler = (
  req: NextRequest,
  ctx: GatewayContext
) => Promise<NextResponse | Response>;

/**
 * Wrap an API route handler with gateway enforcement.
 */
export function withGateway(
  options: GatewayOptions,
  handler: GatewayHandler
): (req: NextRequest) => Promise<NextResponse | Response> {
  return async (req: NextRequest) => {
    // ── 1. Authentication ──────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Tenant resolution ───────────────────────────────────
    const tenant = await resolveTenant(user.id);
    const ctx: GatewayContext = { userId: user.id, tenant };

    // ── 3. Feature flag check ──────────────────────────────────
    if (options.feature) {
      const enabled = await isFeatureEnabled(user.id, options.feature);
      if (!enabled) {
        return NextResponse.json(
          { error: `Feature '${options.feature}' is not enabled.`, feature: options.feature },
          { status: 403 }
        );
      }
    }

    // ── 4. Rate limiting (soft) ────────────────────────────────
    if (options.rateLimit) {
      const limited = await checkRateLimit(
        supabase,
        user.id,
        options.rateLimit.key,
        options.rateLimit.maxPerHour
      );
      if (limited) {
        logUsageEventAsync(user.id, tenant.tenantId, `rate_limited:${options.rateLimit.key}`);
        return NextResponse.json(
          {
            error: "Rate limit reached. Please try again later.",
            rateLimited: true,
            key: options.rateLimit.key,
          },
          { status: 429 }
        );
      }
    }

    // ── 5. Execute handler ─────────────────────────────────────
    const response = await handler(req, ctx);

    // ── 6. Async usage logging (non-blocking) ──────────────────
    if (!options.skipUsageLog) {
      const eventType =
        options.usageEventType ?? options.rateLimit?.key ?? options.feature ?? "api_request";
      logUsageEventAsync(user.id, tenant.tenantId, eventType);
    }

    return response;
  };
}

// ─── Rate limit helpers ────────────────────────────────────────────────────

async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  maxPerHour: number
): Promise<boolean> {
  const bucketKey = `${key}:${userId}`;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const { data: bucket } = await (supabase as any)
      .from("rate_limit_buckets")
      .select("id, count, window_start")
      .eq("user_id", userId)
      .eq("bucket_key", bucketKey)
      .maybeSingle();

    if (!bucket || bucket.window_start < windowStart) {
      // Reset or create window
      await (supabase as any).from("rate_limit_buckets").upsert({
        user_id: userId,
        bucket_key: bucketKey,
        count: 1,
        window_start: new Date().toISOString(),
      }, { onConflict: "user_id,bucket_key" });
      return false;
    }

    if (bucket.count >= maxPerHour) return true;

    await (supabase as any)
      .from("rate_limit_buckets")
      .update({ count: bucket.count + 1 })
      .eq("id", bucket.id);

    return false;
  } catch {
    // Rate limit check failure should never block the request
    return false;
  }
}

// ─── Async usage logging ───────────────────────────────────────────────────

function logUsageEventAsync(
  userId: string,
  tenantId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): void {
  // Fire-and-forget: never await, never block the response
  Promise.resolve().then(async () => {
    try {
      const supabase = await createClient();
      await (supabase as any).from("usage_events").insert({
        user_id: userId,
        tenant_id: tenantId === userId ? null : tenantId, // null in single-user mode
        event_type: eventType,
        metadata_json: metadata,
      });
    } catch {
      // Swallow — telemetry must never affect app behaviour
    }
  });
}
