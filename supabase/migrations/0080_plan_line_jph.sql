-- Manual line JPH for production plan (takt = 60 / line_jph).

alter table public.production_plan_working_days
  add column if not exists line_jph numeric(10, 2) not null default 0 check (line_jph >= 0);
