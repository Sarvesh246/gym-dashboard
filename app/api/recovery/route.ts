import { createClient } from "@/lib/supabase/server";
import { getSystemicRecovery, computeSystemicRecoveryFromProfile, get7DayStrainAccumulation } from "@/services/recovery";
import { getBodyMapData, getAverageMuscleRecovery } from "@/services/muscles";
import { computeReadiness } from "@/services/readiness";
import type { RecoveryDashboardData } from "@/lib/recovery/types";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [systemic, bodyMap, avgMuscleRecovery, strainAcc, readiness] =
      await Promise.all([
        getSystemicRecovery(user.id),
        getBodyMapData(user.id),
        getAverageMuscleRecovery(user.id),
        get7DayStrainAccumulation(user.id),
        computeReadiness(user.id),
      ]);

    const payload: RecoveryDashboardData = {
      systemic,
      muscle_states: [],  // full list available via /api/recovery/muscles if needed
      body_map: bodyMap,
      readiness,
      last_computed_at: new Date().toISOString(),
    };

    return Response.json(payload);
  } catch (err) {
    console.error("[GET /api/recovery]", err);
    return Response.json({ error: "Failed to compute recovery data" }, { status: 500 });
  }
}
