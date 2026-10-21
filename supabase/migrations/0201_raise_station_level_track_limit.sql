-- Allow training matrix tracks to follow Line Balancing headcount (may exceed 4).
alter table public.employee_station_training_levels
  drop constraint if exists estl_level_track;

alter table public.employee_station_training_levels
  add constraint estl_level_track check (level_track between 1 and 20);
