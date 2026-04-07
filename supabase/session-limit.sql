-- Limit concurrent sessions per user to 5.
-- When a 6th session is created, the oldest is automatically deleted.
-- Run this in the Supabase SQL editor (with service role / admin access).

CREATE OR REPLACE FUNCTION auth.enforce_session_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
DECLARE
  excess INT;
BEGIN
  -- How many sessions does this user have beyond the limit?
  SELECT COUNT(*) - 5 INTO excess
  FROM auth.sessions
  WHERE user_id = NEW.user_id;

  -- Delete that many oldest sessions (usually just 1)
  IF excess > 0 THEN
    DELETE FROM auth.sessions
    WHERE id IN (
      SELECT id
      FROM auth.sessions
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
      LIMIT excess
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop first in case we're re-running
DROP TRIGGER IF EXISTS enforce_session_limit ON auth.sessions;

CREATE TRIGGER enforce_session_limit
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION auth.enforce_session_limit();
