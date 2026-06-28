-- ربط الموظف بوحدة الهيكل التنظيمي (إدارة / قسم / قسم فرعي) من الإعدادات

alter table public.employees
  add column if not exists factory_org_unit_id uuid references public.factory_org_units (id) on delete set null;

create index if not exists idx_employees_factory_org_unit
  on public.employees (factory_org_unit_id);
