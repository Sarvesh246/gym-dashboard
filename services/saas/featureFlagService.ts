/**
 * Feature flag management service — admin CRUD operations.
 *
 * User-facing flag resolution lives in lib/saas/featureFlags.ts.
 * This service handles admin-level overrides and auditing.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateFeatureCache, type FeatureKey } from "@/lib/saas/featureFlags";

export interface Feature {
  feature_key: string;
  enabled_by_default: boolean;
  description: string;
}

export interface FeatureOverride {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  feature_key: string;
  enabled: boolean;
  updated_at: string;
}

/** List all features with their global defaults. */
export async function listFeatures(): Promise<Feature[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("features")
    .select("*")
    .order("feature_key");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Update the global default for a feature. */
export async function setFeatureDefault(
  featureKey: FeatureKey,
  enabledByDefault: boolean,
  adminUserId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("features")
    .update({ enabled_by_default: enabledByDefault })
    .eq("feature_key", featureKey);
  if (error) throw new Error(error.message);

  // Audit log
  await (supabase as any).from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    action: "set_feature_default",
    target_type: "feature",
    target_id: featureKey,
    payload_json: { enabled_by_default: enabledByDefault },
  });
}

/** Set a per-user feature override. */
export async function setUserFeatureOverride(
  userId: string,
  featureKey: FeatureKey,
  enabled: boolean,
  adminUserId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await (supabase as any).from("feature_overrides").upsert(
    { user_id: userId, feature_key: featureKey, enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id,feature_key" }
  );
  if (error) throw new Error(error.message);

  invalidateFeatureCache(userId, featureKey);

  await (supabase as any).from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    action: "set_user_feature_override",
    target_type: "feature",
    target_id: featureKey,
    payload_json: { user_id: userId, enabled },
  });
}

/** List all overrides (admin view). */
export async function listFeatureOverrides(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ overrides: FeatureOverride[]; total: number }> {
  const supabase = await createClient();
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const [{ data }, { count }] = await Promise.all([
    (supabase as any)
      .from("feature_overrides")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1),
    (supabase as any).from("feature_overrides").select("*", { count: "exact", head: true }),
  ]);

  return { overrides: data ?? [], total: count ?? 0 };
}
