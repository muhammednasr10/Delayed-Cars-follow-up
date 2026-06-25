-- نطاق القياس: محطة / عامل / عملية + بيانات العرض في السجل
alter table time_studies add column if not exists measurement_scope text not null default 'operation';
alter table time_studies add column if not exists worker_station_id uuid references stations (id) on delete set null;
alter table time_studies add column if not exists subject_label text;
alter table time_studies add column if not exists measured_by_name text;

do $$
begin
  alter table time_studies
    add constraint time_studies_measurement_scope_check
    check (measurement_scope in ('station', 'worker', 'operation'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_time_studies_scope on time_studies (measurement_scope);
