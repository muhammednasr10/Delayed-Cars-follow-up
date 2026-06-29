-- Quality department: record and study quality observations.

create table if not exists public.quality_notes (
  id                uuid primary key default gen_random_uuid(),
  vin               text,
  station_id        uuid references public.stations (id) on delete set null,
  vehicle_model_id  uuid references public.vehicle_models (id) on delete set null,
  category          text not null
    check (category in ('assembly', 'paint', 'trim', 'supplier', 'process', 'other')),
  severity          text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status            text not null default 'open'
    check (status in ('open', 'under_study', 'closed')),
  description       text not null,
  study_notes       text,
  noted_at          date not null default current_date,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_quality_notes_noted_at on public.quality_notes (noted_at desc);
create index if not exists idx_quality_notes_status on public.quality_notes (status);
create index if not exists idx_quality_notes_category on public.quality_notes (category);
create index if not exists idx_quality_notes_station on public.quality_notes (station_id);

drop trigger if exists trg_quality_notes_updated_at on public.quality_notes;
create trigger trg_quality_notes_updated_at
  before update on public.quality_notes
  for each row execute function set_updated_at();

drop trigger if exists trg_quality_notes_created_by on public.quality_notes;
create trigger trg_quality_notes_created_by
  before insert on public.quality_notes
  for each row execute function set_created_by();

alter table public.quality_notes enable row level security;

drop policy if exists quality_notes_select on public.quality_notes;
create policy quality_notes_select on public.quality_notes
  for select to authenticated using (true);

drop policy if exists quality_notes_insert on public.quality_notes;
create policy quality_notes_insert on public.quality_notes
  for insert to authenticated
  with check (has_role('admin', 'quality', 'production'));

drop policy if exists quality_notes_update on public.quality_notes;
create policy quality_notes_update on public.quality_notes
  for update to authenticated
  using (has_role('admin', 'quality'))
  with check (has_role('admin', 'quality'));

drop policy if exists quality_notes_delete on public.quality_notes;
create policy quality_notes_delete on public.quality_notes
  for delete to authenticated
  using (has_role('admin'));

grant select, insert, update, delete on public.quality_notes to authenticated;
