-- Stage 10: AI Coaching + Weekly Analytics System
-- Creates: ai_reports, ai_events, plateau_events

-- ─── AI Reports ───────────────────────────────────────────────────────────────
-- Stores generated coaching summaries. Cached to avoid redundant Gemini calls.
CREATE TABLE IF NOT EXISTS ai_reports (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type      TEXT NOT NULL CHECK (report_type IN ('weekly_summary', 'plateau_explanation', 'deload_suggestion', 'program_refinement', 'monthly_summary')),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start     DATE,
  period_end       DATE,
  summary          TEXT NOT NULL,
  insights         JSONB NOT NULL DEFAULT '[]',
  recommendations  JSONB NOT NULL DEFAULT '[]',
  compressed_context JSONB,
  trigger_reason   TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_cached        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_type_date
  ON ai_reports (user_id, report_type, generated_at DESC);

-- ─── AI Events ────────────────────────────────────────────────────────────────
-- Tracks what triggered an AI generation. Prevents duplicate runs.
CREATE TABLE IF NOT EXISTS ai_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('weekly_report_ready', 'plateau_detected', 'recovery_decline', 'failed_progression', 'imbalance_threshold', 'nutrition_collapse', 'performance_shift', 'deload_threshold')),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolved_status IN ('pending', 'processed', 'dismissed')),
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_events_user_event_date
  ON ai_events (user_id, event_type, detected_at DESC);

-- ─── Plateau Events ───────────────────────────────────────────────────────────
-- Deterministically detected plateaus (AI only explains them).
CREATE TABLE IF NOT EXISTS plateau_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  plateau_type    TEXT NOT NULL CHECK (plateau_type IN ('strength', 'bodyweight', 'recovery', 'progression')),
  affected_metric TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')) DEFAULT 'mild',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  duration_weeks  INTEGER DEFAULT 1,
  context         JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_plateau_events_user_status
  ON plateau_events (user_id, status, detected_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE ai_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plateau_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their ai_reports"
  ON ai_reports FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their ai_events"
  ON ai_events FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their plateau_events"
  ON plateau_events FOR ALL USING (auth.uid() = user_id);
