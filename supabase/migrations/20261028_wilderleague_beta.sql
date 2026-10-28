-- Additive migration. Does not modify legacy users, casts or votes.
create table if not exists public.wl_beta_users(id uuid primary key,username text not null,username_key text unique not null,salt text not null,password_hash text not null);
create table if not exists public.wl_beta_sessions(token_hash text primary key,user_id uuid not null references public.wl_beta_users(id),expires timestamptz not null);
create table if not exists public.wl_beta_casts(id uuid primary key,user_id uuid not null references public.wl_beta_users(id),challenge_id text not null,snapshot jsonb not null,fingerprint text not null,published boolean not null default false,created_at timestamptz not null default now(),unique(user_id,challenge_id,fingerprint));
create table if not exists public.wl_beta_votes(user_id uuid references public.wl_beta_users(id),cast_id uuid references public.wl_beta_casts(id),category text check(category in ('best','hear')),primary key(user_id,cast_id,category));
create table if not exists public.wl_beta_limits(key text primary key,count integer not null,expires timestamptz not null);
create table if not exists public.wl_beta_ai(key text primary key,kind text not null check(kind in ('search','feedback')),user_id uuid references public.wl_beta_users(id),status text not null,day date not null default (now() at time zone 'UTC')::date,created_at timestamptz not null default now(),reserved numeric not null default 0,cost numeric,result jsonb,model text not null);
create index if not exists wl_beta_ai_user_day on public.wl_beta_ai(user_id,day,kind);
create index if not exists wl_beta_cast_board on public.wl_beta_casts(challenge_id,published);
alter table public.wl_beta_users enable row level security;
alter table public.wl_beta_sessions enable row level security;
alter table public.wl_beta_casts enable row level security;
alter table public.wl_beta_votes enable row level security;
alter table public.wl_beta_limits enable row level security;
alter table public.wl_beta_ai enable row level security;
revoke all on public.wl_beta_users,public.wl_beta_sessions,public.wl_beta_casts,public.wl_beta_votes,public.wl_beta_limits,public.wl_beta_ai from anon,authenticated;
grant all on public.wl_beta_users,public.wl_beta_sessions,public.wl_beta_casts,public.wl_beta_votes,public.wl_beta_limits,public.wl_beta_ai to service_role;
create or replace function public.wl_beta_cast_json(c public.wl_beta_casts,viewer text) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('id',c.id,'ownerId',c.user_id,'username',u.username,'challengeId',c.challenge_id,'snapshot',c.snapshot,'published',c.published,'createdAt',c.created_at,
 'best',(select count(*) from wl_beta_votes v where v.cast_id=c.id and v.category='best'),
 'hear',(select count(*) from wl_beta_votes v where v.cast_id=c.id and v.category='hear'),
 'myBest',exists(select 1 from wl_beta_votes v where v.cast_id=c.id and v.category='best' and v.user_id::text=viewer),
 'myHear',exists(select 1 from wl_beta_votes v where v.cast_id=c.id and v.category='hear' and v.user_id::text=viewer)) from wl_beta_users u where u.id=c.user_id;
$$;
revoke all on function public.wl_beta_cast_json(public.wl_beta_casts,text) from public,anon,authenticated;
grant execute on function public.wl_beta_cast_json(public.wl_beta_casts,text) to service_role;
create or replace function public.wl_beta_action(action text,payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb; uid uuid; cid uuid; n integer; used numeric; today date := (now() at time zone 'UTC')::date;
begin
 if action='health' then return '{"ok":true,"version":1}'::jsonb;
 elsif action='register' then
  begin insert into wl_beta_users values((payload->>'id')::uuid,payload->>'username',lower(payload->>'username'),payload->>'salt',payload->>'password_hash');exception when unique_violation then raise exception 'WL:That username is already taken.';end;
 elsif action='login-record' then select to_jsonb(u) into r from wl_beta_users u where username_key=payload->>'username';return r;
 elsif action='session' then insert into wl_beta_sessions values(payload->>'token',(payload->>'user')::uuid,now()+interval '14 days');
 elsif action='user' then select jsonb_build_object('id',u.id,'username',u.username) into r from wl_beta_sessions s join wl_beta_users u on u.id=s.user_id where s.token_hash=payload->>'token' and s.expires>now();return r;
 elsif action='logout' then delete from wl_beta_sessions where token_hash=payload->>'token';
 elsif action='limit' then
  insert into wl_beta_limits values(payload->>'key',1,now()+((payload->>'ms')::bigint*interval '1 millisecond')) on conflict(key) do update set count=case when wl_beta_limits.expires<=now() then 1 else wl_beta_limits.count+1 end,expires=case when wl_beta_limits.expires<=now() then excluded.expires else wl_beta_limits.expires end returning count into n;
  if n>(payload->>'max')::integer then raise exception 'WL:Too many attempts. Please try again later.';end if;
 elsif action='save' then
  insert into wl_beta_casts(id,user_id,challenge_id,snapshot,fingerprint,published) values((payload->>'id')::uuid,(payload->>'user')::uuid,payload->>'challenge',payload->'snapshot',payload->>'fingerprint',(payload->>'publish')::boolean) on conflict(user_id,challenge_id,fingerprint) do update set published=wl_beta_casts.published or excluded.published returning id into cid;return to_jsonb(cid);
 elsif action='cast' then select wl_beta_cast_json(c,payload->>'viewer') into r from wl_beta_casts c where c.id::text=payload->>'id' and (c.published or c.user_id::text=payload->>'viewer');return r;
 elsif action='mine' then select coalesce(jsonb_agg(j),'[]'::jsonb) into r from (select wl_beta_cast_json(c,payload->>'viewer') j from wl_beta_casts c where c.user_id::text=payload->>'viewer' order by created_at desc limit 100) x;return r;
 elsif action='board' then select coalesce(jsonb_agg(j),'[]'::jsonb) into r from (select wl_beta_cast_json(c,payload->>'viewer') j from wl_beta_casts c where c.published and c.challenge_id=payload->>'challenge' order by (select count(*) from wl_beta_votes v where v.cast_id=c.id and v.category=payload->>'category') desc,c.created_at,c.id limit 50) x;return r;
 elsif action='publish' then update wl_beta_casts set published=true where id::text=payload->>'id' and user_id::text=payload->>'user';if not found then raise exception 'WL:Cast not found.';end if;
 elsif action='vote' then
  select user_id,id into uid,cid from wl_beta_casts where id::text=payload->>'id' and published;
  if cid is null then raise exception 'WL:Cast not found.';end if;
  if uid::text=payload->>'user' then raise exception 'WL:You cannot vote for your own cast.';end if;
  if (payload->>'enabled')::boolean then insert into wl_beta_votes values((payload->>'user')::uuid,cid,payload->>'category') on conflict do nothing;else delete from wl_beta_votes where user_id::text=payload->>'user' and cast_id=cid and category=payload->>'category';end if;
 elsif action='ai-read' then select to_jsonb(a) into r from wl_beta_ai a where key=payload->>'key';return r;
 elsif action='ai-reserve' then
  -- One transaction-wide lock makes per-account and site-wide reservations atomic.
  perform pg_advisory_xact_lock(72820261028);
  select to_jsonb(a) into r from wl_beta_ai a where key=payload->>'key';if r is not null then return jsonb_build_object('claimed',false,'row',r);end if;
  if payload->>'kind'='search' then
   if coalesce(payload->>'user','')='' then raise exception 'WL:Sign in to run a new AI search.';end if;
   select count(*) into n from wl_beta_ai where kind='search' and day=today and user_id::text=payload->>'user';if n>=5 then raise exception 'WL:Your daily limit of 5 new searches has been reached. Saved searches still work. Resets at midnight UTC.';end if;
   select count(*) into n from wl_beta_ai where kind='search' and day=today;if n>=50 then raise exception 'WL:The site daily limit of 50 new searches has been reached. Saved searches still work.';end if;
  else
   if coalesce(payload->>'user','')='' then raise exception 'WL:Sign in to request new casting feedback.';end if;
   select sum(reserved) into used from wl_beta_ai where kind='feedback' and day=today;if coalesce(used,0)+(payload->>'reserved')::numeric>2 then raise exception 'WL:The daily feedback spending limit has been reached. Saved reviews still work.';end if;
  end if;
  insert into wl_beta_ai(key,kind,user_id,status,reserved,model) values(payload->>'key',payload->>'kind',nullif(payload->>'user','')::uuid,'pending',coalesce((payload->>'reserved')::numeric,0),payload->>'model') returning to_jsonb(wl_beta_ai.*) into r;return jsonb_build_object('claimed',true,'row',r);
 elsif action='ai-finish' then update wl_beta_ai set status=payload->>'status',result=payload->'result',cost=(payload->>'cost')::numeric where key=payload->>'key' and status='pending';
 else raise exception 'WL:Unknown operation.';
 end if;
 return 'null'::jsonb;
end;
$$;
revoke all on function public.wl_beta_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.wl_beta_action(text,jsonb) to service_role;
notify pgrst, 'reload schema';
