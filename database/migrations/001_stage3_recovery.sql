-- ============================================================
-- Stage 3: Recovery Engine + Muscle Intelligence
-- Run this migration in your Supabase SQL Editor.
-- ============================================================

-- ─── exercise_library ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercise_library (
  id                     TEXT         PRIMARY KEY,
  name                   TEXT         NOT NULL,
  equipment              TEXT[]       NOT NULL DEFAULT '{}',
  movement_pattern       TEXT         NOT NULL,
  primary_muscles        TEXT[]       NOT NULL DEFAULT '{}',
  secondary_muscles      TEXT[]       NOT NULL DEFAULT '{}',
  fatigue_factor         NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  hypertrophy_weighting  NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  systemic_fatigue_factor NUMERIC(4,3) NOT NULL DEFAULT 0.3,
  cns_fatigue_factor     NUMERIC(4,3) NOT NULL DEFAULT 0.2
);

-- Seed exercise_library with core movements
INSERT INTO exercise_library (id, name, equipment, movement_pattern, primary_muscles, secondary_muscles, fatigue_factor, hypertrophy_weighting, systemic_fatigue_factor, cns_fatigue_factor)
VALUES
  ('barbell_bench_press', 'Barbell Bench Press',   ARRAY['barbell','bench'],         'horizontal_push', ARRAY['chest'],                        ARRAY['front_delts','triceps'],              0.80, 0.85, 0.55, 0.50),
  ('dumbbell_bench_press','Dumbbell Bench Press',  ARRAY['dumbbell','bench'],         'horizontal_push', ARRAY['chest'],                        ARRAY['front_delts','triceps'],              0.70, 0.88, 0.45, 0.40),
  ('incline_barbell_press','Incline Barbell Press',ARRAY['barbell','bench'],          'horizontal_push', ARRAY['upper_chest'],                  ARRAY['chest','front_delts','triceps'],       0.75, 0.82, 0.50, 0.45),
  ('incline_dumbbell_press','Incline Dumbbell Press',ARRAY['dumbbell','bench'],       'horizontal_push', ARRAY['upper_chest'],                  ARRAY['chest','front_delts','triceps'],       0.65, 0.85, 0.40, 0.38),
  ('push_up',            'Push-Up',                ARRAY['bodyweight'],               'horizontal_push', ARRAY['chest'],                        ARRAY['front_delts','triceps','core'],        0.40, 0.60, 0.25, 0.20),
  ('cable_fly',          'Cable Fly',              ARRAY['cable'],                    'isolation_push',  ARRAY['chest'],                        ARRAY['front_delts'],                        0.45, 0.90, 0.20, 0.18),
  ('barbell_row',        'Barbell Row',            ARRAY['barbell'],                  'horizontal_pull', ARRAY['upper_back','lats'],            ARRAY['biceps','rear_delts','traps'],         0.80, 0.82, 0.55, 0.50),
  ('dumbbell_row',       'Dumbbell Row',           ARRAY['dumbbell'],                 'horizontal_pull', ARRAY['upper_back','lats'],            ARRAY['biceps','rear_delts'],                 0.65, 0.80, 0.40, 0.38),
  ('cable_row',          'Seated Cable Row',       ARRAY['cable'],                    'horizontal_pull', ARRAY['upper_back'],                   ARRAY['lats','biceps','rear_delts'],          0.55, 0.82, 0.32, 0.28),
  ('face_pull',          'Face Pull',              ARRAY['cable'],                    'isolation_pull',  ARRAY['rear_delts'],                   ARRAY['traps','upper_back'],                  0.35, 0.75, 0.15, 0.12),
  ('overhead_press',     'Overhead Press',         ARRAY['barbell'],                  'vertical_push',   ARRAY['front_delts','side_delts'],     ARRAY['triceps','traps','upper_chest'],       0.78, 0.80, 0.52, 0.48),
  ('dumbbell_shoulder_press','DB Shoulder Press',  ARRAY['dumbbell'],                 'vertical_push',   ARRAY['front_delts','side_delts'],     ARRAY['triceps'],                             0.62, 0.80, 0.40, 0.38),
  ('lateral_raise',      'Lateral Raise',          ARRAY['dumbbell','cable'],         'isolation_push',  ARRAY['side_delts'],                   ARRAY['traps'],                               0.30, 0.85, 0.12, 0.10),
  ('pull_up',            'Pull-Up',                ARRAY['pull_up_bar'],              'vertical_pull',   ARRAY['lats'],                         ARRAY['biceps','upper_back','rear_delts'],    0.70, 0.85, 0.42, 0.40),
  ('lat_pulldown',       'Lat Pulldown',           ARRAY['cable'],                    'vertical_pull',   ARRAY['lats'],                         ARRAY['biceps','upper_back'],                 0.55, 0.83, 0.32, 0.28),
  ('barbell_back_squat', 'Barbell Back Squat',     ARRAY['barbell','squat_rack'],     'squat',           ARRAY['quads','glutes'],               ARRAY['hamstrings','core','lower_back'],      0.95, 0.88, 0.80, 0.88),
  ('front_squat',        'Front Squat',            ARRAY['barbell','squat_rack'],     'squat',           ARRAY['quads'],                        ARRAY['glutes','core','upper_back'],          0.88, 0.85, 0.75, 0.82),
  ('goblet_squat',       'Goblet Squat',           ARRAY['dumbbell','kettlebell'],    'squat',           ARRAY['quads','glutes'],               ARRAY['core'],                                0.55, 0.72, 0.38, 0.35),
  ('leg_press',          'Leg Press',              ARRAY['leg_press_machine'],        'squat',           ARRAY['quads','glutes'],               ARRAY['hamstrings'],                          0.72, 0.80, 0.45, 0.40),
  ('leg_extension',      'Leg Extension',          ARRAY['leg_extension_machine'],    'isolation_push',  ARRAY['quads'],                        ARRAY[]::TEXT[],                              0.38, 0.78, 0.18, 0.15),
  ('conventional_deadlift','Conventional Deadlift',ARRAY['barbell'],                  'hinge',           ARRAY['hamstrings','glutes','lower_back'],ARRAY['quads','traps','forearms','upper_back'],1.00,0.80,1.00, 1.00),
  ('romanian_deadlift',  'Romanian Deadlift',      ARRAY['barbell','dumbbell'],       'hinge',           ARRAY['hamstrings','glutes'],          ARRAY['lower_back','upper_back'],             0.82, 0.88, 0.70, 0.72),
  ('hip_thrust',         'Hip Thrust',             ARRAY['barbell','bench'],          'hinge',           ARRAY['glutes'],                       ARRAY['hamstrings'],                          0.68, 0.92, 0.48, 0.50),
  ('leg_curl',           'Leg Curl',               ARRAY['leg_curl_machine'],         'isolation_pull',  ARRAY['hamstrings'],                   ARRAY[]::TEXT[],                              0.40, 0.80, 0.20, 0.18),
  ('tricep_pushdown',    'Tricep Pushdown',        ARRAY['cable'],                    'isolation_push',  ARRAY['triceps'],                      ARRAY[]::TEXT[],                              0.28, 0.80, 0.10, 0.10),
  ('skull_crusher',      'Skull Crusher',          ARRAY['barbell','dumbbell'],       'isolation_push',  ARRAY['triceps'],                      ARRAY[]::TEXT[],                              0.35, 0.85, 0.14, 0.12),
  ('calf_raise',         'Calf Raise',             ARRAY['machine','bodyweight'],     'isolation_push',  ARRAY['calves'],                       ARRAY[]::TEXT[],                              0.28, 0.78, 0.10, 0.08),
  ('barbell_curl',       'Barbell Curl',           ARRAY['barbell'],                  'isolation_pull',  ARRAY['biceps'],                       ARRAY['forearms'],                            0.30, 0.82, 0.12, 0.10),
  ('dumbbell_curl',      'Dumbbell Curl',          ARRAY['dumbbell'],                 'isolation_pull',  ARRAY['biceps'],                       ARRAY['forearms'],                            0.28, 0.82, 0.10, 0.09),
  ('hammer_curl',        'Hammer Curl',            ARRAY['dumbbell'],                 'isolation_pull',  ARRAY['biceps'],                       ARRAY['forearms'],                            0.28, 0.78, 0.10, 0.09),
  ('rear_delt_fly',      'Rear Delt Fly',          ARRAY['dumbbell','cable'],         'isolation_pull',  ARRAY['rear_delts'],                   ARRAY['upper_back'],                          0.28, 0.78, 0.10, 0.08),
  ('plank',              'Plank',                  ARRAY['bodyweight'],               'core',            ARRAY['core'],                         ARRAY[]::TEXT[],                              0.20, 0.50, 0.10, 0.08),
  ('ab_rollout',         'Ab Rollout',             ARRAY['ab_wheel'],                 'core',            ARRAY['core'],                         ARRAY['lats','triceps'],                      0.38, 0.75, 0.18, 0.15),
  ('cable_crunch',       'Cable Crunch',           ARRAY['cable'],                    'core',            ARRAY['core'],                         ARRAY[]::TEXT[],                              0.30, 0.78, 0.12, 0.10),
  ('treadmill_run',      'Treadmill Run',          ARRAY['treadmill'],                'cardio',          ARRAY['quads','hamstrings','calves'],   ARRAY['glutes','core'],                       0.35, 0.20, 0.30, 0.15),
  ('stationary_bike',    'Stationary Bike',        ARRAY['bike'],                     'cardio',          ARRAY['quads','hamstrings'],            ARRAY['calves','glutes'],                     0.25, 0.18, 0.22, 0.10)
ON CONFLICT (id) DO NOTHING;

-- ─── muscle_states ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS muscle_states (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muscle_group        TEXT         NOT NULL,
  recovery_score      NUMERIC(5,2) NOT NULL DEFAULT 100,
  fatigue_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  strain_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  soreness_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  readiness_modifier  NUMERIC(4,2) NOT NULL DEFAULT 0,
  last_trained_at     TIMESTAMPTZ  NULL,
  weekly_volume       INTEGER      NOT NULL DEFAULT 0,
  weekly_frequency    INTEGER      NOT NULL DEFAULT 0,
  hypertrophy_load    NUMERIC(10,2) NOT NULL DEFAULT 0,
  imbalance_flag      BOOLEAN      NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, muscle_group)
);

CREATE INDEX IF NOT EXISTS idx_muscle_states_user ON muscle_states(user_id);
CREATE INDEX IF NOT EXISTS idx_muscle_states_updated ON muscle_states(updated_at);

-- ─── systemic_recovery ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS systemic_recovery (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  readiness_score      NUMERIC(5,2) NOT NULL DEFAULT 70,
  systemic_fatigue     NUMERIC(5,2) NOT NULL DEFAULT 30,
  sleep_modifier       NUMERIC(5,2) NOT NULL DEFAULT 0,
  stress_modifier      NUMERIC(5,2) NOT NULL DEFAULT 0,
  hrv_modifier         NUMERIC(5,2) NOT NULL DEFAULT 0,
  strain_accumulation  NUMERIC(8,2) NOT NULL DEFAULT 0,
  recovery_trend       NUMERIC(5,2) NOT NULL DEFAULT 0,
  recovery_tier        TEXT         NOT NULL DEFAULT 'yellow',
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_systemic_recovery_user ON systemic_recovery(user_id);

-- ─── workout_strain_logs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_strain_logs (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id          TEXT         NOT NULL,
  total_volume        NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_strain    NUMERIC(5,2) NOT NULL DEFAULT 0,
  systemic_load       NUMERIC(5,2) NOT NULL DEFAULT 0,
  cns_load            NUMERIC(5,2) NOT NULL DEFAULT 0,
  local_muscle_loads  JSONB        NOT NULL DEFAULT '{}',
  recovery_impact     NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strain_logs_user ON workout_strain_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_strain_logs_created ON workout_strain_logs(created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE muscle_states        ENABLE ROW LEVEL SECURITY;
ALTER TABLE systemic_recovery    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_strain_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library     ENABLE ROW LEVEL SECURITY;

-- muscle_states: users own their rows
CREATE POLICY "Users manage own muscle states"
  ON muscle_states FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- systemic_recovery: users own their row
CREATE POLICY "Users manage own systemic recovery"
  ON systemic_recovery FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_strain_logs: users own their rows
CREATE POLICY "Users manage own strain logs"
  ON workout_strain_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exercise_library: public read, no write from client
CREATE POLICY "Exercise library is public read"
  ON exercise_library FOR SELECT
  USING (TRUE);
