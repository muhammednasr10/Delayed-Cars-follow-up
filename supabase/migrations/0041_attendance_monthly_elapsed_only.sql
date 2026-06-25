-- Monthly summary counts only completed calendar days (not today or future)

create or replace view v_employee_attendance_monthly
with (security_invoker = true) as
select
  e.id as employee_id,
  e.employee_code,
  e.full_name,
  e.job_role,
  date_trunc('month', d.work_date)::date as month_start,
  count(*) filter (where d.status = 'present' and d.work_date < current_date)::int as present_days,
  count(*) filter (where d.status = 'absent' and d.work_date < current_date)::int as absent_days,
  count(*) filter (where d.status = 'vacation' and d.work_date < current_date)::int as vacation_days,
  count(*) filter (where d.status = 'sick' and d.work_date < current_date)::int as sick_days,
  count(*) filter (where d.status <> 'present' and d.work_date < current_date)::int as issue_days
from employees e
join employee_attendance_days d on d.employee_id = e.id
group by e.id, e.employee_code, e.full_name, e.job_role, date_trunc('month', d.work_date);
