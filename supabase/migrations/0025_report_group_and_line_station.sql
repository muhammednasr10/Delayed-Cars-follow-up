-- Group multi-VIN reports; per-issue station on batch lines.

alter table missing_parts
  add column if not exists report_group_id uuid;

create index if not exists idx_missing_parts_report_group
  on missing_parts (report_group_id)
  where report_group_id is not null;

drop view if exists v_missing_parts_detail;

create view v_missing_parts_detail
with (security_invoker = true) as
select
  mp.id,
  mp.vehicle_id,
  mp.report_group_id,
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
  v.current_station_id as station_id,
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
  v_vin           text;
  v_vehicle       uuid;
  v_stopper       text;
  v_part          jsonb;
  v_mp_id         uuid;
  v_vehicle_ids   uuid[] := '{}';
  v_mp_ids        uuid[] := '{}';
  v_line_reason   missing_part_reason;
  v_line_dept     responsible_department;
  v_line_station  uuid;
  v_group_id      uuid := gen_random_uuid();
  i               int;
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

      select id into v_vehicle from vehicles where vin = v_vin;

      if v_vehicle is null then
        insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status)
        values (v_vin, p_model_id, p_color_id, v_line_station, 'off_line_incomplete')
        returning id into v_vehicle;
      else
        update vehicles
          set vehicle_color_id   = coalesce(p_color_id, vehicle_color_id),
              current_station_id = coalesce(v_line_station, current_station_id)
        where id = v_vehicle;
      end if;

      v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle);

      if coalesce(trim(v_part->>'part_description'), '') = '' then
        raise exception 'Part description is required for all lines.';
      end if;

      begin
        v_line_reason := coalesce(
          nullif(trim(v_part->>'reason'), '')::missing_part_reason,
          p_reason
        );
      exception
        when invalid_text_representation then
          raise exception 'Invalid reason on part line: %', v_part->>'reason';
      end;

      begin
        v_line_dept := coalesce(
          nullif(trim(v_part->>'department'), '')::responsible_department,
          p_department
        );
      exception
        when invalid_text_representation then
          raise exception 'Invalid department on part line: %', v_part->>'department';
      end;

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
        case when array_length(p_vins, 1) > 1 then v_group_id else null end
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
