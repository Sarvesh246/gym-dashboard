import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateGarminAuthUrl,
  getGarminConfig,
} from "@/services/wearables/garmin";
import { handleGarminCallback } from "@/services/sync/garmin-sync";

export async function POST(request: NextRequest) {
  try {
    const { provider, action } = await request.json();

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

    // Handle OAuth initiation
    if (action === "authorize") {
      if (provider === "garmin") {
        try {
          const config = getGarminConfig();
          // Create a state token to prevent CSRF
          const state = Buffer.from(
            JSON.stringify({
              userId: user.id,
              timestamp: Date.now(),
            })
          ).toString("base64");

          const authUrl = generateGarminAuthUrl(state);
          return NextResponse.json({ authUrl });
        } catch (err) {
          return NextResponse.json(
            { error: "Failed to generate authorization URL" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        { error: `Provider ${provider} is not supported` },
        { status: 400 }
      );
    }

    // Handle OAuth callback
    if (action === "callback") {
      const { code } = await request.json();

      if (!code) {
        return NextResponse.json(
          { error: "Authorization code is required" },
          { status: 400 }
        );
      }

      if (provider === "garmin") {
        const success = await handleGarminCallback(user.id, code);
        if (!success) {
          return NextResponse.json(
            { error: "Failed to establish connection" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `${provider} successfully connected`,
        });
      }

      return NextResponse.json(
        { error: `Provider ${provider} is not supported` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error in wearables connect:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
