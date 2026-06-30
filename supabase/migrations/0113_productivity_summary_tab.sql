-- Split productivity summary tab from working days tab.

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_productivity__summary', 'الإنتاجية — ملخص الإنتاجية', 'Productivity — summary')
on conflict (module_key, permission_key) do nothing;

update public.system_permissions
set permission_name_ar = 'الإنتاجية — أيام العمل',
    permission_name_en = 'Productivity — working days'
where module_key = 'pages' and permission_key = 'production_productivity__workDays';

-- Mirror workDays grants for summary (users who had the old combined tab).
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_summary.id, bool_or(rp.allowed)
from public.system_permissions sp_wd
join public.role_permissions rp on rp.permission_id = sp_wd.id and rp.allowed = true
join public.system_permissions sp_summary
  on sp_summary.module_key = 'pages' and sp_summary.permission_key = 'production_productivity__summary'
where sp_wd.module_key = 'pages' and sp_wd.permission_key = 'production_productivity__workDays'
group by rp.role_id, sp_summary.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
