-- time_study_readings has no updated_at column; remove the stray trigger that breaks
-- recalc_time_study_metrics() when it updates is_outlier on readings.
drop trigger if exists trg_time_study_readings_updated_at on time_study_readings;
