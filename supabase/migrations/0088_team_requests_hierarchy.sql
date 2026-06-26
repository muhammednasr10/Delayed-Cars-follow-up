-- Org hierarchy helpers, team requests (subordinate → manager), manager mission assignment.

create or replace function public.auth_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_org_subordinate(p_subordinate_id uuid, p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_subordinate_id is null or p_manager_id is null then false
    when p_subordinate_id = p_manager_id then false
    else exists (
      with recursive chain as (
        select edm.employee_id as id
        from public.employee_direct_managers edm
        where edm.manager_id = p_manager_id
        union
        select edm.employee_id
        from public.employee_direct_managers edm
        inner join chain c on edm.manager_id = c.id
      )
      select 1 from chain where id = p_subordinate_id
    )
  end;
$$;

create or replace function public.is_my_direct_manager(p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_direct_managers edm
    where edm.employee_id = public.auth_employee_id()
      and edm.manager_id = p_manager_id
  );
$$;

grant execute on function public.auth_employee_id() to authenticated;
grant execute on function public.is_org_subordinate(uuid, uuid) to authenticated;
grant execute on function public.is_my_direct_manager(uuid) to authenticated;

-- Team requests: subordinate asks direct manager above in org tree.
create table if not exists public.team_requests (
  id                    uuid primary key default gen_random_uuid(),
  requester_id          uuid not null references public.employees (id) on delete restrict,
  manager_id            uuid not null references public.employees (id) on delete restrict,
  title                 text not null,
  description           text,
  status                text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'converted')),
  manager_response      text,
  converted_mission_id    uuid references public.team_missions (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint team_requests_not_self check (requester_id <> manager_id)
);

create index if not exists idx_team_requests_requester on public.team_requests (requester_id);
create index if not exists idx_team_requests_manager on public.team_requests (manager_id);
create index if not exists idx_team_requests_status on public.team_requests (status);

drop trigger if exists trg_team_requests_updated_at on public.team_requests;
create trigger trg_team_requests_updated_at
  before update on public.team_requests
  for each row execute function set_updated_at();

alter table public.team_requests enable row level security;

drop policy if exists team_requests_select on public.team_requests;
create policy team_requests_select on public.team_requests
  for select to authenticated
  using (
    has_role('admin', 'production')
    or requester_id = auth_employee_id()
    or manager_id = auth_employee_id()
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
    or manager_id = auth_employee_id()
  )
  with check (
    has_role('admin', 'production')
    or manager_id = auth_employee_id()
  );

grant select, insert, update on public.team_requests to authenticated;

-- Managers may assign missions only to org subordinates (admins/production keep full access).
drop policy if exists team_missions_write on public.team_missions;

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
    or is_org_subordinate(assignee_id, auth_employee_id())
  )
  with check (
    has_role('admin', 'production')
    or is_org_subordinate(assignee_id, auth_employee_id())
  );

drop policy if exists team_missions_delete on public.team_missions;
create policy team_missions_delete on public.team_missions
  for delete to authenticated
  using (
    has_role('admin', 'production')
    or is_org_subordinate(assignee_id, auth_employee_id())
  );

-- Convert accepted request into a mission assigned to a subordinate.
create or replace function public.convert_team_request_to_mission(
  p_request_id uuid,
  p_assignee_id uuid,
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
begin
  v_manager_id := auth_employee_id();
  if v_manager_id is null and not has_role('admin', 'production') then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  select * into v_req from public.team_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  if not has_role('admin', 'production') and v_req.manager_id <> v_manager_id then
    raise exception 'NOT_REQUEST_MANAGER';
  end if;

  if not is_org_subordinate(p_assignee_id, coalesce(v_manager_id, v_req.manager_id)) then
    raise exception 'ASSIGNEE_NOT_SUBORDINATE';
  end if;

  if p_priority not in ('low', 'normal', 'high') then
    raise exception 'INVALID_PRIORITY';
  end if;

  insert into public.team_missions (title, description, assignee_id, status, priority, due_date, notes)
  values (
    v_req.title,
    v_req.description,
    p_assignee_id,
    'pending',
    p_priority,
    p_due_date,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_mission_id;

  update public.team_requests
  set
    status = 'converted',
    converted_mission_id = v_mission_id,
    manager_response = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_request_id;

  return v_mission_id;
end;
$$;

grant execute on function public.convert_team_request_to_mission(uuid, uuid, text, date, text) to authenticated;
