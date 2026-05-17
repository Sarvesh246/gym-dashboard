/**
 * Tenant resolution layer.
 *
 * SaaS mode OFF (default): tenant context is a lightweight wrapper around user_id.
 * SaaS mode ON: resolves a real tenant from the DB.
 *
 * Single-user app behaviour is 100% preserved when NEXT_PUBLIC_SAAS_MODE is unset.
 */

import { createClient } from "@/lib/supabase/server";

export interface TenantContext {
  tenantId: string;       // UUID of the resolved tenant (or synthetic userId-based ID)
  userId: string;
  isSaasMode: boolean;
  isOwner: boolean;
}

const SAAS_MODE = process.env.NEXT_PUBLIC_SAAS_MODE === "true";

/**
 * Resolve the tenant context for the currently authenticated user.
 * Call once per request and pass the result down — do not call repeatedly.
 */
export async function resolveTenant(userId: string): Promise<TenantContext> {
  if (!SAAS_MODE) {
    return {
      tenantId: userId,   // synthetic 1:1 mapping in single-user mode
      userId,
      isSaasMode: false,
      isOwner: true,
    };
  }

  const supabase = await createClient();
  const { data: tenant } = await (supabase as any)
    .from("tenants")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (tenant) {
    return {
      tenantId: tenant.id,
      userId,
      isSaasMode: true,
      isOwner: tenant.owner_user_id === userId,
    };
  }

  // No tenant found — fall back to user-scoped context (safe default)
  return {
    tenantId: userId,
    userId,
    isSaasMode: true,
    isOwner: true,
  };
}

/**
 * Get the authenticated user from the current request and resolve their tenant.
 * Returns null if unauthenticated.
 */
export async function getAuthenticatedTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveTenant(user.id);
}
