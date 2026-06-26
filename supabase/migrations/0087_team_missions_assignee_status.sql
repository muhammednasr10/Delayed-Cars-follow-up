-- Allow assignees to update status on their own team missions.

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
    and assignee_id = v_employee_id;

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.update_my_team_mission_status(uuid, text) to authenticated;
