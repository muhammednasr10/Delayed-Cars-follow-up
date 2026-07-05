-- ربط أهداف خطة الإنتاج بشهر وسنة محددين

alter table public.model_production_plan_targets
  add column if not exists plan_year integer,
  add column if not exists plan_month integer;

-- ترحيل الصفوف القديمة لشهر التشغيل الحالي
update public.model_production_plan_targets
set
  plan_year = extract(year from now())::integer,
  plan_month = extract(month from now())::integer
where plan_year is null or plan_month is null;

alter table public.model_production_plan_targets
  alter column plan_year set not null,
  alter column plan_month set not null;

alter table public.model_production_plan_targets
  drop constraint if exists model_production_plan_targets_model_key;

alter table public.model_production_plan_targets
  drop constraint if exists model_production_plan_targets_month_check;

alter table public.model_production_plan_targets
  add constraint model_production_plan_targets_month_check
  check (plan_month between 1 and 12);

alter table public.model_production_plan_targets
  add constraint model_production_plan_targets_model_month_key
  unique (model_id, plan_year, plan_month);

create index if not exists idx_model_plan_targets_ym
  on public.model_production_plan_targets (plan_year, plan_month);
