-- =============================================================================
-- 0049_manpower_allocation.sql
-- Daily manpower assignment to operations (attendance + training aware).
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'allocation_shift') then
    create type allocation_shift as enum ('day', 'evening', 'night');
  end if;
end$$;

create table if not exists manpower_allocation_days (
  id                uuid primary key default gen_random_uuid(),
  allocation_date   date not null,
  shift             allocation_shift not null default 'day',
  vehicle_model_id  uuid references vehicle_models (id) on delete set null,
  notes             text,
  status            text not null default 'draft'
    check (status in ('draft', 'confirmed')),
  created_by        uuid references profiles (id),
  updated_by        uuid references profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists uq_manpower_day
  on manpower_allocation_days (allocation_date, shift, vehicle_model_id);

create table if not exists manpower_allocation_lines (
  id                      uuid primary key default gen_random_uuid(),
  day_id                  uuid not null references manpower_allocation_days (id) on delete cascade,
  operation_id            uuid not null references station_operations (id) on delete cascade,
  station_id              uuid not null references stations (id) on delete restrict,
  slot_no                 int not null default 1 check (slot_no > 0),
  required_manpower       int not null default 1 check (required_manpower > 0),
  standard_time_seconds   numeric,
  assigned_employee_id    uuid references employees (id) on delete set null,
  warnings                text[] not null default '{}',
  is_override             boolean not null default false,
  override_reason         text,
  override_by             uuid references profiles (id),
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_manpower_line_slot unique (day_id, operation_id, slot_no)
);

create index if not exists idx_manpower_lines_day on manpower_allocation_lines (day_id);
create index if not exists idx_manpower_lines_operation on manpower_allocation_lines (operation_id);
create index if not exists idx_manpower_lines_employee on manpower_allocation_lines (assigned_employee_id);

-- Summary view for UI
drop view if exists v_manpower_allocation_lines;

create view v_manpower_allocation_lines
with (security_invoker = true) as
select
  l.id,
  l.day_id,
  d.allocation_date,
  d.shift,
  d.vehicle_model_id,
  vm.name as vehicle_model_name,
  l.operation_id,
  so.operation_name_ar,
  so.operation_code,
  l.station_id,
  st.station_number,
  st.station_name,
  l.slot_no,
  l.required_manpower,
  l.standard_time_seconds,
  l.assigned_employee_id,
  e.employee_code,
  e.full_name as employee_name,
  l.warnings,
  l.is_override,
  l.override_reason,
  l.notes
from manpower_allocation_lines l
join manpower_allocation_days d on d.id = l.day_id
join station_operations so on so.id = l.operation_id
join stations st on st.id = l.station_id
left join vehicle_models vm on vm.id = d.vehicle_model_id
left join employees e on e.id = l.assigned_employee_id;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['manpower_allocation_days', 'manpower_allocation_lines']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', tbl);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at();', tbl);
    if tbl = 'manpower_allocation_days' then
      execute format('drop trigger if exists trg_%1$s_stamp on %1$s;', tbl);
      execute format('create trigger trg_%1$s_stamp before insert or update on %1$s for each row execute function employees_stamp_actor();', tbl);
    end if;
    execute format('alter table %1$s enable row level security;', tbl);
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('create policy %1$s_select on %1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_write on %1$s;', tbl);
    execute format(
      'create policy %1$s_write on %1$s for all to authenticated
       using (
         has_role(''admin'')
         or has_permission(''station_operations'', ''update'')
         or has_permission(''station_operations'', ''manage'')
         or has_permission(''station_operations'', ''create'')
       )
       with check (
         has_role(''admin'')
         or has_permission(''station_operations'', ''update'')
         or has_permission(''station_operations'', ''manage'')
         or has_permission(''station_operations'', ''create'')
       );',
      tbl, tbl
    );
  end loop;
end$$;
