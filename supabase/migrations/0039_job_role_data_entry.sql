-- مدخل بيانات — reports under supervisor in org hierarchy

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'job_role' and e.enumlabel = 'data_entry'
  ) then
    alter type job_role add value 'data_entry' after 'supervisor';
  end if;
end$$;
