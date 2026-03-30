-- Titles table: movies and TV shows
CREATE TABLE IF NOT EXISTS titles (
  slug text PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'movie', -- 'movie' | 'tv'
  year integer, -- release year (movies) or first air year (TV)
  year_end integer, -- last air year, null if ongoing (TV only)
  tmdb_id text,
  poster_path text,
  backdrop_path text,
  logline text,

  -- Casting budget (used by the game)
  budget integer,

  -- Movie metadata
  production_budget integer,       -- original production budget $M
  production_budget_adjusted integer, -- inflation-adjusted to 2024 $M
  box_office_domestic integer,     -- domestic gross $M
  box_office_worldwide integer,    -- worldwide gross $M
  flop_status text,                -- 'blockbuster' | 'hit' | 'moderate' | 'flop' | 'bomb' | 'cult'
  director text,

  -- TV metadata
  seasons integer,
  episodes integer,
  budget_per_episode numeric,      -- $M per episode
  status text,                     -- 'ended' | 'ongoing'
  showrunner text,
  network text,                    -- 'HBO' | 'AMC' | 'Netflix' | 'NBC' etc.

  -- Shared metadata
  genre_tags text,                 -- comma-separated: 'drama,crime,thriller'
  location_set text,               -- where the story takes place
  location_filmed text,            -- where it was physically filmed
  studio text,                     -- production company
  source_material text,            -- 'original' | 'novel' | 'comic' | 'true story' | 'remake' | 'real events'
  franchise text,                  -- franchise name if part of a series/universe

  -- Critical reception
  rt_score integer,                -- Rotten Tomatoes % (critics)
  awards text,                     -- notable wins: 'Emmy (5), Golden Globe (2)'

  -- Enrichment tracking
  enriched_at date,

  created_at timestamptz DEFAULT now()
);

-- Roles table: cast per title, with season info for TV
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_slug text REFERENCES titles(slug) ON DELETE CASCADE,
  role_name text NOT NULL,
  original_actor text,
  original_actor_image text,
  tier text DEFAULT 'supporting', -- 'first_lead' | 'second_lead' | 'third_lead' | 'supporting'
  seasons_appeared text,           -- e.g. '1-7' or '1,3,5' (TV only)
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roles_title_slug_idx ON roles(title_slug);
CREATE INDEX IF NOT EXISTS roles_display_order_idx ON roles(title_slug, display_order);

-- Enable RLS (read-only for anon, full access for service role)
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "titles_public_read" ON titles FOR SELECT USING (true);
CREATE POLICY "roles_public_read" ON roles FOR SELECT USING (true);
