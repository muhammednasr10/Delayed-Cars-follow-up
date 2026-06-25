-- Daily exit productivity totals per vehicle model (monthly grid).

create table if not exists public.exit_productivity_daily (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references public.vehicle_models (id) on delete cascade,
  work_date   date not null,
  quantity    integer not null default 0 check (quantity >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint exit_productivity_daily_unique unique (model_id, work_date)
);

create index if not exists idx_exit_productivity_model on public.exit_productivity_daily (model_id);
create index if not exists idx_exit_productivity_date on public.exit_productivity_daily (work_date);

drop trigger if exists trg_exit_productivity_daily_updated_at on public.exit_productivity_daily;
create trigger trg_exit_productivity_daily_updated_at
  before update on public.exit_productivity_daily
  for each row execute function set_updated_at();

alter table public.exit_productivity_daily enable row level security;

drop policy if exists exit_productivity_daily_select on public.exit_productivity_daily;
create policy exit_productivity_daily_select on public.exit_productivity_daily
  for select to authenticated using (true);

drop policy if exists exit_productivity_daily_write on public.exit_productivity_daily;
create policy exit_productivity_daily_write on public.exit_productivity_daily
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.exit_productivity_daily to authenticated;
