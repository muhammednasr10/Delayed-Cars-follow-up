-- Multiple direct managers per employee (junction table).
-- Keeps employees.direct_manager_id as the primary manager (first by sort_order).

create table if not exists employee_direct_managers (
  employee_id  uuid not null references employees (id) on delete cascade,
  manager_id   uuid not null references employees (id) on delete cascade,
  sort_order   smallint not null default 0,
  primary key (employee_id, manager_id),
  constraint employee_direct_managers_not_self check (employee_id <> manager_id)
);

create index if not exists idx_employee_direct_managers_manager
  on employee_direct_managers (manager_id);

insert into employee_direct_managers (employee_id, manager_id, sort_order)
select id, direct_manager_id, 0
from employees
where direct_manager_id is not null
on conflict do nothing;

-- Prevent cycles through any manager path.
create or replace function employee_direct_managers_prevent_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.manager_id = new.employee_id then
    raise exception 'An employee cannot be their own manager.';
  end if;

  if exists (
    with recursive ancestors as (
      select edm.manager_id as id
      from employee_direct_managers edm
      where edm.employee_id = new.manager_id
      union
      select edm.manager_id
      from employee_direct_managers edm
      inner join ancestors a on edm.employee_id = a.id
    )
    select 1 from ancestors where id = new.employee_id
  ) then
    raise exception 'Circular management hierarchy is not allowed.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_direct_managers_no_cycle on employee_direct_managers;
create trigger trg_employee_direct_managers_no_cycle
  before insert or update on employee_direct_managers
  for each row execute function employee_direct_managers_prevent_cycle();

-- Sync primary manager column for backward compatibility.
create or replace function sync_employee_primary_manager()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  emp_id uuid;
  primary_mgr uuid;
begin
  emp_id := coalesce(new.employee_id, old.employee_id);

  select edm.manager_id into primary_mgr
  from employee_direct_managers edm
  where edm.employee_id = emp_id
  order by edm.sort_order, edm.manager_id
  limit 1;

  update employees
  set direct_manager_id = primary_mgr
  where id = emp_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_employee_primary_manager on employee_direct_managers;
create trigger trg_sync_employee_primary_manager
  after insert or update or delete on employee_direct_managers
  for each row execute function sync_employee_primary_manager();

-- Single-column cycle check is superseded by the junction table.
drop trigger if exists trg_employees_no_cycle on employees;

alter table employee_direct_managers enable row level security;

drop policy if exists employee_direct_managers_select on employee_direct_managers;
create policy employee_direct_managers_select on employee_direct_managers
  for select to authenticated using (true);

drop policy if exists employee_direct_managers_insert on employee_direct_managers;
create policy employee_direct_managers_insert on employee_direct_managers
  for insert to authenticated with check (has_role('admin'));

drop policy if exists employee_direct_managers_update on employee_direct_managers;
create policy employee_direct_managers_update on employee_direct_managers
  for update to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists employee_direct_managers_delete on employee_direct_managers;
create policy employee_direct_managers_delete on employee_direct_managers
  for delete to authenticated using (has_role('admin'));
