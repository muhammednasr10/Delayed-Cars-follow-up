-- Quality notes: multi-model, worker, vehicle count, VIN list, creatable categories.

create table if not exists public.qn_category_options (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_ar   text not null,
  label_en   text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.qn_category_options (code, label_ar, label_en, sort_order) values
  ('assembly', 'تجميع', 'Assembly', 10),
  ('paint', 'طلاء', 'Paint', 20),
  ('trim', 'تريم', 'Trim', 30),
  ('supplier', 'مورد', 'Supplier', 40),
  ('process', 'عملية', 'Process', 50),
  ('other', 'أخرى', 'Other', 99)
on conflict (code) do nothing;

drop trigger if exists trg_qn_category_options_updated_at on public.qn_category_options;
create trigger trg_qn_category_options_updated_at
  before update on public.qn_category_options
  for each row execute function set_updated_at();

alter table public.qn_category_options enable row level security;

drop policy if exists qn_category_options_select on public.qn_category_options;
create policy qn_category_options_select on public.qn_category_options
  for select to authenticated using (true);

drop policy if exists qn_category_options_write on public.qn_category_options;
create policy qn_category_options_write on public.qn_category_options
  for all to authenticated
  using (has_role('admin', 'quality'))
  with check (has_role('admin', 'quality'));

grant select, insert, update, delete on public.qn_category_options to authenticated;

alter table public.quality_notes
  drop constraint if exists quality_notes_category_check;

alter table public.quality_notes
  add column if not exists vehicle_model_ids uuid[] not null default '{}',
  add column if not exists worker_employee_id uuid references public.employees (id) on delete set null,
  add column if not exists vehicle_count integer not null default 1 check (vehicle_count > 0),
  add column if not exists vins text[] not null default '{}';

-- Migrate legacy single-value columns only when they still exist (0103 shape).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quality_notes' and column_name = 'vehicle_model_id'
  ) then
    update public.quality_notes
    set vehicle_model_ids = array[vehicle_model_id]
    where vehicle_model_id is not null
      and (vehicle_model_ids is null or vehicle_model_ids = '{}');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quality_notes' and column_name = 'vin'
  ) then
    update public.quality_notes
    set vins = array[vin]
    where vin is not null
      and trim(vin) <> ''
      and (vins is null or vins = '{}');
  end if;
end $$;

alter table public.quality_notes drop column if exists vehicle_model_id;
alter table public.quality_notes drop column if exists vin;

create index if not exists idx_quality_notes_worker on public.quality_notes (worker_employee_id);
create index if not exists idx_quality_notes_models on public.quality_notes using gin (vehicle_model_ids);
