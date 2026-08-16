-- Who completed/archived the vehicle shortage (المتمم).

alter table public.vehicles
  add column if not exists shortage_resolved_by uuid references auth.users (id);

comment on column public.vehicles.shortage_resolved_by is
  'User who archived the vehicle shortage (completer / المتمم).';

create index if not exists idx_vehicles_shortage_resolved_by
  on public.vehicles (shortage_resolved_by)
  where shortage_resolved_by is not null;

update public.vehicles
set shortage_resolved_by = coalesce(shortage_resolved_by, final_approved_by)
where shortage_resolved_at is not null
  and shortage_resolved_by is null
  and final_approved_by is not null;

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
  cp.email          as created_by_email
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.stations st on st.id = v.current_station_id
  left join public.work_areas wa on wa.id = st.work_area_id
  left join public.profiles cp on cp.id = mp.created_by
  left join public.profiles rp on rp.id = v.shortage_resolved_by
  left join public.employees re on re.id = rp.employee_id
where v.is_deleted = false;

create or replace function complete_vehicle_shortage(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v vehicles%rowtype;
begin
  if not can_manage_missing_parts(true) then
    raise exception 'Permission denied';
  end if;

  select * into v from vehicles where id = p_vehicle_id and not is_deleted for update;
  if not found then
    raise exception 'Vehicle not found';
  end if;

  if v.shortage_resolved_at is not null then
    raise exception 'Vehicle is already archived';
  end if;

  if not exists (select 1 from missing_parts where vehicle_id = p_vehicle_id) then
    raise exception 'No missing parts registered for this vehicle';
  end if;

  update missing_parts
  set qc_approved = true,
      status      = 'closed'::missing_part_status,
      closed_at   = coalesce(closed_at, now())
  where vehicle_id = p_vehicle_id
    and status not in ('closed'::missing_part_status, 'cancelled'::missing_part_status);

  update vehicles
  set shortage_resolved_at = now(),
      shortage_resolved_by = coalesce(shortage_resolved_by, auth.uid()),
      completion_status    = 'complete'::vehicle_completion_status,
      final_approved_at    = coalesce(final_approved_at, now()),
      final_approved_by    = coalesce(final_approved_by, auth.uid())
  where id = p_vehicle_id;

  perform recalc_vehicle_status(p_vehicle_id);
end;
$$;

create or replace function transfer_missing_part_issue(p_missing_part_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v_open int;
  v_archived boolean := false;
begin
  if not can_manage_missing_parts(true) then
    raise exception 'Permission denied';
  end if;

  select * into mp from missing_parts where id = p_missing_part_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  if mp.status in ('closed'::missing_part_status, 'cancelled'::missing_part_status) then
    raise exception 'Issue is already closed';
  end if;

  update missing_parts
  set qc_approved    = true,
      status         = 'closed'::missing_part_status,
      closed_at      = coalesce(closed_at, now()),
      transferred_at = coalesce(transferred_at, now())
  where id = p_missing_part_id;

  select count(*)::int into v_open
  from missing_parts
  where vehicle_id = mp.vehicle_id
    and status not in ('closed'::missing_part_status, 'cancelled'::missing_part_status);

  if v_open = 0 then
    update vehicles
    set shortage_resolved_at = coalesce(shortage_resolved_at, now()),
        shortage_resolved_by = coalesce(shortage_resolved_by, auth.uid()),
        completion_status    = 'complete'::vehicle_completion_status,
        final_approved_at    = coalesce(final_approved_at, now()),
        final_approved_by    = coalesce(final_approved_by, auth.uid())
    where id = mp.vehicle_id
      and is_deleted = false;
    v_archived := true;
    perform recalc_vehicle_status(mp.vehicle_id);
  end if;

  return jsonb_build_object(
    'missing_part_id', p_missing_part_id,
    'vehicle_id', mp.vehicle_id,
    'vehicle_archived', v_archived
  );
end;
$$;

create or replace function delete_missing_part_record(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
begin
  if not has_role('admin') then
    raise exception 'Permission denied: admin only';
  end if;

  select * into mp from missing_parts where id = p_id;
  if not found then
    raise exception 'Missing part not found';
  end if;

  delete from missing_parts where id = p_id;

  if not exists (select 1 from missing_parts where vehicle_id = mp.vehicle_id) then
    update vehicles
    set shortage_resolved_at = null,
        shortage_resolved_by = null,
        completion_status    = 'incomplete'::vehicle_completion_status,
        final_approved_at    = null,
        final_approved_by    = null
    where id = mp.vehicle_id;
  end if;
end;
$$;

grant execute on function complete_vehicle_shortage(uuid) to authenticated;
grant execute on function transfer_missing_part_issue(uuid) to authenticated;
grant execute on function delete_missing_part_record(uuid) to authenticated;
