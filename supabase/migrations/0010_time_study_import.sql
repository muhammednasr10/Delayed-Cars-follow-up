-- =============================================================================
-- 0010_time_study_import.sql
-- Time study / process routing import — separate station_operations master.
--
-- station_operations = canonical operation (not training_skills).
-- training_skills.station_operation_id = optional link for Training Matrix.
-- T8 "common" = common within a model family (e.g. Tiggo 8), not global.
-- Additive. Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- Extend station_type for PBS / prep / other
do $$
begin
  if not exists (select 1 from pg_type where typname = 'station_type') then
    create type station_type as enum ('main_line', 'side_assembly', 'offline_prep');
  end if;
end$$;

alter type station_type add value if not exists 'pbs';
alter type station_type add value if not exists 'preparation';
alter type station_type add value if not exists 'other';

-- Parent/child stations (PBS1 → PBS1-L1)
alter table stations add column if not exists parent_station_id uuid references stations (id) on delete set null;
create index if not exists idx_stations_parent on stations (parent_station_id);

-- ---------------------------------------------------------------------------
-- vehicle_model_families + manual membership (Tiggo 8, Tiggo 7, …)
-- ---------------------------------------------------------------------------
create table if not exists vehicle_model_families (
  id          uuid primary key default gen_random_uuid(),
  family_code text not null unique,
  name_ar     text,
  name_en     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists vehicle_model_family_members (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references vehicle_model_families (id) on delete cascade,
  vehicle_model_id uuid not null references vehicle_models (id) on delete cascade,
  created_at       timestamptz not null default now(),
  constraint uq_family_model unique (family_id, vehicle_model_id)
);

create index if not exists idx_vmf_members_model on vehicle_model_family_members (vehicle_model_id);

-- Seed Tiggo 8 family for T8 sheet classification (idempotent)
insert into vehicle_model_families (family_code, name_ar, name_en)
values ('tiggo_8', 'تيجو 8', 'Tiggo 8')
on conflict (family_code) do nothing;

-- ---------------------------------------------------------------------------
-- station_operations — canonical operation / time study anchor
-- ---------------------------------------------------------------------------
create table if not exists station_operations (
  id                          uuid primary key default gen_random_uuid(),
  station_id                  uuid not null references stations (id) on delete cascade,
  operation_code              text not null,
  operation_name_ar           text not null,
  operation_name_en           text,
  operation_type              text not null default 'common',
  model_family_id             uuid references vehicle_model_families (id) on delete set null,
  technician_position         text,
  tool_spec                   text,
  tool_spec_percent           text,
  standard_time_seconds       numeric check (standard_time_seconds is null or standard_time_seconds >= 0),
  standard_time_minutes       numeric,
  worker_time_minutes         numeric,
  station_time_minutes        numeric,
  required_manpower_count     int not null default 1 check (required_manpower_count > 0),
  task_precedence               text,
  ranked_positional_weight    numeric,
  zoning_constraints          text,
  sequence_no                 int not null default 0,
  is_critical                 boolean not null default false,
  is_active                   boolean not null default true,
  notes                       text,
  source_sheet_name           text,
  source_row_number           int,
  import_batch_id             uuid,
  created_by                  uuid references profiles (id),
  updated_by                  uuid references profiles (id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index if not exists uq_station_operation_code
  on station_operations (station_id, operation_code);
create unique index if not exists uq_station_operation_name_active
  on station_operations (station_id, operation_name_ar) where is_active;
create index if not exists idx_station_ops_station on station_operations (station_id);
create index if not exists idx_station_ops_family on station_operations (model_family_id);

-- Link training_skills → station_operations (Training Matrix reads operation, stores qualifications)
alter table training_skills add column if not exists station_operation_id uuid references station_operations (id) on delete set null;
create unique index if not exists uq_skill_per_operation
  on training_skills (station_operation_id) where station_operation_id is not null;

-- ---------------------------------------------------------------------------
-- operation_hardware_requirements
-- ---------------------------------------------------------------------------
create table if not exists operation_hardware_requirements (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references station_operations (id) on delete cascade,
  hardware_name text not null,
  hardware_qty  numeric,
  hardware_type text,
  hardware_size text,
  notes         text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_op_hw_operation on operation_hardware_requirements (operation_id);

-- ---------------------------------------------------------------------------
-- operation_time_studies (per operation; optional per vehicle model)
-- ---------------------------------------------------------------------------
create table if not exists operation_time_studies (
  id                              uuid primary key default gen_random_uuid(),
  operation_id                    uuid not null references station_operations (id) on delete cascade,
  vehicle_model_id                uuid references vehicle_models (id) on delete cascade,
  station_id                      uuid not null references stations (id) on delete cascade,
  standard_time_seconds           numeric,
  operation_time_minutes          numeric,
  worker_time_minutes             numeric,
  station_time_minutes            numeric,
  total_workers_at_station          int,
  average_station_time_per_worker numeric,
  ranked_positional_weight        numeric,
  zoning_constraints              text,
  task_precedence                   text,
  source_sheet_name                 text,
  source_row_number                 int,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

create unique index if not exists uq_ots_operation on operation_time_studies (operation_id);
create index if not exists idx_ots_model on operation_time_studies (vehicle_model_id);

-- ---------------------------------------------------------------------------
-- vehicle_model_operations — process routing
-- ---------------------------------------------------------------------------
create table if not exists vehicle_model_operations (
  id                      uuid primary key default gen_random_uuid(),
  vehicle_model_id        uuid references vehicle_models (id) on delete cascade,
  model_family_id         uuid references vehicle_model_families (id) on delete cascade,
  station_id              uuid not null references stations (id) on delete cascade,
  operation_id            uuid not null references station_operations (id) on delete cascade,
  sequence_no             int not null default 0,
  operation_type          text not null default 'common',
  required_level          training_level not null default 'level_3',
  required_manpower_count int not null default 1 check (required_manpower_count > 0),
  standard_time_seconds   numeric,
  is_required             boolean not null default true,
  is_active               boolean not null default true,
  notes                   text,
  created_by              uuid references profiles (id),
  updated_by              uuid references profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint vmo_model_or_family check (
    vehicle_model_id is not null or model_family_id is not null
  )
);

create unique index if not exists uq_vmo_model_op
  on vehicle_model_operations (vehicle_model_id, operation_id) where vehicle_model_id is not null and is_active;
create unique index if not exists uq_vmo_family_op
  on vehicle_model_operations (model_family_id, operation_id) where vehicle_model_id is null and model_family_id is not null and is_active;
create index if not exists idx_vmo_station on vehicle_model_operations (station_id);

-- ---------------------------------------------------------------------------
-- import_batches — audit trail for CSV/XLSX imports
-- ---------------------------------------------------------------------------
create table if not exists import_batches (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null default 'csv',
  file_name     text,
  sheet_name    text,
  row_count     int not null default 0,
  status        text not null default 'pending',
  summary       jsonb,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now()
);

alter table station_operations
  add constraint station_operations_import_batch_fk
  foreign key (import_batch_id) references import_batches (id) on delete set null;

-- ---------------------------------------------------------------------------
-- triggers + RLS
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'vehicle_model_families', 'vehicle_model_family_members',
    'station_operations', 'operation_hardware_requirements', 'operation_time_studies',
    'vehicle_model_operations', 'import_batches'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', tbl);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at();', tbl);
    if tbl not in (
      'vehicle_model_families', 'vehicle_model_family_members',
      'operation_hardware_requirements', 'import_batches'
    ) then
      execute format('drop trigger if exists trg_%1$s_stamp on %1$s;', tbl);
      execute format('create trigger trg_%1$s_stamp before insert or update on %1$s for each row execute function employees_stamp_actor();', tbl);
    end if;
    execute format('alter table %1$s enable row level security;', tbl);
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('create policy %1$s_select on %1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_write on %1$s;', tbl);
    execute format('create policy %1$s_write on %1$s for all to authenticated using (has_role(''admin'')) with check (has_role(''admin''));', tbl);
  end loop;
end$$;
