-- Daily work-day rows for production plan (per calendar date).

create table if not exists public.production_plan_work_days_daily (
  id              uuid primary key default gen_random_uuid(),
  work_date       date not null,
  day_type        text not null default 'work'
                    check (day_type in ('work', 'overtime', 'vacation', 'factory_vacation', 'substitute')),
  planned_hours   numeric(8, 2) not null default 0 check (planned_hours >= 0),
  actual_hours    numeric(8, 2) not null default 0 check (actual_hours >= 0),
  total_stops     numeric(8, 2) not null default 0 check (total_stops >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint production_plan_work_days_daily_date_key unique (work_date)
);

create index if not exists idx_production_plan_work_days_daily_date
  on public.production_plan_work_days_daily (work_date);

drop trigger if exists trg_production_plan_work_days_daily_updated_at on public.production_plan_work_days_daily;
create trigger trg_production_plan_work_days_daily_updated_at
  before update on public.production_plan_work_days_daily
  for each row execute function set_updated_at();

alter table public.production_plan_work_days_daily enable row level security;

drop policy if exists production_plan_work_days_daily_select on public.production_plan_work_days_daily;
create policy production_plan_work_days_daily_select on public.production_plan_work_days_daily
  for select to authenticated using (true);

drop policy if exists production_plan_work_days_daily_write on public.production_plan_work_days_daily;
create policy production_plan_work_days_daily_write on public.production_plan_work_days_daily
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.production_plan_work_days_daily to authenticated;
