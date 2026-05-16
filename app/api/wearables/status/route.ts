import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWearableConnections,
  isProviderConnected,
} from "@/services/wearables";
import { getImplementedProviders } from "@/lib/wearables/providers";
import { checkSyncHealth, getSyncLogs } from "@/services/sync/orchestrator";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all wearable connections
    const connections = await getWearableConnections(user.id);
    if (!connections) {
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 }
      );
    }

    // Get sync health for all connected providers
    const syncHealth = await checkSyncHealth(user.id);

    // Build response with status for each provider
    const implementedProviders = getImplementedProviders();
    const statusMap = await Promise.all(
      implementedProviders.map(async (p) => {
        const conn = connections.find((c) => c.provider === p);
        const health = syncHealth.find((h) => h.provider === p);
        const isConnected = conn?.connection_status === "connected";

        return {
          provider: p,
          connected: isConnected,
          has_token: !!conn?.access_token,
          token_expiry: conn?.token_expiry || null,
          last_synced_at: conn?.last_synced_at || null,
          sync_enabled: conn?.sync_enabled || false,
          data_visibility_enabled: conn?.data_visibility_enabled || false,
          sync_health: health,
        };
      })
    );

    // Filter by provider if requested
    let result = statusMap;
    if (provider) {
      result = statusMap.filter((s) => s.provider === provider);
      if (result.length === 0) {
        return NextResponse.json(
          { error: "Provider not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      providers: result,
      count: result.length,
    });
  } catch (err) {
    console.error("Error fetching wearable status:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
