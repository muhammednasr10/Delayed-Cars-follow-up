-- Working range per physical tool (e.g. 5–14 Nm).

alter table public.line_equipment
  add column if not exists operating_range text not null default '';

comment on column public.line_equipment.operating_range is
  'Working range for this tool unit, e.g. 5–14 Nm (الرينج).';
