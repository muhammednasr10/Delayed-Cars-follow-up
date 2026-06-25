-- Leader job role + assignment status (حالة التعيين) separate from is_active / employment_status.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'job_role' and e.enumlabel = 'leader'
  ) then
    alter type job_role add value 'leader';
  end if;
end$$;

alter table employees
  add column if not exists assignment_status text;

comment on column employees.assignment_status is
  'HR assignment label from roster (e.g. متعين). Not the same as is_active or employment_status.';

create index if not exists idx_employees_assignment_status on employees (assignment_status);
