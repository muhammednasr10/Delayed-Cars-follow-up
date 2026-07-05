-- Allow recording actual work hours on days planned as vacation.

alter table public.production_plan_work_days_daily
  add column if not exists work_despite_vacation boolean not null default false;

comment on column public.production_plan_work_days_daily.work_despite_vacation is
  'When true, actual hours can be entered even though day_type is vacation/factory_vacation.';

update public.production_plan_work_days_daily
set work_despite_vacation = true
where day_type in ('vacation', 'factory_vacation')
  and actual_hours > 0
  and work_despite_vacation = false;
