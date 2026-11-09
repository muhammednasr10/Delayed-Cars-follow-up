-- Assembly-only page: الجودة الداخلية (production internal quality).

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values ('pages', 'production_internal_quality', 'الإنتاج — الجودة الداخلية', 'Production — Internal quality')
on conflict (module_key, permission_key) do nothing;

-- Grant to roles that already have production page view (same pattern as scratches/equipment).
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from public.role_permissions rp
join public.system_permissions sp_mod
  on sp_mod.id = rp.permission_id
 and sp_mod.module_key = 'production'
 and sp_mod.permission_key = 'view'
join public.system_permissions sp_page
  on sp_page.module_key = 'pages'
 and sp_page.permission_key = 'production_internal_quality'
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
