-- Stage 13 Phase 4: Training API Integration
-- Add training-specific metrics to support Garmin Training API

-- Extend wearable_connections OAuth scope to include TRAINING READ
-- (Note: This is a code-level change in services/wearables/garmin.ts)

-- Add Training API metrics to wearable_health_metrics table
ALTER TABLE IF EXISTS wearable_health_metrics
ADD COLUMN IF NOT EXISTS vo2_max NUMERIC,                -- ml/kg/min (aerobic capacity estimate)
ADD COLUMN IF NOT EXISTS training_load NUMERIC,          -- 1–100 scale (current training stress)
ADD COLUMN IF NOT EXISTS recovery_status TEXT CHECK (recovery_status IN ('low', 'moderate', 'high'));

-- Create index for training metrics lookup
CREATE INDEX IF NOT EXISTS idx_wearable_health_metrics_training_load ON wearable_health_metrics(training_load DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_health_metrics_recovery ON wearable_health_metrics(recovery_status);
