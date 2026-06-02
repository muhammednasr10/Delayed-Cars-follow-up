-- =============================================================================
-- 0005_missing_parts_reporting.sql
-- Supports the station-floor flow: "a station reports that a part was not
-- installed on a vehicle". Lets an operator register a shortage by VIN + model
-- + color + station in one step, capturing WHO entered it (created_by).
-- =============================================================================

-- A vehicle may be reported by a station before a formal production order
-- exists, so the production order becomes optional.
alter table vehicles alter column production_order_id drop not null;

-- Allow any authenticated user to read basic profile rows so the UI can show
-- the name of the user who entered each record ("who created this").
drop policy if exists profiles_read_authenticated on profiles;
create policy profiles_read_authenticated on profiles
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- Detail view: missing parts joined with vehicle / model / color / station and
-- the creator's name. security_invoker so row level security of the caller
-- applies (profiles are readable thanks to the policy above).
-- ----------------------------------------------------------------------------
create or replace view v_missing_parts_detail
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
  mp.created_by,
  cp.full_name      as created_by_name,
  cp.email          as created_by_email
from missing_parts mp
  join vehicles v on v.id = mp.vehicle_id
  left join vehicle_models vm on vm.id = v.model_id
  left join vehicle_colors vc on vc.id = v.vehicle_color_id
  left join stations st on st.id = v.current_station_id
  left join profiles cp on cp.id = mp.created_by
where v.is_deleted = false;

-- ----------------------------------------------------------------------------
-- One-step report: find-or-create the vehicle by VIN, then add the shortage.
-- Runs atomically and stamps created_by = the authenticated user.
-- ----------------------------------------------------------------------------
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
  p_is_dr_item       boolean default false,
  p_notes            text default null,
  p_item_id          uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vin       text;
  v_vehicle   uuid;
  v_new_mp    uuid;
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

  -- Find or create the vehicle by VIN.
  select id into v_vehicle from vehicles where vin = v_vin;

  if v_vehicle is null then
    insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status)
    values (v_vin, p_model_id, p_color_id, p_station_id, 'off_line_incomplete')
    returning id into v_vehicle;
  else
    -- Keep latest known color/station for an existing vehicle.
    update vehicles
      set vehicle_color_id   = coalesce(p_color_id, vehicle_color_id),
          current_station_id = coalesce(p_station_id, current_station_id)
    where id = v_vehicle;
  end if;

  insert into missing_parts (
    vehicle_id, item_id, part_description, required_qty,
    reason, department, priority, is_dr_item, notes, status
  )
  values (
    v_vehicle, p_item_id, trim(p_part_description), greatest(p_required_qty, 1),
    p_reason, p_department, p_priority, p_is_dr_item, nullif(trim(p_notes), ''), 'open'
  )
  returning id into v_new_mp;

  return v_new_mp;
end;
$$;
