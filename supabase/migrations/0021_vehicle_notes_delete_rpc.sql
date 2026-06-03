-- =============================================================================
-- 0021_vehicle_notes_delete_rpc.sql
-- Admin delete via RPC (matches has_role admin / super_admin / users.manage).
-- Works even if RLS delete policy was not applied.
-- =============================================================================

create or replace function delete_vehicle_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_session_allowed() then
    raise exception 'Session not allowed';
  end if;
  if not has_role('admin') then
    raise exception 'Permission denied: admin only';
  end if;

  delete from vehicle_notes where id = p_note_id;
  if not found then
    raise exception 'Vehicle note not found';
  end if;
end;
$$;

create or replace function clear_vehicle_notes_thread(p_vehicle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not is_session_allowed() then
    raise exception 'Session not allowed';
  end if;
  if not has_role('admin') then
    raise exception 'Permission denied: admin only';
  end if;

  delete from vehicle_notes where vehicle_id = p_vehicle_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function delete_vehicle_note(uuid) to authenticated;
grant execute on function clear_vehicle_notes_thread(uuid) to authenticated;
