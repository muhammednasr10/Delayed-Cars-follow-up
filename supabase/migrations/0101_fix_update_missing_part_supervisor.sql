-- Fix supervisor edit/save on missing parts:
-- 1) Drop legacy enum overload (ambiguous RPC / stale permission check).
-- 2) Use can_manage_missing_parts for update_missing_part_record.
-- 3) Add security-definer RPC for vehicle station updates (bypass vehicles RLS).

drop function if exists public.update_missing_part_record(
  uuid, text, numeric,
  public.missing_part_reason, public.responsible_department,
  public.priority_level, text, text
);

create or replace function update_missing_part_record(
  p_id uuid,
  p_part_description text,
  p_required_qty numeric,
  p_reason text,
  p_department text,
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
  if not can_manage_missing_parts(false) then
    raise exception 'Permission denied';
  end if;

  select * into mp from missing_parts where id = p_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  select shortage_resolved_at into v_resolved from vehicles where id = mp.vehicle_id;

  if v_resolved is null and mp.status in ('closed', 'cancelled') then
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
      reason           = mp_validate_reason(p_reason),
      department       = mp_validate_department(p_department),
      priority         = p_priority,
      stopper_type     = v_stopper,
      notes            = nullif(trim(p_notes), '')
  where id = p_id;
end;
$$;

create or replace function set_vehicle_current_station(
  p_vehicle_id uuid,
  p_station_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not can_manage_missing_parts(false) then
    raise exception 'Permission denied';
  end if;

  if not exists (select 1 from vehicles where id = p_vehicle_id and not is_deleted) then
    raise exception 'Vehicle not found';
  end if;

  if p_station_id is not null and not exists (select 1 from stations where id = p_station_id) then
    raise exception 'Station not found';
  end if;

  update vehicles
  set current_station_id = p_station_id
  where id = p_vehicle_id;
end;
$$;

grant execute on function update_missing_part_record(
  uuid, text, numeric, text, text, priority_level, text, text
) to authenticated;

grant execute on function set_vehicle_current_station(uuid, uuid) to authenticated;
