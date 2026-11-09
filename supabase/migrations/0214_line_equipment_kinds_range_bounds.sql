-- Theoretical range bounds per tool kind (min/max) for computing actual range from efficiency.

alter table public.line_equipment_kinds
  add column if not exists range_min numeric,
  add column if not exists range_max numeric;

comment on column public.line_equipment_kinds.range_min is
  'Theoretical range lower bound (الرينج النظري — الحد الأدنى).';
comment on column public.line_equipment_kinds.range_max is
  'Theoretical range upper bound (الرينج النظري — الحد الأقصى).';
