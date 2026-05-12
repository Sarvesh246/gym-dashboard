#!/usr/bin/env node

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kngevcmzzmokevlakfge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eixQk2AsJRkjvACOOa_KdA_7Vi1X4zL';
const WGER_API = 'https://wger.de/api/v2/exercise';

async function fetchWgerExercises() {
  console.log('Fetching WGER exercises...');
  const exercises = [];
  let nextUrl = `${WGER_API}?limit=100&language=2`;
  let pageCount = 0;

  while (nextUrl) {
    pageCount++;
    console.log(`Fetching page ${pageCount}...`);

    const data = await new Promise((resolve, reject) => {
      https.get(nextUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    if (data.results) {
      exercises.push(...data.results);
    }

    nextUrl = data.next;
    if (nextUrl) {
      await new Promise(r => setTimeout(r, 100)); // Rate limiting
    }
  }

  return exercises;
}

async function syncToDatabase(exercises) {
  console.log(`Syncing ${exercises.length} exercises to Supabase...`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const rows = exercises.map(ex => ({
    wger_id: ex.id,
    name: ex.name,
    description: ex.description || '',
    equipment_ids: ex.equipment && ex.equipment.length > 0 ? ex.equipment : [],
    muscle_ids: ex.muscles && ex.muscles.length > 0 ? ex.muscles : [],
    images: ex.images && ex.images.length > 0 ? ex.images : [],
    synced_at: new Date().toISOString(),
  }));

  // Batch insert in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('wger_exercises')
      .upsert(batch, { onConflict: 'wger_id' });

    if (error) {
      console.error(`Error syncing batch ${i / 100 + 1}:`, error);
      throw error;
    }
    console.log(`✓ Synced ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }

  return rows.length;
}

async function main() {
  try {
    console.log('=== WGER Sync Starting ===\n');

    const exercises = await fetchWgerExercises();
    console.log(`\nFetched ${exercises.length} exercises from WGER\n`);

    const count = await syncToDatabase(exercises);
    console.log(`\n✅ Successfully synced ${count} exercises!`);
    console.log('You can now visit http://localhost:3000/workouts/exercises');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();
