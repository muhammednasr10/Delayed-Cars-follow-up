-- Chassis = exactly 4 digits. Reuse vehicle by VIN+model; skip duplicate open issue lines.

drop function if exists report_missing_part(
  text, uuid, text, uuid, uuid, numeric,
  missing_part_reason, responsible_department, priority_level,
  text, text, uuid, boolean
);

create or replace function public.mp_normalize_chassis_vin(p_vin text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := upper(trim(coalesce(p_vin, '')));
  if v !~ '^\d{4}$' then
    raise exception 'Chassis number must be exactly 4 digits.';
  end if;
  return v;
end;
$$;

create or replace function report_missing_parts_batch(
  p_vins             text[],
  p_model_id         uuid,
  p_parts            jsonb,
  p_color_id         uuid default null,
  p_station_id       uuid default null,
  p_reason           text default 'stock_shortage',
  p_department       text default 'warehouse',
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
  v_vin           text;
  v_vehicle       uuid;
  v_existing_model uuid;
  v_stopper       text;
  v_part          jsonb;
  v_mp_id         uuid;
  v_vehicle_ids   uuid[] := '{}';
  v_mp_ids        uuid[] := '{}';
  v_line_reason   text;
  v_line_dept     text;
  v_line_station  uuid;
  v_group_id      uuid := gen_random_uuid();
  v_distinct_vins text[];
  v_inserted      int := 0;
  v_skipped       int := 0;
  i               int;
begin
  if not (
    has_role('admin', 'production', 'warehouse', 'quality', 'purchasing')
    or has_permission('missing_parts', 'create')
    or has_permission('missing_parts', 'update')
    or has_permission('users', 'manage')
  ) then
    raise exception 'Not authorized to report missing parts.' using errcode = '42501';
  end if;

  if p_vins is null or array_length(p_vins, 1) is null or array_length(p_vins, 1) < 1 then
    raise exception 'At least one chassis number is required.';
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

  select coalesce(array_agg(distinct mp_normalize_chassis_vin(v)), '{}')
    into v_distinct_vins
  from unnest(p_vins) as u(v);

  if array_length(v_distinct_vins, 1) is null or array_length(v_distinct_vins, 1) < 1 then
    raise exception 'At least one valid chassis number is required.';
  end if;

  for i in 1..array_length(v_distinct_vins, 1) loop
    v_vin := v_distinct_vins[i];

    select id, model_id
      into v_vehicle, v_existing_model
    from vehicles
    where vin = v_vin
      and is_deleted = false
    limit 1;

    if v_vehicle is not null and v_existing_model is distinct from p_model_id then
      raise exception 'Chassis % is already registered under a different model.', v_vin;
    end if;

    for v_part in select * from jsonb_array_elements(p_parts) loop
      begin
        v_line_station := coalesce(
          nullif(trim(v_part->>'station_id'), '')::uuid,
          p_station_id
        );
      exception
        when invalid_text_representation then
          raise exception 'Invalid station_id on part line: %', v_part->>'station_id';
      end;

      if v_vehicle is null then
        insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status)
        values (v_vin, p_model_id, p_color_id, v_line_station, 'off_line_incomplete')
        returning id into v_vehicle;
      else
        update vehicles
          set vehicle_color_id   = coalesce(p_color_id, vehicle_color_id),
              current_station_id = coalesce(v_line_station, current_station_id),
              model_id           = p_model_id
        where id = v_vehicle;
      end if;

      if not v_vehicle = any (v_vehicle_ids) then
        v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle);
      end if;

      if coalesce(trim(v_part->>'part_description'), '') = '' then
        raise exception 'Part description is required for all lines.';
      end if;

      v_line_reason := mp_validate_reason(coalesce(nullif(trim(v_part->>'reason'), ''), p_reason));
      v_line_dept := mp_validate_department(coalesce(nullif(trim(v_part->>'department'), ''), p_department));

      select mp.id
        into v_mp_id
      from missing_parts mp
      where mp.vehicle_id = v_vehicle
        and lower(trim(mp.part_description)) = lower(trim(v_part->>'part_description'))
        and mp.status not in ('closed', 'cancelled')
      limit 1;

      if v_mp_id is not null then
        v_mp_ids := array_append(v_mp_ids, v_mp_id);
        v_skipped := v_skipped + 1;
        continue;
      end if;

      insert into missing_parts (
        vehicle_id, part_description, required_qty,
        reason, department, priority, stopper_type, notes, status, report_group_id
      )
      values (
        v_vehicle,
        trim(v_part->>'part_description'),
        greatest(coalesce((v_part->>'required_qty')::numeric, 1), 1),
        v_line_reason,
        v_line_dept,
        p_priority,
        v_stopper,
        nullif(trim(p_notes), ''),
        'open',
        case when array_length(v_distinct_vins, 1) > 1 then v_group_id else null end
      )
      returning id into v_mp_id;

      v_mp_ids := array_append(v_mp_ids, v_mp_id);
      v_inserted := v_inserted + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'vehicle_count', array_length(v_distinct_vins, 1),
    'part_line_count', jsonb_array_length(p_parts),
    'missing_part_count', v_inserted,
    'skipped_duplicate_count', v_skipped,
    'report_group_id', v_group_id,
    'vehicle_ids', to_jsonb(v_vehicle_ids),
    'missing_part_ids', to_jsonb(v_mp_ids)
  );
end;
$$;

create or replace function report_missing_part(
  p_vin              text,
  p_model_id         uuid,
  p_part_description text,
  p_color_id         uuid default null,
  p_station_id       uuid default null,
  p_required_qty     numeric default 1,
  p_reason           text default 'stock_shortage',
  p_department       text default 'warehouse',
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
  v_vin            text;
  v_vehicle        uuid;
  v_existing_model uuid;
  v_new_mp         uuid;
  v_stopper        text;
begin
  if not (
    has_role('admin', 'production', 'warehouse', 'quality', 'purchasing')
    or has_permission('missing_parts', 'create')
    or has_permission('missing_parts', 'update')
    or has_permission('users', 'manage')
  ) then
    raise exception 'Not authorized to report missing parts.' using errcode = '42501';
  end if;

  v_vin := mp_normalize_chassis_vin(p_vin);

  if p_model_id is null then
    raise exception 'Model is required.';
  end if;
  if coalesce(trim(p_part_description), '') = '' then
    raise exception 'Part description is required.';
  end if;

  v_stopper := coalesce(
    nullif(p_stopper_type, ''),
    case when p_is_dr_item then 'line_stopper' else null end,
    'car_stopper'
  );
  if v_stopper not in ('line_stopper', 'car_stopper') then
    raise exception 'Invalid stopper_type: %', v_stopper;
  end if;

  select id, model_id into v_vehicle, v_existing_model
  from vehicles
  where vin = v_vin and is_deleted = false
  limit 1;

  if v_vehicle is not null and v_existing_model is distinct from p_model_id then
    raise exception 'Chassis % is already registered under a different model.', v_vin;
  end if;

  if v_vehicle is null then
    insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status)
    values (v_vin, p_model_id, p_color_id, p_station_id, 'off_line_incomplete')
    returning id into v_vehicle;
  else
    update vehicles
      set vehicle_color_id   = coalesce(p_color_id, vehicle_color_id),
          current_station_id = coalesce(p_station_id, current_station_id),
          model_id           = p_model_id
    where id = v_vehicle;
  end if;

  select mp.id into v_new_mp
  from missing_parts mp
  where mp.vehicle_id = v_vehicle
    and lower(trim(mp.part_description)) = lower(trim(p_part_description))
    and mp.status not in ('closed', 'cancelled')
  limit 1;

  if v_new_mp is not null then
    return v_new_mp;
  end if;

  insert into missing_parts (
    vehicle_id, item_id, part_description, required_qty,
    reason, department, priority, stopper_type, notes, status
  )
  values (
    v_vehicle, p_item_id, trim(p_part_description), greatest(p_required_qty, 1),
    mp_validate_reason(p_reason),
    mp_validate_department(p_department),
    p_priority, v_stopper, nullif(trim(p_notes), ''), 'open'
  )
  returning id into v_new_mp;

  return v_new_mp;
end;
$$;
