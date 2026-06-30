-- Granular missing-parts UI: tabs, filters, row actions.

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_missing__active', 'نواقص — قائمة النواقص', 'Missing parts — list'),
  ('pages', 'production_missing__summary', 'نواقص — ملخص النواقص', 'Missing parts — summary'),
  ('pages', 'production_missing__history', 'نواقص — الأرشيف', 'Missing parts — archive'),
  ('pages', 'production_missing__historySummary', 'نواقص — ملخص الأرشيف', 'Missing parts — archive summary'),
  ('missing_parts', 'filter', 'استخدام الفلاتر', 'Use filters'),
  ('missing_parts', 'update_status', 'تحديث الكميات المركّبة', 'Update install quantities'),
  ('missing_parts', 'notes', 'ملاحظات السيارة', 'Vehicle notes'),
  ('missing_parts', 'complete', 'انتهاء من السيارة', 'Complete vehicle'),
  ('missing_parts', 'bulk_install', 'التركيب الجماعي', 'Bulk install')
on conflict (module_key, permission_key) do nothing;

-- Tab visibility mirrors parent page access.
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_tab.id, bool_or(rp.allowed)
from public.system_permissions sp_parent
join public.role_permissions rp on rp.permission_id = sp_parent.id and rp.allowed = true
join public.system_permissions sp_tab
  on sp_tab.module_key = 'pages'
 and sp_tab.permission_key in (
   'production_missing__active',
   'production_missing__summary',
   'production_missing__history',
   'production_missing__historySummary'
 )
where sp_parent.module_key = 'pages' and sp_parent.permission_key = 'production_missing'
group by rp.role_id, sp_tab.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- filter + notes from view
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_new.id, bool_or(rp.allowed)
from public.system_permissions sp_old
join public.role_permissions rp on rp.permission_id = sp_old.id and rp.allowed = true
join public.system_permissions sp_new
  on sp_new.module_key = 'missing_parts'
 and sp_new.permission_key in ('filter', 'notes')
where sp_old.module_key = 'missing_parts' and sp_old.permission_key = 'view'
group by rp.role_id, sp_new.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- update_status + bulk_install from update
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_new.id, bool_or(rp.allowed)
from public.system_permissions sp_old
join public.role_permissions rp on rp.permission_id = sp_old.id and rp.allowed = true
join public.system_permissions sp_new
  on sp_new.module_key = 'missing_parts'
 and sp_new.permission_key in ('update_status', 'bulk_install')
where sp_old.module_key = 'missing_parts' and sp_old.permission_key = 'update'
group by rp.role_id, sp_new.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- complete from approve or update
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_new.id, bool_or(rp.allowed)
from public.system_permissions sp_old
join public.role_permissions rp on rp.permission_id = sp_old.id and rp.allowed = true
join public.system_permissions sp_new
  on sp_new.module_key = 'missing_parts' and sp_new.permission_key = 'complete'
where sp_old.module_key = 'missing_parts' and sp_old.permission_key in ('approve', 'update')
group by rp.role_id, sp_new.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
