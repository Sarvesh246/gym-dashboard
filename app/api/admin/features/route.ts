/**
 * GET  /api/admin/features         — list all features + overrides
 * POST /api/admin/features         — set global default or user override
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/saas/rbac";
import {
  listFeatures,
  listFeatureOverrides,
  setFeatureDefault,
  setUserFeatureOverride,
} from "@/services/saas/featureFlagService";
import type { FeatureKey } from "@/lib/saas/featureFlags";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);

  const [features, { overrides, total }] = await Promise.all([
    listFeatures(),
    listFeatureOverrides({ limit, offset }),
  ]);

  return NextResponse.json({ features, overrides, total });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action: "set_default" | "set_user_override";
    feature_key: FeatureKey;
    enabled: boolean;
    user_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.feature_key || body.enabled === undefined) {
    return NextResponse.json({ error: "feature_key and enabled are required" }, { status: 400 });
  }

  if (body.action === "set_user_override" && body.user_id) {
    await setUserFeatureOverride(body.user_id, body.feature_key, body.enabled, user.id);
    return NextResponse.json({ ok: true, action: "set_user_override" });
  }

  await setFeatureDefault(body.feature_key, body.enabled, user.id);
  return NextResponse.json({ ok: true, action: "set_default" });
}
