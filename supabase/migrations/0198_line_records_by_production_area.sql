-- Separate entry, exit, repair, delay reasons, and stops by production area.
-- Existing rows stay on the assembly line.

alter table public.entry_productivity_daily
  add column if not exists production_area text not null default 'assembly';

alter table public.exit_productivity_daily
  add column if not exists production_area text not null default 'assembly';

alter table public.repair_productivity_daily
  add column if not exists production_area text not null default 'assembly';

alter table public.productivity_delay_reasons
  add column if not exists production_area text not null default 'assembly';

alter table public.production_line_stops
  add column if not exists production_area text not null default 'assembly';

do $$
declare
  r record;
  target text;
begin
  foreach target in array array[
    'entry_productivity_daily',
    'exit_productivity_daily',
    'repair_productivity_daily',
    'productivity_delay_reasons'
  ]
  loop
    for r in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = target
        and con.contype = 'u'
    loop
      execute format('alter table public.%I drop constraint %I', target, r.conname);
    end loop;
  end loop;
end $$;

alter table public.entry_productivity_daily
  drop constraint if exists entry_productivity_daily_area_check;
alter table public.entry_productivity_daily
  add constraint entry_productivity_daily_area_check
  check (production_area in ('body', 'paint', 'assembly', 'externalRepair'));
alter table public.entry_productivity_daily
  add constraint entry_productivity_daily_area_unique
  unique (production_area, model_id, work_date);

alter table public.exit_productivity_daily
  drop constraint if exists exit_productivity_daily_area_check;
alter table public.exit_productivity_daily
  add constraint exit_productivity_daily_area_check
  check (production_area in ('body', 'paint', 'assembly', 'externalRepair'));
alter table public.exit_productivity_daily
  add constraint exit_productivity_daily_area_unique
  unique (production_area, model_id, work_date);

alter table public.repair_productivity_daily
  drop constraint if exists repair_productivity_daily_area_check;
alter table public.repair_productivity_daily
  add constraint repair_productivity_daily_area_check
  check (production_area in ('body', 'paint', 'assembly', 'externalRepair'));
alter table public.repair_productivity_daily
  add constraint repair_productivity_daily_area_unique
  unique (production_area, model_id, work_date);

alter table public.productivity_delay_reasons
  drop constraint if exists productivity_delay_reasons_area_check;
alter table public.productivity_delay_reasons
  add constraint productivity_delay_reasons_area_check
  check (production_area in ('body', 'paint', 'assembly', 'externalRepair'));
alter table public.productivity_delay_reasons
  add constraint productivity_delay_reasons_area_unique
  unique (production_area, work_date, kind);

alter table public.production_line_stops
  drop constraint if exists production_line_stops_area_check;
alter table public.production_line_stops
  add constraint production_line_stops_area_check
  check (production_area in ('body', 'paint', 'assembly', 'externalRepair'));

create index if not exists idx_entry_productivity_area on public.entry_productivity_daily (production_area, work_date);
create index if not exists idx_exit_productivity_area on public.exit_productivity_daily (production_area, work_date);
create index if not exists idx_repair_productivity_area on public.repair_productivity_daily (production_area, work_date);
create index if not exists idx_production_line_stops_area on public.production_line_stops (production_area, started_at desc);

notify pgrst, 'reload schema';
