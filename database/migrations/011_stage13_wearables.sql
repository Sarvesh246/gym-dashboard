-- Stage 13: Wearable Integration + Health Data Ingestion System

-- Extend wearable_connections with additional fields for token management
ALTER TABLE IF EXISTS wearable_connections
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP;

-- Add indexes for sync operations
CREATE INDEX IF NOT EXISTS idx_wearable_connections_status ON wearable_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_last_synced ON wearable_connections(last_synced_at);

-- Wearable Sync Logs — track sync history and errors
CREATE TABLE IF NOT EXISTS wearable_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('garmin', 'apple_health', 'fitbit', 'polar', 'wahoo')),
  sync_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMP,
  sync_status TEXT DEFAULT 'in_progress' CHECK (sync_status IN ('in_progress', 'completed', 'failed', 'partial')),
  records_processed INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Normalized Wearable Health Metrics — daily snapshot of health data
CREATE TABLE IF NOT EXISTS wearable_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('garmin', 'apple_health', 'fitbit', 'polar', 'wahoo')),
  sleep_duration NUMERIC,          -- hours (0–12)
  sleep_quality NUMERIC,           -- 0–100 score
  hrv NUMERIC,                     -- bpm (typically 20–200)
  resting_heart_rate NUMERIC,      -- bpm (40–100)
  stress_score NUMERIC,            -- 0–100 scale
  daily_steps INT,
  active_calories INT,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, metric_date, provider)
);

-- Wearable Raw Payloads — optional archival of provider-specific data
CREATE TABLE IF NOT EXISTS wearable_raw_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('garmin', 'apple_health', 'fitbit', 'polar', 'wahoo')),
  payload_type TEXT NOT NULL,      -- e.g., 'sleep', 'heart_rate', 'stress'
  payload_json JSONB NOT NULL,
  imported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wearable_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_raw_payloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "wearable_sync_logs_own" ON wearable_sync_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wearable_health_metrics_own" ON wearable_health_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wearable_raw_payloads_own" ON wearable_raw_payloads FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wearable_sync_logs_user_id ON wearable_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sync_logs_provider ON wearable_sync_logs(provider);
CREATE INDEX IF NOT EXISTS idx_wearable_sync_logs_created ON wearable_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_health_metrics_user_id ON wearable_health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_health_metrics_date ON wearable_health_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_health_metrics_provider ON wearable_health_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_payloads_user_id ON wearable_raw_payloads(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_payloads_provider ON wearable_raw_payloads(provider);
