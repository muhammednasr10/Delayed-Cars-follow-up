-- Optional vehicle model + stop type (partial / full) on line stops.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'production_stop_type') then
    create type public.production_stop_type as enum ('partial', 'full');
  end if;
end $$;

alter table public.production_line_stops
  add column if not exists vehicle_model_id uuid references public.vehicle_models (id) on delete set null,
  add column if not exists stop_type public.production_stop_type not null default 'partial';

create index if not exists idx_production_line_stops_model
  on public.production_line_stops (vehicle_model_id);
