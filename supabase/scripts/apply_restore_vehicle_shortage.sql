-- Apply in Supabase SQL Editor if MCP apply fails.
-- Same as supabase/migrations/0149_restore_vehicle_shortage.sql

alter table public.vehicles
  add column if not exists shortage_resolved_by uuid references auth.users (id);

alter table public.missing_parts
  add column if not exists transferred_at timestamptz;

create or replace function restore_vehicle_shortage(p_vehicle_id uuid)
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

  if v.shortage_resolved_at is null then
    raise exception 'Vehicle is not archived';
  end if;

  if not exists (select 1 from missing_parts where vehicle_id = p_vehicle_id) then
    raise exception 'No missing parts registered for this vehicle';
  end if;

  update missing_parts
  set qc_approved    = false,
      closed_at      = null,
      transferred_at = null,
      status         = case
        when installed_qty >= required_qty then 'qc_pending'::missing_part_status
        when installed_qty > 0 then 'installed'::missing_part_status
        else 'open'::missing_part_status
      end
  where vehicle_id = p_vehicle_id
    and status = 'closed'::missing_part_status;

  update vehicles
  set shortage_resolved_at = null,
      shortage_resolved_by = null,
      completion_status    = 'incomplete'::vehicle_completion_status
  where id = p_vehicle_id;

  perform recalc_vehicle_status(p_vehicle_id);
end;
$$;

grant execute on function restore_vehicle_shortage(uuid) to authenticated;
