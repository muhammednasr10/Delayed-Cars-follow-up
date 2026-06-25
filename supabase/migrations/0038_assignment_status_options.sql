-- Allowed assignment_status values (حالة التعيين)

alter table employees drop constraint if exists employees_assignment_status_check;
alter table employees add constraint employees_assignment_status_check
  check (assignment_status is null or assignment_status in ('متعين', 'كاجوال'));
