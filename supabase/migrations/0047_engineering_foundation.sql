-- =============================================================================
-- 0047_engineering_foundation.sql
-- BOM ↔ operations ↔ operation_parts ↔ time studies ↔ routing ↔ training sync.
-- Additive. Keeps operation_time_studies for legacy import; new formal time_studies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'engineering_task_kind') then
    create type engineering_task_kind as enum (
      'install', 'fit', 'torque', 'connect', 'clip', 'inspect', 'adjust', 'test', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'operation_side') then
    create type operation_side as enum (
      'RH', 'LH', 'front', 'rear', 'upper', 'lower', 'interior', 'exterior', 'none'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'operation_part_usage_type') then
    create type operation_part_usage_type as enum (
      'main_part', 'fastener', 'clip', 'hardware', 'consumable', 'tool_reference', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'time_study_status') then
    create type time_study_status as enum (
      'draft', 'under_review', 'approved', 'rejected', 'archived'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'routing_classification') then
    create type routing_classification as enum (
      'common_within_model_family', 'model_specific', 'optional'
    );
  end if;
end$$;

-- Manufacturing part categories (alongside engineering codes)
insert into part_categories (category_code, category_name_ar, category_name_en, description)
values
  ('INTERIOR', 'داخلي', 'Interior', 'Interior trim and cabin parts'),
  ('EXTERIOR', 'خارجي', 'Exterior', 'Exterior body and panels'),
  ('ELECTRICAL', 'كهرباء', 'Electrical', 'Electrical and wiring'),
  ('CHASSIS', 'هيكل', 'Chassis', 'Chassis and structural'),
  ('POWERTRAIN', 'محرك ونقل', 'Powertrain', 'Engine and drivetrain'),
  ('FASTENERS', 'مثبتات', 'Fasteners', 'Bolts, screws, nuts'),
  ('TRIM', 'تشطيب', 'Trim', 'Trim components'),
  ('SAFETY', 'سلامة', 'Safety', 'Safety systems'),
  ('FLUIDS', 'سوائل', 'Fluids', 'Fluids and lubricants'),
  ('CONSUMABLES', 'مستهلكات', 'Consumables', 'Consumable materials'),
  ('HARDWARE', 'عدد وقطع', 'Hardware', 'General hardware'),
  ('OTHER_MFG', 'أخرى — تصنيع', 'Other (Mfg)', 'Other manufacturing category')
on conflict (category_code) do nothing;

-- ---------------------------------------------------------------------------
-- station_operations extensions
-- ---------------------------------------------------------------------------
alter table station_operations add column if not exists task_kind engineering_task_kind;
alter table station_operations add column if not exists side operation_side default 'none';
alter table station_operations add column if not exists position text;
alter table station_operations add column if not exists precedence_operation_id uuid references station_operations (id) on delete set null;
alter table station_operations add column if not exists required_level training_level not null default 'level_3';
alter table station_operations add column if not exists tools_required text;
alter table station_operations add column if not exists quality_check_point boolean not null default false;
alter table station_operations add column if not exists safety_note text;
alter table station_operations add column if not exists is_line_stopper boolean not null default false;
alter table station_operations add column if not exists is_car_stopper boolean not null default false;

create index if not exists idx_station_ops_precedence on station_operations (precedence_operation_id);

-- ---------------------------------------------------------------------------
-- bom_items extensions
-- ---------------------------------------------------------------------------
alter table bom_items add column if not exists is_critical boolean not null default false;
alter table bom_items add column if not exists stopper_type text;

update bom_items set stopper_type = 'non_stopper' where stopper_type is null;

alter table bom_items alter column stopper_type set default 'non_stopper';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bom_items_stopper_type_check') then
    alter table bom_items add constraint bom_items_stopper_type_check
      check (stopper_type in ('line_stopper', 'car_stopper', 'non_stopper'));
  end if;
end$$;

create index if not exists idx_bom_items_operation on bom_items (operation_id);
create index if not exists idx_bom_items_stopper on bom_items (stopper_type);

-- ---------------------------------------------------------------------------
-- vehicle_model_operations extensions
-- ---------------------------------------------------------------------------
alter table vehicle_model_operations add column if not exists takt_time_seconds numeric
  check (takt_time_seconds is null or takt_time_seconds > 0);
alter table vehicle_model_operations add column if not exists routing_class routing_classification
  default 'model_specific';

-- ---------------------------------------------------------------------------
-- operation_parts
-- ---------------------------------------------------------------------------
create table if not exists operation_parts (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references station_operations (id) on delete cascade,
  part_id       uuid not null references parts (id) on delete restrict,
  bom_item_id   uuid references bom_items (id) on delete set null,
  quantity      numeric(14,3) not null default 1 check (quantity > 0),
  unit          text default 'pcs',
  usage_type    operation_part_usage_type not null default 'main_part',
  notes         text,
  is_active     boolean not null default true,
  created_by    uuid references profiles (id),
  updated_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists uq_operation_part_active
  on operation_parts (operation_id, part_id, usage_type) where is_active;
create index if not exists idx_operation_parts_operation on operation_parts (operation_id);
create index if not exists idx_operation_parts_part on operation_parts (part_id);

-- ---------------------------------------------------------------------------
-- operation_required_skills (operation-level training requirements)
-- ---------------------------------------------------------------------------
create table if not exists operation_required_skills (
  id             uuid primary key default gen_random_uuid(),
  operation_id   uuid not null references station_operations (id) on delete cascade,
  skill_id       uuid not null references training_skills (id) on delete cascade,
  required_level training_level not null default 'level_3',
  is_mandatory   boolean not null default true,
  notes          text,
  is_active      boolean not null default true,
  created_by     uuid references profiles (id),
  updated_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists uq_operation_skill_active
  on operation_required_skills (operation_id, skill_id) where is_active;
create index if not exists idx_ors_operation on operation_required_skills (operation_id);

-- ---------------------------------------------------------------------------
-- time_studies + time_study_readings
-- ---------------------------------------------------------------------------
create table if not exists time_studies (
  id                              uuid primary key default gen_random_uuid(),
  vehicle_model_id                uuid references vehicle_models (id) on delete set null,
  station_id                      uuid not null references stations (id) on delete restrict,
  operation_id                    uuid not null references station_operations (id) on delete cascade,
  study_code                      text not null unique,
  study_date                      date not null default current_date,
  operator_employee_id            uuid references employees (id) on delete set null,
  observer_employee_id            uuid references employees (id) on delete set null,
  rating_factor                   numeric not null default 1.00
    check (rating_factor >= 0.5 and rating_factor <= 1.5),
  allowance_factor                numeric not null default 0.15
    check (allowance_factor >= 0 and allowance_factor <= 0.5),
  takt_time_seconds               numeric check (takt_time_seconds is null or takt_time_seconds > 0),
  average_observed_time_seconds   numeric,
  normal_time_seconds             numeric,
  standard_time_seconds           numeric,
  required_manpower               numeric,
  status                          time_study_status not null default 'draft',
  approved_by                     uuid references profiles (id),
  approved_at                     timestamptz,
  notes                           text,
  created_by                      uuid references profiles (id),
  updated_by                      uuid references profiles (id),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index if not exists idx_time_studies_operation on time_studies (operation_id);
create index if not exists idx_time_studies_model on time_studies (vehicle_model_id);
create index if not exists idx_time_studies_status on time_studies (status);

create table if not exists time_study_readings (
  id                    uuid primary key default gen_random_uuid(),
  time_study_id         uuid not null references time_studies (id) on delete cascade,
  cycle_no              int not null check (cycle_no > 0),
  observed_time_seconds numeric not null check (observed_time_seconds > 0),
  is_outlier            boolean not null default false,
  exclude_from_avg      boolean not null default false,
  outlier_reason        text,
  notes                 text,
  created_at            timestamptz not null default now()
);

create unique index if not exists uq_ts_reading_cycle
  on time_study_readings (time_study_id, cycle_no);
create index if not exists idx_ts_readings_study on time_study_readings (time_study_id);

-- ---------------------------------------------------------------------------
-- Recalculate time study metrics (excludes outliers + manually excluded)
-- ---------------------------------------------------------------------------
create or replace function recalc_time_study_metrics(p_study_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric;
  v_rating numeric;
  v_allowance numeric;
  v_takt numeric;
  v_normal numeric;
  v_standard numeric;
  v_manpower numeric;
begin
  select rating_factor, allowance_factor, takt_time_seconds
  into v_rating, v_allowance, v_takt
  from time_studies where id = p_study_id;

  select avg(observed_time_seconds)
  into v_avg
  from time_study_readings
  where time_study_id = p_study_id
    and not exclude_from_avg
    and observed_time_seconds > 0;

  if v_avg is not null and v_avg > 0 then
    update time_study_readings r
    set is_outlier = (
      abs(r.observed_time_seconds - v_avg) / v_avg > 0.30
      and not r.exclude_from_avg
    )
    where r.time_study_id = p_study_id;

    select avg(observed_time_seconds)
    into v_avg
    from time_study_readings
    where time_study_id = p_study_id
      and not exclude_from_avg;

    v_normal := v_avg * coalesce(v_rating, 1);
    v_standard := v_normal * (1 + coalesce(v_allowance, 0));
    v_manpower := case
      when v_takt is not null and v_takt > 0 then ceil(v_standard / v_takt * 100) / 100
      else null
    end;
  else
    v_normal := null;
    v_standard := null;
    v_manpower := null;
  end if;

  update time_studies
  set
    average_observed_time_seconds = v_avg,
    normal_time_seconds = v_normal,
    standard_time_seconds = v_standard,
    required_manpower = v_manpower,
    updated_at = now()
  where id = p_study_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Approve time study → push standard times
-- ---------------------------------------------------------------------------
create or replace function approve_time_study(p_study_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_study time_studies%rowtype;
begin
  if not (
    has_permission('station_operations', 'approve')
    or has_role('admin')
  ) then
    raise exception 'Not authorized to approve time studies';
  end if;

  select * into v_study from time_studies where id = p_study_id;
  if not found then
    raise exception 'Time study not found';
  end if;

  if v_study.status not in ('draft', 'under_review') then
    raise exception 'Time study cannot be approved from status %', v_study.status;
  end if;

  if v_study.standard_time_seconds is null then
    perform recalc_time_study_metrics(p_study_id);
    select * into v_study from time_studies where id = p_study_id;
  end if;

  update time_studies
  set
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_by = auth.uid()
  where id = p_study_id;

  update station_operations
  set
    standard_time_seconds = v_study.standard_time_seconds,
    standard_time_minutes = round((v_study.standard_time_seconds / 60.0)::numeric, 4),
    required_manpower_count = greatest(1, ceil(coalesce(v_study.required_manpower, 1))::int),
    updated_by = auth.uid()
  where id = v_study.operation_id;

  if v_study.vehicle_model_id is not null then
    update vehicle_model_operations
    set
      standard_time_seconds = v_study.standard_time_seconds,
      required_manpower_count = greatest(1, ceil(coalesce(v_study.required_manpower, 1))::int),
      takt_time_seconds = coalesce(takt_time_seconds, v_study.takt_time_seconds),
      updated_by = auth.uid()
    where operation_id = v_study.operation_id
      and vehicle_model_id = v_study.vehicle_model_id
      and is_active;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sync training_skills when operation is created/updated
-- ---------------------------------------------------------------------------
create or replace function sync_training_skill_from_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill_id uuid;
  v_code text;
begin
  v_code := 'op_' || left(replace(new.operation_code, ' ', '_'), 40);

  select id into v_skill_id
  from training_skills
  where station_operation_id = new.id;

  if v_skill_id is null then
    insert into training_skills (
      skill_code, skill_name_ar, skill_name_en, station_id, station_operation_id, is_active
    ) values (
      v_code,
      new.operation_name_ar,
      new.operation_name_en,
      new.station_id,
      new.id,
      new.is_active
    )
    on conflict (skill_code) do update set
      skill_name_ar = excluded.skill_name_ar,
      skill_name_en = excluded.skill_name_en,
      station_id = excluded.station_id,
      station_operation_id = excluded.station_operation_id,
      is_active = excluded.is_active,
      updated_at = now()
    returning id into v_skill_id;
  else
    update training_skills set
      skill_name_ar = new.operation_name_ar,
      skill_name_en = coalesce(new.operation_name_en, skill_name_en),
      station_id = new.station_id,
      is_active = new.is_active,
      updated_at = now()
    where id = v_skill_id;
  end if;

  if not exists (
    select 1 from operation_required_skills
    where operation_id = new.id and skill_id = v_skill_id and is_active
  ) then
    insert into operation_required_skills (operation_id, skill_id, required_level, is_mandatory)
    values (new.id, v_skill_id, new.required_level, true);
  else
    update operation_required_skills
    set required_level = new.required_level, updated_at = now()
    where operation_id = new.id and skill_id = v_skill_id and is_active;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_skill_from_operation on station_operations;
create trigger trg_sync_skill_from_operation
  after insert or update of operation_name_ar, operation_name_en, operation_code, station_id, is_active, required_level
  on station_operations
  for each row
  execute function sync_training_skill_from_operation();

-- Backfill skills for existing operations (idempotent)
insert into training_skills (skill_code, skill_name_ar, skill_name_en, station_id, station_operation_id, is_active)
select
  'op_' || left(replace(so.operation_code, ' ', '_'), 40),
  so.operation_name_ar,
  so.operation_name_en,
  so.station_id,
  so.id,
  so.is_active
from station_operations so
where so.is_active
  and not exists (
    select 1 from training_skills ts where ts.station_operation_id = so.id
  )
on conflict (skill_code) do nothing;

-- ---------------------------------------------------------------------------
-- v_bom_items_detail — include operation + stopper
-- PostgreSQL cannot insert/reorder columns via CREATE OR REPLACE (42P16).
-- Keep 0016 column order; append new columns at the end only.
-- ---------------------------------------------------------------------------
drop view if exists v_bom_items_detail;

create view v_bom_items_detail as
select
  bi.id,
  bi.part_id,
  bi.vehicle_model_id,
  bi.station_id,
  bi.part_number,
  bi.part_name,
  bi.quantity,
  bi.side,
  bi.position,
  bi.model_family,
  bi.applicable_models_text,
  bi.station_code_text,
  bi.station_category,
  bi.bom_classification,
  bi.qty_by_model_raw,
  bi.source_file,
  bi.source_sheet,
  bi.source_row_number,
  bi.import_line_key,
  bi.needs_review,
  bi.notes,
  bi.raw_data,
  bi.is_active,
  bi.created_at,
  p.normalized_part_number,
  p.part_name_ar,
  p.part_name_en,
  p.part_type,
  p.part_number_new,
  p.alternative_part_no,
  pc.category_code,
  pc.category_name_ar,
  pc.category_name_en,
  vm.name as vehicle_model_name,
  st.station_number,
  st.station_name,
  bi.operation_id,
  bi.is_critical,
  bi.stopper_type,
  so.operation_code,
  so.operation_name_ar as operation_name
from bom_items bi
join parts p on p.id = bi.part_id
left join part_categories pc on pc.id = p.category_id
left join vehicle_models vm on vm.id = bi.vehicle_model_id
left join stations st on st.id = bi.station_id
left join station_operations so on so.id = bi.operation_id
where bi.is_active = true;

-- ---------------------------------------------------------------------------
-- Engineering dashboard view (read-only KPIs)
-- ---------------------------------------------------------------------------
create or replace view v_engineering_dashboard as
select
  (select count(*)::int from bom_items where is_active) as bom_rows_total,
  (select count(distinct part_id)::int from bom_items where is_active) as bom_unique_parts,
  (select count(*)::int from station_operations where is_active) as operations_total,
  (select count(*)::int from operation_parts where is_active) as operation_parts_total,
  (select count(*)::int from station_operations so where so.is_active
     and not exists (select 1 from operation_parts op where op.operation_id = so.id and op.is_active)
  ) as operations_without_parts,
  (select count(*)::int from time_studies where status = 'approved') as time_studies_approved,
  (select count(*)::int from time_studies where status = 'draft') as time_studies_draft,
  (select count(*)::int from station_operations so where so.is_active
     and so.standard_time_seconds is null
  ) as operations_without_standard_time;

-- ---------------------------------------------------------------------------
-- Triggers + RLS for new tables
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'operation_parts', 'operation_required_skills', 'time_studies', 'time_study_readings'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', tbl);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at();', tbl);
    if tbl in ('operation_parts', 'operation_required_skills', 'time_studies') then
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

grant execute on function recalc_time_study_metrics(uuid) to authenticated;
grant execute on function approve_time_study(uuid) to authenticated;

-- Approve permission seed (idempotent)
insert into system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
select 'station_operations', 'approve', 'اعتماد دراسة الوقت', 'Approve time study'
where not exists (
  select 1 from system_permissions
  where module_key = 'station_operations' and permission_key = 'approve'
);
