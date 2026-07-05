insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_home__plan', 'الرئيسية — كارت خطة الإنتاج', 'Home — production plan card'),
  ('pages', 'production_home__manpower', 'الرئيسية — كارت توزيع العمالة', 'Home — manpower card')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_card.id, bool_or(rp.allowed)
from public.system_permissions sp_home
join public.role_permissions rp on rp.permission_id = sp_home.id and rp.allowed = true
join public.system_permissions sp_card
  on sp_card.module_key = 'pages'
 and sp_card.permission_key in ('production_home__plan', 'production_home__manpower')
where sp_home.module_key = 'pages'
  and sp_home.permission_key = 'production_home'
group by rp.role_id, sp_card.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
