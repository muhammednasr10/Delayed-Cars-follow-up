-- A line stop can stay open and be closed later.

alter table public.production_line_stops
  alter column ended_at drop not null;

alter table public.production_line_stops
  drop constraint if exists production_line_stops_time_order;

alter table public.production_line_stops
  add constraint production_line_stops_time_order
  check (ended_at is null or ended_at > started_at);
