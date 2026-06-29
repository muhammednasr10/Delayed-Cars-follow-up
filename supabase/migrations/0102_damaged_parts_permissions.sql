-- Permission-aware write access for damaged parts (supervisor / missing_parts roles).

create or replace function can_manage_damaged_parts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    has_role('admin', 'production', 'warehouse')
    or has_permission('users', 'manage')
    or has_permission('production', 'create')
    or has_permission('production', 'update')
    or has_permission('missing_parts', 'create')
    or has_permission('missing_parts', 'update');
$$;

drop policy if exists damaged_parts_write on public.damaged_parts;
create policy damaged_parts_write on public.damaged_parts
  for all to authenticated
  using (can_manage_damaged_parts())
  with check (can_manage_damaged_parts());

drop policy if exists dp_damage_reason_options_write on public.dp_damage_reason_options;
create policy dp_damage_reason_options_write on public.dp_damage_reason_options
  for all to authenticated
  using (can_manage_damaged_parts())
  with check (can_manage_damaged_parts());

drop policy if exists dp_final_decision_options_write on public.dp_final_decision_options;
create policy dp_final_decision_options_write on public.dp_final_decision_options
  for all to authenticated
  using (can_manage_damaged_parts())
  with check (can_manage_damaged_parts());

drop policy if exists damaged_parts_images_write on storage.objects;
create policy damaged_parts_images_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'damaged-parts'
    and can_manage_damaged_parts()
  )
  with check (
    bucket_id = 'damaged-parts'
    and can_manage_damaged_parts()
  );

grant execute on function can_manage_damaged_parts() to authenticated;
