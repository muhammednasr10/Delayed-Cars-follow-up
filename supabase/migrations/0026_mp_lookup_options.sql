-- Admin-managed reason classes and responsible departments for missing parts.
-- Prefer running 0029_mp_lookup_full_apply.sql once in SQL Editor if migrations were partial.

create table if not exists mp_reason_options (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_ar   text not null,
  label_en   text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mp_department_options (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_ar   text not null,
  label_en   text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into mp_reason_options (code, label_ar, label_en, sort_order) values
  ('stock_shortage', 'نقص مخزون', 'Stock shortage', 10),
  ('supplier_delay', 'تأخر مورد', 'Supplier delay', 20),
  ('damaged_part', 'قطعة تالفة', 'Damaged part', 30),
  ('qc_rejection', 'رفض جودة', 'QC rejection', 40),
  ('wrong_part', 'قطعة خاطئة', 'Wrong part', 50),
  ('production_mistake', 'خطأ إنتاج', 'Production mistake', 60),
  ('other', 'أخرى', 'Other', 99)
on conflict (code) do nothing;

insert into mp_department_options (code, label_ar, label_en, sort_order) values
  ('warehouse', 'المخازن', 'Warehouse', 10),
  ('purchasing', 'المشتريات', 'Purchasing', 20),
  ('production', 'الإنتاج', 'Production', 30),
  ('quality', 'الجودة', 'Quality', 40),
  ('supplier', 'المورد', 'Supplier', 50),
  ('management', 'الإدارة', 'Management', 60)
on conflict (code) do nothing;

-- Prerequisites from 0025/0022 if not applied yet.
alter table missing_parts
  add column if not exists report_group_id uuid;

create index if not exists idx_missing_parts_report_group
  on missing_parts (report_group_id)
  where report_group_id is not null;

alter table vehicles
  add column if not exists shortage_resolved_at timestamptz;

-- Views that depend on reason/department must be dropped before type change.
drop view if exists v_missing_parts_detail;
drop view if exists v_missing_by_department;
drop view if exists v_missing_aging;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'missing_parts'
      and column_name = 'reason' and udt_name = 'missing_part_reason'
  ) then
    alter table missing_parts
      alter column reason type text using reason::text,
      alter column department type text using department::text;
  end if;
end$$;

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

create or replace view v_missing_by_department as
select department,
       count(*) as total,
       count(*) filter (where status not in ('closed','cancelled')) as open_count
from missing_parts
group by department;

create or replace view v_missing_aging as
select mp.id,
       mp.vehicle_id,
       v.vin,
       mp.part_description,
       mp.priority,
       mp.department,
       mp.status,
       mp.created_at,
       round(extract(epoch from (now() - mp.created_at)) / 3600, 1) as hours_open,
       case
         when extract(epoch from (now() - mp.created_at)) / 3600 < 24 then '0-1d'
         when extract(epoch from (now() - mp.created_at)) / 3600 < 72 then '1-3d'
         when extract(epoch from (now() - mp.created_at)) / 3600 < 168 then '3-7d'
         else '7d+'
       end as age_bucket
from missing_parts mp
  join vehicles v on v.id = mp.vehicle_id
where mp.status not in ('closed','cancelled');

create or replace function mp_validate_reason(p_code text)
returns text
language plpgsql
stable
as $$
declare
  v_code text := trim(p_code);
begin
  if v_code = '' then
    raise exception 'Reason is required';
  end if;
  if not exists (select 1 from mp_reason_options where code = v_code and is_active) then
    raise exception 'Invalid or inactive reason: %', v_code;
  end if;
  return v_code;
end;
$$;

create or replace function mp_validate_department(p_code text)
returns text
language plpgsql
stable
as $$
declare
  v_code text := trim(p_code);
begin
  if v_code = '' then
    raise exception 'Department is required';
  end if;
  if not exists (select 1 from mp_department_options where code = v_code and is_active) then
    raise exception 'Invalid or inactive department: %', v_code;
  end if;
  return v_code;
end;
$$;

alter table mp_reason_options enable row level security;
alter table mp_department_options enable row level security;

drop policy if exists mp_reason_options_select on mp_reason_options;
create policy mp_reason_options_select on mp_reason_options
  for select to authenticated using (true);

drop policy if exists mp_reason_options_write on mp_reason_options;
create policy mp_reason_options_write on mp_reason_options
  for all to authenticated using (has_role('admin')) with check (has_role('admin'));

drop policy if exists mp_department_options_select on mp_department_options;
create policy mp_department_options_select on mp_department_options
  for select to authenticated using (true);

drop policy if exists mp_department_options_write on mp_department_options;
create policy mp_department_options_write on mp_department_options
  for all to authenticated using (has_role('admin')) with check (has_role('admin'));

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

      v_line_reason := mp_validate_reason(coalesce(nullif(trim(v_part->>'reason'), ''), p_reason));
      v_line_dept := mp_validate_department(coalesce(nullif(trim(v_part->>'department'), ''), p_department));

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
      reason           = mp_validate_reason(p_reason),
      department       = mp_validate_department(p_department),
      priority         = p_priority,
      stopper_type     = v_stopper,
      notes            = nullif(trim(p_notes), '')
  where id = p_id;
end;
$$;

grant execute on function update_missing_part_record(
  uuid, text, numeric, text, text, priority_level, text, text
) to authenticated;
