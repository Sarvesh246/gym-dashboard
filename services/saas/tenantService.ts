/**
 * Tenant management service.
 *
 * In single-user mode (default) this is largely a no-op passthrough.
 * In SaaS mode it manages real tenant records.
 */

import { createClient } from "@/lib/supabase/server";

export interface Tenant {
  id: string;
  name: string;
  owner_user_id: string;
  settings_json: Record<string, unknown>;
  created_at: string;
}

/** List all tenants — admin only, called from admin panel APIs. */
export async function listTenants(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ tenants: Tenant[]; total: number }> {
  const supabase = await createClient();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [{ data, error }, { count }] = await Promise.all([
    (supabase as any)
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    (supabase as any).from("tenants").select("*", { count: "exact", head: true }),
  ]);

  if (error) throw new Error(error.message);
  return { tenants: data ?? [], total: count ?? 0 };
}

/** Get or create a tenant for a user (called during onboarding in SaaS mode). */
export async function getOrCreateTenantForUser(
  userId: string,
  name: string
): Promise<Tenant> {
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from("tenants")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from("tenants")
    .insert({ name, owner_user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Update tenant settings. */
export async function updateTenantSettings(
  tenantId: string,
  settings: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("tenants")
    .update({ settings_json: settings })
    .eq("id", tenantId);
  if (error) throw new Error(error.message);
}
