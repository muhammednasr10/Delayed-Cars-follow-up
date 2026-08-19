insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('missions', 'assign', 'تعيين المهمات', 'Assign missions'),
  ('missions', 'view_all', 'عرض كل المهمات', 'View all missions')
on conflict (module_key, permission_key) do update set
  permission_name_ar = excluded.permission_name_ar,
  permission_name_en = excluded.permission_name_en,
  is_active = true;

create or replace function public.can_write_team_mission_assignee(p_assignee_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_emp uuid;
begin
  if has_role('admin', 'production') then
    return true;
  end if;

  if has_permission('missions', 'assign') and has_permission('missions', 'view_all') then
    return p_assignee_id is not null;
  end if;

  v_emp := auth_employee_id();
  if v_emp is null or p_assignee_id is null then
    return false;
  end if;

  return is_org_subordinate(p_assignee_id, v_emp);
end;
$$;

drop policy if exists team_missions_insert on public.team_missions;
create policy team_missions_insert on public.team_missions
  for insert to authenticated
  with check (public.can_write_team_mission_assignee(assignee_id));

drop policy if exists team_missions_update on public.team_missions;
create policy team_missions_update on public.team_missions
  for update to authenticated
  using (public.can_write_team_mission_assignee(assignee_id))
  with check (public.can_write_team_mission_assignee(assignee_id));

drop policy if exists team_missions_delete on public.team_missions;
create policy team_missions_delete on public.team_missions
  for delete to authenticated
  using (public.can_write_team_mission_assignee(assignee_id));

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

grant execute on function public.can_write_team_mission_assignee(uuid) to authenticated;
grant execute on function public.sync_team_mission_assignees(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
