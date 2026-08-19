-- Allow mission assignees to respond (append note) and mark in progress.

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
  v_existing_notes text;
  v_entry text;
  v_status text;
begin
  if nullif(trim(p_response), '') is null then
    raise exception 'RESPONSE_REQUIRED';
  end if;

  v_employee_id := auth_employee_id();
  if v_employee_id is null then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  if not is_mission_assignee(p_mission_id, v_employee_id) then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

  select coalesce(e.full_name, '—'), coalesce(tm.notes, ''), tm.status
  into v_name, v_existing_notes, v_status
  from public.team_missions tm
  left join public.employees e on e.id = v_employee_id
  where tm.id = p_mission_id;

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_entry := to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI') || ' UTC · ' || v_name || ': ' || trim(p_response);

  update public.team_missions
  set
    notes = case
      when coalesce(v_existing_notes, '') = '' then v_entry
      else v_existing_notes || E'\n\n' || v_entry
    end,
    status = case when v_status = 'pending' then 'in_progress' else v_status end
  where id = p_mission_id;
end;
$$;

grant execute on function public.respond_my_team_mission(uuid, text) to authenticated;

notify pgrst, 'reload schema';
