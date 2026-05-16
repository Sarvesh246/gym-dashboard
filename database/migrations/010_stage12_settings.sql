-- Stage 12: Settings + Personalization Control System

-- User Preferences (theme, UI settings, measurement system)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  reduced_motion BOOLEAN DEFAULT FALSE,
  measurement_system TEXT DEFAULT 'imperial' CHECK (measurement_system IN ('metric', 'imperial')),
  dashboard_layout TEXT DEFAULT 'standard' CHECK (dashboard_layout IN ('standard', 'compact', 'expanded')),
  dashboard_cards JSONB DEFAULT '[]'::jsonb,
  notification_preferences JSONB DEFAULT '{
    "workout_reminders": true,
    "nutrition_reminders": false,
    "recovery_warnings": true,
    "weekly_reports": true,
    "hydration_reminders": false,
    "streak_reminders": true,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00"
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Training Preferences (personalization for workout behavior)
CREATE TABLE IF NOT EXISTS training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progression_aggressiveness TEXT DEFAULT 'balanced' CHECK (progression_aggressiveness IN ('conservative', 'balanced', 'aggressive')),
  training_bias TEXT DEFAULT 'balanced' CHECK (training_bias IN ('aesthetics', 'strength', 'endurance', 'recovery', 'balanced')),
  hypertrophy_emphasis NUMERIC DEFAULT 0.33 CHECK (hypertrophy_emphasis >= 0 AND hypertrophy_emphasis <= 1),
  strength_emphasis NUMERIC DEFAULT 0.33 CHECK (strength_emphasis >= 0 AND strength_emphasis <= 1),
  cardio_emphasis NUMERIC DEFAULT 0.34 CHECK (cardio_emphasis >= 0 AND cardio_emphasis <= 1),
  workout_split TEXT DEFAULT 'push_pull_legs' CHECK (workout_split IN ('push_pull_legs', 'upper_lower', 'full_body', 'balanced')),
  session_duration_preference INT DEFAULT 60 CHECK (session_duration_preference >= 30 AND session_duration_preference <= 120),
  training_intensity_preference TEXT DEFAULT 'balanced' CHECK (training_intensity_preference IN ('light', 'balanced', 'intense')),
  conservative_mode_enabled BOOLEAN DEFAULT FALSE,
  fatigue_sensitivity NUMERIC DEFAULT 1.0 CHECK (fatigue_sensitivity >= 0.5 AND fatigue_sensitivity <= 2.0),
  soreness_sensitivity NUMERIC DEFAULT 1.0 CHECK (soreness_sensitivity >= 0.5 AND soreness_sensitivity <= 2.0),
  deload_preference TEXT DEFAULT 'auto' CHECK (deload_preference IN ('auto', 'manual', 'conservative')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Recovery Preferences
CREATE TABLE IF NOT EXISTS recovery_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_sensitivity TEXT DEFAULT 'balanced' CHECK (recovery_sensitivity IN ('low', 'balanced', 'high')),
  sleep_weighting NUMERIC DEFAULT 0.35 CHECK (sleep_weighting >= 0 AND sleep_weighting <= 1),
  soreness_weighting NUMERIC DEFAULT 0.35 CHECK (soreness_weighting >= 0 AND soreness_weighting <= 1),
  hrv_weighting NUMERIC DEFAULT 0.30 CHECK (hrv_weighting >= 0 AND hrv_weighting <= 1),
  readiness_strictness TEXT DEFAULT 'balanced' CHECK (readiness_strictness IN ('lenient', 'balanced', 'strict')),
  athlete_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Nutrition Preferences
CREATE TABLE IF NOT EXISTS nutrition_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_strategy TEXT DEFAULT 'maintenance' CHECK (calorie_strategy IN ('deficit', 'maintenance', 'surplus')),
  macro_strategy TEXT DEFAULT 'balanced' CHECK (macro_strategy IN ('high_protein', 'low_carb', 'balanced', 'keto')),
  hydration_target INT DEFAULT 3000 CHECK (hydration_target >= 1000 AND hydration_target <= 5000),
  meal_reminder_frequency TEXT DEFAULT 'thrice_daily' CHECK (meal_reminder_frequency IN ('none', 'once_daily', 'twice_daily', 'thrice_daily')),
  nutrition_adherence_strictness TEXT DEFAULT 'flexible' CHECK (nutrition_adherence_strictness IN ('flexible', 'balanced', 'strict')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Wearable Connections
CREATE TABLE IF NOT EXISTS wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('garmin', 'apple_health', 'fitbit', 'polar', 'wahoo')),
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'expired')),
  access_token TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  data_visibility_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Notification Preferences (expanded)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_reminders BOOLEAN DEFAULT TRUE,
  missed_workout_reminders BOOLEAN DEFAULT TRUE,
  hydration_reminders BOOLEAN DEFAULT FALSE,
  recovery_warnings BOOLEAN DEFAULT TRUE,
  nutrition_alerts BOOLEAN DEFAULT FALSE,
  weekly_report_notifications BOOLEAN DEFAULT TRUE,
  streak_milestones BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  notification_frequency TEXT DEFAULT 'normal' CHECK (notification_frequency IN ('minimal', 'normal', 'frequent')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Data Export Requests (for GDPR compliance)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL CHECK (export_format IN ('json', 'csv')),
  data_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_url TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Enable RLS on all new tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY "user_preferences_own" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "training_preferences_own" ON training_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "recovery_preferences_own" ON recovery_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "nutrition_preferences_own" ON nutrition_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wearable_connections_own" ON wearable_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_own" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "data_export_requests_own" ON data_export_requests FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_training_preferences_user_id ON training_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_preferences_user_id ON recovery_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_preferences_user_id ON nutrition_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_id ON wearable_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
