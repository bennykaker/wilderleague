-- Add universe_tags column to actors table
ALTER TABLE actors ADD COLUMN IF NOT EXISTS universe_tags text;

-- Index for challenge filtering
CREATE INDEX IF NOT EXISTS actors_universe_tags_idx ON actors USING gin(to_tsvector('english', coalesce(universe_tags, '')));
