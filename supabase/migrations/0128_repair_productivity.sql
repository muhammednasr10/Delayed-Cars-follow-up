-- Repair delivery daily productivity + delay reasons kind.

create table if not exists public.repair_productivity_daily (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references public.vehicle_models (id) on delete cascade,
  work_date   date not null,
  quantity    integer not null default 0 check (quantity >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint repair_productivity_daily_unique unique (model_id, work_date)
);

create index if not exists idx_repair_productivity_model on public.repair_productivity_daily (model_id);
create index if not exists idx_repair_productivity_date on public.repair_productivity_daily (work_date);

drop trigger if exists trg_repair_productivity_daily_updated_at on public.repair_productivity_daily;
create trigger trg_repair_productivity_daily_updated_at
  before update on public.repair_productivity_daily
  for each row execute function set_updated_at();

alter table public.repair_productivity_daily enable row level security;

drop policy if exists repair_productivity_daily_select on public.repair_productivity_daily;
create policy repair_productivity_daily_select on public.repair_productivity_daily
  for select to authenticated using (true);

drop policy if exists repair_productivity_daily_write on public.repair_productivity_daily;
create policy repair_productivity_daily_write on public.repair_productivity_daily
  for all to authenticated
  using (can_module_write('production'))
  with check (can_module_write('production'));

grant select, insert, update, delete on public.repair_productivity_daily to authenticated;

alter table public.productivity_delay_reasons
  drop constraint if exists productivity_delay_reasons_kind_check;

alter table public.productivity_delay_reasons
  add constraint productivity_delay_reasons_kind_check
  check (kind in ('entry', 'exit', 'repair'));
