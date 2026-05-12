import { createClient } from "@supabase/supabase-js";
import { fetchWgerExercises } from "./lib/wger/client.ts";

const SUPABASE_URL = "https://kngevcmzzmokevlakfge.supabase.co";
const SUPABASE_KEY = "sb_publishable_eixQk2AsJRkjvACOOa_KdA_7Vi1X4zL";

async function syncWgerExercises() {
  try {
    console.log("Fetching WGER exercises...");
    const exercises = await fetchWgerExercises();

    if (exercises.length === 0) {
      console.log("No exercises fetched");
      return { success: false, error: "No exercises fetched from WGER" };
    }

    console.log(`Fetched ${exercises.length} exercises`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const rows = exercises.map((e) => ({
      wger_id: e.id,
      name: e.name,
      description: e.description || null,
      equipment_ids: e.equipment || [],
      muscle_ids: e.muscles || [],
      secondary_muscle_ids: e.muscles_secondary || [],
      images: e.images || [],
      synced_at: new Date().toISOString(),
    }));

    console.log(`Upserting ${rows.length} exercises in batches...`);

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase
        .from("wger_exercises")
        .upsert(batch, { onConflict: "wger_id" });

      if (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
        return { success: false, error: `Upsert failed: ${error.message}` };
      }

      const percentage = Math.round(((i + batchSize) / rows.length) * 100);
      console.log(`✓ ${Math.min(i + batchSize, rows.length)}/${rows.length} (${percentage}%)`);
    }

    console.log(`\n✅ Successfully synced ${exercises.length} exercises!`);
    console.log("Visit http://localhost:3000/workouts/exercises to see them");
    return { success: true, count: exercises.length };
  } catch (err) {
    console.error("Sync failed:", err);
    return { success: false, error: err.message };
  }
}

syncWgerExercises();
