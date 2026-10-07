-- Permission to change the shortage vehicle entry date (missing_parts.created_at).
-- Default grant: engineer and managers. Other roles stay off until the matrix allows them.

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values (
  'missing_parts',
  'edit_entry_date',
  'تعديل تاريخ إدخال السيارة',
  'Edit vehicle entry date'
)
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id, true
from public.system_roles sr
join public.system_permissions sp
  on sp.module_key = 'missing_parts'
 and sp.permission_key = 'edit_entry_date'
where sr.role_code in ('engineer', 'production_manager', 'general_manager', 'admin', 'super_admin')
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

create or replace function public.update_missing_parts_entry_date(
  p_ids uuid[],
  p_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicles int;
begin
  if not public.has_permission('missing_parts', 'edit_entry_date') then
    raise exception 'Permission denied';
  end if;

  if p_created_at is null then
    raise exception 'Entry date is required';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'No shortage lines';
  end if;

  select count(distinct vehicle_id)
    into v_vehicles
  from public.missing_parts
  where id = any(p_ids);

  if v_vehicles <> 1 then
    raise exception 'Entry date applies to one vehicle';
  end if;

  update public.missing_parts
  set created_at = p_created_at
  where id = any(p_ids);
end;
$$;

grant execute on function public.update_missing_parts_entry_date(uuid[], timestamptz) to authenticated;
