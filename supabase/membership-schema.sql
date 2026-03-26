-- Run this in Supabase SQL editor

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_member boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Service role can do anything"
  on profiles for all
  using (true)
  with check (true);

-- Auto-create profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
