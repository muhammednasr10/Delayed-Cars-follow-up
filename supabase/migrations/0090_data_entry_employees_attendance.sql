-- مدخل البيانات: إضافة/تعديل/حذف الموظفين + تسجيل الحضور والانصراف

drop policy if exists employees_insert on employees;
create policy employees_insert on employees
  for insert to authenticated
  with check (has_permission('employees', 'create') or has_role('admin'));

drop policy if exists employees_delete on employees;
create policy employees_delete on employees
  for delete to authenticated
  using (has_permission('employees', 'delete') or has_role('admin'));

drop policy if exists employee_attendance_days_write on employee_attendance_days;
create policy employee_attendance_days_write on employee_attendance_days
  for all to authenticated
  using (has_permission('employees', 'update') or has_role('admin'))
  with check (has_permission('employees', 'update') or has_role('admin'));

-- حذف الموظفين لدور مدخل البيانات (الإضافة والتعديل مفعّلان مسبقاً)
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id, true
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'data_entry'
  and sp.module_key = 'employees'
  and sp.permission_key = 'delete'
  and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
