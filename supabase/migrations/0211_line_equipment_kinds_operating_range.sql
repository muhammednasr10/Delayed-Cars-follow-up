-- Operating range for each tool kind (e.g. torque / force range).

alter table public.line_equipment_kinds
  add column if not exists operating_range text not null default '';

comment on column public.line_equipment_kinds.operating_range is
  'Working range for this tool kind, e.g. 5–14 Nm (الرينج).';
