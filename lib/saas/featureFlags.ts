/**
 * Feature flag utilities — server-side only.
 *
 * Checks feature_overrides (per-user) then features (global default).
 * Lightweight in-process cache (Map) with 5-minute TTL to avoid per-request DB hits.
 *
 * Never trust client-side feature state — always verify server-side.
 */

import { createClient } from "@/lib/supabase/server";

export type FeatureKey =
  | "ai_coaching"
  | "wearable_sync"
  | "advanced_analytics"
  | "body_map"
  | "export_data"
  | "long_term_history"
  | "custom_templates"
  | "recovery_engine"
  | "nutrition_tracking"
  | "reports";

interface CacheEntry {
  enabled: boolean;
  expiresAt: number;
}

// Process-level cache — cleared on cold start, safe for serverless
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(userId: string, feature: FeatureKey): string {
  return `${userId}:${feature}`;
}

/**
 * Check if a feature is enabled for a given user.
 * User-level overrides win over global defaults.
 */
export async function isFeatureEnabled(
  userId: string,
  feature: FeatureKey
): Promise<boolean> {
  const key = cacheKey(userId, feature);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;

  const supabase = await createClient();

  // 1. Check user-level override
  const { data: override } = await (supabase as any)
    .from("feature_overrides")
    .select("enabled")
    .eq("user_id", userId)
    .eq("feature_key", feature)
    .maybeSingle();

  let enabled: boolean;
  if (override !== null && override !== undefined) {
    enabled = override.enabled;
  } else {
    // 2. Fall back to global default
    const { data: featureRow } = await (supabase as any)
      .from("features")
      .select("enabled_by_default")
      .eq("feature_key", feature)
      .maybeSingle();

    // Unknown features default to enabled (safe open default for single-user mode)
    enabled = featureRow?.enabled_by_default ?? true;
  }

  cache.set(key, { enabled, expiresAt: Date.now() + TTL_MS });
  return enabled;
}

/** Invalidate cached flag for a user — call after admin override changes. */
export function invalidateFeatureCache(userId: string, feature?: FeatureKey): void {
  if (feature) {
    cache.delete(cacheKey(userId, feature));
  } else {
    for (const k of cache.keys()) {
      if (k.startsWith(`${userId}:`)) cache.delete(k);
    }
  }
}

/** Fetch all features with their resolved state for a user. */
export async function getAllFeaturesForUser(
  userId: string
): Promise<Record<FeatureKey, boolean>> {
  const supabase = await createClient();

  const [{ data: features }, { data: overrides }] = await Promise.all([
    (supabase as any).from("features").select("feature_key, enabled_by_default"),
    (supabase as any)
      .from("feature_overrides")
      .select("feature_key, enabled")
      .eq("user_id", userId),
  ]);

  const overrideMap = new Map(
    (overrides ?? []).map((o: { feature_key: string; enabled: boolean }) => [o.feature_key, o.enabled])
  );

  const result: Record<string, boolean> = {};
  for (const f of features ?? []) {
    const key = f.feature_key as FeatureKey;
    result[key] = overrideMap.has(key) ? (overrideMap.get(key) as boolean) : f.enabled_by_default;
  }
  return result as Record<FeatureKey, boolean>;
}
