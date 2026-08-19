alter table public.app_notifications
  drop constraint if exists app_notifications_event_type_check;

alter table public.app_notifications
  add constraint app_notifications_event_type_check
  check (event_type in (
    'shortage_added',
    'shortage_archived',
    'shortage_deleted',
    'transfer_requested',
    'mission_assigned',
    'mission_delegated'
  ));

create table if not exists public.app_notification_targets (
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  primary key (notification_id, employee_id)
);

create index if not exists idx_app_notification_targets_employee
  on public.app_notification_targets (employee_id);

alter table public.app_notification_targets enable row level security;

drop policy if exists app_notification_targets_select on public.app_notification_targets;
create policy app_notification_targets_select on public.app_notification_targets
  for select to authenticated
  using (employee_id = auth_employee_id());

grant select on public.app_notification_targets to authenticated;

drop policy if exists app_notifications_read on public.app_notifications;
create policy app_notifications_read on public.app_notifications
  for select to authenticated
  using (
    event_type not in ('mission_assigned', 'mission_delegated')
    or exists (
      select 1
      from public.app_notification_targets t
      where t.notification_id = app_notifications.id
        and t.employee_id = auth_employee_id()
    )
  );

create or replace function public.notify_mission_assignees(
  p_mission_id uuid,
  p_event_type text,
  p_assignee_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_actor uuid;
  v_actor_emp uuid;
  v_ids uuid[];
  v_nid uuid;
begin
  if p_event_type not in ('mission_assigned', 'mission_delegated') then
    return;
  end if;

  if p_assignee_ids is null or coalesce(array_length(p_assignee_ids, 1), 0) = 0 then
    return;
  end if;

  v_actor := auth.uid();
  v_actor_emp := auth_employee_id();

  select array_agg(distinct x)
  into v_ids
  from unnest(p_assignee_ids) as x
  where x is not null
    and (v_actor_emp is null or x <> v_actor_emp);

  if v_ids is null or coalesce(array_length(v_ids, 1), 0) = 0 then
    return;
  end if;

  select tm.title into v_title
  from public.team_missions tm
  where tm.id = p_mission_id;

  if v_title is null then
    return;
  end if;

  insert into public.app_notifications (event_type, vehicle_id, vin, model_name, actor_id, payload)
  values (
    p_event_type,
    null,
    null,
    null,
    v_actor,
    jsonb_build_object('mission_id', p_mission_id, 'title', v_title)
  )
  returning id into v_nid;

  insert into public.app_notification_targets (notification_id, employee_id)
  select v_nid, unnest(v_ids)
  on conflict do nothing;
end;
$$;

revoke all on function public.notify_mission_assignees(uuid, text, uuid[]) from public;
revoke all on function public.notify_mission_assignees(uuid, text, uuid[]) from authenticated;

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
begin
  if p_assignee_ids is null or array_length(p_assignee_ids, 1) is null then
    raise exception 'ASSIGNEES_REQUIRED';
  end if;

  v_manager_id := auth_employee_id();

  if not has_role('admin', 'production') then
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

  delete from public.team_mission_assignees where mission_id = p_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select p_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_missions
  set assignee_id = p_assignee_ids[1]
  where id = p_mission_id;

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

  delete from public.team_mission_assignees where mission_id = p_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select p_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_missions
  set assignee_id = p_assignee_ids[1]
  where id = p_mission_id;

  perform public.notify_mission_assignees(p_mission_id, 'mission_delegated', p_assignee_ids);
end;
$$;

create or replace function public.convert_team_request_to_mission(
  p_request_id uuid,
  p_assignee_ids uuid[],
  p_priority text default 'normal',
  p_due_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manager_id uuid;
  v_req public.team_requests%rowtype;
  v_mission_id uuid;
  v_assignee_id uuid;
begin
  v_manager_id := auth_employee_id();
  if v_manager_id is null and not has_role('admin', 'production') then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  if p_assignee_ids is null or array_length(p_assignee_ids, 1) is null then
    raise exception 'ASSIGNEES_REQUIRED';
  end if;

  select * into v_req from public.team_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  if not has_role('admin', 'production') and not is_request_manager(p_request_id, v_manager_id) then
    raise exception 'NOT_REQUEST_MANAGER';
  end if;

  foreach v_assignee_id in array p_assignee_ids loop
    if not is_org_subordinate(v_assignee_id, coalesce(v_manager_id, v_req.manager_id)) then
      raise exception 'ASSIGNEE_NOT_SUBORDINATE';
    end if;
  end loop;

  if p_priority not in ('low', 'normal', 'high') then
    raise exception 'INVALID_PRIORITY';
  end if;

  insert into public.team_missions (title, description, assignee_id, status, priority, due_date, notes)
  values (
    v_req.title,
    v_req.description,
    p_assignee_ids[1],
    'pending',
    p_priority,
    p_due_date,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select v_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_requests
  set
    status = 'converted',
    converted_mission_id = v_mission_id,
    manager_response = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_request_id;

  perform public.notify_mission_assignees(v_mission_id, 'mission_assigned', p_assignee_ids);

  return v_mission_id;
end;
$$;

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
    and (
      n.event_type not in ('mission_assigned', 'mission_delegated')
      or exists (
        select 1
        from public.app_notification_targets t
        where t.notification_id = n.id
          and t.employee_id = auth_employee_id()
      )
    )
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
    and (
      n.event_type not in ('mission_assigned', 'mission_delegated')
      or exists (
        select 1
        from public.app_notification_targets t
        where t.notification_id = n.id
          and t.employee_id = auth_employee_id()
      )
    )
  on conflict (notification_id, user_id) do nothing;
end;
$$;

notify pgrst, 'reload schema';
