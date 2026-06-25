-- Virtual station columns: PBS01-L1, PBS01-L2, … each stores its own level per employee.

alter table employee_station_training_levels
  add column if not exists level_track smallint;

update employee_station_training_levels
set level_track = case level
  when 'level_1' then 1
  when 'level_2' then 2
  when 'level_3' then 3
  when 'level_4' then 4
  else 1
end
where level_track is null;

alter table employee_station_training_levels
  alter column level_track set not null;

alter table employee_station_training_levels
  drop constraint if exists estl_employee_station_unique;

alter table employee_station_training_levels
  add constraint estl_level_track check (level_track between 1 and 4);

alter table employee_station_training_levels
  add constraint estl_employee_station_track_unique unique (employee_id, station_id, level_track);

create index if not exists idx_estl_track on employee_station_training_levels (level_track);
