-- Allow authenticated users to add missing-parts lookup options from the report form.
-- Update/delete remain admin-only.

drop policy if exists mp_reason_options_write on mp_reason_options;
drop policy if exists mp_department_options_write on mp_department_options;

drop policy if exists mp_reason_options_insert on mp_reason_options;
create policy mp_reason_options_insert on mp_reason_options
  for insert to authenticated with check (true);

drop policy if exists mp_reason_options_admin_mutate on mp_reason_options;
create policy mp_reason_options_admin_mutate on mp_reason_options
  for update to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists mp_reason_options_admin_delete on mp_reason_options;
create policy mp_reason_options_admin_delete on mp_reason_options
  for delete to authenticated using (has_role('admin'));

drop policy if exists mp_department_options_insert on mp_department_options;
create policy mp_department_options_insert on mp_department_options
  for insert to authenticated with check (true);

drop policy if exists mp_department_options_admin_mutate on mp_department_options;
create policy mp_department_options_admin_mutate on mp_department_options
  for update to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists mp_department_options_admin_delete on mp_department_options;
create policy mp_department_options_admin_delete on mp_department_options
  for delete to authenticated using (has_role('admin'));
