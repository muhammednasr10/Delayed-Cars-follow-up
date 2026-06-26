-- Combined production plan targets (e.g. T4 + T7 + T8 together).

create table if not exists public.production_plan_group_targets (
  group_code  text primary key,
  target_qty  integer not null default 0 check (target_qty >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_production_plan_group_targets_updated_at on public.production_plan_group_targets;
create trigger trg_production_plan_group_targets_updated_at
  before update on public.production_plan_group_targets
  for each row execute function set_updated_at();

alter table public.production_plan_group_targets enable row level security;

drop policy if exists production_plan_group_targets_select on public.production_plan_group_targets;
create policy production_plan_group_targets_select on public.production_plan_group_targets
  for select to authenticated using (true);

drop policy if exists production_plan_group_targets_write on public.production_plan_group_targets;
create policy production_plan_group_targets_write on public.production_plan_group_targets
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.production_plan_group_targets to authenticated;
