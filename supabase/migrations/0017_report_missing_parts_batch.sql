-- Batch report: multiple missing parts on one or more vehicles (same model/station context).

create or replace function report_missing_parts_batch(
  p_vins             text[],
  p_model_id         uuid,
  p_parts            jsonb,
  p_color_id         uuid default null,
  p_station_id       uuid default null,
  p_reason           missing_part_reason default 'stock_shortage',
  p_department       responsible_department default 'warehouse',
  p_priority         priority_level default 'normal',
  p_stopper_type     text default 'car_stopper',
  p_notes            text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vin      text;
  v_vehicle  uuid;
  v_stopper  text;
  v_part     jsonb;
  v_mp_id    uuid;
  v_vehicle_ids uuid[] := '{}';
  v_mp_ids   uuid[] := '{}';
  i          int;
begin
  if not has_role('admin', 'production', 'warehouse', 'quality', 'purchasing') then
    raise exception 'Not authorized to report missing parts.' using errcode = '42501';
  end if;

  if p_vins is null or array_length(p_vins, 1) is null or array_length(p_vins, 1) < 1 then
    raise exception 'At least one VIN is required.';
  end if;
  if p_model_id is null then
    raise exception 'Model is required.';
  end if;
  if p_parts is null or jsonb_array_length(p_parts) < 1 then
    raise exception 'At least one missing part is required.';
  end if;

  v_stopper := coalesce(nullif(trim(p_stopper_type), ''), 'car_stopper');
  if v_stopper not in ('line_stopper', 'car_stopper') then
    raise exception 'Invalid stopper_type: %', v_stopper;
  end if;

  for i in 1..array_length(p_vins, 1) loop
    v_vin := upper(trim(p_vins[i]));
    if length(v_vin) < 6 then
      raise exception 'VIN #% must be at least 6 characters.', i;
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

    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle);

    for v_part in select * from jsonb_array_elements(p_parts) loop
      if coalesce(trim(v_part->>'part_description'), '') = '' then
        raise exception 'Part description is required for all lines.';
      end if;

      insert into missing_parts (
        vehicle_id, part_description, required_qty,
        reason, department, priority, stopper_type, notes, status
      )
      values (
        v_vehicle,
        trim(v_part->>'part_description'),
        greatest(coalesce((v_part->>'required_qty')::numeric, 1), 1),
        p_reason,
        p_department,
        p_priority,
        v_stopper,
        nullif(trim(p_notes), ''),
        'open'
      )
      returning id into v_mp_id;

      v_mp_ids := array_append(v_mp_ids, v_mp_id);
    end loop;
  end loop;

  return jsonb_build_object(
    'vehicle_count', array_length(p_vins, 1),
    'part_line_count', jsonb_array_length(p_parts),
    'missing_part_count', array_length(v_mp_ids, 1),
    'vehicle_ids', to_jsonb(v_vehicle_ids),
    'missing_part_ids', to_jsonb(v_mp_ids)
  );
end;
$$;
