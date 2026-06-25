-- Production line stops / downtime records (productivity tab).

create table if not exists public.production_line_stops (
  id              uuid primary key default gen_random_uuid(),
  stop_reason     text not null,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  department      text not null,
  lost_vehicles   integer not null default 0 check (lost_vehicles >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint production_line_stops_time_order check (ended_at > started_at)
);

create index if not exists idx_production_line_stops_started
  on public.production_line_stops (started_at desc);

create index if not exists idx_production_line_stops_department
  on public.production_line_stops (department);

drop trigger if exists trg_production_line_stops_updated_at on public.production_line_stops;
create trigger trg_production_line_stops_updated_at
  before update on public.production_line_stops
  for each row execute function set_updated_at();

alter table public.production_line_stops enable row level security;

drop policy if exists production_line_stops_select on public.production_line_stops;
create policy production_line_stops_select on public.production_line_stops
  for select to authenticated using (true);

drop policy if exists production_line_stops_write on public.production_line_stops;
create policy production_line_stops_write on public.production_line_stops
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.production_line_stops to authenticated;
