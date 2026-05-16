-- Stage 11: Reports + Long-term Analytics System
-- Creates: analytics_snapshots
-- Note: weekly/monthly/yearly reports reuse ai_reports (monthly_summary already in CHECK).
--       This migration adds yearly_summary and analytics_snapshot types + analytics_snapshots table.

-- ─── Extend ai_reports report_type check ──────────────────────────────────────
-- Drop old constraint and recreate with expanded types
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_report_type_check;
ALTER TABLE ai_reports ADD CONSTRAINT ai_reports_report_type_check
  CHECK (report_type IN (
    'weekly_summary',
    'monthly_summary',
    'yearly_summary',
    'plateau_explanation',
    'deload_suggestion',
    'program_refinement'
  ));

-- ─── Analytics Snapshots ──────────────────────────────────────────────────────
-- Precomputed trend aggregates for fast report generation.
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_type  TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  snapshot_date  DATE NOT NULL,
  metric_payload JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snapshots_unique
  ON analytics_snapshots (user_id, snapshot_type, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user_type_date
  ON analytics_snapshots (user_id, snapshot_type, snapshot_date DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their analytics_snapshots"
  ON analytics_snapshots FOR ALL USING (auth.uid() = user_id);
