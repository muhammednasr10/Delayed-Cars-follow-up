-- Allow manage permission to approve; re-apply readings trigger fix (idempotent)
drop trigger if exists trg_time_study_readings_updated_at on time_study_readings;

create or replace function approve_time_study(p_study_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_study time_studies%rowtype;
begin
  if not (
    has_permission('station_operations', 'approve')
    or has_permission('station_operations', 'manage')
    or has_permission('users', 'manage')
    or has_role('admin')
  ) then
    raise exception 'Not authorized to approve time studies';
  end if;

  select * into v_study from time_studies where id = p_study_id;
  if not found then
    raise exception 'Time study not found';
  end if;

  if v_study.status not in ('draft', 'under_review') then
    raise exception 'Time study cannot be approved from status %', v_study.status;
  end if;

  if v_study.standard_time_seconds is null then
    perform recalc_time_study_metrics(p_study_id);
    select * into v_study from time_studies where id = p_study_id;
  end if;

  if v_study.standard_time_seconds is null then
    raise exception 'Time study has no standard time — add at least one reading first';
  end if;

  update time_studies
  set
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_by = auth.uid()
  where id = p_study_id;

  update station_operations
  set
    standard_time_seconds = v_study.standard_time_seconds,
    standard_time_minutes = round((v_study.standard_time_seconds / 60.0)::numeric, 4),
    required_manpower_count = greatest(1, ceil(coalesce(v_study.required_manpower, 1))::int),
    updated_by = auth.uid()
  where id = v_study.operation_id;

  if v_study.vehicle_model_id is not null then
    update vehicle_model_operations
    set
      standard_time_seconds = v_study.standard_time_seconds,
      required_manpower_count = greatest(1, ceil(coalesce(v_study.required_manpower, 1))::int),
      takt_time_seconds = coalesce(takt_time_seconds, v_study.takt_time_seconds),
      updated_by = auth.uid()
    where operation_id = v_study.operation_id
      and vehicle_model_id = v_study.vehicle_model_id
      and is_active;
  end if;
end;
$$;
