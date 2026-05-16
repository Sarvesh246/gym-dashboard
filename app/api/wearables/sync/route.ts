import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGarminData, triggerManualGarminSync } from "@/services/sync/garmin-sync";
import { isProviderImplemented } from "@/lib/wearables/providers";

export async function POST(request: NextRequest) {
  try {
    const { provider, daysBack } = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // Check if provider is implemented
    if (!isProviderImplemented(provider)) {
      return NextResponse.json(
        { error: `Provider ${provider} is not yet implemented` },
        { status: 400 }
      );
    }

    let syncResult;

    // Dispatch to provider-specific sync
    if (provider === "garmin") {
      // Use manual sync trigger which checks connection first
      syncResult = await triggerManualGarminSync(user.id);
    } else {
      return NextResponse.json(
        { error: `Provider ${provider} is not supported` },
        { status: 400 }
      );
    }

    return NextResponse.json(syncResult);
  } catch (err) {
    console.error("Error triggering sync:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to trigger sync", details: message },
      { status: 500 }
    );
  }
}
