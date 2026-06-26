-- Per-model daily manpower + per-model operations labels (separate from general).

alter table public.station_manpower_daily
  add column if not exists vehicle_model_id uuid references public.vehicle_models (id) on delete cascade;

alter table public.station_manpower_daily
  drop constraint if exists station_manpower_daily_unique;

create unique index if not exists station_manpower_daily_unique_general
  on public.station_manpower_daily (work_date, station_id, employee_id)
  where vehicle_model_id is null;

create unique index if not exists station_manpower_daily_unique_model
  on public.station_manpower_daily (work_date, station_id, employee_id, vehicle_model_id)
  where vehicle_model_id is not null;

create index if not exists idx_station_manpower_daily_model
  on public.station_manpower_daily (vehicle_model_id);

create table if not exists public.station_manpower_worker_labels (
  id                  uuid primary key default gen_random_uuid(),
  work_date           date not null,
  station_id          uuid not null references public.stations (id) on delete cascade,
  vehicle_model_id    uuid references public.vehicle_models (id) on delete cascade,
  operations_summary  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists station_manpower_worker_labels_unique_general
  on public.station_manpower_worker_labels (work_date, station_id)
  where vehicle_model_id is null;

create unique index if not exists station_manpower_worker_labels_unique_model
  on public.station_manpower_worker_labels (work_date, station_id, vehicle_model_id)
  where vehicle_model_id is not null;

create index if not exists idx_station_manpower_worker_labels_date
  on public.station_manpower_worker_labels (work_date);

drop trigger if exists trg_station_manpower_worker_labels_updated_at on public.station_manpower_worker_labels;
create trigger trg_station_manpower_worker_labels_updated_at
  before update on public.station_manpower_worker_labels
  for each row execute function set_updated_at();

alter table public.station_manpower_worker_labels enable row level security;

drop policy if exists station_manpower_worker_labels_select on public.station_manpower_worker_labels;
create policy station_manpower_worker_labels_select on public.station_manpower_worker_labels
  for select to authenticated using (true);

drop policy if exists station_manpower_worker_labels_write on public.station_manpower_worker_labels;
create policy station_manpower_worker_labels_write on public.station_manpower_worker_labels
  for all to authenticated
  using (has_role('admin', 'production') or has_permission('employees', 'update'))
  with check (has_role('admin', 'production') or has_permission('employees', 'update'));

grant select, insert, update, delete on public.station_manpower_worker_labels to authenticated;
