/**
 * GET /api/admin/usage
 * Usage events viewer with optional filtering — admin only.
 *
 * Query params:
 *   limit     (default 100, max 500)
 *   offset    (default 0)
 *   eventType (filter by type)
 *   since     (ISO timestamp or "7d" / "30d" shorthand)
 *   summary   (set to "true" to get aggregated summary instead of raw events)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/saas/rbac";
import { getRecentUsageEvents, getUsageSummary } from "@/services/saas/usageService";

function parseSince(raw: string | null): string | undefined {
  if (!raw) return undefined;
  if (raw === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (raw === "30d") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return raw; // assume ISO string
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const summary = searchParams.get("summary") === "true";

  if (summary) {
    try {
      const days = Number(searchParams.get("days") ?? 30);
      const data = await getUsageSummary(days);
      return NextResponse.json({ summary: data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);
  const eventType = searchParams.get("eventType") ?? undefined;
  const since = parseSince(searchParams.get("since"));

  try {
    const { events, total } = await getRecentUsageEvents({ limit, offset, eventType, since });
    return NextResponse.json({ events, total, limit, offset });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
