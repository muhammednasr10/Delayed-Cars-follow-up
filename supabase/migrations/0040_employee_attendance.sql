-- Daily attendance / leave per employee (monthly tracking)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_day_status') then
    create type attendance_day_status as enum ('present', 'absent', 'vacation', 'sick');
  end if;
end$$;

create table if not exists employee_attendance_days (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees (id) on delete cascade,
  work_date     date not null,
  status        attendance_day_status not null default 'present',
  check_in      time,
  check_out     time,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint employee_attendance_days_unique unique (employee_id, work_date)
);

create index if not exists idx_attendance_employee on employee_attendance_days (employee_id);
create index if not exists idx_attendance_date on employee_attendance_days (work_date);
create index if not exists idx_attendance_status on employee_attendance_days (status);

drop trigger if exists trg_employee_attendance_days_updated_at on employee_attendance_days;
create trigger trg_employee_attendance_days_updated_at
  before update on employee_attendance_days
  for each row execute function set_updated_at();

alter table employee_attendance_days enable row level security;

drop policy if exists employee_attendance_days_select on employee_attendance_days;
create policy employee_attendance_days_select on employee_attendance_days
  for select to authenticated using (true);

drop policy if exists employee_attendance_days_write on employee_attendance_days;
create policy employee_attendance_days_write on employee_attendance_days
  for all to authenticated using (has_role('admin')) with check (has_role('admin'));

-- Monthly summary for dashboards (security invoker)
create or replace view v_employee_attendance_monthly
with (security_invoker = true) as
select
  e.id as employee_id,
  e.employee_code,
  e.full_name,
  e.job_role,
  date_trunc('month', d.work_date)::date as month_start,
  count(*) filter (where d.status = 'present')::int as present_days,
  count(*) filter (where d.status = 'absent')::int as absent_days,
  count(*) filter (where d.status = 'vacation')::int as vacation_days,
  count(*) filter (where d.status = 'sick')::int as sick_days,
  count(*) filter (where d.status <> 'present')::int as issue_days
from employees e
join employee_attendance_days d on d.employee_id = e.id
group by e.id, e.employee_code, e.full_name, e.job_role, date_trunc('month', d.work_date);
