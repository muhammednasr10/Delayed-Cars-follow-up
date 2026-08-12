-- Per-issue "ترحيل": fully install + close one shortage line; archive vehicle when none remain open.

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
  set installed_qty = required_qty,
      qc_approved   = true,
      status        = 'closed'::missing_part_status,
      closed_at     = coalesce(closed_at, now())
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
