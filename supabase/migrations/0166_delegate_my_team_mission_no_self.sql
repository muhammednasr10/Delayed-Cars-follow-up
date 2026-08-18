-- Prevent delegating a mission to yourself (even for admins)

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
    -- never allow self delegation
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
end;
$$;

notify pgrst, 'reload schema';

