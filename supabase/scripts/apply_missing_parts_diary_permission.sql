-- Apply in Supabase SQL Editor if MCP apply fails.
-- Same as supabase/migrations/0148_missing_parts_diary_permission.sql

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_missing__historyDiary', 'نواقص — يوميات النواقص', 'Missing parts — shortage diary')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_tab.id, bool_or(rp.allowed)
from public.system_permissions sp_parent
join public.role_permissions rp on rp.permission_id = sp_parent.id and rp.allowed = true
join public.system_permissions sp_tab
  on sp_tab.module_key = 'pages'
 and sp_tab.permission_key = 'production_missing__historyDiary'
where sp_parent.module_key = 'pages'
  and sp_parent.permission_key in (
    'production_missing',
    'production_missing__historySummary'
  )
group by rp.role_id, sp_tab.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
