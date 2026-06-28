-- القسم المتسبب في سجل الأجزاء التالفة

alter table public.damaged_parts
  add column if not exists causing_department text;

comment on column public.damaged_parts.causing_department is
  'Department responsible for the damage (warehouse, production, etc.)';
