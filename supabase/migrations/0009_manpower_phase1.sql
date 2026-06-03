-- =============================================================================
-- 0009_manpower_phase1.sql
-- Manpower / station-operations — PHASE 1.
--
-- Merge approach: a "station operation" is modelled as a training_skills row
-- tied to a station (training_skills already has station_id), and a worker's
-- operation qualification is an employee_training_records row. This phase only
-- EXTENDS existing tables (stations, training_skills, employee_training_records)
-- and refreshes the v_employee_training view — no new tables yet.
--
-- Additive & idempotent. Reuses training_level / training_status enums + the
-- training_level_rank() helper from 0008. Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- station_type enum + station extensions
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'station_type') then
    create type station_type as enum ('main_line', 'side_assembly', 'offline_prep');
  end if;
end$$;

alter table stations add column if not exists station_type station_type not null default 'main_line';
alter table stations add column if not exists station_name_en text;
alter table stations add column if not exists sort_order int not null default 0;

create index if not exists idx_stations_type on stations (station_type);
create index if not exists idx_stations_sort on stations (sort_order);

-- ----------------------------------------------------------------------------
-- training_skills = station operations: add operation metadata
-- ----------------------------------------------------------------------------
alter table training_skills add column if not exists standard_time_minutes numeric
  check (standard_time_minutes is null or standard_time_minutes >= 0);
alter table training_skills add column if not exists required_manpower_count int not null default 1
  check (required_manpower_count > 0);
alter table training_skills add column if not exists is_critical boolean not null default false;

-- ----------------------------------------------------------------------------
-- employee_training_records = operation qualifications: rating + evaluation
-- Rating is a 1..5 scale (clear UI badge).
-- ----------------------------------------------------------------------------
alter table employee_training_records add column if not exists rating int
  check (rating is null or (rating between 1 and 5));
alter table employee_training_records add column if not exists last_evaluation_date date;

-- ----------------------------------------------------------------------------
-- Refresh v_employee_training to surface rating / evaluation / operation station
-- (drop+create because column set/order changes).
-- ----------------------------------------------------------------------------
drop view if exists v_employee_training;
create view v_employee_training
with (security_invoker = true) as
select
  r.id,
  r.employee_id,
  e.employee_code,
  e.full_name        as employee_name,
  e.job_role,
  e.department       as employee_department,
  e.work_area_id,
  e.station_id       as employee_station_id,
  r.skill_id,
  s.skill_code,
  coalesce(nullif(trim(s.skill_name_ar), ''), s.skill_name_en) as skill_name_ar,
  coalesce(nullif(trim(s.skill_name_en), ''), s.skill_name_ar) as skill_name_en,
  s.station_id       as operation_station_id,
  st.station_number  as operation_station_number,
  st.station_name    as operation_station_name,
  s.is_critical,
  s.required_manpower_count,
  r.level,
  training_level_rank(r.level) as level_rank,
  r.rating,
  r.status,
  case
    when r.status = 'suspended' then 'suspended'::training_status
    when r.expiry_date is not null and r.expiry_date < current_date then 'expired'::training_status
    else r.status
  end as effective_status,
  r.training_date,
  r.expiry_date,
  r.last_evaluation_date,
  (r.expiry_date is not null and r.expiry_date < current_date) as is_expired,
  (r.expiry_date is not null and r.expiry_date >= current_date and r.expiry_date < current_date + 30) as is_near_expiry,
  r.trainer_id,
  tr.full_name       as trainer_name,
  r.notes,
  r.attachment_url,
  r.is_active,
  r.created_at,
  r.updated_at
from employee_training_records r
  join employees e on e.id = r.employee_id
  join training_skills s on s.id = r.skill_id
  left join stations st on st.id = s.station_id
  left join employees tr on tr.id = r.trainer_id
where r.is_active = true;
