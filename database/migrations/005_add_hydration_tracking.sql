-- Stage 5 (continued): Add hydration tracking to nutrition logs

-- Add hydration_ml column to nutrition_logs
ALTER TABLE nutrition_logs
ADD COLUMN IF NOT EXISTS hydration_ml NUMERIC(10, 2) DEFAULT 0;

-- Recreate trigger to include hydration_ml in daily summary
DROP TRIGGER IF EXISTS trg_update_daily_nutrition_summary ON nutrition_logs;
DROP FUNCTION IF EXISTS update_daily_nutrition_summary();

CREATE OR REPLACE FUNCTION update_daily_nutrition_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_nutrition_summary (user_id, date, calories, protein_g, carbs_g, fat_g, fiber_g, hydration_ml)
  SELECT
    user_id,
    logged_at,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    COALESCE(SUM(fiber_g), 0),
    COALESCE(SUM(hydration_ml), 0)
  FROM nutrition_logs
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND logged_at = COALESCE(NEW.logged_at, OLD.logged_at)
  GROUP BY user_id, logged_at
  ON CONFLICT (user_id, date) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    fiber_g = EXCLUDED.fiber_g,
    hydration_ml = EXCLUDED.hydration_ml,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_daily_nutrition_summary
AFTER INSERT OR UPDATE OR DELETE ON nutrition_logs
FOR EACH ROW
EXECUTE FUNCTION update_daily_nutrition_summary();
