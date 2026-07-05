-- Home page card visibility permissions (under pages.production_home).

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_home__missing', 'الرئيسية — كارت نواقص السيارات', 'Home — missing parts card'),
  ('pages', 'production_home__entry', 'الرئيسية — كارت إنتاجية الدخول', 'Home — entry productivity card'),
  ('pages', 'production_home__exit', 'الرئيسية — كارت إنتاجية الخروج', 'Home — exit productivity card'),
  ('pages', 'production_home__stops', 'الرئيسية — كارت التوقفات', 'Home — stops card'),
  ('pages', 'production_home__attendance', 'الرئيسية — كارت الحضور', 'Home — attendance card'),
  ('pages', 'production_home__training', 'الرئيسية — كارت العمالة', 'Home — workforce card'),
  ('pages', 'production_home__damaged', 'الرئيسية — كارت الأجزاء التالفة', 'Home — damaged parts card'),
  ('pages', 'production_home__missions', 'الرئيسية — كارت المهمات', 'Home — missions card'),
  ('pages', 'production_home__requests', 'الرئيسية — كارت الطلبات', 'Home — requests card'),
  ('pages', 'production_home__scratches', 'الرئيسية — كارت الخدوش', 'Home — scratches card'),
  ('pages', 'production_home__equipment', 'الرئيسية — كارت العدة', 'Home — equipment card'),
  ('pages', 'production_home__feedback', 'الرئيسية — كارت المقترحات', 'Home — feedback card'),
  ('pages', 'production_home__settings', 'الرئيسية — كارت الإعدادات', 'Home — settings card'),
  ('pages', 'production_home__ipl', 'الرئيسية — كارت IPL', 'Home — IPL card'),
  ('pages', 'production_home__stations', 'الرئيسية — كارت المحطات', 'Home — stations card'),
  ('pages', 'production_home__line_balancing', 'الرئيسية — كارت توازن الخط', 'Home — line balancing card'),
  ('pages', 'production_home__stock', 'الرئيسية — كارت المخزون', 'Home — stock card'),
  ('pages', 'production_home__feeding', 'الرئيسية — كارت التغذية', 'Home — feeding card'),
  ('pages', 'production_home__feeding_plan', 'الرئيسية — كارت خطة التغذية', 'Home — feeding plan card')
on conflict (module_key, permission_key) do nothing;

-- Roles that can see production home also get all home cards by default.
insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_card.id, bool_or(rp.allowed)
from public.system_permissions sp_home
join public.role_permissions rp on rp.permission_id = sp_home.id and rp.allowed = true
join public.system_permissions sp_card
  on sp_card.module_key = 'pages'
 and sp_card.permission_key like 'production_home__%'
where sp_home.module_key = 'pages'
  and sp_home.permission_key = 'production_home'
group by rp.role_id, sp_card.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
