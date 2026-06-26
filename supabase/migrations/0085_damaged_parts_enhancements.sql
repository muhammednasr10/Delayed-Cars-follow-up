-- Damaged parts: image, causer (employee), configurable reason/decision options.

create table if not exists public.dp_damage_reason_options (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_ar   text not null,
  label_en   text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dp_final_decision_options (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_ar   text not null,
  label_en   text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.dp_damage_reason_options (code, label_ar, label_en, sort_order) values
  ('production_mistake', 'خطأ إنتاج', 'Production mistake', 10),
  ('handling', 'تلف أثناء التداول', 'Handling damage', 20),
  ('supplier_defect', 'عيب مورد', 'Supplier defect', 30),
  ('storage', 'تلف تخزين', 'Storage damage', 40),
  ('other', 'أخرى', 'Other', 99)
on conflict (code) do nothing;

insert into public.dp_final_decision_options (code, label_ar, label_en, sort_order) values
  ('pending', 'قيد المراجعة', 'Pending review', 10),
  ('scrap', 'إعدام', 'Scrap', 20),
  ('rework', 'إعادة تشغيل', 'Rework', 30),
  ('return_supplier', 'إرجاع للمورد', 'Return to supplier', 40),
  ('use_as_is', 'استخدام كما هو', 'Use as-is', 50)
on conflict (code) do nothing;

alter table public.damaged_parts
  drop constraint if exists damaged_parts_damage_reason_check,
  drop constraint if exists damaged_parts_final_decision_check;

alter table public.damaged_parts
  add column if not exists image_path text,
  add column if not exists caused_by_employee_id uuid references public.employees (id) on delete set null;

create index if not exists idx_damaged_parts_caused_by
  on public.damaged_parts (caused_by_employee_id);

drop trigger if exists trg_dp_damage_reason_options_updated_at on public.dp_damage_reason_options;
create trigger trg_dp_damage_reason_options_updated_at
  before update on public.dp_damage_reason_options
  for each row execute function set_updated_at();

drop trigger if exists trg_dp_final_decision_options_updated_at on public.dp_final_decision_options;
create trigger trg_dp_final_decision_options_updated_at
  before update on public.dp_final_decision_options
  for each row execute function set_updated_at();

alter table public.dp_damage_reason_options enable row level security;
alter table public.dp_final_decision_options enable row level security;

drop policy if exists dp_damage_reason_options_select on public.dp_damage_reason_options;
create policy dp_damage_reason_options_select on public.dp_damage_reason_options
  for select to authenticated using (true);

drop policy if exists dp_damage_reason_options_write on public.dp_damage_reason_options;
create policy dp_damage_reason_options_write on public.dp_damage_reason_options
  for all to authenticated
  using (has_role('admin', 'production', 'warehouse'))
  with check (has_role('admin', 'production', 'warehouse'));

drop policy if exists dp_final_decision_options_select on public.dp_final_decision_options;
create policy dp_final_decision_options_select on public.dp_final_decision_options
  for select to authenticated using (true);

drop policy if exists dp_final_decision_options_write on public.dp_final_decision_options;
create policy dp_final_decision_options_write on public.dp_final_decision_options
  for all to authenticated
  using (has_role('admin', 'production', 'warehouse'))
  with check (has_role('admin', 'production', 'warehouse'));

grant select, insert, update, delete on public.dp_damage_reason_options to authenticated;
grant select, insert, update, delete on public.dp_final_decision_options to authenticated;

-- Damaged-part photos bucket (public read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'damaged-parts',
  'damaged-parts',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists damaged_parts_images_select on storage.objects;
create policy damaged_parts_images_select on storage.objects
  for select to public
  using (bucket_id = 'damaged-parts');

drop policy if exists damaged_parts_images_write on storage.objects;
create policy damaged_parts_images_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'damaged-parts'
    and has_role('admin', 'production', 'warehouse')
  )
  with check (
    bucket_id = 'damaged-parts'
    and has_role('admin', 'production', 'warehouse')
  );
