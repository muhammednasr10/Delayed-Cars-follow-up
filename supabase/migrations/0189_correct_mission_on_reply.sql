create or replace function public.correct_my_team_mission(
  p_mission_id uuid,
  p_parent_model_id uuid,
  p_variant_model_id uuid,
  p_vehicle_count integer,
  p_chassis_numbers text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_allowed boolean;
begin
  if not exists (select 1 from public.team_missions where id = p_mission_id) then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_employee_id := auth_employee_id();
  v_allowed := has_role('admin', 'production')
    or (
      v_employee_id is not null
      and (
        is_mission_assignee(p_mission_id, v_employee_id)
        or mission_assignees_are_subordinates(p_mission_id, v_employee_id)
      )
    )
    or (
      has_permission('missions', 'assign')
      and has_permission('missions', 'view_all')
    );

  if not v_allowed then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

  update public.team_missions
  set
    parent_model_id = p_parent_model_id,
    variant_model_id = p_variant_model_id,
    vehicle_count = p_vehicle_count,
    chassis_numbers = coalesce(p_chassis_numbers, '{}'::text[])
  where id = p_mission_id;
end;
$$;

grant execute on function public.correct_my_team_mission(uuid, uuid, uuid, integer, text[]) to authenticated;

notify pgrst, 'reload schema';
