# WGER Exercise Database Integration

This app supports importing ~1400 exercises from the free, open-source [WGER](https://wger.de) exercise database.

## Current State

- **Static Library**: 40 core exercises (always available, no setup needed)
- **WGER Cache**: 1400+ exercises (optional, requires one-time sync)

## Setup (One-Time)

### 1. Run the database migration

If you haven't already run `002_stage4_workouts.sql`:

```bash
# In Supabase SQL Editor, paste the entire file and click "Run"
```

This creates the `wger_exercises` table to cache exercises locally.

### 2. Trigger the sync

Visit `/admin/sync` (in your app):

```
http://localhost:3000/admin/sync
```

**Note**: Only users with "admin" in their email can access this page (simple check, for production use proper role system).

**What happens**:
- Fetches ~1400 exercises from WGER API (~10-30 seconds)
- Stores them in your Supabase database
- Makes them searchable in `/workouts/exercises`

Button shows:
- 🔄 "Syncing..." while in progress
- ✅ "Success! Synced 1400+ exercises" when done
- ❌ Error message if anything fails

### 3. Verify

Visit `/workouts/exercises` and search for exercises. You'll now see 1400+ results instead of 40.

## How It Works

### Exercise Lookup (`lib/exercises/lookup.ts`)

1. **Static library first** (40 core exercises) — fastest, always available
2. **Fall back to WGER cache** (if synced) — for extended library
3. **Search** combines both sources

### Data Flow

```
API call → checks static lib → checks WGER Supabase table → returns ExerciseLibrary
```

### Generator

The workout generator automatically uses whatever exercises are available:
- With static only: picks from 40
- With WGER synced: picks from 1400+

Respects equipment, training level, recovery state same as before.

## Behind the Scenes

### WGER API Details

- **URL**: `https://wger.de/api/v2/`
- **No auth required** — public read-only API
- **Endpoints used**:
  - `/exercise?limit=100&offset=0&language=2` — exercises (paginated)
  - `/equipment` — equipment reference
  - `/muscle` — muscle reference

### Server Action (`app/actions/workouts.ts`)

```typescript
export async function syncWgerExercises() {
  // Fetches from WGER
  // Upserts into Supabase wger_exercises table
  // Returns count or error
}
```

### Caching

- Exercises cached in `wger_exercises` table
- Fetch from WGER only once (no repeated API calls)
- WGER data is read-only in the app (user workouts stored separately)

## Troubleshooting

### Sync says "Admin only"

Your email doesn't contain "admin". For testing, either:
1. Use an email with "admin" in it
2. Temporarily change the check in `app/actions/workouts.ts` to allow your email
3. In production, use Supabase roles + `user.user_metadata.role`

### Sync says "No exercises fetched"

- WGER API might be temporarily down (rare)
- Network issue — try again in a few seconds
- Check server logs for details

### Synced but exercises don't appear in search

- Refresh the page
- Check `/admin/sync` shows "Success"
- Verify Supabase table `wger_exercises` has data:
  ```sql
  select count(*) from wger_exercises;
  ```

## Future Improvements

Currently, WGER exercises in the cache don't map to the app's movement patterns or muscle categorization perfectly. You could:

1. **Add mapping table** — `wger_muscle_mapping` and `wger_pattern_mapping`
2. **Auto-categorize** — use ML or rules to assign movement patterns
3. **Search across both** — `searchExercises()` already combines static + WGER
4. **User favorites** — store which exercises users prefer

## Architecture

```
lib/wger/client.ts          ← WGER API client (fetch, cache)
app/actions/workouts.ts     ← Server action (admin sync)
app/admin/sync/page.tsx     ← Sync UI
lib/exercises/lookup.ts     ← Unified exercise lookup (static + WGER)
lib/muscles/mapping.ts      ← Static library (always available)
database/migrations/002_stage4_workouts.sql  ← wger_exercises table
```

## Cost

- 🆓 Free — WGER API has no cost or rate limits (public service)
- 💾 Storage — ~50KB per exercise (metadata + images JSON)
- ⏱️ Time — one-time sync takes 10-30 seconds

## Notes

- WGER is maintained by the fitness community (non-profit)
- All data is CC BY-SA licensed (you can use/modify)
- No affiliation — just a great open data source
- App still works fine with just the 40 core exercises
