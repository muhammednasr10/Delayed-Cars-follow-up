-- Multiple assignees per mission; multiple managers per request.

-- ── Mission assignees ────────────────────────────────────────────────────────

create table if not exists public.team_mission_assignees (
  mission_id   uuid not null references public.team_missions (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete restrict,
  created_at   timestamptz not null default now(),
  primary key (mission_id, employee_id)
);

create index if not exists idx_team_mission_assignees_employee
  on public.team_mission_assignees (employee_id);

insert into public.team_mission_assignees (mission_id, employee_id)
select id, assignee_id from public.team_missions
on conflict do nothing;

alter table public.team_mission_assignees enable row level security;

drop policy if exists team_mission_assignees_select on public.team_mission_assignees;
create policy team_mission_assignees_select on public.team_mission_assignees
  for select to authenticated using (true);

grant select on public.team_mission_assignees to authenticated;

create or replace function public.is_mission_assignee(p_mission_id uuid, p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_mission_assignees
    where mission_id = p_mission_id and employee_id = p_employee_id
  );
$$;

create or replace function public.mission_assignees_are_subordinates(p_mission_id uuid, p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_mission_assignees where mission_id = p_mission_id
  )
  and not exists (
    select 1 from public.team_mission_assignees tma
    where tma.mission_id = p_mission_id
      and not public.is_org_subordinate(tma.employee_id, p_manager_id)
  );
$$;

grant execute on function public.is_mission_assignee(uuid, uuid) to authenticated;
grant execute on function public.mission_assignees_are_subordinates(uuid, uuid) to authenticated;

drop policy if exists team_missions_insert on public.team_missions;
create policy team_missions_insert on public.team_missions
  for insert to authenticated
  with check (
    has_role('admin', 'production')
    or is_org_subordinate(assignee_id, auth_employee_id())
  );

drop policy if exists team_missions_update on public.team_missions;
create policy team_missions_update on public.team_missions
  for update to authenticated
  using (
    has_role('admin', 'production')
    or mission_assignees_are_subordinates(id, auth_employee_id())
  )
  with check (
    has_role('admin', 'production')
    or mission_assignees_are_subordinates(id, auth_employee_id())
  );

drop policy if exists team_missions_delete on public.team_missions;
create policy team_missions_delete on public.team_missions
  for delete to authenticated
  using (
    has_role('admin', 'production')
    or mission_assignees_are_subordinates(id, auth_employee_id())
  );

create or replace function public.sync_team_mission_assignees(p_mission_id uuid, p_assignee_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manager_id uuid;
  v_id uuid;
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

  delete from public.team_mission_assignees where mission_id = p_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  select p_mission_id, unnest(p_assignee_ids)
  on conflict do nothing;

  update public.team_missions
  set assignee_id = p_assignee_ids[1]
  where id = p_mission_id;
end;
$$;

grant execute on function public.sync_team_mission_assignees(uuid, uuid[]) to authenticated;

create or replace function public.update_my_team_mission_status(p_mission_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
begin
  if p_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select employee_id into v_employee_id
  from public.profiles
  where id = auth.uid();

  if v_employee_id is null then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  update public.team_missions
  set status = p_status
  where id = p_mission_id
    and is_mission_assignee(p_mission_id, v_employee_id);

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;
end;
$$;

-- ── Request managers ─────────────────────────────────────────────────────────

create table if not exists public.team_request_managers (
  request_id   uuid not null references public.team_requests (id) on delete cascade,
  manager_id   uuid not null references public.employees (id) on delete restrict,
  created_at   timestamptz not null default now(),
  primary key (request_id, manager_id)
);

create index if not exists idx_team_request_managers_manager
  on public.team_request_managers (manager_id);

insert into public.team_request_managers (request_id, manager_id)
select id, manager_id from public.team_requests
on conflict do nothing;

alter table public.team_request_managers enable row level security;

drop policy if exists team_request_managers_select on public.team_request_managers;
create policy team_request_managers_select on public.team_request_managers
  for select to authenticated using (true);

grant select on public.team_request_managers to authenticated;

create or replace function public.is_request_manager(p_request_id uuid, p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_request_managers
    where request_id = p_request_id and manager_id = p_manager_id
  )
  or exists (
    select 1 from public.team_requests tr
    where tr.id = p_request_id and tr.manager_id = p_manager_id
  );
$$;

grant execute on function public.is_request_manager(uuid, uuid) to authenticated;

drop policy if exists team_requests_select on public.team_requests;
create policy team_requests_select on public.team_requests
  for select to authenticated
  using (
    has_role('admin', 'production')
    or requester_id = auth_employee_id()
    or is_request_manager(id, auth_employee_id())
  );

drop policy if exists team_requests_insert on public.team_requests;
create policy team_requests_insert on public.team_requests
  for insert to authenticated
  with check (
    requester_id = auth_employee_id()
    and is_my_direct_manager(manager_id)
  );

drop policy if exists team_requests_update on public.team_requests;
create policy team_requests_update on public.team_requests
  for update to authenticated
  using (
    has_role('admin', 'production')
    or is_request_manager(id, auth_employee_id())
  )
  with check (
    has_role('admin', 'production')
    or is_request_manager(id, auth_employee_id())
  );

create or replace function public.create_team_request_with_managers(
  p_manager_ids uuid[],
  p_title text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid;
  v_request_id uuid;
  v_manager_id uuid;
begin
  v_requester_id := auth_employee_id();
  if v_requester_id is null then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  if p_manager_ids is null or array_length(p_manager_ids, 1) is null then
    raise exception 'MANAGERS_REQUIRED';
  end if;

  foreach v_manager_id in array p_manager_ids loop
    if v_manager_id = v_requester_id then
      raise exception 'MANAGER_IS_SELF';
    end if;
    if not is_my_direct_manager(v_manager_id) then
      raise exception 'NOT_DIRECT_MANAGER';
    end if;
  end loop;

  insert into public.team_requests (requester_id, manager_id, title, description)
  values (v_requester_id, p_manager_ids[1], trim(p_title), nullif(trim(coalesce(p_description, '')), ''))
  returning id into v_request_id;

  insert into public.team_request_managers (request_id, manager_id)
  select v_request_id, unnest(p_manager_ids)
  on conflict do nothing;

  return v_request_id;
end;
$$;

grant execute on function public.create_team_request_with_managers(uuid[], text, text) to authenticated;

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

  return v_mission_id;
end;
$$;

-- Keep backward-compatible overload for single assignee callers.
create or replace function public.convert_team_request_to_mission(
  p_request_id uuid,
  p_assignee_id uuid,
  p_priority text default 'normal',
  p_due_date date default null,
  p_notes text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.convert_team_request_to_mission(
    p_request_id,
    array[p_assignee_id],
    p_priority,
    p_due_date,
    p_notes
  );
$$;

grant execute on function public.convert_team_request_to_mission(uuid, uuid[], text, date, text) to authenticated;
grant execute on function public.convert_team_request_to_mission(uuid, uuid, text, date, text) to authenticated;
