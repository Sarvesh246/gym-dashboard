/**
 * POST /api/ai/insights
 * On-demand AI insight for a specific trigger type.
 * Rate-limited: checks for recent duplicate event before calling Gemini.
 */

import { createClient } from "@/lib/supabase/server";
import { buildWeeklyAnalytics } from "@/services/analytics/core";
import { scanForPlateaus } from "@/services/analytics/plateaus";
import { generateCoachingInsight, parseInsightResponse } from "@/services/ai/gemini";
import {
  buildPlateauPrompt,
  buildDeloadPrompt,
  buildImbalancePrompt,
  type InsightPromptType,
} from "@/services/ai/prompts";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/templates";

const COOLDOWN_MINUTES = 60;

async function hasRecentInsight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventType: string
): Promise<boolean> {
  const since = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
  const { data } = await (supabase as any)
    .from("ai_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .eq("resolved_status", "processed")
    .gte("detected_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function recordEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await (supabase as any).from("ai_events").insert({
    user_id: userId,
    event_type: eventType,
    resolved_status: "processed",
    metadata,
  });
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: { type?: InsightPromptType };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type ?? "weekly_summary";
  const eventTypeMap: Record<InsightPromptType, string> = {
    weekly_summary: "weekly_report_ready",
    plateau_explanation: "plateau_detected",
    deload_suggestion: "deload_threshold",
    imbalance: "imbalance_threshold",
  };
  const eventType = eventTypeMap[type];

  // Cooldown check — prevents duplicate AI calls
  if (await hasRecentInsight(supabase, user.id, eventType)) {
    return Response.json(
      { error: "Too soon — a recent insight already exists for this trigger.", cooldown: true },
      { status: 429 }
    );
  }

  try {
    const analytics = await buildWeeklyAnalytics(user.id);

    let systemPrompt = COACH_SYSTEM_PROMPT;
    let userPrompt = "";

    if (type === "plateau_explanation") {
      const plateauScan = await scanForPlateaus(user.id);
      if (!plateauScan.primaryPlateau) {
        return Response.json({ error: "No plateau detected" }, { status: 404 });
      }
      const pkg = buildPlateauPrompt(
        plateauScan.primaryPlateau,
        Math.round(analytics.avgReadiness7d),
        `${analytics.volumeTrend.deltaPct >= 0 ? "+" : ""}${analytics.volumeTrend.deltaPct.toFixed(1)}%`
      );
      systemPrompt = pkg.systemPrompt;
      userPrompt = pkg.userPrompt;
    } else if (type === "deload_suggestion") {
      const pkg = buildDeloadPrompt(analytics);
      systemPrompt = pkg.systemPrompt;
      userPrompt = pkg.userPrompt;
    } else if (type === "imbalance") {
      if (analytics.imbalanceFlags.length === 0) {
        return Response.json({ error: "No imbalance detected" }, { status: 404 });
      }
      const pkg = buildImbalancePrompt(analytics.imbalanceFlags, analytics.fatigueHotspots);
      systemPrompt = pkg.systemPrompt;
      userPrompt = pkg.userPrompt;
    }

    if (!userPrompt) {
      return Response.json({ error: "Unable to build prompt for type" }, { status: 400 });
    }

    const aiResponse = await generateCoachingInsight(systemPrompt, userPrompt);
    const parsed = parseInsightResponse(aiResponse.text);

    await recordEvent(supabase, user.id, eventType, { type });

    return Response.json({
      type,
      summary: parsed.summary,
      insights: parsed.insights,
      recommendations: parsed.recommendations,
      tokenCount: aiResponse.tokenCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
