-- Settings page permissions: only admin / super_admin roles keep access.

update public.role_permissions rp
set allowed = false
from public.system_permissions sp, public.system_roles sr
where rp.permission_id = sp.id
  and sr.id = rp.role_id
  and sp.module_key = 'pages'
  and (
    sp.permission_key = 'production_settings'
    or sp.permission_key like 'production_settings__%'
    or sp.permission_key = 'production_home__settings'
  )
  and coalesce(sr.role_code, '') not in ('admin', 'super_admin');

-- Ensure admin roles have settings page permissions.
insert into public.role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id, true
from public.system_roles sr
cross join public.system_permissions sp
where sr.role_code in ('admin', 'super_admin')
  and sp.module_key = 'pages'
  and (
    sp.permission_key = 'production_settings'
    or sp.permission_key like 'production_settings__%'
    or sp.permission_key = 'production_home__settings'
  )
on conflict (role_id, permission_id) do update set allowed = true;
