-- Adds optional elevator pitch to saved casts.
-- Run in Supabase SQL editor.

ALTER TABLE saved_casts
  ADD COLUMN IF NOT EXISTS pitch TEXT;
