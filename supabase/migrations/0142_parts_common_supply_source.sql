-- Common supplier on parts master (قائمة الأجزاء — المورد الشائع)
alter table public.parts
  add column if not exists common_supply_source text;

comment on column public.parts.common_supply_source is 'المورد الشائع — default CKD/Local for this part across models';

create index if not exists idx_parts_common_supply on public.parts (common_supply_source) where is_active;
