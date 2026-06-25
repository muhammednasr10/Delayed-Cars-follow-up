-- Editable production plan targets per vehicle model (variant).

create table if not exists public.model_production_plan_targets (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references public.vehicle_models (id) on delete cascade,
  target_qty  integer not null default 0 check (target_qty >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint model_production_plan_targets_model_key unique (model_id)
);

create index if not exists idx_model_plan_targets_model on public.model_production_plan_targets (model_id);

drop trigger if exists trg_model_production_plan_targets_updated_at on public.model_production_plan_targets;
create trigger trg_model_production_plan_targets_updated_at
  before update on public.model_production_plan_targets
  for each row execute function set_updated_at();

alter table public.model_production_plan_targets enable row level security;

drop policy if exists model_production_plan_targets_select on public.model_production_plan_targets;
create policy model_production_plan_targets_select on public.model_production_plan_targets
  for select to authenticated using (true);

drop policy if exists model_production_plan_targets_write on public.model_production_plan_targets;
create policy model_production_plan_targets_write on public.model_production_plan_targets
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.model_production_plan_targets to authenticated;
