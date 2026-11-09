-- Manufacturer on tool kinds + helpers for settings catalog counters.

alter table public.line_equipment_kinds
  add column if not exists manufacturer text not null default '';

comment on column public.line_equipment_kinds.manufacturer is
  'Company that manufactures this tool kind (الشركة المصنعة).';
