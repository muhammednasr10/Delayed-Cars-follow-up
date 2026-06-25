-- Daily station manpower assignments (workforce distribution).

create table if not exists public.station_manpower_daily (
  id           uuid primary key default gen_random_uuid(),
  work_date    date not null,
  station_id   uuid not null references public.stations (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete cascade,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint station_manpower_daily_unique unique (work_date, station_id, employee_id)
);

create index if not exists idx_station_manpower_daily_date on public.station_manpower_daily (work_date);
create index if not exists idx_station_manpower_daily_station on public.station_manpower_daily (station_id);
create index if not exists idx_station_manpower_daily_employee on public.station_manpower_daily (employee_id);

drop trigger if exists trg_station_manpower_daily_updated_at on public.station_manpower_daily;
create trigger trg_station_manpower_daily_updated_at
  before update on public.station_manpower_daily
  for each row execute function set_updated_at();

alter table public.station_manpower_daily enable row level security;

drop policy if exists station_manpower_daily_select on public.station_manpower_daily;
create policy station_manpower_daily_select on public.station_manpower_daily
  for select to authenticated using (true);

drop policy if exists station_manpower_daily_write on public.station_manpower_daily;
create policy station_manpower_daily_write on public.station_manpower_daily
  for all to authenticated
  using (has_role('admin', 'production') or has_permission('employees', 'update'))
  with check (has_role('admin', 'production') or has_permission('employees', 'update'));

grant select, insert, update, delete on public.station_manpower_daily to authenticated;
