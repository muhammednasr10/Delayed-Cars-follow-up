-- Apply in Supabase SQL Editor if MCP apply fails.
-- Same as supabase/migrations/0146_missing_part_transferred_at.sql

alter table public.missing_parts
  add column if not exists transferred_at timestamptz;

comment on column public.missing_parts.transferred_at is
  'Set when the issue is closed via transfer (ترحيل): treated as done for workflow but shortage not physically resolved.';

create index if not exists idx_missing_parts_transferred_at
  on public.missing_parts (transferred_at)
  where transferred_at is not null;

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

grant execute on function transfer_missing_part_issue(uuid) to authenticated;
