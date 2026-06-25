-- Production plan: working / vacation / overtime days per month.

create table if not exists public.production_plan_working_days (
  id             uuid primary key default gen_random_uuid(),
  plan_year      integer not null check (plan_year between 2000 and 2100),
  plan_month     integer not null check (plan_month between 1 and 12),
  working_days   integer not null default 0 check (working_days >= 0),
  vacation_days  integer not null default 0 check (vacation_days >= 0),
  overtime_days  integer not null default 0 check (overtime_days >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint production_plan_working_days_period_key unique (plan_year, plan_month)
);

create index if not exists idx_production_plan_working_days_period
  on public.production_plan_working_days (plan_year, plan_month);

drop trigger if exists trg_production_plan_working_days_updated_at on public.production_plan_working_days;
create trigger trg_production_plan_working_days_updated_at
  before update on public.production_plan_working_days
  for each row execute function set_updated_at();

alter table public.production_plan_working_days enable row level security;

drop policy if exists production_plan_working_days_select on public.production_plan_working_days;
create policy production_plan_working_days_select on public.production_plan_working_days
  for select to authenticated using (true);

drop policy if exists production_plan_working_days_write on public.production_plan_working_days;
create policy production_plan_working_days_write on public.production_plan_working_days
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.production_plan_working_days to authenticated;
