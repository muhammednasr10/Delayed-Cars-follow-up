-- plan_month = 0 → خطة سنوية، 1–12 → خطة شهرية
-- wip_carryover_qty → بواقي WIP من الشهر السابق (شهري فقط)

alter table public.model_production_plan_targets
  drop constraint if exists model_production_plan_targets_month_check;

alter table public.model_production_plan_targets
  add constraint model_production_plan_targets_month_check
  check (plan_month between 0 and 12);

alter table public.model_production_plan_targets
  add column if not exists wip_carryover_qty integer not null default 0
  check (wip_carryover_qty >= 0);

comment on column public.model_production_plan_targets.plan_month is
  '0 = annual plan target; 1–12 = monthly plan target.';

comment on column public.model_production_plan_targets.wip_carryover_qty is
  'WIP carryover from previous month (monthly plans only).';
