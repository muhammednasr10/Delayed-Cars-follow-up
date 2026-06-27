-- مدخل البيانات: ربط المديرين المباشرين عند إضافة/تعديل الموظف

drop policy if exists employee_direct_managers_insert on employee_direct_managers;
create policy employee_direct_managers_insert on employee_direct_managers
  for insert to authenticated
  with check (
    has_role('admin')
    or has_permission('employees', 'create')
    or has_permission('employees', 'update')
  );

drop policy if exists employee_direct_managers_update on employee_direct_managers;
create policy employee_direct_managers_update on employee_direct_managers
  for update to authenticated
  using (
    has_role('admin')
    or has_permission('employees', 'create')
    or has_permission('employees', 'update')
  )
  with check (
    has_role('admin')
    or has_permission('employees', 'create')
    or has_permission('employees', 'update')
  );

drop policy if exists employee_direct_managers_delete on employee_direct_managers;
create policy employee_direct_managers_delete on employee_direct_managers
  for delete to authenticated
  using (
    has_role('admin')
    or has_permission('employees', 'create')
    or has_permission('employees', 'update')
  );
