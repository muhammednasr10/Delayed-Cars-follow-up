-- Partial fix only (views + columns). If mp_reason_options does not exist, run 0029_mp_lookup_full_apply.sql instead.
-- Safe to re-run. Use if 0026/0027 failed on views or missing report_group_id.

alter table missing_parts
  add column if not exists report_group_id uuid;

create index if not exists idx_missing_parts_report_group
  on missing_parts (report_group_id)
  where report_group_id is not null;

alter table vehicles
  add column if not exists shortage_resolved_at timestamptz;

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
