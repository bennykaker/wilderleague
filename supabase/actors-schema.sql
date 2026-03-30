-- Migration: actors table
-- Run in Supabase SQL editor

create table if not exists actors (
  id uuid primary key default gen_random_uuid(),
  tmdb_id text unique,
  name text not null,
  headshot_url text not null default '',
  popularity numeric not null default 0,
  cost integer not null default 3,
  gender text not null default '',
  birth_year text not null default '',
  biography text not null default '',
  known_for text not null default '',
  keywords text not null default '',
  notes text not null default '',
  archetype text,
  strengths text,
  weaknesses text,
  best_cast_as text,
  signature_quality text,
  career_stage text,
  casting_profile text,
  deep_dive_date text,
  nationality text,
  salary_estimate numeric,
  salary_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists actors_popularity_idx on actors (popularity desc);
create index if not exists actors_cost_idx on actors (cost);
create index if not exists actors_gender_idx on actors (gender);
create index if not exists actors_career_stage_idx on actors (career_stage);
create index if not exists actors_name_idx on actors (name);

-- Full text search
create index if not exists actors_fts_idx on actors
  using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(known_for,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(biography,'')));

-- RLS: public read, service role write
alter table actors enable row level security;

create policy "Anyone can read actors"
  on actors for select
  using (true);

create policy "Service role can modify actors"
  on actors for all
  using (true)
  with check (true);
