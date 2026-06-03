-- Install records quantity only; archiving a vehicle is a separate manual step.

create or replace function install_part(
  p_missing_part_id uuid,
  p_quantity        numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp record;
  new_installed numeric(14,3);
begin
  if not has_role('admin', 'production') then
    raise exception 'Not authorized to install parts.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Install quantity must be positive.';
  end if;

  select * into mp from missing_parts where id = p_missing_part_id for update;
  if mp.id is null then
    raise exception 'Missing part % not found.', p_missing_part_id;
  end if;

  new_installed := mp.installed_qty + p_quantity;
  if new_installed > mp.required_qty then
    raise exception 'Installed (%) would exceed required (%).', new_installed, mp.required_qty;
  end if;

  update missing_parts
  set installed_qty = new_installed,
      status = case
        when new_installed >= mp.required_qty then 'installed'::missing_part_status
        when mp.status in ('open', 'waiting_purchase', 'available_in_stock', 'issued_to_production')
          then 'installed'::missing_part_status
        else mp.status
      end
  where id = p_missing_part_id;
end;
$$;

create or replace function complete_vehicle_shortage(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v vehicles%rowtype;
begin
  if not has_role('admin', 'production', 'quality') then
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
      completion_status    = 'complete'::vehicle_completion_status,
      final_approved_at    = coalesce(final_approved_at, now()),
      final_approved_by    = coalesce(final_approved_by, auth.uid())
  where id = p_vehicle_id;

  perform recalc_vehicle_status(p_vehicle_id);
end;
$$;

grant execute on function install_part(uuid, numeric) to authenticated;
grant execute on function complete_vehicle_shortage(uuid) to authenticated;
