-- إصلاح حفظ مصفوفة الصلاحيات + صلاحيات ظهور الصفحات

-- ---------------------------------------------------------------------------
-- RPC آمن لتحديث صلاحيات الدور (يتجاوز مشاكل RLS للمسؤولين)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_role_permissions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    has_permission('users', 'manage')
    or exists (
      select 1
      from profiles p
      join system_roles sr on sr.id = p.system_role_id
      where p.id = auth.uid()
        and sr.role_code in ('super_admin', 'admin')
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    );
$$;

create or replace function public.set_role_permission(
  p_role_id uuid,
  p_permission_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_role_permissions() then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.role_permissions (role_id, permission_id, allowed)
  values (p_role_id, p_permission_id, p_allowed)
  on conflict (role_id, permission_id)
  do update set allowed = excluded.allowed;
end;
$$;

grant execute on function public.set_role_permission(uuid, uuid, boolean) to authenticated;

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_write on public.role_permissions
  for all to authenticated
  using (public.can_manage_role_permissions())
  with check (public.can_manage_role_permissions());

-- ---------------------------------------------------------------------------
-- صلاحيات ظهور الصفحات في القائمة
-- ---------------------------------------------------------------------------
insert into system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_home', 'الإنتاج — الرئيسية', 'Production — Home'),
  ('pages', 'production_missing', 'نقص السيارات', 'Missing parts'),
  ('pages', 'production_productivity', 'الإنتاجية', 'Productivity'),
  ('pages', 'production_training', 'العمالة والتدريب', 'Workforce & training'),
  ('pages', 'production_damaged_parts', 'القطع التالفة', 'Damaged parts'),
  ('pages', 'production_missions', 'المهام', 'Missions'),
  ('pages', 'production_requests', 'الطلبات', 'Requests'),
  ('pages', 'production_scratches', 'الخدوش', 'Scratches'),
  ('pages', 'production_equipment', 'المعدات', 'Equipment'),
  ('pages', 'production_feedback', 'الملاحظات', 'Feedback'),
  ('pages', 'production_settings', 'الإعدادات', 'Settings'),
  ('pages', 'engineering_home', 'الهندسة — الرئيسية', 'Engineering — Home'),
  ('pages', 'engineering_ipl', 'قائمة الأجزاء IPL', 'IPL parts list'),
  ('pages', 'engineering_stations', 'المحطات', 'Stations'),
  ('pages', 'engineering_line_balancing', 'توازن الخط', 'Line balancing'),
  ('pages', 'warehouses_home', 'المخازن — الرئيسية', 'Warehouses — Home'),
  ('pages', 'warehouses_stock', 'المخزون الحالي', 'Current stock'),
  ('pages', 'warehouses_feeding', 'تغذية الخط', 'Line feeding')
on conflict (module_key, permission_key) do nothing;

-- مزامنة أولية: منح صفحة لكل دور إذا كانت وحدة النظام المقابلة مسموحة
insert into role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from role_permissions rp
join system_permissions sp_mod on sp_mod.id = rp.permission_id
join system_permissions sp_page on sp_page.module_key = 'pages'
  and sp_page.permission_key = case sp_mod.module_key
    when 'missing_parts' then 'production_missing'
    when 'production' then 'production_productivity'
    when 'training_matrix' then 'production_training'
    when 'bom' then 'engineering_ipl'
    when 'station_operations' then 'engineering_stations'
    when 'inventory' then 'warehouses_stock'
    else null
  end
where sp_mod.permission_key = 'view'
  and sp_page.permission_key is not null
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- الصفحات الرئيسية + الإعدادات للأدوار التي لديها عرض على dashboard/settings/users
insert into role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from role_permissions rp
join system_permissions sp_mod on sp_mod.id = rp.permission_id
join system_permissions sp_page on sp_page.module_key = 'pages'
  and (
    (sp_page.permission_key in ('production_home', 'engineering_home', 'warehouses_home') and sp_mod.module_key = 'dashboard' and sp_mod.permission_key = 'view')
    or (sp_page.permission_key = 'production_settings' and sp_mod.module_key in ('settings', 'users') and sp_mod.permission_key in ('view', 'manage'))
    or (sp_page.permission_key = 'engineering_line_balancing' and sp_mod.module_key = 'station_operations' and sp_mod.permission_key = 'view')
    or (sp_page.permission_key = 'warehouses_feeding' and sp_mod.module_key = 'inventory' and sp_mod.permission_key = 'view')
  )
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- صفحات الإنتاج الإضافية: افتراضياً للأدوار التي لديها عرض إنتاج
insert into role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_page.id, bool_or(rp.allowed)
from role_permissions rp
join system_permissions sp_mod on sp_mod.id = rp.permission_id and sp_mod.module_key = 'production' and sp_mod.permission_key = 'view'
join system_permissions sp_page on sp_page.module_key = 'pages'
  and sp_page.permission_key in (
    'production_damaged_parts',
    'production_missions',
    'production_requests',
    'production_scratches',
    'production_equipment',
    'production_feedback'
  )
group by rp.role_id, sp_page.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
