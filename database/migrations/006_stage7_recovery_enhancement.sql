-- ============================================================
-- Stage 7: Recovery Engine Enhancement + Health Data Ingestion
-- Adds daily health metrics, recovery snapshots, recovery notes,
-- and alerts system for comprehensive readiness intelligence.
-- Run this migration in your Supabase SQL Editor.
-- ============================================================

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE recovery_tier_enum AS ENUM ('green', 'yellow', 'orange', 'red');

CREATE TYPE training_rec_enum AS ENUM (
  'full_intensity',
  'moderate_intensity',
  'reduced_volume',
  'active_recovery',
  'rest'
);

CREATE TYPE recovery_alert_type_enum AS ENUM (
  'readiness_drop',
  'high_fatigue',
  'deload_recommended',
  'training_suppressed',
  'recovery_spike',
  'injury_flag'
);

CREATE TYPE alert_severity_enum AS ENUM ('info', 'caution', 'warning');

-- ─── daily_health_metrics ─────────────────────────────────────────────────────
-- User-loggable daily health snapshot (sleep, HRV, stress, etc.)
-- Provides real data for readiness calculation instead of profile-only fallbacks

CREATE TABLE IF NOT EXISTS daily_health_metrics (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Sleep data (nullable — falls back to profile if not logged)
  sleep_hours DECIMAL(3,1),
  sleep_quality SMALLINT,  -- 1-10 Likert scale

  -- Biometric data (nullable — for wearable sync)
  resting_heart_rate SMALLINT,  -- bpm
  hrv_score SMALLINT,  -- 0-100 normalized

  -- Subjective/contextual data
  stress_level SMALLINT,  -- 1-10 Likert scale
  hydration_score SMALLINT,  -- 0-100

  -- User feedback (JSON structures)
  soreness_report JSONB,  -- { "muscle_group": 1-10, ... }
  injury_flags JSONB,  -- [ { "muscle_group": "...", "note": "...", "since_date": "..." }, ... ]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, date),
  CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 16)),
  CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 10)),
  CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 10)),
  CHECK (hrv_score IS NULL OR (hrv_score >= 0 AND hrv_score <= 100)),
  CHECK (hydration_score IS NULL OR (hydration_score >= 0 AND hydration_score <= 100)),
  CHECK (resting_heart_rate IS NULL OR (resting_heart_rate >= 30 AND resting_heart_rate <= 200))
);

CREATE INDEX idx_daily_health_metrics_user_date ON daily_health_metrics(user_id, date DESC);

-- Enable RLS
ALTER TABLE daily_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_health_metrics_user_own ON daily_health_metrics
  FOR ALL USING (auth.uid() = user_id);

-- ─── recovery_snapshots ───────────────────────────────────────────────────────
-- Daily persistence of computed readiness state for trend analysis
-- Allows fast historical queries without recalculating strain from scratch

CREATE TABLE IF NOT EXISTS recovery_snapshots (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Computed scores at time of snapshot
  readiness_score SMALLINT,  -- 0-100
  systemic_fatigue SMALLINT,  -- 0-100
  avg_muscle_recovery SMALLINT,  -- 0-100

  -- Classification
  recovery_tier recovery_tier_enum,
  training_recommendation training_rec_enum,

  -- Weekly metrics snapshot
  weekly_strain_accumulation DECIMAL(7,2),  -- 7-day rolling sum

  -- Suppressors active on this day
  key_suppressors TEXT[],  -- [ 'poor_sleep', 'high_stress', 'high_fatigue', ... ]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_recovery_snapshots_user_date ON recovery_snapshots(user_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE recovery_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_snapshots_user_own ON recovery_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- ─── recovery_notes ───────────────────────────────────────────────────────────
-- User-logged recovery feedback: soreness, injuries, movement restrictions

CREATE TABLE IF NOT EXISTS recovery_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,

  -- Muscle-specific feedback
  muscle_group TEXT NOT NULL,
  soreness_level SMALLINT,  -- 1-10 (1=none, 10=unbearable)

  -- Contextual details
  movement_restriction TEXT,  -- "shoulder abduction", "knee extension", etc.
  notes TEXT,  -- free-form: "tight after deadlifts", "rolling helps", etc.

  -- Classification
  is_injury BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CHECK (soreness_level IS NULL OR (soreness_level >= 1 AND soreness_level <= 10))
);

CREATE INDEX idx_recovery_notes_user_date ON recovery_notes(user_id, note_date DESC);
CREATE INDEX idx_recovery_notes_is_injury ON recovery_notes(user_id, is_injury) WHERE is_injury = TRUE;

-- Enable RLS
ALTER TABLE recovery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_notes_user_own ON recovery_notes
  FOR ALL USING (auth.uid() = user_id);

-- ─── recovery_alerts ──────────────────────────────────────────────────────────
-- System-generated alerts for readiness changes, fatigue, deload recommendations, etc.
-- Users can dismiss alerts to manage dashboard clutter

CREATE TABLE IF NOT EXISTS recovery_alerts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_date DATE NOT NULL,

  -- Alert classification
  alert_type recovery_alert_type_enum,
  severity alert_severity_enum,

  -- Message content
  message TEXT NOT NULL,

  -- Muscle-specific context (if applicable)
  muscle_specific TEXT[],

  -- Dismissal state
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CHECK (NOT (dismissed = FALSE AND dismissed_at IS NOT NULL)),
  CHECK (NOT (dismissed = TRUE AND dismissed_at IS NULL))
);

CREATE INDEX idx_recovery_alerts_user_active ON recovery_alerts(user_id, dismissed) WHERE dismissed = FALSE;
CREATE INDEX idx_recovery_alerts_user_date ON recovery_alerts(user_id, alert_date DESC);

-- Enable RLS
ALTER TABLE recovery_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_alerts_user_own ON recovery_alerts
  FOR ALL USING (auth.uid() = user_id);

-- ─── Add ENUM types to systemic_recovery (if not already present) ──────────────
-- Migration 001 creates systemic_recovery with recovery_tier as TEXT
-- This ensures enum support going forward

DO $$ BEGIN
  BEGIN
    -- Alter existing systemic_recovery recovery_tier column to use enum
    -- This is safe if migration 001 already set it as TEXT
    ALTER TABLE systemic_recovery
      ALTER COLUMN recovery_tier TYPE recovery_tier_enum USING recovery_tier::recovery_tier_enum;
  EXCEPTION WHEN others THEN
    -- Column might already be enum or might not exist, silently continue
    NULL;
  END;
END $$;

-- ─── Add training_recommendation to systemic_recovery (if not already present) ─
-- This tracks the current training recommendation state
DO $$ BEGIN
  BEGIN
    ALTER TABLE systemic_recovery
      ADD COLUMN training_recommendation training_rec_enum DEFAULT 'moderate_intensity';
  EXCEPTION WHEN duplicate_column THEN
    -- Column already exists, silently continue
    NULL;
  END;
END $$;

-- ─── Summary ──────────────────────────────────────────────────────────────────
-- This migration creates the infrastructure for:
-- 1. Daily health metric logging (sleep, HRV, stress, soreness, injuries)
-- 2. Historical recovery snapshots for trend analysis
-- 3. User recovery feedback and injury flagging
-- 4. Automated alert generation and dismissal
--
-- All tables enforce RLS to ensure user data isolation.
-- Indexes optimize common queries (user + date range lookups).
-- Constraints validate data ranges and relationships.
