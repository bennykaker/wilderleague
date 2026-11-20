begin;

alter table public.wl_beta_votes add column if not exists direction smallint
  not null default 1 check (direction in (-1,1));
create index if not exists wl_beta_votes_cast_category
  on public.wl_beta_votes(cast_id,category,direction);

create or replace function public.wl_beta_cast_json(c public.wl_beta_casts,viewer text)
returns jsonb language sql stable set search_path=public as $$
  select jsonb_build_object(
    'id',c.id,'ownerId',c.user_id,'username',u.username,'challengeId',c.challenge_id,
    'snapshot',c.snapshot,'published',c.published,'createdAt',c.created_at,
    'best',t.best,'hear',t.hear,'myBest',t.my_best,'myHear',t.my_hear)
  from wl_beta_users u cross join lateral (
    select count(*) filter(where category='best') best, count(*) filter(where category='hear') hear,
      count(*) filter(where category='best' and user_id::text=viewer)>0 my_best,
      count(*) filter(where category='hear' and user_id::text=viewer)>0 my_hear
    from wl_beta_votes where cast_id=c.id and direction=1
  ) t where u.id=c.user_id;
$$;

create or replace function public.wl_beta_ranked_board(challenge text,board_category text,viewer text)
returns jsonb language sql stable set search_path=public as $$
  with tallies as (
    select c.id,c.created_at,(a.result->>board_category)::numeric ai,
      count(v.user_id) filter(where v.direction=1) up,
      count(v.user_id) filter(where v.direction=-1) down,
      coalesce(max(v.direction) filter(where v.user_id::text=viewer),0) mine
    from wl_beta_casts c
    left join wl_beta_votes v on v.cast_id=c.id and v.category=board_category
    left join wl_beta_ai a on a.key='board-v1:'||c.id::text and a.status='ready'
    where c.challenge_id=challenge and c.published
    group by c.id,a.result
  ), scores as (
    select *,case when up+down>20 then (ai+100.0*up/(up+down))/2 else ai end score,
      case when ai is null then up-down end unscored_order from tallies
  ), leaders as (
    select * from scores order by score desc nulls last,unscored_order desc,created_at,id limit 50
  )
  select coalesce(jsonb_agg(wl_beta_cast_json(c,viewer) || jsonb_build_object('rating',
    jsonb_build_object('ai',l.ai,'up',l.up,'down',l.down,'mine',l.mine,'score',l.score))
    order by l.score desc nulls last,l.unscored_order desc,l.created_at,l.id),'[]'::jsonb)
  from leaders l join wl_beta_casts c on c.id=l.id;
$$;

create or replace function public.wl_beta_set_vote(voter uuid,entry uuid,board_category text,choice integer)
returns void language plpgsql set search_path=public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from wl_beta_casts where id=entry and published;
  if owner_id is null then raise exception 'WL:Cast not found.'; end if;
  if owner_id=voter then raise exception 'WL:You cannot vote for your own cast.'; end if;
  if choice is null or choice not in (-1,0,1) or board_category is null
     or board_category not in ('best','hear') then raise exception 'WL:Invalid vote.'; end if;
  if choice=0 then
    delete from wl_beta_votes where user_id=voter and cast_id=entry and category=board_category;
  else
    insert into wl_beta_votes(user_id,cast_id,category,direction) values(voter,entry,board_category,choice)
    on conflict(user_id,cast_id,category) do update set direction=excluded.direction;
  end if;
end;
$$;

revoke all on function public.wl_beta_ranked_board(text,text,text),public.wl_beta_set_vote(uuid,uuid,text,integer)
  from public,anon,authenticated;
grant execute on function public.wl_beta_ranked_board(text,text,text),public.wl_beta_set_vote(uuid,uuid,text,integer)
  to service_role;
notify pgrst, 'reload schema';
commit;
