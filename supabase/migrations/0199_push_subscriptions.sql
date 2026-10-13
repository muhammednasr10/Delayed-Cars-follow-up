-- Phone push subscriptions. Recipients stay in push_notification_recipients so a later
-- org-structure filter can change one function without rebuilding delivery.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  expiration_time timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint),
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%')
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

create table if not exists public.push_deliveries (
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  status text not null check (status in ('pending', 'sent', 'failed', 'gone')),
  attempts int not null default 1 check (attempts >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (notification_id, subscription_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_deliveries from public, anon, authenticated;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_expiration timestamptz default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_endpoint is null or btrim(p_endpoint) = '' or p_endpoint not like 'https://%' then
    raise exception 'invalid endpoint';
  end if;
  if p_p256dh is null or btrim(p_p256dh) = '' or p_auth_key is null or btrim(p_auth_key) = '' then
    raise exception 'invalid keys';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, expiration_time, user_agent)
  values (auth.uid(), btrim(p_endpoint), btrim(p_p256dh), btrim(p_auth_key), p_expiration, nullif(btrim(coalesce(p_user_agent, '')), ''))
  on conflict (endpoint) do update
    set user_id = auth.uid(),
        p256dh = excluded.p256dh,
        auth_key = excluded.auth_key,
        expiration_time = excluded.expiration_time,
        user_agent = excluded.user_agent,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_my_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  delete from public.push_subscriptions
  where user_id = auth.uid()
    and endpoint = btrim(coalesce(p_endpoint, ''));
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, timestamptz, text) from public;
revoke all on function public.delete_my_push_subscription(text) from public;
grant execute on function public.save_push_subscription(text, text, text, timestamptz, text) to authenticated;
grant execute on function public.delete_my_push_subscription(text) to authenticated;

-- Same audience as list_app_notifications: missions go to assignees, everything else to
-- signed-in users other than the actor. Only users who registered a phone are returned.
create or replace function public.push_notification_recipients(p_notification_id uuid)
returns table (user_id uuid, unread_count int)
language sql
stable
security definer
set search_path = public
as $$
  with note as (
    select id, event_type, actor_id
    from public.app_notifications
    where id = p_notification_id
  ),
  audience as (
    select distinct p.id as user_id, p.employee_id
    from public.profiles p
    join note n on true
    where p.id is distinct from n.actor_id
      and exists (
        select 1 from public.push_subscriptions s where s.user_id = p.id
      )
      and (
        n.event_type not in ('mission_assigned', 'mission_delegated')
        or exists (
          select 1
          from public.app_notification_targets t
          where t.notification_id = n.id
            and t.employee_id = p.employee_id
        )
      )
  )
  select
    a.user_id,
    (
      select count(*)::int
      from public.app_notifications n
      where n.created_at > now() - interval '14 days'
        and n.actor_id is distinct from a.user_id
        and not exists (
          select 1
          from public.app_notification_reads r
          where r.notification_id = n.id
            and r.user_id = a.user_id
        )
        and (
          n.event_type not in ('mission_assigned', 'mission_delegated')
          or exists (
            select 1
            from public.app_notification_targets t
            where t.notification_id = n.id
              and t.employee_id = a.employee_id
          )
        )
    ) as unread_count
  from audience a;
$$;

create or replace function public.claim_push_delivery(
  p_notification_id uuid,
  p_subscription_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  insert into public.push_deliveries (notification_id, subscription_id, status, attempts, updated_at)
  values (p_notification_id, p_subscription_id, 'pending', 1, now())
  on conflict (notification_id, subscription_id) do update
    set attempts = public.push_deliveries.attempts + 1,
        status = 'pending',
        updated_at = now()
    where public.push_deliveries.attempts < 3
      and (
        public.push_deliveries.status = 'failed'
        or (
          public.push_deliveries.status = 'pending'
          and public.push_deliveries.updated_at < now() - interval '90 seconds'
        )
      )
  returning status into v_status;

  return v_status is not null;
end;
$$;

create or replace function public.finish_push_delivery(
  p_notification_id uuid,
  p_subscription_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending', 'sent', 'failed', 'gone') then
    return;
  end if;
  update public.push_deliveries
  set status = p_status,
      updated_at = now()
  where notification_id = p_notification_id
    and subscription_id = p_subscription_id;
end;
$$;

revoke all on function public.push_notification_recipients(uuid) from public, anon, authenticated;
revoke all on function public.claim_push_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_push_delivery(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.push_notification_recipients(uuid) to service_role;
grant execute on function public.claim_push_delivery(uuid, uuid) to service_role;
grant execute on function public.finish_push_delivery(uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';
