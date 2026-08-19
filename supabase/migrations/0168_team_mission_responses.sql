create table if not exists public.team_mission_responses (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.team_missions (id) on delete cascade,
  author_employee_id uuid references public.employees (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_mission_responses_mission
  on public.team_mission_responses (mission_id, created_at);

alter table public.team_mission_responses enable row level security;

drop policy if exists team_mission_responses_select on public.team_mission_responses;
create policy team_mission_responses_select on public.team_mission_responses
  for select to authenticated using (true);

grant select on public.team_mission_responses to authenticated;

create or replace function public.respond_my_team_mission(
  p_mission_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_name text;
  v_status text;
  v_allowed boolean;
begin
  if nullif(trim(p_response), '') is null then
    raise exception 'RESPONSE_REQUIRED';
  end if;

  v_employee_id := auth_employee_id();
  if v_employee_id is null and not has_role('admin', 'production') then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  select tm.status into v_status
  from public.team_missions tm
  where tm.id = p_mission_id;

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_allowed := has_role('admin', 'production')
    or (
      v_employee_id is not null
      and (
        is_mission_assignee(p_mission_id, v_employee_id)
        or mission_assignees_are_subordinates(p_mission_id, v_employee_id)
      )
    );

  if not v_allowed then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

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

  insert into public.team_mission_responses (mission_id, author_employee_id, author_name, body)
  values (p_mission_id, v_employee_id, v_name, trim(p_response));

  update public.team_missions
  set status = case when v_status = 'pending' then 'in_progress' else v_status end
  where id = p_mission_id;
end;
$$;

grant execute on function public.respond_my_team_mission(uuid, text) to authenticated;

notify pgrst, 'reload schema';
