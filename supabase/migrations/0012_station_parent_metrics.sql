-- Editable parent-station metrics (headcount, avg cycle time)
alter table stations add column if not exists headcount_workers int
  check (headcount_workers is null or headcount_workers > 0);

alter table stations add column if not exists avg_station_time_minutes numeric
  check (avg_station_time_minutes is null or avg_station_time_minutes >= 0);
