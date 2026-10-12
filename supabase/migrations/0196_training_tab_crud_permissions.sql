-- إضافة وتعديل وحذف مستقلين لكل تبويب فرعي في العمالة.

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
select
  'pages',
  tab.page_key || '::' || act.perm_key,
  tab.name_ar || ' — ' || act.name_ar,
  tab.name_en || ' — ' || act.name_en
from (values
  ('production_training__attendance', 'الحضور والانصراف', 'Attendance'),
  ('production_training__manpower', 'توزيع العمالة', 'Manpower'),
  ('production_training__operations', 'تأهيل العمليات', 'Operations'),
  ('production_training__stationSkills', 'مصفوفة التدريب', 'Training matrix'),
  ('production_training__matrix', 'تدريب الموظفين', 'Employee training'),
  ('production_training__qualification', 'تأهيل المحطات', 'Qualification'),
  ('production_training__expiry', 'انتهاء التدريبات', 'Training expiry')
) as tab(page_key, name_ar, name_en)
cross join (values
  ('create', 'إضافة', 'Create'),
  ('update', 'تعديل', 'Update'),
  ('delete', 'حذف', 'Delete')
) as act(perm_key, name_ar, name_en)
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from public.system_permissions sp_mod
join public.system_permissions sp_page
  on sp_page.module_key = 'pages'
 and sp_page.permission_key in (
   'production_training__attendance::' || sp_mod.permission_key,
   'production_training__manpower::' || sp_mod.permission_key
 )
join public.role_permissions rp on rp.permission_id = sp_mod.id
where sp_mod.module_key = 'employees'
  and sp_mod.permission_key in ('create', 'update', 'delete')
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from public.system_permissions sp_mod
join public.system_permissions sp_page
  on sp_page.module_key = 'pages'
 and sp_page.permission_key in (
   'production_training__operations::' || sp_mod.permission_key,
   'production_training__stationSkills::' || sp_mod.permission_key,
   'production_training__matrix::' || sp_mod.permission_key,
   'production_training__qualification::' || sp_mod.permission_key,
   'production_training__expiry::' || sp_mod.permission_key
 )
join public.role_permissions rp on rp.permission_id = sp_mod.id
where sp_mod.module_key = 'training_matrix'
  and sp_mod.permission_key in ('create', 'update', 'delete')
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
