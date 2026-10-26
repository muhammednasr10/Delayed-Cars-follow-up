-- Per product-line worker count at a station (Tiggo 4 vs Tiggo 8 can differ).
create table if not exists public.station_line_headcounts (
  id            uuid primary key default gen_random_uuid(),
  station_id    uuid not null references public.stations (id) on delete cascade,
  model_line    text not null check (model_line in ('T4', 'T8', 'T7', 'GD', 'Foton')),
  headcount     int not null check (headcount > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (station_id, model_line)
);

create index if not exists idx_station_line_headcounts_station
  on public.station_line_headcounts (station_id);

drop trigger if exists trg_station_line_headcounts_updated_at on public.station_line_headcounts;
create trigger trg_station_line_headcounts_updated_at
  before update on public.station_line_headcounts
  for each row execute function set_updated_at();

alter table public.station_line_headcounts enable row level security;

drop policy if exists station_line_headcounts_select on public.station_line_headcounts;
create policy station_line_headcounts_select on public.station_line_headcounts
  for select to authenticated using (true);

drop policy if exists station_line_headcounts_write on public.station_line_headcounts;
create policy station_line_headcounts_write on public.station_line_headcounts
  for all to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.station_line_headcounts to authenticated;

-- The current station headcount was set for Tiggo 4 with all filters open.
insert into public.station_line_headcounts (station_id, model_line, headcount)
select s.id, 'T4', s.headcount_workers
from public.stations s
where s.headcount_workers is not null
  and s.headcount_workers > 0
  and s.parent_station_id is null
  and s.station_number !~* '-L[0-9]+$'
on conflict (station_id, model_line) do nothing;
