-- Stage 13 Phase 5: Add missing activity_level column to wearable_health_metrics
-- Services/wearables/normalizer.ts produces this metric (Garmin sync) and
-- services/wearables/index.ts::storeHealthMetrics writes it on every upsert.
-- Without this column, every sync upsert raised "column does not exist" and
-- silently failed all wearable data persistence.

ALTER TABLE IF EXISTS wearable_health_metrics
ADD COLUMN IF NOT EXISTS activity_level NUMERIC; -- 0–100 normalized activity intensity
