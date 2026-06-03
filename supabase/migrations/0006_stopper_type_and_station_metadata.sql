-- =============================================================================
-- 0006_stopper_type_and_station_metadata.sql
-- 1) Replaces the user-facing "DR item" flag with a clearer classification
--    `stopper_type` ('line_stopper' | 'car_stopper'). The legacy boolean
--    `is_dr_item` is KEPT for backward compatibility and kept in sync.
-- 2) Adds optional station metadata so the searchable station field can
--    auto-fill line / area / responsible department / person.
-- Safe & additive: no columns are dropped, existing rows are migrated.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1) stopper_type on missing_parts
-- ----------------------------------------------------------------------------
alter table missing_parts
  add column if not exists stopper_type text;

-- Backfill from the legacy flag: a DR item historically meant a line-stop risk.
update missing_parts
  set stopper_type = case when is_dr_item then 'line_stopper' else 'car_stopper' end
  where stopper_type is null;

alter table missing_parts
  alter column stopper_type set default 'car_stopper';

alter table missing_parts
  alter column stopper_type set not null;

-- Validate allowed values (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'missing_parts_stopper_type_check'
  ) then
    alter table missing_parts
      add constraint missing_parts_stopper_type_check
      check (stopper_type in ('line_stopper', 'car_stopper'));
  end if;
end$$;

create index if not exists idx_mp_stopper_type on missing_parts (stopper_type);

-- Keep is_dr_item in sync with stopper_type so legacy code/data stays correct.
create or replace function sync_is_dr_item()
returns trigger
language plpgsql
as $$
begin
  new.is_dr_item := (new.stopper_type = 'line_stopper');
  return new;
end;
$$;

drop trigger if exists trg_mp_sync_dr on missing_parts;
create trigger trg_mp_sync_dr
  before insert or update on missing_parts
  for each row execute function sync_is_dr_item();

-- ----------------------------------------------------------------------------
-- 2) Station metadata (all optional / nullable)
-- ----------------------------------------------------------------------------
alter table stations add column if not exists line_name text;
alter table stations add column if not exists responsible_department responsible_department;
alter table stations add column if not exists responsible_person text;

-- ----------------------------------------------------------------------------
-- 3) Rebuild detail view with stopper_type + station metadata
--    (drop first: adding a column mid-list is not allowed by CREATE OR REPLACE)
-- ----------------------------------------------------------------------------
drop view if exists v_missing_parts_detail;

create view v_missing_parts_detail
with (security_invoker = true) as
select
  mp.id,
  mp.vehicle_id,
  mp.item_id,
  mp.part_description,
  mp.required_qty,
  mp.installed_qty,
  mp.remaining_qty,
  mp.reason,
  mp.department,
  mp.priority,
  mp.status,
  mp.qc_approved,
  mp.is_dr_item,
  mp.stopper_type,
  mp.notes,
  mp.created_at,
  mp.updated_at,
  mp.closed_at,
  v.vin,
  v.model_id,
  vm.name           as model_name,
  v.vehicle_color_id,
  vc.name           as color_name,
  vc.hex_code       as color_hex,
  v.current_station_id,
  st.station_number,
  st.station_name,
  st.line_name              as station_line_name,
  wa.name                   as station_area,
  st.responsible_department as station_department,
  st.responsible_person     as station_person,
  mp.created_by,
  cp.full_name      as created_by_name,
  cp.email          as created_by_email
from missing_parts mp
  join vehicles v on v.id = mp.vehicle_id
  left join vehicle_models vm on vm.id = v.model_id
  left join vehicle_colors vc on vc.id = v.vehicle_color_id
  left join stations st on st.id = v.current_station_id
  left join work_areas wa on wa.id = st.work_area_id
  left join profiles cp on cp.id = mp.created_by
where v.is_deleted = false;

-- ----------------------------------------------------------------------------
-- 4) Update report RPC to accept stopper_type (keeps p_is_dr_item for compat)
-- ----------------------------------------------------------------------------
drop function if exists report_missing_part(
  text, uuid, text, uuid, uuid, numeric, missing_part_reason,
  responsible_department, priority_level, boolean, text, uuid
);

create or replace function report_missing_part(
  p_vin              text,
  p_model_id         uuid,
  p_part_description text,
  p_color_id         uuid default null,
  p_station_id       uuid default null,
  p_required_qty     numeric default 1,
  p_reason           missing_part_reason default 'stock_shortage',
  p_department       responsible_department default 'warehouse',
  p_priority         priority_level default 'normal',
  p_stopper_type     text default 'car_stopper',
  p_notes            text default null,
  p_item_id          uuid default null,
  p_is_dr_item       boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vin      text;
  v_vehicle  uuid;
  v_new_mp   uuid;
  v_stopper  text;
begin
  if not has_role('admin', 'production', 'warehouse', 'quality') then
    raise exception 'Not authorized to report missing parts.' using errcode = '42501';
  end if;

  v_vin := upper(trim(p_vin));
  if length(v_vin) < 6 then
    raise exception 'VIN must be at least 6 characters.';
  end if;
  if p_model_id is null then
    raise exception 'Model is required.';
  end if;
  if coalesce(trim(p_part_description), '') = '' then
    raise exception 'Part description is required.';
  end if;

  -- Resolve stopper type (fall back to legacy flag, then default).
  v_stopper := coalesce(
    nullif(p_stopper_type, ''),
    case when p_is_dr_item then 'line_stopper' else null end,
    'car_stopper'
  );
  if v_stopper not in ('line_stopper', 'car_stopper') then
    raise exception 'Invalid stopper_type: %', v_stopper;
  end if;

  select id into v_vehicle from vehicles where vin = v_vin;

  if v_vehicle is null then
    insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status)
    values (v_vin, p_model_id, p_color_id, p_station_id, 'off_line_incomplete')
    returning id into v_vehicle;
  else
    update vehicles
      set vehicle_color_id   = coalesce(p_color_id, vehicle_color_id),
          current_station_id = coalesce(p_station_id, current_station_id)
    where id = v_vehicle;
  end if;

  insert into missing_parts (
    vehicle_id, item_id, part_description, required_qty,
    reason, department, priority, stopper_type, notes, status
  )
  values (
    v_vehicle, p_item_id, trim(p_part_description), greatest(p_required_qty, 1),
    p_reason, p_department, p_priority, v_stopper, nullif(trim(p_notes), ''), 'open'
  )
  returning id into v_new_mp;

  return v_new_mp;
end;
$$;
