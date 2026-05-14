import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBodyMapData } from "@/services/muscles";
import { getSystemicRecovery } from "@/services/recovery";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { BODY_MAP_MUSCLES } from "@/lib/body-map/mapping";

/**
 * GET /api/body-map?range=7d
 *
 * Returns comprehensive body map data:
 * - Per-muscle recovery/fatigue scores (current and raw)
 * - Weekly volume and frequency
 * - Imbalance detection and severity
 * - Overworked and undertrained muscle lists
 * - Training recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Parse time range from query params
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get("range") || "7d") as "7d" | "14d" | "30d";

    if (!["7d", "14d", "30d"].includes(range)) {
      return NextResponse.json(
        { error: "Invalid range. Must be 7d, 14d, or 30d" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch muscle states (includes recovery scores, fatigue, strain, volume, frequency)
    // This already applies time-decay via getBodyMapData()
    // Note: The time range parameter is for UI display; the data is aggregated over all workouts
    const bodyMapData = await getBodyMapData(user.id);

    // Fetch systemic recovery for context
    const systemic = await getSystemicRecovery(user.id);

    // Compute derived metrics
    const overworkedMuscles: MuscleGroup[] = [];
    const undertrainedMuscles: MuscleGroup[] = [];
    const imbalances: Array<{
      pairLabel: string;
      ratio: number;
      severity: "mild" | "moderate" | "severe";
      recommendation: string;
    }> = [];

    // Identify overworked (recovery < 40) and undertrained (volume < 5 sets) muscles
    for (const muscle of BODY_MAP_MUSCLES as MuscleGroup[]) {
      const data = bodyMapData[muscle];
      if (data) {
        if ((data.recovery_score ?? 0) < 40) {
          overworkedMuscles.push(muscle);
        }
        if ((data.weekly_volume ?? 0) < 5) {
          undertrainedMuscles.push(muscle);
        }
      }
    }

    // Detect imbalances (push/pull, leg balance, arm balance, shoulder balance)
    // This uses simple ratio-based detection
    const imbalancePairs = [
      { primary: "chest", secondary: "upper_back", label: "Push vs Pull (Chest vs Back)" },
      { primary: "quads", secondary: "hamstrings", label: "Leg Balance (Quads vs Hamstrings)" },
      { primary: "biceps", secondary: "triceps", label: "Arm Balance (Biceps vs Triceps)" },
      {
        primary: "front_delts",
        secondary: "rear_delts",
        label: "Shoulder Balance (Front vs Rear)",
      },
    ];

    for (const pair of imbalancePairs) {
      const primaryData = bodyMapData[pair.primary as MuscleGroup];
      const secondaryData = bodyMapData[pair.secondary as MuscleGroup];

      if (primaryData && secondaryData) {
        const primaryVolume = primaryData.weekly_volume ?? 0;
        const secondaryVolume = secondaryData.weekly_volume ?? 0;

        if (secondaryVolume > 0) {
          const ratio = primaryVolume / secondaryVolume;

          // Determine severity based on ratio thresholds
          let severity: "mild" | "moderate" | "severe" | null = null;
          if (ratio > 3.5 || ratio < 0.3) {
            severity = "severe";
          } else if (ratio > 2.5 || ratio < 0.4) {
            severity = "moderate";
          } else if (ratio > 2.0 || ratio < 0.5) {
            severity = "mild";
          }

          if (severity) {
            const isOverloaded = ratio > 1;
            const overloadedMuscle = isOverloaded ? pair.primary : pair.secondary;
            const recommendation =
              severity === "severe"
                ? `Critical imbalance detected. Significantly reduce ${overloadedMuscle} training and increase ${!isOverloaded ? pair.primary : pair.secondary} training.`
                : severity === "moderate"
                  ? `Moderate imbalance. Gradually reduce ${overloadedMuscle} volume and increase ${!isOverloaded ? pair.primary : pair.secondary}.`
                  : `Mild imbalance. Consider adding volume to ${!isOverloaded ? pair.primary : pair.secondary} training.`;

            imbalances.push({
              pairLabel: pair.label,
              ratio,
              severity,
              recommendation,
            });
          }
        }
      }
    }

    // Build response
    const response = {
      muscleData: bodyMapData,
      imbalances: {
        flag: imbalances.length > 0 ? (imbalances.some((i) => i.severity === "severe") ? "severe" : imbalances.some((i) => i.severity === "moderate") ? "moderate" : "mild") : null,
        imbalancedPairs: imbalances,
      },
      overworkedMuscles,
      undertrainedMuscles,
      systemicReadiness: {
        readiness_score: systemic?.readiness_score ?? 0,
        systemic_fatigue: systemic?.systemic_fatigue ?? 0,
        recovery_tier: systemic?.recovery_tier ?? "gray",
      },
      generatedAt: new Date().toISOString(),
      timeRange: range,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching body map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch body map data" },
      { status: 500 }
    );
  }
}
