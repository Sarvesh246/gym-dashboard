import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/services/readiness";
import type { ReadinessOutput } from "@/lib/recovery/types";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const readiness: ReadinessOutput = await computeReadiness(user.id);
    return Response.json(readiness);
  } catch (err) {
    console.error("[GET /api/recovery/readiness]", err);
    return Response.json({ error: "Failed to compute readiness" }, { status: 500 });
  }
}
