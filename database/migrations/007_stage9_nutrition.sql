-- Stage 9: Nutrition Engine + Hydration Tracking Extension

-- Dedicated hydration logs table (lightweight, fast writes)
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml NUMERIC(10, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date
  ON hydration_logs (user_id, logged_at);

-- RLS
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hydration logs"
  ON hydration_logs FOR ALL
  USING (auth.uid() = user_id);

-- Custom foods table (user-created food entries)
CREATE TABLE IF NOT EXISTS custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  calories_per_serving NUMERIC(10, 2) NOT NULL DEFAULT 0,
  protein_g NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(10, 2) DEFAULT 0,
  sugar_g NUMERIC(10, 2) DEFAULT 0,
  sodium_mg NUMERIC(10, 2) DEFAULT 0,
  serving_size NUMERIC(10, 2) NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_foods_user
  ON custom_foods (user_id);

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom foods"
  ON custom_foods FOR ALL
  USING (auth.uid() = user_id);

-- Update daily_nutrition_summary to track hydration from dedicated table
-- (existing hydration_ml column remains for backward compat with nutrition_logs)

-- Add nutrition_recovery_modifier column to systemic_recovery if not exists
ALTER TABLE systemic_recovery
  ADD COLUMN IF NOT EXISTS nutrition_modifier NUMERIC(5, 2) DEFAULT 0;
