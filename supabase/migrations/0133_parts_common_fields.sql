-- Common station and common name for parts master list (قائمة الأجزاء)
alter table public.parts
  add column if not exists common_station text,
  add column if not exists common_name text;

comment on column public.parts.common_station is 'المحطة الشائعة — unified station label across models';
comment on column public.parts.common_name is 'اسم شائع — canonical display name across models';

create index if not exists idx_parts_common_station on public.parts (common_station) where is_active;
create index if not exists idx_parts_common_name on public.parts (common_name) where is_active;
