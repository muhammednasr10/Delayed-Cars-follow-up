-- Show reporter / completer names to every authenticated user.
-- v_missing_parts_detail is security_invoker, so joining profiles hid names
-- unless the viewer had users.view (own profile only).

create or replace function public.profile_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(e.full_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.email), '')
  )
  from public.profiles p
  left join public.employees e on e.id = p.employee_id
  where p.id = p_user_id
$$;

create or replace function public.profile_display_email(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(email), '')
  from public.profiles
  where id = p_user_id
$$;

revoke all on function public.profile_display_name(uuid) from public;
revoke all on function public.profile_display_email(uuid) from public;
grant execute on function public.profile_display_name(uuid) to authenticated;
grant execute on function public.profile_display_email(uuid) to authenticated;

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
  public.profile_display_name(v.shortage_resolved_by) as shortage_resolved_by_name,
  st.station_number,
  st.station_name,
  st.line_name              as station_line_name,
  wa.name                   as station_area,
  st.responsible_department as station_department,
  st.responsible_person     as station_person,
  mp.created_by,
  public.profile_display_name(mp.created_by) as created_by_name,
  public.profile_display_email(mp.created_by) as created_by_email,
  ptr.id            as pending_transfer_request_id,
  prr.id            as pending_restore_request_id
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.stations st on st.id = v.current_station_id
  left join public.work_areas wa on wa.id = st.work_area_id
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
