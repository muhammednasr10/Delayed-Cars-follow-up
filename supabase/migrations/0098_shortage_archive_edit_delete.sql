-- Allow editing and deleting missing-part lines for archived (history) vehicles.

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
  if not (
    has_role('admin', 'production', 'warehouse', 'purchasing')
    or has_permission('missing_parts', 'update')
    or has_permission('users', 'manage')
  ) then
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
        completion_status    = 'incomplete'::vehicle_completion_status,
        final_approved_at    = null,
        final_approved_by    = null
    where id = mp.vehicle_id;
  end if;
end;
$$;

grant execute on function update_missing_part_record(
  uuid, text, numeric, text, text, priority_level, text, text
) to authenticated;

grant execute on function delete_missing_part_record(uuid) to authenticated;
