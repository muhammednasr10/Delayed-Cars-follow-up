-- Align RLS write access with the permissions matrix (has_permission),
-- matching the frontend: users.manage and module.manage act as supersets.

-- ---------------------------------------------------------------------------
-- has_permission: users.manage / module.manage bypass (same as PermissionsContext)
-- ---------------------------------------------------------------------------
create or replace function public.has_permission(p_module text, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perms jsonb;
  key text;
begin
  if not is_session_allowed() then
    return false;
  end if;

  perms := get_current_user_permissions();

  if coalesce((perms ->> 'users.manage')::boolean, false) then
    return true;
  end if;

  if p_permission is distinct from 'manage'
     and coalesce((perms ->> (p_module || '.manage'))::boolean, false) then
    return true;
  end if;

  key := p_module || '.' || p_permission;
  return coalesce((perms ->> key)::boolean, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers for policies
-- ---------------------------------------------------------------------------
create or replace function public.can_module(p_module text, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission(p_module, p_permission);
$$;

create or replace function public.can_module_write(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_permission(p_module, 'create')
    or public.has_permission(p_module, 'update')
    or public.has_permission(p_module, 'delete')
    or public.has_permission(p_module, 'manage');
$$;

grant execute on function public.can_module(text, text) to authenticated;
grant execute on function public.can_module_write(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Scratches (production)
-- ---------------------------------------------------------------------------
drop policy if exists scratches_insert on public.scratches;
create policy scratches_insert on public.scratches
  for insert to authenticated
  with check (can_module('production', 'create'));

drop policy if exists scratches_update on public.scratches;
create policy scratches_update on public.scratches
  for update to authenticated
  using (can_module('production', 'update'))
  with check (can_module('production', 'update'));

drop policy if exists scratches_delete on public.scratches;
create policy scratches_delete on public.scratches
  for delete to authenticated
  using (can_module('production', 'delete'));

-- ---------------------------------------------------------------------------
-- Attendance (employees + training_matrix)
-- ---------------------------------------------------------------------------
drop policy if exists employee_attendance_days_write on public.employee_attendance_days;
create policy employee_attendance_days_write on public.employee_attendance_days
  for all to authenticated
  using (
    can_module('employees', 'update')
    or can_module('training_matrix', 'create')
    or can_module('training_matrix', 'update')
    or can_module('training_matrix', 'manage')
  )
  with check (
    can_module('employees', 'update')
    or can_module('training_matrix', 'create')
    or can_module('training_matrix', 'update')
    or can_module('training_matrix', 'manage')
  );

-- ---------------------------------------------------------------------------
-- Entry / exit productivity
-- ---------------------------------------------------------------------------
drop policy if exists entry_productivity_daily_write on public.entry_productivity_daily;
create policy entry_productivity_daily_write on public.entry_productivity_daily
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

drop policy if exists exit_productivity_daily_write on public.exit_productivity_daily;
create policy exit_productivity_daily_write on public.exit_productivity_daily
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

-- ---------------------------------------------------------------------------
-- Production stops
-- ---------------------------------------------------------------------------
drop policy if exists production_line_stops_write on public.production_line_stops;
create policy production_line_stops_write on public.production_line_stops
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

-- ---------------------------------------------------------------------------
-- Production plan / work days
-- ---------------------------------------------------------------------------
drop policy if exists production_plan_work_days_daily_write on public.production_plan_work_days_daily;
create policy production_plan_work_days_daily_write on public.production_plan_work_days_daily
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

drop policy if exists production_plan_working_days_write on public.production_plan_working_days;
create policy production_plan_working_days_write on public.production_plan_working_days
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

drop policy if exists model_production_plan_targets_write on public.model_production_plan_targets;
create policy model_production_plan_targets_write on public.model_production_plan_targets
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

drop policy if exists production_plan_group_targets_write on public.production_plan_group_targets;
create policy production_plan_group_targets_write on public.production_plan_group_targets
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

-- ---------------------------------------------------------------------------
-- Damaged parts — matrix permissions (not legacy role alone)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_damaged_parts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    can_module_write('production')
    or can_module('missing_parts', 'create')
    or can_module('missing_parts', 'update')
    or can_module('missing_parts', 'manage')
    or can_module('inventory', 'update')
    or can_module('inventory', 'create');
$$;

-- ---------------------------------------------------------------------------
-- Quality notes
-- ---------------------------------------------------------------------------
drop policy if exists quality_notes_insert on public.quality_notes;
create policy quality_notes_insert on public.quality_notes
  for insert to authenticated
  with check (can_module('qc', 'create') or can_module('qc', 'update') or can_module('production', 'create'));

drop policy if exists quality_notes_update on public.quality_notes;
create policy quality_notes_update on public.quality_notes
  for update to authenticated
  using (can_module('qc', 'update') or can_module('qc', 'manage'))
  with check (can_module('qc', 'update') or can_module('qc', 'manage'));

drop policy if exists quality_notes_delete on public.quality_notes;
create policy quality_notes_delete on public.quality_notes
  for delete to authenticated
  using (can_module('qc', 'delete') or can_module('qc', 'manage'));

-- ---------------------------------------------------------------------------
-- Station manpower
-- ---------------------------------------------------------------------------
drop policy if exists station_manpower_daily_write on public.station_manpower_daily;
create policy station_manpower_daily_write on public.station_manpower_daily
  for all to authenticated
  using (
    can_module('employees', 'update')
    or can_module('training_matrix', 'update')
    or can_module('training_matrix', 'manage')
    or can_module_write('production')
  )
  with check (
    can_module('employees', 'update')
    or can_module('training_matrix', 'update')
    or can_module('training_matrix', 'manage')
    or can_module_write('production')
  );
