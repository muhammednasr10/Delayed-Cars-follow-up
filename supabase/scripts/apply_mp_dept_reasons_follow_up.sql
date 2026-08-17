-- Reason classes nested under causing departments, plus completing dept + follow-up employee on shortage lines.

create table if not exists public.mp_department_reason_options (
  department_code text not null,
  reason_code     text not null references public.mp_reason_options (code) on update cascade on delete cascade,
  sort_order      int not null default 0,
  primary key (department_code, reason_code)
);

create index if not exists idx_mp_dept_reason_reason
  on public.mp_department_reason_options (reason_code);

alter table public.mp_department_reason_options enable row level security;

drop policy if exists mp_dept_reason_select on public.mp_department_reason_options;
create policy mp_dept_reason_select on public.mp_department_reason_options
  for select to authenticated using (true);

drop policy if exists mp_dept_reason_insert on public.mp_department_reason_options;
create policy mp_dept_reason_insert on public.mp_department_reason_options
  for insert to authenticated with check (true);

drop policy if exists mp_dept_reason_admin_mutate on public.mp_department_reason_options;
create policy mp_dept_reason_admin_mutate on public.mp_department_reason_options
  for update to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists mp_dept_reason_admin_delete on public.mp_department_reason_options;
create policy mp_dept_reason_admin_delete on public.mp_department_reason_options
  for delete to authenticated using (has_role('admin'));

grant select, insert, update, delete on public.mp_department_reason_options to authenticated;

alter table public.missing_parts
  add column if not exists completing_department text,
  add column if not exists follow_up_employee_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'missing_parts_follow_up_employee_id_fkey'
  ) then
    alter table public.missing_parts
      add constraint missing_parts_follow_up_employee_id_fkey
      foreign key (follow_up_employee_id) references public.employees (id) on delete set null;
  end if;
end$$;

create index if not exists idx_missing_parts_follow_up_employee
  on public.missing_parts (follow_up_employee_id)
  where follow_up_employee_id is not null;

create or replace function public.can_assign_mp_follow_up()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    has_role('admin')
    or has_permission('users', 'manage')
    or exists (
      select 1
      from public.profiles p
      join public.system_roles sr on sr.id = p.system_role_id
      where p.id = auth.uid()
        and sr.role_code in ('engineer', 'production_manager', 'general_manager', 'admin', 'super_admin')
    );
$$;

grant execute on function public.can_assign_mp_follow_up() to authenticated;

drop view if exists public.v_missing_parts_detail;
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
  mp.completing_department,
  mp.follow_up_employee_id,
  fu.full_name      as follow_up_employee_name,
  mp.priority,
  mp.status,
  mp.qc_approved,
  mp.is_dr_item,
  mp.stopper_type,
  mp.notes,
  mp.created_at,
  mp.updated_at,
  mp.closed_at,
  mp.transferred_at,
  mp.factory_org_unit_id,
  v.vin,
  v.model_id,
  vm.name           as model_name,
  v.vehicle_color_id,
  vc.name           as color_name,
  vc.code           as color_code,
  vc.hex_code       as color_hex,
  v.current_station_id as station_id,
  v.shortage_resolved_at,
  v.shortage_resolved_by,
  coalesce(re.full_name, rp.full_name) as shortage_resolved_by_name,
  st.station_number,
  st.station_name,
  st.line_name              as station_line_name,
  wa.name                   as station_area,
  st.responsible_department as station_department,
  st.responsible_person     as station_person,
  mp.created_by,
  cp.full_name      as created_by_name,
  cp.email          as created_by_email,
  ptr.id            as pending_transfer_request_id,
  prr.id            as pending_restore_request_id
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.stations st on st.id = v.current_station_id
  left join public.work_areas wa on wa.id = st.work_area_id
  left join public.profiles cp on cp.id = mp.created_by
  left join public.profiles rp on rp.id = v.shortage_resolved_by
  left join public.employees re on re.id = rp.employee_id
  left join public.employees fu on fu.id = mp.follow_up_employee_id
  left join public.missing_part_workflow_requests ptr
    on ptr.missing_part_id = mp.id
   and ptr.kind = 'transfer'
   and ptr.status = 'pending'
  left join public.missing_part_workflow_requests prr
    on prr.vehicle_id = v.id
   and prr.kind = 'restore'
   and prr.status = 'pending'
where v.is_deleted = false;

grant select on public.v_missing_parts_detail to authenticated;

drop function if exists public.report_missing_parts_batch(
  text[], uuid, jsonb, uuid, uuid, text, text, public.priority_level, text, text, uuid, uuid
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
  v_line_station  uuid;
  v_group_id      uuid;
  v_can_assign    boolean;
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

      v_complete_dept := null;
      v_follow_emp := null;
      if v_can_assign then
        v_complete_dept := nullif(trim(v_part->>'completing_department'), '');
        if v_complete_dept is not null then
          v_complete_dept := mp_validate_department(v_complete_dept);
        end if;
        begin
          v_follow_emp := nullif(trim(v_part->>'follow_up_employee_id'), '')::uuid;
        exception
          when invalid_text_representation then
            raise exception 'Invalid follow_up_employee_id on part line.';
        end;
      end if;

      insert into missing_parts (
        vehicle_id, part_description, required_qty,
        reason, department, completing_department, follow_up_employee_id,
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

drop function if exists public.update_missing_part_record(
  uuid, text, numeric, text, text, public.priority_level, text, text
);

create or replace function public.update_missing_part_record(
  p_id uuid,
  p_part_description text,
  p_required_qty numeric,
  p_reason text,
  p_department text,
  p_priority priority_level,
  p_stopper_type text default 'car_stopper',
  p_notes text default null,
  p_completing_department text default null,
  p_follow_up_employee_id uuid default null,
  p_assign_follow_up boolean default false
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
  v_complete_dept text;
  v_follow_emp uuid;
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

  v_complete_dept := mp.completing_department;
  v_follow_emp := mp.follow_up_employee_id;
  if p_assign_follow_up and can_assign_mp_follow_up() then
    v_complete_dept := nullif(trim(p_completing_department), '');
    if v_complete_dept is not null then
      v_complete_dept := mp_validate_department(v_complete_dept);
    end if;
    v_follow_emp := p_follow_up_employee_id;
  end if;

  update missing_parts
  set part_description = trim(p_part_description),
      required_qty     = p_required_qty,
      reason           = mp_validate_reason(p_reason),
      department       = mp_validate_department(p_department),
      completing_department = v_complete_dept,
      follow_up_employee_id = v_follow_emp,
      priority         = p_priority,
      stopper_type     = v_stopper,
      notes            = nullif(trim(p_notes), '')
  where id = p_id;
end;
$$;

grant execute on function public.update_missing_part_record(
  uuid, text, numeric, text, text, priority_level, text, text, text, uuid, boolean
) to authenticated;
