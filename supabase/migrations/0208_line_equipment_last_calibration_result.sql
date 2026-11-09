-- Last calibration result is stored on the tool itself, separate from current status.

alter table public.line_equipment
  add column if not exists last_calibration_result text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'line_equipment_last_calibration_result_check'
  ) then
    alter table public.line_equipment
      add constraint line_equipment_last_calibration_result_check
      check (last_calibration_result is null or last_calibration_result in ('pass', 'fail'));
  end if;
end $$;
