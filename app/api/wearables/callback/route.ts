import { NextRequest, NextResponse } from "next/server";
import { handleAppleHealthCallback } from "@/services/sync/apple-sync";
import { handleFitbitCallback } from "@/services/sync/fitbit-sync";
import { handleGarminCallback } from "@/services/sync/garmin-sync";
import { handlePolarCallback } from "@/services/sync/polar-sync";
import { handleWahooCallback } from "@/services/sync/wahoo-sync";
import type { WearableProvider } from "@/lib/wearables/providers";
import { SITE_URL } from "@/lib/site";

type CallbackState = {
  provider?: WearableProvider;
  userId?: string;
  timestamp?: number;
};

const CALLBACK_HANDLERS: Record<
  WearableProvider,
  (userId: string, code: string) => Promise<boolean>
> = {
  garmin: handleGarminCallback,
  apple_health: handleAppleHealthCallback,
  fitbit: handleFitbitCallback,
  polar: handlePolarCallback,
  wahoo: handleWahooCallback,
};

function redirectToSettings(
  request: NextRequest,
  status: "connected" | "error",
  provider: string,
  message?: string
) {
  const target = new URL("/settings", request.url);
  target.searchParams.set("wearable", provider);
  target.searchParams.set("status", status);

  if (message) {
    target.searchParams.set("message", message);
  }

  return NextResponse.redirect(target);
}

function parseState(rawState: string | null): CallbackState | null {
  if (!rawState) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(rawState, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("errorDescription");
  const state = parseState(searchParams.get("state"));
  const provider = (searchParams.get("provider") ?? state?.provider) as
    | WearableProvider
    | null;
  const userId = state?.userId;

  if (!provider || !(provider in CALLBACK_HANDLERS)) {
    return NextResponse.json(
      { error: "Unsupported or missing provider in callback request." },
      { status: 400 }
    );
  }

  if (error) {
    return redirectToSettings(
      request,
      "error",
      provider,
      errorDescription ?? "The wearable provider denied the connection request."
    );
  }

  if (!code || !userId) {
    return NextResponse.json(
      { error: "Missing authorization code or state." },
      { status: 400 }
    );
  }

  const connected = await CALLBACK_HANDLERS[provider](userId, code);

  if (!connected) {
    return redirectToSettings(
      request,
      "error",
      provider,
      "We could not complete the wearable connection."
    );
  }

  return NextResponse.redirect(
    new URL(
      `/settings?wearable=${provider}&status=connected&source=oauth`,
      SITE_URL
    )
  );
}
