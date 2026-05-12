const { createClient } = require("@supabase/supabase-js");
const https = require("https");

const SUPABASE_URL = "https://kngevcmzzmokevlakfge.supabase.co";
const SUPABASE_KEY = "sb_publishable_eixQk2AsJRkjvACOOa_KdA_7Vi1X4zL";
const WGER_API = "https://wger.de/api/v2";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function fetchWgerExercises() {
  const exercises = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 50) {
    pageCount++;
    const url = `${WGER_API}/exercise/?limit=${limit}&offset=${offset}&language=2`;
    console.log(`Fetching page ${pageCount} (offset: ${offset})...`);

    try {
      const data = await httpsGet(url);
      if (data.results && Array.isArray(data.results)) {
        exercises.push(...data.results);
        console.log(
          `  Got ${data.results.length} exercises, total: ${exercises.length}`
        );
      }
      hasMore = !!data.next;
      offset += limit;

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error fetching page ${pageCount}:`, err.message);
      hasMore = false;
    }
  }

  return exercises;
}

async function syncToDatabase(exercises) {
  // Filter out exercises without names
  const validExercises = exercises.filter((e) => e.name && e.name.trim());
  console.log(
    `\nSyncing ${validExercises.length} exercises to Supabase (${exercises.length - validExercises.length} skipped due to missing name)...`
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const rows = validExercises.map((e) => ({
    wger_id: e.id,
    name: e.name,
    description: e.description || null,
    equipment_ids: e.equipment || [],
    muscle_ids: e.muscles || [],
    secondary_muscle_ids: e.muscles_secondary || [],
    images: e.images || [],
    synced_at: new Date().toISOString(),
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("wger_exercises")
      .upsert(batch, { onConflict: "wger_id" });

    if (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      throw error;
    }

    const progress = Math.min(i + batchSize, rows.length);
    const percentage = Math.round((progress / rows.length) * 100);
    console.log(`✓ Synced ${progress}/${rows.length} (${percentage}%)`);
  }

  return rows.length;
}

async function main() {
  try {
    console.log("=== WGER Exercise Sync ===\n");

    const exercises = await fetchWgerExercises();
    console.log(`\nFetched ${exercises.length} total exercises\n`);

    const count = await syncToDatabase(exercises);

    console.log(
      `\n✅ Successfully synced ${count} exercises!`
    );
    console.log("\nVisit http://localhost:3000/workouts/exercises to see them");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Sync failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
