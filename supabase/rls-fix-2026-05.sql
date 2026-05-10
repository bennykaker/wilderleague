-- RLS hardening — 2026-05
-- Run in Supabase SQL editor. Idempotent: drops then recreates each policy.
-- Verifies/locks down every public table flagged by Supabase security linter.
--
-- Service role bypasses RLS automatically — no service_role policies needed.

-- ============================================================
-- PUBLIC GAME DATA: anyone can read
-- ============================================================

alter table public.actors enable row level security;
drop policy if exists "actors_public_read" on public.actors;
drop policy if exists "Anyone can read actors" on public.actors;
drop policy if exists "Service role can modify actors" on public.actors;
create policy "actors_public_read" on public.actors for select using (true);

alter table public.titles enable row level security;
drop policy if exists "titles_public_read" on public.titles;
drop policy if exists "Anyone can read titles" on public.titles;
drop policy if exists "Service role can modify titles" on public.titles;
create policy "titles_public_read" on public.titles for select using (true);

alter table public.roles enable row level security;
drop policy if exists "roles_public_read" on public.roles;
create policy "roles_public_read" on public.roles for select using (true);

alter table public.cast_scores enable row level security;
drop policy if exists "cast_scores_public_read" on public.cast_scores;
drop policy if exists "Anyone can read cast scores" on public.cast_scores;
drop policy if exists "Service role can modify cast scores" on public.cast_scores;
create policy "cast_scores_public_read" on public.cast_scores for select using (true);

-- ============================================================
-- LEADERBOARD: public read intended (username displayed).
-- Inserts/updates go through the /api/submit-cast and /api/score-submission
-- routes via the service client, so no anon write policy is needed.
-- ============================================================

alter table public.submissions enable row level security;
drop policy if exists "submissions_public_read" on public.submissions;
drop policy if exists "Anyone can read submissions" on public.submissions;
drop policy if exists "Authenticated users can submit" on public.submissions;
drop policy if exists "Service role can manage all submissions" on public.submissions;
create policy "submissions_public_read" on public.submissions for select using (true);

-- Hide ip and user_id from anon/authenticated reads. App code never selects
-- them; service role still has full access.
revoke select on public.submissions from anon, authenticated;
grant select (
  id, username, movie_slug, challenge_id, selections, ai_summary,
  is_cursed, curse_reason, green_light_score, quality_score,
  hear_me_out_score, award, scored, created_at
) on public.submissions to anon, authenticated;

-- ============================================================
-- USER-OWNED: own rows only
-- ============================================================

alter table public.saved_casts enable row level security;
drop policy if exists "saved_casts_own_select" on public.saved_casts;
drop policy if exists "saved_casts_own_insert" on public.saved_casts;
drop policy if exists "saved_casts_own_update" on public.saved_casts;
drop policy if exists "saved_casts_own_delete" on public.saved_casts;
drop policy if exists "Users can read own saved casts" on public.saved_casts;
drop policy if exists "Users can insert own saved casts" on public.saved_casts;
drop policy if exists "Users can update own saved casts" on public.saved_casts;
drop policy if exists "Users can delete own saved casts" on public.saved_casts;
drop policy if exists "Service role can manage all saved casts" on public.saved_casts;
create policy "saved_casts_own_select" on public.saved_casts for select using (auth.uid() = user_id);
create policy "saved_casts_own_insert" on public.saved_casts for insert with check (auth.uid() = user_id);
create policy "saved_casts_own_update" on public.saved_casts for update using (auth.uid() = user_id);
create policy "saved_casts_own_delete" on public.saved_casts for delete using (auth.uid() = user_id);

-- votes: only written via /api/vote (service client). No anon policy needed.
alter table public.votes enable row level security;
drop policy if exists "votes_own_all" on public.votes;
drop policy if exists "Users can manage own votes" on public.votes;
drop policy if exists "Service role can manage all votes" on public.votes;

alter table public.profiles enable row level security;
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Service role can do anything" on public.profiles;
create policy "profiles_own_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- Column-level lockdown: authenticated users can only UPDATE the username
-- column. is_member / is_director / stripe_* must go through service role
-- (Stripe webhook, admin routes), preventing self-promotion.
revoke update on public.profiles from authenticated;
grant update (username) on public.profiles to authenticated;

-- ============================================================
-- SUBMISSION FORMS: contain submitter_email. /api/submit-actor and
-- /api/submit-title insert via service client, so no anon policy needed.
-- ============================================================

alter table public.actor_submissions enable row level security;
drop policy if exists "actor_submissions_auth_insert" on public.actor_submissions;
drop policy if exists "Authenticated users can submit actors" on public.actor_submissions;
drop policy if exists "Service role can manage actor submissions" on public.actor_submissions;

alter table public.title_submissions enable row level security;
drop policy if exists "title_submissions_auth_insert" on public.title_submissions;
drop policy if exists "Authenticated users can submit titles" on public.title_submissions;
drop policy if exists "Service role can manage title submissions" on public.title_submissions;

-- ============================================================
-- SERVICE ROLE ONLY (no policies = no anon/auth access; service role bypasses)
-- ============================================================

alter table public.review_usage enable row level security;
drop policy if exists "Service role can manage review usage" on public.review_usage;

alter table public.cast_picks enable row level security;
-- No policies: only service role writes/reads (see app/api/top-picks/route.ts and app/[movie]/page.tsx)
