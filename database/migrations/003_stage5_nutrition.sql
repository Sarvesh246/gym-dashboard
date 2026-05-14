-- Stage 5: Nutrition Engine + Food Tracking
-- Creates nutrition goals, daily logs, summaries, and saved foods

-- nutrition_goals: User's daily nutrition targets
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  calorie_target NUMERIC(8, 2) NOT NULL,
  protein_target NUMERIC(8, 2) NOT NULL,
  carb_target NUMERIC(8, 2) NOT NULL,
  fat_target NUMERIC(8, 2) NOT NULL,
  fiber_target NUMERIC(8, 2),
  hydration_target_ml NUMERIC(8, 2),
  goal_strategy VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_goals UNIQUE (user_id)
);

ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit their own nutrition goals"
  ON nutrition_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nutrition_goals_user_id ON nutrition_goals (user_id);

-- nutrition_logs: Individual food entries
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_at DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  food_name VARCHAR(255) NOT NULL,
  serving_size NUMERIC(10, 2) NOT NULL,
  serving_unit VARCHAR(50) NOT NULL,
  calories NUMERIC(10, 2) NOT NULL,
  protein_g NUMERIC(8, 2) NOT NULL,
  carbs_g NUMERIC(8, 2) NOT NULL,
  fat_g NUMERIC(8, 2) NOT NULL,
  fiber_g NUMERIC(8, 2),
  sugar_g NUMERIC(8, 2),
  sodium_mg NUMERIC(10, 2),
  source_type VARCHAR(50),
  external_food_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit/delete their own nutrition logs"
  ON nutrition_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nutrition_logs_user_id ON nutrition_logs (user_id);
CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs (user_id, logged_at DESC);
CREATE INDEX idx_nutrition_logs_meal_type ON nutrition_logs (user_id, meal_type, logged_at DESC);

-- daily_nutrition_summary: Denormalized daily totals (updated via trigger)
CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calories NUMERIC(10, 2) DEFAULT 0,
  protein_g NUMERIC(8, 2) DEFAULT 0,
  carbs_g NUMERIC(8, 2) DEFAULT 0,
  fat_g NUMERIC(8, 2) DEFAULT 0,
  fiber_g NUMERIC(8, 2) DEFAULT 0,
  hydration_ml NUMERIC(10, 2) DEFAULT 0,
  adherence_score NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_daily_summary UNIQUE (user_id, date)
);

ALTER TABLE daily_nutrition_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit their own daily summaries"
  ON daily_nutrition_summary
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_nutrition_summary_user_id ON daily_nutrition_summary (user_id);
CREATE INDEX idx_daily_nutrition_summary_date ON daily_nutrition_summary (user_id, date DESC);

-- saved_foods: User's favorite/recent foods (cached from USDA)
CREATE TABLE IF NOT EXISTS saved_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  external_food_id VARCHAR(255),
  serving_defaults JSONB,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_food UNIQUE (user_id, external_food_id)
);

ALTER TABLE saved_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit/delete their own saved foods"
  ON saved_foods
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_foods_user_id ON saved_foods (user_id);
CREATE INDEX idx_saved_foods_user_last_used ON saved_foods (user_id, last_used_at DESC);

-- Trigger: Recalculate daily_nutrition_summary when nutrition_logs change
CREATE OR REPLACE FUNCTION update_daily_nutrition_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_nutrition_summary (user_id, date, calories, protein_g, carbs_g, fat_g, fiber_g)
  SELECT
    user_id,
    logged_at,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    COALESCE(SUM(fiber_g), 0)
  FROM nutrition_logs
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND logged_at = COALESCE(NEW.logged_at, OLD.logged_at)
  GROUP BY user_id, logged_at
  ON CONFLICT (user_id, date) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    fiber_g = EXCLUDED.fiber_g,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_daily_nutrition_summary
AFTER INSERT OR UPDATE OR DELETE ON nutrition_logs
FOR EACH ROW
EXECUTE FUNCTION update_daily_nutrition_summary();

-- Create initial nutrition_goals for existing users (if needed)
INSERT INTO nutrition_goals (user_id, calorie_target, protein_target, carb_target, fat_target, goal_strategy)
SELECT id, 2000, 150, 200, 70, 'maintenance' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM nutrition_goals)
ON CONFLICT (user_id) DO NOTHING;
