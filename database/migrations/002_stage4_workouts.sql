-- Stage 4: Workout Engine + Session Tracking
-- Run this in the Supabase SQL Editor after migration 001_stage3_recovery.sql

-- ─── Workouts (templates & generated plans) ───────────────────────────────────

create table if not exists workouts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  split_type        text not null,            -- 'push_pull_legs'|'upper_lower'|'full_body'|'bro_split'|'hybrid'|'custom'
  workout_day       text,                     -- 'push'|'pull'|'legs'|'upper'|'lower'|'A'|'B' etc.
  estimated_duration integer default 60,      -- minutes
  target_muscles    text[] default '{}',
  difficulty_tier   text default 'intermediate', -- 'beginner'|'intermediate'|'advanced'
  generated_by_ai   boolean default false,
  created_at        timestamptz default now()
);

alter table workouts enable row level security;

create policy "users own their workouts"
  on workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Workout Exercises (exercises within a workout template) ──────────────────

create table if not exists workout_exercises (
  id               uuid primary key default gen_random_uuid(),
  workout_id       uuid not null references workouts(id) on delete cascade,
  exercise_id      text not null,             -- maps to lib/muscles/mapping.ts exercise id
  order_index      integer not null default 0,
  target_sets      integer not null default 3,
  target_rep_min   integer not null default 8,
  target_rep_max   integer not null default 12,
  target_rpe       numeric(3,1) default 7.5,
  rest_seconds     integer default 90,
  notes            text,
  progression_type text default 'double_progression' -- 'double_progression'|'linear'|'rpe_based'
);

alter table workout_exercises enable row level security;

create policy "users can manage exercises in their workouts"
  on workout_exercises for all
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

-- ─── Logged Workouts (completed sessions) ─────────────────────────────────────

create table if not exists logged_workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_id      uuid references workouts(id) on delete set null,
  performed_at    timestamptz not null default now(),
  duration_minutes integer,
  workout_rating  integer check (workout_rating between 1 and 5),
  soreness_rating integer check (soreness_rating between 1 and 5),
  energy_rating   integer check (energy_rating between 1 and 5),
  notes           text,
  created_at      timestamptz default now()
);

alter table logged_workouts enable row level security;

create policy "users own their logged workouts"
  on logged_workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Logged Sets (individual set entries) ─────────────────────────────────────

create table if not exists logged_sets (
  id                uuid primary key default gen_random_uuid(),
  logged_workout_id uuid not null references logged_workouts(id) on delete cascade,
  exercise_id       text not null,
  set_number        integer not null,
  reps              integer,
  weight            numeric(7,2),             -- kg
  rpe               numeric(3,1),
  completed         boolean default true,
  failed            boolean default false,
  created_at        timestamptz default now()
);

alter table logged_sets enable row level security;

create policy "users can manage their logged sets"
  on logged_sets for all
  using (
    exists (
      select 1 from logged_workouts lw
      where lw.id = logged_sets.logged_workout_id
        and lw.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from logged_workouts lw
      where lw.id = logged_sets.logged_workout_id
        and lw.user_id = auth.uid()
    )
  );

-- ─── Exercise Performance History ─────────────────────────────────────────────

create table if not exists exercise_performance_history (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  exercise_id            text not null,
  best_weight            numeric(7,2) default 0,
  best_volume            numeric(10,2) default 0,  -- best single-session total volume (sets×reps×weight)
  estimated_1rm          numeric(7,2) default 0,
  rolling_volume_average numeric(10,2) default 0,  -- 4-week rolling avg session volume
  last_performed_at      timestamptz,
  progression_trend      text default 'stable',    -- 'progressing'|'stable'|'regressing'|'deloading'
  updated_at             timestamptz default now(),
  unique (user_id, exercise_id)
);

alter table exercise_performance_history enable row level security;

create policy "users own their performance history"
  on exercise_performance_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_workout_exercises_workout_id on workout_exercises(workout_id);
create index if not exists idx_logged_workouts_user_id on logged_workouts(user_id);
create index if not exists idx_logged_workouts_performed_at on logged_workouts(performed_at desc);
create index if not exists idx_logged_sets_logged_workout_id on logged_sets(logged_workout_id);
create index if not exists idx_exercise_perf_user_exercise on exercise_performance_history(user_id, exercise_id);

-- ─── WGER Exercise API Cache ──────────────────────────────────────────────

create table if not exists wger_exercises (
  id                    uuid primary key default gen_random_uuid(),
  wger_id               integer unique not null,
  name                  text not null,
  description           text,
  equipment_ids         integer[] default '{}',
  muscle_ids            integer[] default '{}',
  secondary_muscle_ids  integer[] default '{}',
  images                jsonb,
  synced_at             timestamptz default now(),
  created_at            timestamptz default now()
);

create index if not exists idx_wger_exercises_name on wger_exercises(name);
create index if not exists idx_wger_exercises_muscles on wger_exercises using gin(muscle_ids);
create index if not exists idx_wger_exercises_synced_at on wger_exercises(synced_at);
