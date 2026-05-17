-- Stage 15: SaaS Readiness — Multi-Tenant Architecture & Scaling Foundation
-- No billing, no subscriptions, no monetization.
-- Purpose: isolation, scalability, observability, access control.

-- ─────────────────────────────────────────────
-- 1. TENANTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_user_id);

-- ─────────────────────────────────────────────
-- 2. FEATURES (FEATURE FLAGS) TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS features (
  feature_key       TEXT PRIMARY KEY,
  enabled_by_default BOOLEAN NOT NULL DEFAULT TRUE,
  description       TEXT NOT NULL DEFAULT ''
);

-- Seed default features (idempotent)
INSERT INTO features (feature_key, enabled_by_default, description) VALUES
  ('ai_coaching',         TRUE,  'AI-powered coaching insights via Gemini'),
  ('wearable_sync',       TRUE,  'Wearable device integration and data sync'),
  ('advanced_analytics',  TRUE,  'Deep performance analytics and trend analysis'),
  ('body_map',            TRUE,  'Visual muscle group body map tracking'),
  ('export_data',         TRUE,  'Export personal data as CSV/JSON'),
  ('long_term_history',   TRUE,  'Access to historical data beyond 90 days'),
  ('custom_templates',    TRUE,  'Create and manage custom workout templates'),
  ('recovery_engine',     TRUE,  'Recovery readiness and fatigue tracking'),
  ('nutrition_tracking',  TRUE,  'Nutrition and calorie logging'),
  ('reports',             TRUE,  'Weekly, monthly, and yearly reports')
ON CONFLICT (feature_key) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. FEATURE OVERRIDES PER TENANT/USER
-- Allows per-tenant overrides on top of defaults.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- scope: either tenant_id or user_id (one must be set)
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_overrides_scope CHECK (
    (tenant_id IS NOT NULL) OR (user_id IS NOT NULL)
  ),
  UNIQUE(tenant_id, feature_key),
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_user ON feature_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_tenant ON feature_overrides(tenant_id);

-- ─────────────────────────────────────────────
-- 4. USAGE EVENTS TABLE
-- Tracks system usage for scaling + observability (NOT monetization).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant ON usage_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type, created_at DESC);

-- ─────────────────────────────────────────────
-- 5. ANALYTICS EVENTS TABLE
-- Internal product telemetry — feature adoption + behavior patterns.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  event_name      TEXT NOT NULL,
  properties_json JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, created_at DESC);

-- ─────────────────────────────────────────────
-- 6. RATE LIMIT STATE TABLE
-- Sliding-window state for soft rate limiting.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,      -- e.g. "ai_insights:user_abc123"
  count      INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, bucket_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_buckets(user_id, bucket_key);

-- ─────────────────────────────────────────────
-- 7. ADMIN AUDIT LOG TABLE
-- Tracks admin actions for accountability.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,               -- 'feature', 'user', 'tenant'
  target_id   TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 8. RLS POLICIES
-- ─────────────────────────────────────────────

-- Tenants: only owner can read/update their tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_owner ON tenants
  USING (owner_user_id = auth.uid());

-- Feature overrides: users see only their own overrides
ALTER TABLE feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY feature_overrides_user ON feature_overrides
  USING (user_id = auth.uid());

-- Usage events: users see only their own
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_events_user ON usage_events
  USING (user_id = auth.uid());

-- Analytics events: users see only their own
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_events_user ON analytics_events
  USING (user_id = auth.uid());

-- Rate limit buckets: users see only their own
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limit_user ON rate_limit_buckets
  USING (user_id = auth.uid());

-- Admin audit logs: no user-level access (admin only via service role)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_audit_deny ON admin_audit_logs USING (FALSE);

-- Features table: public read, no user write
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
CREATE POLICY features_read ON features FOR SELECT USING (TRUE);
