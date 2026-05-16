import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { WearableProvider } from "@/lib/wearables/providers";
import {
  generateGarminAuthUrl,
  getGarminConfig,
} from "@/services/wearables/garmin";
import {
  generateAppleHealthAuthUrl,
  getAppleHealthConfig,
} from "@/services/wearables/apple";
import {
  generateFitbitAuthUrl,
  getFitbitConfig,
} from "@/services/wearables/fitbit";
import {
  generatePolarAuthUrl,
  getPolarConfig,
} from "@/services/wearables/polar";
import {
  generateWahooAuthUrl,
  getWahooConfig,
} from "@/services/wearables/wahoo";
import { handleGarminCallback } from "@/services/sync/garmin-sync";
import { handleFitbitCallback } from "@/services/sync/fitbit-sync";
import { handleAppleHealthCallback } from "@/services/sync/apple-sync";
import { handlePolarCallback } from "@/services/sync/polar-sync";
import { handleWahooCallback } from "@/services/sync/wahoo-sync";
import { upsertWearableConnection } from "@/services/wearables";

const SUPPORTED_PROVIDERS: WearableProvider[] = [
  "garmin",
  "apple_health",
  "fitbit",
  "polar",
  "wahoo",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, action, code } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: "Provider is required and must be supported" },
        { status: 400 }
      );
    }

    const typedProvider = provider as WearableProvider;

    // Create a state token to prevent CSRF
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        provider,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Handle OAuth initiation
    if (action === "authorize") {
      try {
        switch (typedProvider) {
          case "garmin": {
            const authUrl = generateGarminAuthUrl(state);
            return NextResponse.json({ authUrl });
          }
          case "apple_health": {
            const authUrl = generateAppleHealthAuthUrl(state);
            return NextResponse.json({ authUrl });
          }
          case "fitbit": {
            const authUrl = generateFitbitAuthUrl(state);
            return NextResponse.json({ authUrl });
          }
          case "polar": {
            const authUrl = generatePolarAuthUrl(state);
            return NextResponse.json({ authUrl });
          }
          case "wahoo": {
            const authUrl = generateWahooAuthUrl(state);
            return NextResponse.json({ authUrl });
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate auth URL";
        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }
    }

    // Handle OAuth callback
    if (action === "callback") {

      if (!code) {
        return NextResponse.json(
          { error: "Authorization code is required" },
          { status: 400 }
        );
      }

      try {
        let tokenData: {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
        } | null = null;

        switch (typedProvider) {
          case "garmin": {
            const success = await handleGarminCallback(user.id, code);
            if (!success) {
              throw new Error("Failed to establish Garmin connection");
            }
            return NextResponse.json({
              success: true,
              message: "Garmin successfully connected",
            });
          }
          case "fitbit": {
            const success = await handleFitbitCallback(user.id, code);
            if (!success) {
              throw new Error("Failed to establish Fitbit connection");
            }
            return NextResponse.json({
              success: true,
              message: "Fitbit successfully connected",
            });
          }
          case "apple_health": {
            const success = await handleAppleHealthCallback(user.id, code);
            if (!success) {
              throw new Error("Failed to establish Apple Health connection");
            }
            return NextResponse.json({
              success: true,
              message: "Apple Health successfully connected",
            });
          }
          case "polar": {
            const success = await handlePolarCallback(user.id, code);
            if (!success) {
              throw new Error("Failed to establish Polar connection");
            }
            return NextResponse.json({
              success: true,
              message: "Polar successfully connected",
            });
          }
          case "wahoo": {
            const success = await handleWahooCallback(user.id, code);
            if (!success) {
              throw new Error("Failed to establish Wahoo connection");
            }
            return NextResponse.json({
              success: true,
              message: "Wahoo successfully connected",
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Connection failed";
        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }
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
