-- Fixed (non-board) mission routing: event → assignee, plus source links for damaged/internal quality.

create table if not exists public.mission_auto_routes (
  event_type text primary key
    check (event_type in (
      'missing_part_vehicle',
      'scratch',
      'damaged_part',
      'internal_quality',
      'external_quality'
    )),
  assignee_employee_id uuid references public.employees (id) on delete set null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.mission_auto_routes (event_type, enabled)
values
  ('missing_part_vehicle', true),
  ('scratch', true),
  ('damaged_part', true),
  ('internal_quality', true),
  ('external_quality', true)
on conflict (event_type) do nothing;

alter table public.team_missions
  add column if not exists source_damaged_part_id uuid references public.damaged_parts (id) on delete set null,
  add column if not exists source_internal_quality_id uuid references public.internal_quality_issues (id) on delete set null,
  add column if not exists auto_route_event text
    check (
      auto_route_event is null
      or auto_route_event in (
        'missing_part_vehicle',
        'scratch',
        'damaged_part',
        'internal_quality',
        'external_quality'
      )
    );

create index if not exists idx_team_missions_source_damaged_part
  on public.team_missions (source_damaged_part_id)
  where source_damaged_part_id is not null;

create index if not exists idx_team_missions_source_internal_quality
  on public.team_missions (source_internal_quality_id)
  where source_internal_quality_id is not null;

create index if not exists idx_team_missions_auto_route_event
  on public.team_missions (auto_route_event)
  where auto_route_event is not null;

alter table public.mission_auto_routes enable row level security;

drop policy if exists mission_auto_routes_select on public.mission_auto_routes;
create policy mission_auto_routes_select on public.mission_auto_routes
  for select to authenticated
  using (true);

drop policy if exists mission_auto_routes_update on public.mission_auto_routes;
create policy mission_auto_routes_update on public.mission_auto_routes
  for update to authenticated
  using (
    has_role('admin', 'production')
    or has_permission('missions', 'assign')
    or has_permission('missions', 'view_all')
  )
  with check (
    has_role('admin', 'production')
    or has_permission('missions', 'assign')
    or has_permission('missions', 'view_all')
  );

drop policy if exists mission_auto_routes_insert on public.mission_auto_routes;
create policy mission_auto_routes_insert on public.mission_auto_routes
  for insert to authenticated
  with check (
    has_role('admin', 'production')
    or has_permission('missions', 'assign')
    or has_permission('missions', 'view_all')
  );

create or replace function public.create_auto_routed_mission(
  p_event_type text,
  p_title text,
  p_description text default null,
  p_source_vehicle_id uuid default null,
  p_source_missing_part_id uuid default null,
  p_source_scratch_id uuid default null,
  p_source_damaged_part_id uuid default null,
  p_source_internal_quality_id uuid default null,
  p_source_quality_note_id uuid default null,
  p_source_vin text default null,
  p_source_model_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignee uuid;
  v_enabled boolean;
  v_mission_id uuid;
  v_creator uuid;
  v_creator_name text;
begin
  if p_event_type is null or btrim(p_title) = '' then
    return null;
  end if;

  select assignee_employee_id, enabled
  into v_assignee, v_enabled
  from public.mission_auto_routes
  where event_type = p_event_type;

  if not found or not coalesce(v_enabled, false) or v_assignee is null then
    return null;
  end if;

  -- Skip if an open auto-routed mission already exists for the same source key.
  if p_event_type = 'missing_part_vehicle' and p_source_vehicle_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'missing_part_vehicle'
        and source_vehicle_id = p_source_vehicle_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'scratch' and p_source_scratch_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'scratch'
        and source_scratch_id = p_source_scratch_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'damaged_part' and p_source_damaged_part_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'damaged_part'
        and source_damaged_part_id = p_source_damaged_part_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'internal_quality' and p_source_internal_quality_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'internal_quality'
        and source_internal_quality_id = p_source_internal_quality_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'external_quality' and p_source_quality_note_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'external_quality'
        and source_quality_note_id = p_source_quality_note_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  end if;

  v_creator := public.auth_employee_id();
  if v_creator is not null then
    select e.full_name into v_creator_name from public.employees e where e.id = v_creator;
  end if;

  insert into public.team_missions (
    title,
    description,
    assignee_id,
    status,
    priority,
    due_date,
    recurrence_type,
    notes,
    created_by_employee_id,
    created_by_name,
    source_vehicle_id,
    source_missing_part_id,
    source_scratch_id,
    source_damaged_part_id,
    source_internal_quality_id,
    source_quality_note_id,
    source_vin,
    source_model_name,
    auto_route_event
  ) values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    v_assignee,
    'pending',
    'normal',
    (current_date + 1)::date,
    'none',
    'مهمة ثابتة تلقائية',
    v_creator,
    v_creator_name,
    p_source_vehicle_id,
    p_source_missing_part_id,
    p_source_scratch_id,
    p_source_damaged_part_id,
    p_source_internal_quality_id,
    p_source_quality_note_id,
    nullif(btrim(coalesce(p_source_vin, '')), ''),
    nullif(btrim(coalesce(p_source_model_name, '')), ''),
    p_event_type
  )
  returning id into v_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  values (v_mission_id, v_assignee)
  on conflict do nothing;

  perform public.notify_mission_assignees(v_mission_id, 'mission_assigned', array[v_assignee]);

  return v_mission_id;
exception
  when others then
    -- Never block the source registration if mission creation fails.
    raise warning 'create_auto_routed_mission failed: %', sqlerrm;
    return null;
end;
$$;

grant execute on function public.create_auto_routed_mission(
  text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, text
) to authenticated;

notify pgrst, 'reload schema';
