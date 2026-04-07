-- Member numbers — assigned once when is_member first becomes true.
-- Never revoked even if the subscription lapses.
-- Run this in the Supabase SQL editor, then run scripts/backfill-member-numbers.ts

-- 1. Add column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS member_number INTEGER UNIQUE;

-- 2. Create sequence
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1;

-- 3. Trigger function — fires BEFORE INSERT OR UPDATE
CREATE OR REPLACE FUNCTION assign_member_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_member = TRUE AND NEW.member_number IS NULL THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_member IS NULL OR OLD.is_member = FALSE)) THEN
      NEW.member_number := nextval('member_number_seq');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_assign_member_number ON profiles;
CREATE TRIGGER trg_assign_member_number
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_member_number();
