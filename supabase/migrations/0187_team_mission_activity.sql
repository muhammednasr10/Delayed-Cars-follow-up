create table if not exists public.team_mission_activity (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.team_missions (id) on delete cascade,
  author_employee_id uuid references public.employees (id) on delete set null,
  author_name text not null,
  field_key text not null,
  value_from text,
  value_to text,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_mission_activity_mission
  on public.team_mission_activity (mission_id, created_at);

alter table public.team_mission_activity enable row level security;

drop policy if exists team_mission_activity_select on public.team_mission_activity;
create policy team_mission_activity_select on public.team_mission_activity
  for select to authenticated using (true);

grant select on public.team_mission_activity to authenticated;

create or replace function public.log_team_mission_change(
  p_mission_id uuid,
  p_field text,
  p_from text,
  p_to text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_name text;
  v_from text := nullif(trim(p_from), '');
  v_to text := nullif(trim(p_to), '');
begin
  if p_field is null then
    return;
  end if;

  if p_field in ('parent_model_id', 'variant_model_id') then
    if v_from is not null then
      select vm.name into v_from
      from public.vehicle_models vm
      where vm.id = v_from::uuid;
    end if;
    if v_to is not null then
      select vm.name into v_to
      from public.vehicle_models vm
      where vm.id = v_to::uuid;
    end if;
  end if;

  if p_field = 'chassis_numbers' then
    v_from := nullif(replace(replace(replace(coalesce(v_from, ''), '[', ''), ']', ''), '"', ''), '');
    v_to := nullif(replace(replace(replace(coalesce(v_to, ''), '[', ''), ']', ''), '"', ''), '');
  end if;

  if v_from is not distinct from v_to then
    return;
  end if;

  v_employee_id := auth_employee_id();
  if v_employee_id is not null then
    select coalesce(e.full_name, '—') into v_name
    from public.employees e
    where e.id = v_employee_id;
  end if;

  if v_name is null then
    select coalesce(nullif(trim(p.full_name), ''), '—') into v_name
    from public.profiles p
    where p.id = auth.uid();
  end if;

  v_name := coalesce(nullif(trim(v_name), ''), '—');

  insert into public.team_mission_activity (
    mission_id,
    author_employee_id,
    author_name,
    field_key,
    value_from,
    value_to
  )
  values (p_mission_id, v_employee_id, v_name, p_field, v_from, v_to);
end;
$$;

create or replace function public.team_missions_log_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
  keys text[] := array[
    'title',
    'description',
    'status',
    'priority',
    'due_date',
    'notes',
    'recurrence_type',
    'recurrence_custom',
    'parent_model_id',
    'variant_model_id',
    'vehicle_count',
    'chassis_numbers'
  ];
  k text;
begin
  foreach k in array keys loop
    if (old_j ? k) and (new_j ? k) then
      perform public.log_team_mission_change(new.id, k, old_j ->> k, new_j ->> k);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_team_missions_log_changes on public.team_missions;
create trigger trg_team_missions_log_changes
  after update on public.team_missions
  for each row execute function public.team_missions_log_changes();

create or replace function public.mission_employee_names(p_ids uuid[])
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(string_agg(e.full_name, '، ' order by e.full_name), '')
  from public.employees e
  where e.id = any (p_ids);
$$;

create or replace function public.sync_team_mission_assignees(
  p_mission_id uuid,
  p_assignee_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manager_id uuid;
  v_id uuid;
  v_old uuid[];
  v_added uuid[];
  v_skip_tree boolean;
  v_from_names text;
  v_to_names text;
begin
  if p_assignee_ids is null or array_length(p_assignee_ids, 1) is null then
    raise exception 'ASSIGNEES_REQUIRED';
  end if;

  v_manager_id := auth_employee_id();
  v_skip_tree := has_role('admin', 'production')
    or (has_permission('missions', 'assign') and has_permission('missions', 'view_all'));

  if not v_skip_tree then
    if v_manager_id is null then
      raise exception 'NO_EMPLOYEE_LINK';
    end if;
    if not exists (select 1 from public.team_missions where id = p_mission_id) then
      raise exception 'MISSION_NOT_FOUND';
    end if;
    foreach v_id in array p_assignee_ids loop
      if not is_org_subordinate(v_id, v_manager_id) then
        raise exception 'ASSIGNEE_NOT_SUBORDINATE';
      end if;
    end loop;
  end if;

  select coalesce(array_agg(employee_id), array[]::uuid[])
  into v_old
  from public.team_mission_assignees
  where mission_id = p_mission_id;

  v_from_names := public.mission_employee_names(v_old);

  delete from public.team_mission_assignees where mission_id = p_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select p_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_missions
  set assignee_id = p_assignee_ids[1]
  where id = p_mission_id;

  v_to_names := public.mission_employee_names(p_assignee_ids);
  if coalesce(array_length(v_old, 1), 0) > 0 then
    perform public.log_team_mission_change(p_mission_id, 'assignees', v_from_names, v_to_names);
  end if;

  select coalesce(array_agg(x), array[]::uuid[])
  into v_added
  from unnest(p_assignee_ids) as x
  where not (x = any (v_old));

  perform public.notify_mission_assignees(p_mission_id, 'mission_assigned', v_added);
end;
$$;

create or replace function public.delegate_my_team_mission(
  p_mission_id uuid,
  p_assignee_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_id uuid;
  v_old uuid[];
  v_from_names text;
  v_to_names text;
begin
  if p_assignee_ids is null or array_length(p_assignee_ids, 1) is null then
    raise exception 'ASSIGNEES_REQUIRED';
  end if;

  v_employee_id := auth_employee_id();
  if v_employee_id is null then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  if not exists (select 1 from public.team_missions where id = p_mission_id) then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  if not is_mission_assignee(p_mission_id, v_employee_id) then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

  foreach v_id in array p_assignee_ids loop
    if v_id = v_employee_id then
      raise exception 'ASSIGNEE_NOT_SUBORDINATE';
    end if;
    if not is_org_subordinate(v_id, v_employee_id) then
      raise exception 'ASSIGNEE_NOT_SUBORDINATE';
    end if;
  end loop;

  select coalesce(array_agg(employee_id), array[]::uuid[])
  into v_old
  from public.team_mission_assignees
  where mission_id = p_mission_id;

  v_from_names := public.mission_employee_names(v_old);

  delete from public.team_mission_assignees where mission_id = p_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select p_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_missions
  set assignee_id = p_assignee_ids[1]
  where id = p_mission_id;

  v_to_names := public.mission_employee_names(p_assignee_ids);
  perform public.log_team_mission_change(p_mission_id, 'assignees', v_from_names, v_to_names);

  perform public.notify_mission_assignees(p_mission_id, 'mission_delegated', p_assignee_ids);
end;
$$;

notify pgrst, 'reload schema';
