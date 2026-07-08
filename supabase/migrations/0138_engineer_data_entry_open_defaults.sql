-- Default: engineer + data_entry can use/edit the whole app except settings (and user admin).
-- Admins can still revoke individual permissions from the permissions matrix.

-- Grant every active permission.
insert into public.role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id, true
from public.system_roles sr
cross join public.system_permissions sp
where sr.role_code in ('engineer', 'data_entry')
  and sp.is_active
on conflict (role_id, permission_id) do update set allowed = true;

-- Explicitly deny settings + user-admin pages/modules (same exclusions as settings-only admin).
update public.role_permissions rp
set allowed = false
from public.system_permissions sp, public.system_roles sr
where rp.permission_id = sp.id
  and sr.id = rp.role_id
  and sr.role_code in ('engineer', 'data_entry')
  and (
    sp.module_key in ('settings', 'users')
    or (
      sp.module_key = 'pages'
      and (
        sp.permission_key = 'production_settings'
        or sp.permission_key like 'production_settings__%'
        or sp.permission_key = 'production_home__settings'
      )
    )
  );
