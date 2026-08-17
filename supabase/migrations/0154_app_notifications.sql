-- Bell inbox for missing-part add / archive / delete / transfer-request events.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in ('shortage_added', 'shortage_archived', 'shortage_deleted', 'transfer_requested')
  ),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  vin text,
  model_name text,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_notifications_created
  on public.app_notifications (created_at desc);

create table if not exists public.app_notification_reads (
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.app_notifications enable row level security;
alter table public.app_notification_reads enable row level security;

drop policy if exists app_notifications_read on public.app_notifications;
create policy app_notifications_read on public.app_notifications
  for select using (auth.uid() is not null);

drop policy if exists app_notification_reads_own on public.app_notification_reads;
create policy app_notification_reads_own on public.app_notification_reads
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.app_notifications to authenticated;
grant select, insert, delete on public.app_notification_reads to authenticated;

create or replace function public.emit_app_notification(
  p_event_type text,
  p_vehicle_id uuid,
  p_vin text,
  p_model_name text,
  p_actor_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_notifications (event_type, vehicle_id, vin, model_name, actor_id, payload)
  values (
    p_event_type,
    p_vehicle_id,
    nullif(trim(coalesce(p_vin, '')), ''),
    nullif(trim(coalesce(p_model_name, '')), ''),
    p_actor_id,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.trg_app_notify_missing_parts_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_notifications (event_type, vehicle_id, vin, model_name, actor_id, payload)
  select
    'shortage_added',
    v.id,
    v.vin,
    vm.name,
    coalesce((array_agg(n.created_by) filter (where n.created_by is not null))[1], auth.uid()),
    jsonb_build_object(
      'part_count', count(*)::int,
      'part_description', (array_agg(n.part_description order by n.created_at))[1]
    )
  from new_rows n
  join public.vehicles v on v.id = n.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  group by v.id, v.vin, vm.name;
  return null;
end;
$$;

drop trigger if exists trg_app_notify_mp_insert on public.missing_parts;
create trigger trg_app_notify_mp_insert
  after insert on public.missing_parts
  referencing new table as new_rows
  for each statement
  execute function public.trg_app_notify_missing_parts_inserted();

create or replace function public.trg_app_notify_missing_parts_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_notifications (event_type, vehicle_id, vin, model_name, actor_id, payload)
  select
    'shortage_deleted',
    v.id,
    v.vin,
    vm.name,
    auth.uid(),
    jsonb_build_object(
      'part_count', count(*)::int,
      'part_description', (array_agg(o.part_description))[1]
    )
  from old_rows o
  join public.vehicles v on v.id = o.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  group by v.id, v.vin, vm.name;
  return null;
end;
$$;

drop trigger if exists trg_app_notify_mp_delete on public.missing_parts;
create trigger trg_app_notify_mp_delete
  after delete on public.missing_parts
  referencing old table as old_rows
  for each statement
  execute function public.trg_app_notify_missing_parts_deleted();

create or replace function public.trg_app_notify_vehicle_archived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model text;
begin
  select vm.name into v_model
  from public.vehicle_models vm
  where vm.id = new.model_id;

  perform public.emit_app_notification(
    'shortage_archived',
    new.id,
    new.vin,
    v_model,
    coalesce(new.shortage_resolved_by, auth.uid()),
    '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists trg_app_notify_vehicle_archived on public.vehicles;
create trigger trg_app_notify_vehicle_archived
  after update of shortage_resolved_at on public.vehicles
  for each row
  when (old.shortage_resolved_at is null and new.shortage_resolved_at is not null)
  execute function public.trg_app_notify_vehicle_archived();

create or replace function public.trg_app_notify_transfer_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vin text;
  v_model text;
  v_part text;
  v_station text;
begin
  if new.kind is distinct from 'transfer' then
    return new;
  end if;

  select v.vin, vm.name into v_vin, v_model
  from public.vehicles v
  left join public.vehicle_models vm on vm.id = v.model_id
  where v.id = new.vehicle_id;

  if new.missing_part_id is not null then
    select part_description into v_part from public.missing_parts where id = new.missing_part_id;
  end if;

  if new.to_station_id is not null then
    select coalesce(nullif(trim(station_name), ''), station_number)
    into v_station
    from public.stations
    where id = new.to_station_id;
  end if;

  perform public.emit_app_notification(
    'transfer_requested',
    new.vehicle_id,
    v_vin,
    v_model,
    coalesce(new.requested_by, auth.uid()),
    jsonb_build_object(
      'part_description', v_part,
      'to_station_name', v_station,
      'request_id', new.id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_app_notify_transfer_requested on public.missing_part_workflow_requests;
create trigger trg_app_notify_transfer_requested
  after insert on public.missing_part_workflow_requests
  for each row
  execute function public.trg_app_notify_transfer_requested();

create or replace function public.list_app_notifications(p_limit int default 40)
returns table (
  id uuid,
  event_type text,
  vehicle_id uuid,
  vin text,
  model_name text,
  actor_id uuid,
  actor_name text,
  payload jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.event_type,
    n.vehicle_id,
    n.vin,
    n.model_name,
    n.actor_id,
    p.full_name,
    n.payload,
    n.created_at,
    r.read_at
  from public.app_notifications n
  left join public.profiles p on p.id = n.actor_id
  left join public.app_notification_reads r
    on r.notification_id = n.id and r.user_id = auth.uid()
  where auth.uid() is not null
    and n.created_at > now() - interval '14 days'
    and n.actor_id is distinct from auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 80);
$$;

create or replace function public.mark_app_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.app_notification_reads (notification_id, user_id)
  select n.id, auth.uid()
  from public.app_notifications n
  where n.created_at > now() - interval '14 days'
    and n.actor_id is distinct from auth.uid()
    and (p_ids is null or n.id = any (p_ids))
  on conflict (notification_id, user_id) do nothing;
end;
$$;

grant execute on function public.list_app_notifications(int) to authenticated;
grant execute on function public.mark_app_notifications_read(uuid[]) to authenticated;
