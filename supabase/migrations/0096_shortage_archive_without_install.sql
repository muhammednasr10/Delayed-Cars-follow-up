-- Allow archiving a vehicle shortage even when installed_qty < required_qty.
-- User confirms in the app that parts were physically installed.

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

grant execute on function complete_vehicle_shortage(uuid) to authenticated;

-- Allow close when archive flow sets qc_approved (user confirmed install in app).
create or replace function enforce_missing_part_close()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' then
    if new.installed_qty < new.required_qty and not coalesce(new.qc_approved, false) then
      raise exception
        'Cannot close missing part %: installed (%) < required (%).',
        new.id, new.installed_qty, new.required_qty
        using errcode = 'check_violation';
    end if;
    if not coalesce(new.qc_approved, false) then
      raise exception
        'Cannot close missing part %: QC approval is required first.', new.id
        using errcode = 'check_violation';
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;
