-- Show all policies on the tables that still have leftovers, plus the
-- tables I hadn't seen before (comments, fan_art, users).
-- Paste output here so we can write proper DROP statements.

select
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expr,
  with_check as check_expr
from pg_policies
where schemaname = 'public'
  and tablename in (
    'actor_submissions',
    'title_submissions',
    'submissions',
    'votes',
    'saved_casts',
    'profiles',
    'comments',
    'fan_art',
    'users'
  )
order by tablename, policyname;
