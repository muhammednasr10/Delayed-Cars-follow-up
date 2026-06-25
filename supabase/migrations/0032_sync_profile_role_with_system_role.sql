-- Keep profiles.role aligned with system_roles when legacy role is admin but system role stayed viewer.

update profiles p
set system_role_id = sr.id
from system_roles sr
where p.role = 'admin'
  and sr.role_code = 'admin'
  and (
    p.system_role_id is null
    or p.system_role_id <> sr.id
  );

update profiles p
set role = 'admin'::user_role
from system_roles sr
where p.system_role_id = sr.id
  and sr.role_code in ('admin', 'super_admin')
  and p.role = 'viewer'::user_role;
