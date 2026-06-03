-- =============================================================================
-- 0007_org_structure_employees.sql
-- Organizational Structure / الهيكل الوظيفي.
--
-- Adds an `employees` table modelling the factory job-role hierarchy. This is
-- SEPARATE from `profiles` (which holds the system/auth role): a person can be
-- an auth `admin` while having job_role `engineer`. Employees may optionally be
-- linked to a profile via `profile_id`.
--
-- Additive & safe: no existing tables are modified.
-- Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Job role enum (factory hierarchy, NOT system permissions)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_role') then
    create type job_role as enum
      ('general_manager', 'manager', 'engineer', 'supervisor', 'assistant_supervisor', 'technician');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- employees table
-- ----------------------------------------------------------------------------
create table if not exists employees (
  id                uuid primary key default gen_random_uuid(),
  employee_code     text not null unique,
  full_name         text not null,
  job_role          job_role not null,
  department        responsible_department,
  work_area_id      uuid references work_areas (id) on delete set null,
  station_id        uuid references stations (id) on delete set null,
  line_name         text,
  direct_manager_id uuid references employees (id) on delete set null,
  profile_id        uuid references profiles (id) on delete set null,
  phone             text,
  email             text,
  notes             text,
  is_active         boolean not null default true,
  created_by        uuid references profiles (id),
  updated_by        uuid references profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint employees_not_self_manager check (direct_manager_id is null or direct_manager_id <> id)
);

create index if not exists idx_employees_code on employees (employee_code);
create index if not exists idx_employees_job_role on employees (job_role);
create index if not exists idx_employees_department on employees (department);
create index if not exists idx_employees_manager on employees (direct_manager_id);
create index if not exists idx_employees_active on employees (is_active);
create index if not exists idx_employees_work_area on employees (work_area_id);

-- ----------------------------------------------------------------------------
-- updated_at (reuse shared helper from 0001)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_employees_updated_at on employees;
create trigger trg_employees_updated_at
  before update on employees
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Stamp created_by / updated_by from the authenticated user
-- ----------------------------------------------------------------------------
create or replace function employees_stamp_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_employees_stamp on employees;
create trigger trg_employees_stamp
  before insert or update on employees
  for each row execute function employees_stamp_actor();

-- ----------------------------------------------------------------------------
-- Prevent self-management and circular hierarchy chains
-- ----------------------------------------------------------------------------
create or replace function employees_prevent_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cur   uuid := new.direct_manager_id;
  steps int := 0;
begin
  if new.direct_manager_id is null then
    return new;
  end if;
  if new.direct_manager_id = new.id then
    raise exception 'An employee cannot be their own manager.';
  end if;
  -- Walk up the chain; if we reach this row again it is a cycle.
  while cur is not null and steps < 100 loop
    if cur = new.id then
      raise exception 'Circular management hierarchy is not allowed.';
    end if;
    select direct_manager_id into cur from employees where id = cur;
    steps := steps + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_employees_no_cycle on employees;
create trigger trg_employees_no_cycle
  before insert or update on employees
  for each row execute function employees_prevent_cycle();

-- ----------------------------------------------------------------------------
-- Row Level Security
--   - any authenticated user may read the structure
--   - only admins may insert / update / delete (HR/management handled in app)
-- ----------------------------------------------------------------------------
alter table employees enable row level security;

drop policy if exists employees_select on employees;
create policy employees_select on employees
  for select to authenticated using (true);

drop policy if exists employees_insert on employees;
create policy employees_insert on employees
  for insert to authenticated with check (has_role('admin'));

drop policy if exists employees_update on employees;
create policy employees_update on employees
  for update to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists employees_delete on employees;
create policy employees_delete on employees
  for delete to authenticated using (has_role('admin'));
