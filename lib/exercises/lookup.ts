/**
 * Exercise lookup — checks WGER cache first, falls back to static library.
 * Server-side only.
 */

import { createClient } from "@/lib/supabase/server";
import { getExercise as getStaticExercise } from "@/lib/muscles/mapping";
import type { ExerciseLibrary } from "@/lib/recovery/types";

/**
 * Unified exercise lookup:
 * 1. Try WGER cache (if synced)
 * 2. Fall back to static library (~40 exercises)
 */
export async function getExercise(id: string): Promise<ExerciseLibrary | undefined> {
  // Try static library first (faster, always available)
  const staticEx = getStaticExercise(id);
  if (staticEx) return staticEx;

  // Fall back to WGER cache by wger_id (if available)
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("wger_exercises")
      .select("*")
      .eq("wger_id", parseInt(id, 10))
      .single();

    if (data) {
      // Convert WGER format to ExerciseLibrary
      return wgerToExerciseLibrary(data);
    }
  } catch {
    // Not in WGER, return static if available
  }

  return undefined;
}

/**
 * Search exercises across both WGER and static library.
 */
export async function searchExercises(query: string): Promise<ExerciseLibrary[]> {
  const q = query.toLowerCase();

  // Start with static library
  const allExercises = require("@/lib/muscles/mapping").getAllExercises();
  let results = allExercises.filter(
    (e: ExerciseLibrary) =>
      e.name.toLowerCase().includes(q) ||
      e.primary_muscles.some((m) => m.includes(q)) ||
      e.movement_pattern.includes(q)
  );

  // Augment with WGER if synced
  try {
    const supabase = await createClient();
    const { data: wgerResults } = await (supabase as any)
      .from("wger_exercises")
      .select("*")
      .ilike("name", `%${q}%`)
      .limit(10);

    if (wgerResults && wgerResults.length > 0) {
      const wgerExercises = (wgerResults as any[]).map(wgerToExerciseLibrary);
      // Avoid duplicates by name
      const staticNames = new Set(results.map((e: ExerciseLibrary) => e.name));
      results = [...results, ...wgerExercises.filter((e) => !staticNames.has(e.name))];
    }
  } catch {
    // WGER not available, use static only
  }

  return results.slice(0, 50); // Limit results
}

/**
 * Convert WGER row format to ExerciseLibrary format.
 * Approximates missing fields since WGER has a different schema.
 */
function wgerToExerciseLibrary(wgerRow: any): ExerciseLibrary {
  return {
    id:                    `wger_${wgerRow.wger_id}`,
    name:                  wgerRow.name,
    equipment:            wgerRow.equipment_ids?.map((id: number) => `equipment_${id}`) ?? [],
    movement_pattern:     "isolation_push", // fallback — WGER doesn't have movement patterns
    primary_muscles:      [], // WGER uses numeric muscle IDs, would need mapping table
    secondary_muscles:    [],
    fatigue_factor:       0.5,
    hypertrophy_weighting: 0.7,
    systemic_fatigue_factor: 0.3,
    cns_fatigue_factor:    0.2,
  };
}
