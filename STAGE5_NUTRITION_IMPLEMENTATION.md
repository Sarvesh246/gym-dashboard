# Stage 5: Nutrition Engine + Food Tracking - Implementation Summary

## ✅ COMPLETED COMPONENTS

### 1. Database Layer
- **File**: `database/migrations/003_stage5_nutrition.sql`
- **Tables Created**:
  - `nutrition_goals` - User nutrition targets (unique per user)
  - `nutrition_logs` - Individual food entries (meal_type: breakfast/lunch/dinner/snack)
  - `daily_nutrition_summary` - Denormalized daily totals with adherence scores
  - `saved_foods` - Cached favorite/recent foods from USDA
- **Features**: RLS policies, triggers for automatic daily summary updates, indexes for fast queries

### 2. Services Layer
- **`services/macros/index.ts`**:
  - `calculateBMR()` - Mifflin-St Jeor formula
  - `calculateTDEE()` - With activity level multipliers
  - `calculateMacroTargets()` - Deterministic macro calculations by goal
  - `calculateDailyAdherence()` - Macro adherence scoring (0-100)
  - `calculateWeeklyAdherence()` - 7-day rolling average + consistency
  - `calculateRecoveryModifier()` - Nutrition → recovery readiness integration
  - `calculateHydrationTarget()` - Dynamic hydration goals

- **`services/nutrition/index.ts`**:
  - `getUserNutritionGoals()`, `createNutritionGoals()`
  - `getDailyNutritionLog()`, `logFoodEntry()`, `updateFoodEntry()`, `deleteFoodEntry()`
  - `getDailyNutritionSummary()`, `get7DayNutritionHistory()`
  - `updateDailySummary()` - Recalculates adherence after log changes
  - `getWeeklyAdherenceStats()` - Weekly statistics

- **`services/foods/index.ts`**:
  - `searchFoods()` - USDA FoodData Central API integration with 24h in-memory cache
  - `getFoodDetails()` - Full nutrient breakdown for a food
  - `getUserSavedFoods()`, `saveFood()`, `deleteSavedFood()`
  - `getUserRecentFoods()` - For quick-add functionality
  - `incrementSavedFoodUsage()` - Track and sort by frequency

### 3. Types & Constants
- **`lib/nutrition/types.ts`**: 
  - All domain types (NutritionLog, NutritionGoals, DailyNutritionSummary, SavedFood, etc.)
  - UI state types (ActiveMealEntry, DailyNutritionUI)
  - API request/response types

- **`lib/nutrition/constants.ts`**:
  - Activity level multipliers (1.2 - 1.9)
  - Macro targets by goal (protein: 1.6-2.2g/kg, fat: 0.8-1.2g/kg)
  - Calorie adjustments by strategy (±300 to ±500)
  - Carb volume scalars (0.85 - 1.15)
  - Recovery nutrition modifiers (-10 to +5 readiness)
  - Serving unit conversions and aliases

### 4. Tests
- **`lib/nutrition/__tests__/calorie-math.test.ts`** (8 tests):
  - BMR calculation
  - TDEE with activity levels
  - Macro targets for each goal
  - Hydration targets

- **`lib/nutrition/__tests__/adherence.test.ts`** (13 tests):
  - Daily adherence scoring
  - Weighted macro scoring
  - 7-day rolling averages
  - Consistency calculations
  - Recovery modifiers

### 5. API Routes
- **`GET/PUT /api/nutrition/goals`** - Manage user nutrition goals
- **`GET/POST /api/nutrition/logs`** - Fetch daily logs or log new food
- **`PATCH/DELETE /api/nutrition/logs/[id]`** - Edit or delete food entries
- **`GET /api/nutrition/search`** - Search USDA database (debounced client-side)
- **`GET /api/nutrition/summary`** - Daily or weekly summary with adherence
- **`GET/POST /api/foods/saved`** - Manage saved foods
- **`POST /api/foods/barcode`** - Scan barcode and auto-log with default serving

### 6. Components
All in `components/nutrition/`:

- **NutritionCard.tsx** - Dashboard widget showing daily macro progress + quick-add button
- **MacroRings.tsx** - SVG donut chart visualization (3 rings: protein/carbs/fat, animated)
- **FoodSearch.tsx** - Search input with debounce, recent foods, search results
- **FoodCard.tsx** - Compact food result card (name, serving, calories, macros)
- **ServingSizeAdjuster.tsx** - Serving size UI with real-time macro preview
- **FoodLogger.tsx** - Full flow: search → adjust → select meal → confirm → log
- **BarcodeScanner.tsx** - Camera-based barcode scanning with manual fallback
- **MealTimeline.tsx** - Grouped meal display (breakfast/lunch/dinner/snacks), collapsible, delete buttons

### 7. Pages
- **`app/nutrition/page.tsx`** - Main nutrition dashboard
  - Macro progress visualization
  - Daily totals and adherence
  - Meal timeline with quick-add
  - Log food & barcode scan buttons
  - Date selector for viewing past days

- **`app/nutrition/history/page.tsx`** - Last 30 days of nutrition data
  - Daily summary cards showing adherence %
  - Click to jump to daily detail

## 🔧 NEXT STEPS: SETUP & INTEGRATION

### 1. Database Migration (Required)
Run in Supabase SQL Editor:
```sql
-- Copy and paste contents of: database/migrations/003_stage5_nutrition.sql
-- This creates all 4 tables with RLS, triggers, and indexes
```

### 2. Environment Variables (if using USDA API key)
Currently uses DEMO_KEY (rate limited but free).  For production:
```env
NEXT_PUBLIC_USDA_API_KEY=your_key_here
```
Get a free key at: https://fdc.nal.usda.gov/api-guide.html

### 3. Add NutritionCard to Dashboard
In `app/page.tsx`, add this client component wrapper after the "Today's Overview" section:

```tsx
// Add after MetricsOverview in Hero Metrics section:
import dynamic from 'next/dynamic';

const NutritionWidget = dynamic(
  () => import('@/components/nutrition/NutritionCard').then(mod => ({
    default: (props: any) => {
      const [data, setData] = useState(null);
      useEffect(() => {
        Promise.all([
          fetch('/api/nutrition/goals'),
          fetch('/api/nutrition/logs')
        ]).then(async ([g, l]) => {
          const goals = await g.json();
          const logs = await l.json();
          setData({ goals: goals.goals, summary: logs.summary });
        });
      }, []);
      return data ? <NutritionCard summary={data.summary} goals={data.goals} /> : <div className="animate-pulse h-48 bg-gray-200 rounded" />;
    }
  })),
  { ssr: false }
);
```

### 4. Recovery System Integration
In `PATCH /api/workouts/session/[id]` (session finalization):

```typescript
// After calculating workout strain, add:
const weeklyNutrition = await get7DayNutritionHistory(user.id);
const nutritionAdherence = await getWeeklyAdherenceStats(user.id);
const nutrient_modifier = calculateRecoveryModifier(nutritionAdherence);

// Include in systemicRecovery update:
await upsertSystemicRecovery(user.id, {
  systemic_fatigue: ...,
  nutrient_modifier: nutrient_modifier // -10 to +5
});
```

## 📊 ARCHITECTURE DECISIONS

### Deterministic Calculations (No AI)
- All nutrition math uses proven formulas (Mifflin-St Jeor BMR, Harris-Benedict TDEE)
- Macro targets based on training goal and bodyweight
- Adherence scored as % of goals within ±10% tolerance
- No AI for calorie estimation or macro recommendations

### USDA Food Data
- Free tier: 1000 calls/hour
- 24h in-memory cache to avoid repeated API calls
- Fallback: manual food entry with macro input
- Barcode → text search → USDA lookup

### Meal Grouping
- No separate `meals` table; grouped by `meal_type` on client
- Reduces schema complexity, sufficient for daily tracking
- MealTimeline component handles grouping & UI

### Nutrition → Recovery Integration
- Nutrition adherence affects `systemic_readiness` softly (±5-10 points)
- Low protein: -5 readiness (impairs muscle recovery)
- Under-eating: -10 readiness (insufficient energy)
- Excellent nutrition: +5 readiness (accelerated recovery)
- 7-day rolling average (not day-to-day spikes)

## 🧪 TESTING

Run tests:
```bash
npm test -- lib/nutrition/__tests__/
```

All 21 tests should pass:
- Calorie math (BMR, TDEE, macros)
- Adherence scoring
- Edge cases (zero intake, over-goals, etc.)

## 🚀 FEATURE VERIFICATION CHECKLIST

### Food Tracking
- [ ] USDA food search works (test with "chicken breast")
- [ ] Food logging persists to DB
- [ ] Serving size adjustments update macros in real-time
- [ ] Barcode scanning finds foods and auto-logs
- [ ] Recent foods appear at top of search

### Macros
- [ ] Nutrition goals are calculated correctly
- [ ] Daily totals aggregate from all logs
- [ ] Adherence scores match expected %
- [ ] Weekly averages smooth out daily variance

### Dashboard
- [ ] NutritionCard appears on /dashboard (once integrated)
- [ ] Macro rings animate on load
- [ ] Meal timeline shows all meals grouped by type
- [ ] Delete buttons remove entries

### Recovery Integration
- [ ] Poor nutrition (adherence <80%) reduces readiness
- [ ] Good nutrition (adherence >90%) boosts readiness
- [ ] 7-day window is used (not daily spikes)

### UX
- [ ] Food logging takes <10 seconds (search → select → log)
- [ ] Mobile experience is smooth (no lag)
- [ ] Buttons are thumb-friendly (min 44px touch targets)

## 📝 KNOWN LIMITATIONS & FUTURE WORK

1. **Barcode Scanning**: Currently text-based fallback to USDA search. Could integrate dedicated UPC database.
2. **Hydration Tracking**: Implemented in models but UI not added to page (easy add-on).
3. **Meal Prep**: No meal templates or recipe builder (future phase).
4. **Nutrition History**: 30-day view only; could add monthly/yearly analytics.
5. **Goals Adjustment**: User must manually update goals; could auto-adjust based on weight trends.
6. **Custom Foods**: Allowed via manual entry; could add crowdsourced database.

## 📚 API RESPONSE EXAMPLES

### POST /api/nutrition/logs
```json
{
  "log": {
    "id": "log-123",
    "user_id": "user-456",
    "logged_at": "2026-05-13",
    "meal_type": "lunch",
    "food_name": "Chicken Breast",
    "serving_size": 150,
    "serving_unit": "g",
    "calories": 280,
    "protein_g": 53,
    "carbs_g": 0,
    "fat_g": 6
  },
  "summary": {
    "date": "2026-05-13",
    "calories": 1850,
    "protein_g": 145,
    "carbs_g": 210,
    "fat_g": 65,
    "adherence_score": 92
  }
}
```

### GET /api/nutrition/summary
```json
{
  "summaries": [...], // Last 7 days
  "goals": {...},
  "adherence": {
    "protein_adherence": 92,
    "calorie_adherence": 85,
    "overall_score": 88,
    "consistency": 78
  }
}
```

---

**Status**: Stage 5 code complete. Ready for database migration and testing.
