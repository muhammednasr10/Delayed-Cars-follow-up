-- ربط السجلات التشغيلية بالهيكل التنظيمي (قسم / قسم فرعي)

alter table public.missing_parts
  add column if not exists factory_org_unit_id uuid references public.factory_org_units(id) on delete set null;

alter table public.vehicles
  add column if not exists factory_org_unit_id uuid references public.factory_org_units(id) on delete set null;

create index if not exists idx_missing_parts_factory_org_unit
  on public.missing_parts (factory_org_unit_id)
  where factory_org_unit_id is not null;

create index if not exists idx_vehicles_factory_org_unit
  on public.vehicles (factory_org_unit_id)
  where factory_org_unit_id is not null;

drop view if exists public.v_missing_parts_detail;
drop view if exists public.v_missing_by_department;
drop view if exists public.v_missing_aging;

create view public.v_missing_parts_detail
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
  mp.factory_org_unit_id,
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
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.stations st on st.id = v.current_station_id
  left join public.work_areas wa on wa.id = st.work_area_id
  left join public.profiles cp on cp.id = mp.created_by
where v.is_deleted = false;

create or replace view public.v_missing_by_department as
select department,
       count(*) as total,
       count(*) filter (where status not in ('closed','cancelled')) as open_count
from public.missing_parts
group by department;

create or replace view public.v_missing_aging as
select mp.id,
       mp.vehicle_id,
       v.vin,
       mp.part_description,
       mp.department,
       mp.status,
       mp.created_at,
       extract(epoch from (now() - mp.created_at)) / 3600 as age_hours
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
where v.is_deleted = false
  and mp.status not in ('closed', 'cancelled');

-- توسيع دالة التبليغ لتخزين القسم التنظيمي
drop function if exists public.report_missing_parts_batch(
  text[], uuid, jsonb, uuid, uuid, text, text, public.priority_level, text, text
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
  p_factory_org_unit_id   uuid default null
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
  v_line_station  uuid;
  v_group_id      uuid := gen_random_uuid();
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

      select id into v_vehicle from vehicles where vin = v_vin;

      if v_vehicle is null then
        insert into vehicles (vin, model_id, vehicle_color_id, current_station_id, production_status, factory_org_unit_id)
        values (v_vin, p_model_id, p_color_id, v_line_station, 'off_line_incomplete', p_factory_org_unit_id)
        returning id into v_vehicle;
      else
        update vehicles
          set vehicle_color_id        = coalesce(p_color_id, vehicle_color_id),
              current_station_id      = coalesce(v_line_station, current_station_id),
              factory_org_unit_id     = coalesce(p_factory_org_unit_id, factory_org_unit_id)
        where id = v_vehicle;
      end if;

      v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle);

      if coalesce(trim(v_part->>'part_description'), '') = '' then
        raise exception 'Part description is required for all lines.';
      end if;

      v_line_reason := mp_validate_reason(coalesce(nullif(trim(v_part->>'reason'), ''), p_reason));
      v_line_dept := mp_validate_department(coalesce(nullif(trim(v_part->>'department'), ''), p_department));

      insert into missing_parts (
        vehicle_id, part_description, required_qty,
        reason, department, priority, stopper_type, notes, status, report_group_id, factory_org_unit_id
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
        case when array_length(p_vins, 1) > 1 then v_group_id else null end,
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
    'vehicle_ids', to_jsonb(v_vehicle_ids),
    'missing_part_ids', to_jsonb(v_mp_ids)
  );
end;
$$;

grant execute on function public.report_missing_parts_batch(
  text[], uuid, jsonb, uuid, uuid, text, text, priority_level, text, text, uuid
) to authenticated;

-- إضافة القسم التنظيمي لعرض السيارات
drop view if exists public.v_vehicle_overview;

create view public.v_vehicle_overview
with (security_invoker = true) as
select
  v.id,
  v.vin,
  v.model_id,
  v.vehicle_color_id,
  v.production_order_id,
  v.production_status,
  v.completion_status,
  v.qc_status,
  v.delivery_status,
  v.delivery_blocked,
  v.open_missing_count,
  v.completion_percent,
  vm.name              as model_name,
  vc.name              as color_name,
  vc.hex_code          as color_hex,
  po.order_number      as production_order_number,
  v.factory_org_unit_id,
  v.created_at,
  v.updated_at
from public.vehicles v
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.production_orders po on po.id = v.production_order_id
where v.is_deleted = false;

grant select on public.v_vehicle_overview to authenticated;
