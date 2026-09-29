-- Models that share plan_group_id are one combined quantity.
-- Totals count that quantity once, not once per model.

alter table public.model_production_plan_targets
  add column if not exists plan_group_id uuid;

comment on column public.model_production_plan_targets.plan_group_id is
  'Shared plan bundle. Rows with the same id are one quantity and are counted once.';
