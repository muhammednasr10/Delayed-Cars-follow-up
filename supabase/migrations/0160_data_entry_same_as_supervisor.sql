-- Treat data_entry like supervisor for now: same permission matrix and production legacy role.

create or replace function public.legacy_role_for_system_code(p_code text)
returns user_role
language sql
immutable
as $$
  select case p_code
    when 'super_admin' then 'admin'::user_role
    when 'admin' then 'admin'::user_role
    when 'production_manager' then 'production'::user_role
    when 'general_manager' then 'production'::user_role
    when 'engineer' then 'production'::user_role
    when 'supervisor' then 'production'::user_role
    when 'data_entry' then 'production'::user_role
    when 'qc_user' then 'quality'::user_role
    else 'viewer'::user_role
  end;
$$;

insert into public.role_permissions (role_id, permission_id, allowed)
select de.id, sp.id, coalesce(sup.allowed, false)
from public.system_roles de
cross join public.system_permissions sp
join public.system_roles su on su.role_code = 'supervisor'
left join public.role_permissions sup
  on sup.role_id = su.id and sup.permission_id = sp.id
where de.role_code = 'data_entry'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

update public.profiles p
set role = public.legacy_role_for_system_code(sr.role_code)
from public.system_roles sr
where p.system_role_id = sr.id
  and sr.role_code = 'data_entry'
  and p.role is distinct from public.legacy_role_for_system_code(sr.role_code);
