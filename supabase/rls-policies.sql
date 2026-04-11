-- RLS policies for all public tables
-- Run in Supabase SQL editor

-- ============================================================
-- titles: public read, service role write
-- ============================================================
alter table titles enable row level security;

create policy "Anyone can read titles"
  on titles for select using (true);

create policy "Service role can modify titles"
  on titles for all using (true) with check (true);

-- ============================================================
-- cast_scores: public read (cached scores), service role write
-- ============================================================
alter table cast_scores enable row level security;

create policy "Anyone can read cast scores"
  on cast_scores for select using (true);

create policy "Service role can modify cast scores"
  on cast_scores for all using (true) with check (true);

-- ============================================================
-- review_usage: service role only (rate limiting data)
-- ============================================================
alter table review_usage enable row level security;

create policy "Service role can manage review usage"
  on review_usage for all using (true) with check (true);

-- ============================================================
-- saved_casts: users can read/write their own, service role all
-- ============================================================
alter table saved_casts enable row level security;

create policy "Users can read own saved casts"
  on saved_casts for select using (auth.uid() = user_id);

create policy "Users can insert own saved casts"
  on saved_casts for insert with check (auth.uid() = user_id);

create policy "Users can update own saved casts"
  on saved_casts for update using (auth.uid() = user_id);

create policy "Users can delete own saved casts"
  on saved_casts for delete using (auth.uid() = user_id);

create policy "Service role can manage all saved casts"
  on saved_casts for all using (true) with check (true);

-- ============================================================
-- votes: users can manage their own votes
-- ============================================================
alter table votes enable row level security;

create policy "Users can manage own votes"
  on votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Service role can manage all votes"
  on votes for all using (true) with check (true);

-- ============================================================
-- submissions: public read, authenticated insert, service role all
-- ============================================================
alter table submissions enable row level security;

create policy "Anyone can read submissions"
  on submissions for select using (true);

create policy "Authenticated users can submit"
  on submissions for insert with check (auth.uid() is not null);

create policy "Service role can manage all submissions"
  on submissions for all using (true) with check (true);

-- ============================================================
-- actor_submissions: authenticated insert, service role all
-- ============================================================
alter table actor_submissions enable row level security;

create policy "Authenticated users can submit actors"
  on actor_submissions for insert with check (auth.uid() is not null);

create policy "Service role can manage actor submissions"
  on actor_submissions for all using (true) with check (true);

-- ============================================================
-- title_submissions: authenticated insert, service role all
-- ============================================================
alter table title_submissions enable row level security;

create policy "Authenticated users can submit titles"
  on title_submissions for insert with check (auth.uid() is not null);

create policy "Service role can manage title submissions"
  on title_submissions for all using (true) with check (true);

-- waitlist table does not exist yet — add policies here when created
