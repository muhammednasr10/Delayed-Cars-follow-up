-- Per-employee training level at each station (مصفوفة التدريب).

create table if not exists employee_station_training_levels (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  station_id  uuid not null references stations (id) on delete cascade,
  level       training_level not null,
  created_by  uuid references profiles (id),
  updated_by  uuid references profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint estl_level_work check (level in ('level_1', 'level_2', 'level_3', 'level_4')),
  constraint estl_employee_station_unique unique (employee_id, station_id)
);

create index if not exists idx_estl_employee on employee_station_training_levels (employee_id);
create index if not exists idx_estl_station on employee_station_training_levels (station_id);

drop trigger if exists trg_employee_station_training_levels_updated_at on employee_station_training_levels;
create trigger trg_employee_station_training_levels_updated_at
  before update on employee_station_training_levels
  for each row execute function set_updated_at();

drop trigger if exists trg_employee_station_training_levels_stamp on employee_station_training_levels;
create trigger trg_employee_station_training_levels_stamp
  before insert or update on employee_station_training_levels
  for each row execute function employees_stamp_actor();

alter table employee_station_training_levels enable row level security;

drop policy if exists employee_station_training_levels_select on employee_station_training_levels;
create policy employee_station_training_levels_select on employee_station_training_levels
  for select to authenticated using (true);

drop policy if exists employee_station_training_levels_insert on employee_station_training_levels;
create policy employee_station_training_levels_insert on employee_station_training_levels
  for insert to authenticated
  with check (
    has_role('admin')
    or has_permission('training_matrix', 'manage')
    or has_permission('training_matrix', 'update')
    or has_permission('training_matrix', 'create')
  );

drop policy if exists employee_station_training_levels_update on employee_station_training_levels;
create policy employee_station_training_levels_update on employee_station_training_levels
  for update to authenticated
  using (
    has_role('admin')
    or has_permission('training_matrix', 'manage')
    or has_permission('training_matrix', 'update')
    or has_permission('training_matrix', 'create')
  )
  with check (
    has_role('admin')
    or has_permission('training_matrix', 'manage')
    or has_permission('training_matrix', 'update')
    or has_permission('training_matrix', 'create')
  );

drop policy if exists employee_station_training_levels_delete on employee_station_training_levels;
create policy employee_station_training_levels_delete on employee_station_training_levels
  for delete to authenticated
  using (
    has_role('admin')
    or has_permission('training_matrix', 'manage')
    or has_permission('training_matrix', 'update')
    or has_permission('training_matrix', 'create')
  );
