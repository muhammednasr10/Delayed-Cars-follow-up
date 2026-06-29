-- Worker profile: self punch attendance + page permission.

create or replace function public.punch_my_attendance(p_action text)
returns table (check_in time, check_out time, work_date date, status attendance_day_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_today date := current_date;
  v_now time := localtime;
  v_row employee_attendance_days%rowtype;
begin
  if p_action not in ('in', 'out') then
    raise exception 'INVALID_ACTION';
  end if;

  select employee_id into v_employee_id
  from profiles
  where id = auth.uid();

  if v_employee_id is null then
    raise exception 'NO_LINKED_EMPLOYEE';
  end if;

  select * into v_row
  from employee_attendance_days
  where employee_id = v_employee_id and work_date = v_today
  for update;

  if not found then
    insert into employee_attendance_days (employee_id, work_date, status, check_in, check_out)
    values (
      v_employee_id,
      v_today,
      case when p_action = 'in' then 'present'::attendance_day_status else 'present'::attendance_day_status end,
      case when p_action = 'in' then v_now else null end,
      case when p_action = 'out' then v_now else null end
    )
    returning * into v_row;
  else
    if p_action = 'in' then
      update employee_attendance_days
      set status = 'present',
          check_in = coalesce(check_in, v_now),
          updated_at = now()
      where id = v_row.id
      returning * into v_row;
    else
      update employee_attendance_days
      set check_out = coalesce(check_out, v_now),
          updated_at = now()
      where id = v_row.id
      returning * into v_row;
    end if;
  end if;

  return query
  select v_row.check_in, v_row.check_out, v_row.work_date, v_row.status;
end;
$$;

revoke all on function public.punch_my_attendance(text) from public;
grant execute on function public.punch_my_attendance(text) to authenticated;

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values ('pages', 'production_worker_profile', 'بروفايل العامل — التجميع', 'Worker profile — assembly')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_new.id, bool_or(rp.allowed)
from public.role_permissions rp
join public.system_permissions sp_src on sp_src.id = rp.permission_id
join public.system_permissions sp_new on sp_new.module_key = 'pages' and sp_new.permission_key = 'production_worker_profile'
where sp_src.module_key = 'pages' and sp_src.permission_key = 'production_home'
group by rp.role_id, sp_new.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
