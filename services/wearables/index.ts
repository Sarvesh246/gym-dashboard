/**
 * Wearable service — main entry point for wearable operations
 * Handles connections, syncs, and data retrieval
 */

import { createClient } from "@/lib/supabase/server";
import type { WearableProvider } from "@/lib/wearables/providers";
import { PROVIDER_REGISTRY } from "@/lib/wearables/providers";

// ─── Connection Management ────────────────────────────────────────────────

export interface WearableConnection {
  id: string;
  user_id: string;
  provider: WearableProvider;
  connection_status: "connected" | "disconnected" | "error" | "expired";
  access_token?: string;
  refresh_token?: string;
  token_expiry?: string;
  sync_enabled: boolean;
  data_visibility_enabled: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all wearable connections for a user
 */
export async function getWearableConnections(userId: string): Promise<WearableConnection[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("wearable_connections")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Failed to fetch wearable connections:", err);
    return [];
  }
}

/**
 * Get a specific wearable connection
 */
export async function getWearableConnection(
  userId: string,
  provider: WearableProvider
): Promise<WearableConnection | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("wearable_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    if (error || !data) return null;
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${provider} connection:`, err);
    return null;
  }
}

/**
 * Check if a provider is connected and valid
 */
export async function isProviderConnected(
  userId: string,
  provider: WearableProvider
): Promise<boolean> {
  const connection = await getWearableConnection(userId, provider);
  if (!connection) return false;

  // Check if token is expired
  if (connection.token_expiry) {
    const expiry = new Date(connection.token_expiry);
    if (expiry < new Date()) return false;
  }

  return connection.connection_status === "connected";
}

/**
 * Create or update a wearable connection
 */
export async function upsertWearableConnection(
  userId: string,
  provider: WearableProvider,
  data: Partial<WearableConnection>
): Promise<WearableConnection | null> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabase as any)
      .from("wearable_connections")
      .upsert(
        {
          user_id: userId,
          provider,
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (err) {
    console.error(`Failed to upsert ${provider} connection:`, err);
    return null;
  }
}

/**
 * Disconnect a wearable provider
 */
export async function disconnectWearable(
  userId: string,
  provider: WearableProvider
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("wearable_connections")
      .update({
        connection_status: "disconnected",
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Failed to disconnect ${provider}:`, err);
    return false;
  }
}

/**
 * Get provider metadata
 */
export function getProviderMetadata(provider: WearableProvider) {
  return PROVIDER_REGISTRY[provider];
}

/**
 * Check if provider is fully implemented
 */
export function isProviderImplemented(provider: WearableProvider): boolean {
  return PROVIDER_REGISTRY[provider]?.implemented ?? false;
}
