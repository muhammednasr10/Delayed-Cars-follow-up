-- Manual available working days / hours for production plan JPH & takt.

alter table public.production_plan_working_days
  add column if not exists available_days integer not null default 0 check (available_days >= 0),
  add column if not exists available_hours numeric(10, 2) not null default 0 check (available_hours >= 0);
