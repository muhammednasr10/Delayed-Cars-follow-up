-- =============================================================================
-- 0020_vehicle_notes_admin_delete.sql
-- Only admins may delete vehicle note messages (single or bulk via vehicle_id).
-- =============================================================================

drop policy if exists vehicle_notes_delete on vehicle_notes;
create policy vehicle_notes_delete on vehicle_notes
  for delete using (has_role('admin'));
