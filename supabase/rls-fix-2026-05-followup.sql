-- Followup cleanup. Run after rls-fix-2026-05.sql.
-- Removes dangerous policies created via the Supabase Studio UI that were
-- applied to the {public} role instead of {service_role}, and tightens up.

-- ============================================================
-- CRITICAL: dangerous policies granting ALL/INSERT to {public}
-- ============================================================

drop policy if exists "Service role full access" on public.actor_submissions;
drop policy if exists "Service role full access" on public.title_submissions;
drop policy if exists "submissions_insert" on public.submissions;
drop policy if exists "votes_insert" on public.votes;

-- ============================================================
-- Redundant / no-longer-needed policies (writes now go via service client)
-- ============================================================

drop policy if exists "submissions_auth_insert" on public.submissions;
drop policy if exists "submissions_own_update" on public.submissions;
drop policy if exists "submissions_own_delete" on public.submissions;
drop policy if exists "submissions_read" on public.submissions;
drop policy if exists "votes_auth_insert" on public.votes;
drop policy if exists "votes_own_delete" on public.votes;
drop policy if exists "votes_read" on public.votes;
drop policy if exists "Users can manage their own casts" on public.saved_casts;
drop policy if exists "profiles_own_read" on public.profiles;

-- ============================================================
-- votes: votes_public_read stays (the embedded read in /api/casts/[movie]
-- needs SELECT on votes). Hide voter identity via column grant.
-- ============================================================

revoke select on public.votes from anon, authenticated;
grant select (submission_id, value) on public.votes to anon, authenticated;

-- ============================================================
-- fan_art: enable RLS. No policies => fully locked down. Add policies
-- once we know what this table is for.
-- ============================================================

alter table public.fan_art enable row level security;
