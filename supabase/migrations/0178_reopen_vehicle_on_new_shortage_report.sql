-- When reporting new open shortages on an existing chassis, reopen the vehicle
-- so it appears again under current shortages (not stuck in archive).
-- Also repair vehicles that already had open parts while still marked resolved.

update vehicles v
set
  shortage_resolved_at = null,
  shortage_resolved_by = null,
  production_status = case
    when production_status = 'completed' then 'off_line_incomplete'::vehicle_production_status
    else production_status
  end,
  is_deleted = false
where v.shortage_resolved_at is not null
  and exists (
    select 1
    from missing_parts mp
    where mp.vehicle_id = v.id
      and mp.status = 'open'
      and mp.closed_at is null
  );

create or replace function public.report_missing_parts_batch(
  p_vins                  text[],
  p_model_id              uuid,
  p_parts                 jsonb,
  p_color_id              uuid default null,
  p_station_id            uuid default null,
  p_reason                text default 'stock_shortage',
  p_department            text default 'warehouse',
  p_priority              priority_level default 'normal',
  p_stopper_type          text default 'car_stopper',
  p_notes                 text default null,
  p_factory_org_unit_id   uuid default null,
  p_report_group_id       uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vin           text;
  v_vehicle       uuid;
  v_stopper       text;
  v_part          jsonb;
  v_mp_id         uuid;
  v_vehicle_ids   uuid[] := '{}';
  v_mp_ids        uuid[] := '{}';
  v_line_reason   text;
  v_line_dept     text;
  v_complete_dept text;
  v_follow_emp    uuid;
  v_follow_emps   uuid[];
  v_line_station  uuid;
  v_group_id      uuid;
  v_can_assign    boolean;
  i               int;
  v_emp_text      text;
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

  v_can_assign := can_assign_mp_follow_up();

  if p_report_group_id is not null then
    v_group_id := p_report_group_id;
  elsif array_length(p_vins, 1) > 1 then
    v_group_id := gen_random_uuid();
  else
    v_group_id := null;
  end if;

  for i in 1..array_length(p_vins, 1) loop
    v_vin := upper(trim(p_vins[i]));
    if length(v_vin) < 4 then
      raise exception 'VIN #% must be at least 4 characters.', i;
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

      select id into v_vehicle
      from vehicles
      where vin = v_vin
      order by is_deleted asc, created_at desc nulls last
      limit 1;

      if v_vehicle is null then
        insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status, factory_org_unit_id)
        values (v_vin, p_model_id, p_color_id, v_line_station, 'off_line_incomplete', p_factory_org_unit_id)
        returning id into v_vehicle;
      else
        update vehicles
          set vehicle_color_id        = coalesce(p_color_id, vehicle_color_id),
              current_station_id      = coalesce(v_line_station, current_station_id),
              factory_org_unit_id     = coalesce(p_factory_org_unit_id, factory_org_unit_id),
              model_id                = coalesce(p_model_id, model_id),
              shortage_resolved_at    = null,
              shortage_resolved_by    = null,
              is_deleted              = false,
              production_status       = case
                when production_status = 'completed' then 'off_line_incomplete'::vehicle_production_status
                else coalesce(production_status, 'off_line_incomplete'::vehicle_production_status)
              end
        where id = v_vehicle;
      end if;

      v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle);

      if coalesce(trim(v_part->>'part_description'), '') = '' then
        raise exception 'Part description is required for all lines.';
      end if;

      v_line_reason := mp_validate_reason(coalesce(nullif(trim(v_part->>'reason'), ''), p_reason));
      v_line_dept := mp_validate_department(coalesce(nullif(trim(v_part->>'department'), ''), p_department));

      v_complete_dept := null;
      v_follow_emp := null;
      v_follow_emps := '{}';
      if v_can_assign then
        v_complete_dept := nullif(trim(v_part->>'completing_department'), '');
        if v_complete_dept is not null then
          v_complete_dept := mp_validate_department(v_complete_dept);
        end if;
        v_emp_text := v_part->>'follow_up_employee_ids';
        if v_emp_text is not null and v_emp_text <> '' and v_emp_text <> '[]' then
          select array_agg(elem::uuid) into v_follow_emps
          from jsonb_array_elements_text(v_part->'follow_up_employee_ids') as elem;
          v_follow_emp := v_follow_emps[1];
        else
          begin
            v_follow_emp := nullif(trim(v_part->>'follow_up_employee_id'), '')::uuid;
          exception
            when invalid_text_representation then
              raise exception 'Invalid follow_up_employee_id on part line.';
          end;
          if v_follow_emp is not null then
            v_follow_emps := array[v_follow_emp];
          end if;
        end if;
      end if;

      insert into missing_parts (
        vehicle_id, part_description, required_qty,
        reason, department, completing_department, follow_up_employee_id, follow_up_employee_ids,
        priority, stopper_type, notes, status, report_group_id, factory_org_unit_id
      )
      values (
        v_vehicle,
        trim(v_part->>'part_description'),
        greatest(coalesce((v_part->>'required_qty')::numeric, 1), 1),
        v_line_reason,
        v_line_dept,
        v_complete_dept,
        v_follow_emp,
        coalesce(v_follow_emps, '{}'),
        p_priority,
        v_stopper,
        nullif(trim(p_notes), ''),
        'open',
        v_group_id,
        p_factory_org_unit_id
      )
      returning id into v_mp_id;

      v_mp_ids := array_append(v_mp_ids, v_mp_id);
    end loop;
  end loop;

  return jsonb_build_object(
    'vehicle_count', array_length(p_vins, 1),
    'part_line_count', jsonb_array_length(p_parts),
    'missing_part_count', array_length(v_mp_ids, 1),
    'report_group_id', v_group_id,
    'vehicle_ids', to_jsonb(v_vehicle_ids),
    'missing_part_ids', to_jsonb(v_mp_ids)
  );
end;
$$;

grant execute on function public.report_missing_parts_batch(
  text[], uuid, jsonb, uuid, uuid, text, text, priority_level, text, text, uuid, uuid
) to authenticated;

create or replace function public.report_missing_part(
  p_vin text,
  p_model_id uuid,
  p_part_description text,
  p_color_id uuid default null,
  p_station_id uuid default null,
  p_required_qty numeric default 1,
  p_reason text default 'stock_shortage',
  p_department text default 'warehouse',
  p_priority priority_level default 'normal',
  p_stopper_type text default 'car_stopper',
  p_notes text default null,
  p_item_id uuid default null,
  p_is_dr_item boolean default null
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
  where vin = v_vin
  order by is_deleted asc, created_at desc nulls last
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
      set vehicle_color_id     = coalesce(p_color_id, vehicle_color_id),
          current_station_id   = coalesce(p_station_id, current_station_id),
          model_id             = p_model_id,
          shortage_resolved_at = null,
          shortage_resolved_by = null,
          is_deleted           = false,
          production_status    = case
            when production_status = 'completed' then 'off_line_incomplete'::vehicle_production_status
            else coalesce(production_status, 'off_line_incomplete'::vehicle_production_status)
          end
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

grant execute on function public.report_missing_part(
  text, uuid, text, uuid, uuid, numeric, text, text, priority_level, text, text, uuid, boolean
) to authenticated;
