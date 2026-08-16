-- If the full workflow script failed at the end with deadlock (40P01),
-- close the ERP app tab, wait ~10 seconds, then run this finish-only block.

set lock_timeout = '15s';

grant execute on function is_quality_transfer_station(uuid) to authenticated;
grant execute on function can_review_missing_part_workflow() to authenticated;
grant execute on function request_missing_part_transfer(uuid, uuid) to authenticated;
grant execute on function request_vehicle_shortage_restore(uuid) to authenticated;
grant execute on function review_missing_part_workflow_request(uuid, boolean, text) to authenticated;
grant select on public.v_missing_part_workflow_requests to authenticated;

revoke execute on function apply_approved_missing_part_transfer(uuid, uuid) from public, anon, authenticated;
revoke execute on function apply_approved_vehicle_shortage_restore(uuid) from public, anon, authenticated;

drop policy if exists mp_wf_select on public.missing_part_workflow_requests;
create policy mp_wf_select on public.missing_part_workflow_requests
  for select to authenticated
  using (
    can_manage_missing_parts(false)
    or can_review_missing_part_workflow()
  );
