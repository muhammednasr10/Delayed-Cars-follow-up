-- Create fixed-route missions inside shortage reporting (server-side),
-- and keep notify failures from rolling back an already-inserted mission.

create or replace function public.create_auto_routed_mission(
  p_event_type text,
  p_title text,
  p_description text default null,
  p_source_vehicle_id uuid default null,
  p_source_missing_part_id uuid default null,
  p_source_scratch_id uuid default null,
  p_source_damaged_part_id uuid default null,
  p_source_internal_quality_id uuid default null,
  p_source_quality_note_id uuid default null,
  p_source_vin text default null,
  p_source_model_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignee uuid;
  v_enabled boolean;
  v_mission_id uuid;
  v_creator uuid;
  v_creator_name text;
begin
  if p_event_type is null or btrim(p_title) = '' then
    return null;
  end if;

  select assignee_employee_id, enabled
  into v_assignee, v_enabled
  from public.mission_auto_routes
  where event_type = p_event_type;

  if not found or not coalesce(v_enabled, false) or v_assignee is null then
    return null;
  end if;

  if p_event_type = 'missing_part_vehicle' and p_source_vehicle_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'missing_part_vehicle'
        and source_vehicle_id = p_source_vehicle_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'scratch' and p_source_scratch_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'scratch'
        and source_scratch_id = p_source_scratch_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'damaged_part' and p_source_damaged_part_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'damaged_part'
        and source_damaged_part_id = p_source_damaged_part_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'internal_quality' and p_source_internal_quality_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'internal_quality'
        and source_internal_quality_id = p_source_internal_quality_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  elsif p_event_type = 'external_quality' and p_source_quality_note_id is not null then
    if exists (
      select 1 from public.team_missions
      where auto_route_event = 'external_quality'
        and source_quality_note_id = p_source_quality_note_id
        and status in ('pending', 'in_progress')
    ) then
      return null;
    end if;
  end if;

  v_creator := public.auth_employee_id();
  if v_creator is not null then
    select e.full_name into v_creator_name from public.employees e where e.id = v_creator;
  end if;

  insert into public.team_missions (
    title,
    description,
    assignee_id,
    status,
    priority,
    due_date,
    recurrence_type,
    notes,
    created_by_employee_id,
    created_by_name,
    source_vehicle_id,
    source_missing_part_id,
    source_scratch_id,
    source_damaged_part_id,
    source_internal_quality_id,
    source_quality_note_id,
    source_vin,
    source_model_name,
    auto_route_event
  ) values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    v_assignee,
    'pending',
    'normal',
    (current_date + 1)::date,
    'none',
    'مهمة ثابتة تلقائية',
    v_creator,
    v_creator_name,
    p_source_vehicle_id,
    p_source_missing_part_id,
    p_source_scratch_id,
    p_source_damaged_part_id,
    p_source_internal_quality_id,
    p_source_quality_note_id,
    nullif(btrim(coalesce(p_source_vin, '')), ''),
    nullif(btrim(coalesce(p_source_model_name, '')), ''),
    p_event_type
  )
  returning id into v_mission_id;

  insert into public.team_mission_assignees (mission_id, employee_id)
  values (v_mission_id, v_assignee)
  on conflict do nothing;

  begin
    perform public.notify_mission_assignees(v_mission_id, 'mission_assigned', array[v_assignee]);
  exception
    when others then
      raise warning 'notify_mission_assignees failed: %', sqlerrm;
  end;

  return v_mission_id;
exception
  when others then
    raise warning 'create_auto_routed_mission failed: %', sqlerrm;
    return null;
end;
$$;

grant execute on function public.create_auto_routed_mission(
  text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, text
) to authenticated;

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
  v_distinct_ids  uuid[] := '{}';
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
  v_vid           uuid;
  v_model_name    text;
  v_title         text;
  v_desc          text;
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

  select coalesce(array_agg(distinct x), '{}') into v_distinct_ids
  from unnest(v_vehicle_ids) as x;

  v_desc := nullif(trim(p_notes), '');
  if v_desc is null and jsonb_array_length(p_parts) > 0 then
    select string_agg(trim(p->>'part_description'), E'\n')
      into v_desc
    from jsonb_array_elements(p_parts) as p
    where coalesce(trim(p->>'part_description'), '') <> '';
  end if;

  foreach v_vid in array v_distinct_ids loop
    select v.vin, vm.name
      into v_vin, v_model_name
    from public.vehicles v
    left join public.vehicle_models vm on vm.id = v.model_id
    where v.id = v_vid;

    if v_vin is null then
      continue;
    end if;

    v_title := case
      when coalesce(nullif(trim(v_model_name), ''), '') <> '' then
        'نواقص — ' || v_vin || ' · ' || trim(v_model_name)
      else
        'نواقص — ' || v_vin
    end;

    perform public.create_auto_routed_mission(
      'missing_part_vehicle',
      v_title,
      v_desc,
      v_vid,
      null,
      null,
      null,
      null,
      null,
      v_vin,
      v_model_name
    );
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

notify pgrst, 'reload schema';
