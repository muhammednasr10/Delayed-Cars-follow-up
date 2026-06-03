-- =============================================================================
-- 0022_missing_parts_edit_archive.sql
-- Edit/delete missing part lines; archive vehicle to history when shortage resolved.
-- =============================================================================

alter table vehicles
  add column if not exists shortage_resolved_at timestamptz;

create index if not exists idx_vehicles_shortage_resolved
  on vehicles (shortage_resolved_at)
  where shortage_resolved_at is not null;

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
  v.shortage_resolved_at,
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

-- ---------------------------------------------------------------------------
-- Update missing part metadata (open lines only, active vehicles only)
-- ---------------------------------------------------------------------------
create or replace function update_missing_part_record(
  p_id uuid,
  p_part_description text,
  p_required_qty numeric,
  p_reason missing_part_reason,
  p_department responsible_department,
  p_priority priority_level,
  p_stopper_type text default 'car_stopper',
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v_resolved timestamptz;
  v_stopper text;
begin
  if not has_role('admin', 'production', 'warehouse') then
    raise exception 'Permission denied';
  end if;

  select * into mp from missing_parts where id = p_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  select shortage_resolved_at into v_resolved from vehicles where id = mp.vehicle_id;
  if v_resolved is not null then
    raise exception 'Vehicle is already in history';
  end if;

  if mp.status in ('closed', 'cancelled') then
    raise exception 'Cannot edit a closed or cancelled line';
  end if;

  if p_required_qty is null or p_required_qty <= 0 then
    raise exception 'Required quantity must be positive';
  end if;

  if trim(coalesce(p_part_description, '')) = '' then
    raise exception 'Part description is required';
  end if;

  if p_required_qty < mp.installed_qty then
    raise exception 'Required quantity cannot be less than installed quantity (%)', mp.installed_qty;
  end if;

  v_stopper := coalesce(nullif(trim(p_stopper_type), ''), 'car_stopper');
  if v_stopper not in ('line_stopper', 'car_stopper') then
    raise exception 'Invalid stopper_type: %', v_stopper;
  end if;

  update missing_parts
  set part_description = trim(p_part_description),
      required_qty     = p_required_qty,
      reason           = p_reason,
      department       = p_department,
      priority         = p_priority,
      stopper_type     = v_stopper,
      notes            = nullif(trim(p_notes), '')
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete missing part line (admin)
-- ---------------------------------------------------------------------------
create or replace function delete_missing_part_record(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v_resolved timestamptz;
begin
  if not has_role('admin') then
    raise exception 'Permission denied: admin only';
  end if;

  select * into mp from missing_parts where id = p_id;
  if not found then
    raise exception 'Missing part not found';
  end if;

  select shortage_resolved_at into v_resolved from vehicles where id = mp.vehicle_id;
  if v_resolved is not null then
    raise exception 'Cannot delete lines for a vehicle already in history';
  end if;

  delete from missing_parts where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Complete vehicle shortage → close installed lines, move to history
-- ---------------------------------------------------------------------------
create or replace function complete_vehicle_shortage(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v vehicles%rowtype;
  pending_install integer;
begin
  if not has_role('admin', 'production', 'quality') then
    raise exception 'Permission denied';
  end if;

  select * into v from vehicles where id = p_vehicle_id and not is_deleted for update;
  if not found then
    raise exception 'Vehicle not found';
  end if;

  if v.shortage_resolved_at is not null then
    raise exception 'Vehicle is already archived';
  end if;

  select count(*) into pending_install
  from missing_parts
  where vehicle_id = p_vehicle_id
    and status not in ('closed', 'cancelled')
    and installed_qty < required_qty;

  if pending_install > 0 then
    raise exception 'Not all parts are fully installed (% remaining)', pending_install;
  end if;

  if not exists (select 1 from missing_parts where vehicle_id = p_vehicle_id) then
    raise exception 'No missing parts registered for this vehicle';
  end if;

  update missing_parts
  set qc_approved = true,
      status      = 'closed',
      closed_at   = coalesce(closed_at, now())
  where vehicle_id = p_vehicle_id
    and status not in ('closed', 'cancelled');

  update vehicles
  set shortage_resolved_at = now(),
      completion_status    = 'complete',
      final_approved_at    = coalesce(final_approved_at, now()),
      final_approved_by    = coalesce(final_approved_by, auth.uid())
  where id = p_vehicle_id;

  perform recalc_vehicle_status(p_vehicle_id);
end;
$$;

grant execute on function update_missing_part_record(
  uuid, text, numeric, missing_part_reason, responsible_department, priority_level, text, text
) to authenticated;

grant execute on function delete_missing_part_record(uuid) to authenticated;
grant execute on function complete_vehicle_shortage(uuid) to authenticated;
