-- Tab-level page permissions + quality notes page.

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'quality_notes', 'الجودة — ملاحظات', 'Quality — notes'),
  ('pages', 'production_productivity__orders', 'الإنتاجية — خطة الإنتاج', 'Productivity — plan'),
  ('pages', 'production_productivity__entry', 'الإنتاجية — دخول', 'Productivity — entry'),
  ('pages', 'production_productivity__exit', 'الإنتاجية — خروج', 'Productivity — exit'),
  ('pages', 'production_productivity__stops', 'الإنتاجية — توقفات', 'Productivity — stops'),
  ('pages', 'production_productivity__workDays', 'الإنتاجية — ملخص الأيام', 'Productivity — work days'),
  ('pages', 'production_productivity__planOrders', 'الإنتاجية — أوامر الإنتاج', 'Productivity — plan orders'),
  ('pages', 'production_training__org', 'العمالة — سجل العمالة', 'Workforce — org'),
  ('pages', 'production_training__attendance', 'العمالة — حضور وانصراف', 'Workforce — attendance'),
  ('pages', 'production_training__manpower', 'العمالة — توزيع العمالة', 'Workforce — manpower'),
  ('pages', 'production_training__operations', 'العمالة — تأهيل العمليات', 'Workforce — operations'),
  ('pages', 'production_training__stationSkills', 'العمالة — مصفوفة التدريب', 'Workforce — matrix'),
  ('pages', 'production_training__matrix', 'العمالة — تدريب الموظفين', 'Workforce — employee matrix'),
  ('pages', 'production_training__qualification', 'العمالة — تأهيل المحطات', 'Workforce — qualification'),
  ('pages', 'production_training__expiry', 'العمالة — انتهاء التدريبات', 'Workforce — expiry'),
  ('pages', 'production_worker_profile__data', 'البروفايل — بيانات', 'Profile — data'),
  ('pages', 'production_worker_profile__station', 'البروفايل — المحطة', 'Profile — station'),
  ('pages', 'production_worker_profile__equipment', 'البروفايل — العدة', 'Profile — equipment'),
  ('pages', 'production_worker_profile__attendance', 'البروفايل — حضور', 'Profile — attendance'),
  ('pages', 'production_worker_profile__errors', 'البروفايل — أخطاء', 'Profile — errors'),
  ('pages', 'production_settings__administrations', 'الإعدادات — الإدارات', 'Settings — administrations'),
  ('pages', 'production_settings__models', 'الإعدادات — الموديلات', 'Settings — models'),
  ('pages', 'production_settings__stations', 'الإعدادات — المحطات', 'Settings — stations'),
  ('pages', 'production_settings__colors', 'الإعدادات — الألوان', 'Settings — colors'),
  ('pages', 'production_settings__users', 'الإعدادات — المستخدمون', 'Settings — users'),
  ('pages', 'engineering_ipl__parts', 'IPL — الأجزاء', 'IPL — parts'),
  ('pages', 'engineering_ipl__partsGd', 'IPL — أجزاء GD', 'IPL — GD parts'),
  ('pages', 'engineering_ipl__compare', 'IPL — مقارنة', 'IPL — compare'),
  ('pages', 'engineering_ipl__categories', 'IPL — التصنيفات', 'IPL — categories'),
  ('pages', 'engineering_ipl__import', 'IPL — استيراد', 'IPL — import'),
  ('pages', 'engineering_ipl__dashboard', 'IPL — لوحة', 'IPL — dashboard'),
  ('pages', 'engineering_line_balancing__operations', 'توازن الخط — العمليات', 'Line balancing — operations'),
  ('pages', 'engineering_line_balancing__opParts', 'توازن الخط — أجزاء العمليات', 'Line balancing — op parts'),
  ('pages', 'engineering_line_balancing__timeStudy', 'توازن الخط — دراسة الوقت', 'Line balancing — time study'),
  ('pages', 'engineering_line_balancing__routing', 'توازن الخط — التوجيه', 'Line balancing — routing'),
  ('pages', 'engineering_line_balancing__manpower', 'توازن الخط — العمالة', 'Line balancing — manpower'),
  ('pages', 'engineering_line_balancing__import', 'توازن الخط — استيراد', 'Line balancing — import'),
  ('pages', 'warehouses_feeding__plan', 'التغذية — الخطة', 'Feeding — plan'),
  ('pages', 'warehouses_feeding__actual', 'التغذية — الفعلي', 'Feeding — actual'),
  ('pages', 'quality_notes__record', 'الجودة — التسجيل', 'Quality — record'),
  ('pages', 'quality_notes__study', 'الجودة — الدراسة', 'Quality — study')
on conflict (module_key, permission_key) do nothing;

-- Inherit role grants from parent page permission for tab keys.
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_child.id, rp.allowed
from public.system_permissions sp_parent
join public.system_permissions sp_child
  on sp_child.module_key = 'pages'
 and sp_child.permission_key like sp_parent.permission_key || '__%'
join public.role_permissions rp on rp.permission_id = sp_parent.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- quality_notes: mirror qc.view for roles that have it
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_qn.id, rp.allowed
from public.system_permissions sp_qc
join public.system_permissions sp_qn on sp_qn.module_key = 'pages' and sp_qn.permission_key = 'quality_notes'
join public.role_permissions rp on rp.permission_id = sp_qc.id
where sp_qc.module_key = 'qc' and sp_qc.permission_key = 'view'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
