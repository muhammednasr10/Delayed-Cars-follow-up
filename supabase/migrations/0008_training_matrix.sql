-- =============================================================================
-- 0008_training_matrix.sql
-- Training Matrix / مصفوفة التدريب.
--
-- Models which employee is trained on which skill, what each station requires,
-- and (via the v_employee_training view) the *effective* status that accounts
-- for expiry. Qualification per station is computed in the app service from
-- station_required_skills + effective records (kept simple / RPC-ready).
--
-- Additive & safe. Reuses employees, stations, work_areas, responsible_department.
-- Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_level') then
    create type training_level as enum ('level_0', 'level_1', 'level_2', 'level_3', 'level_4');
  end if;
  if not exists (select 1 from pg_type where typname = 'training_status') then
    create type training_status as enum ('not_trained', 'in_training', 'qualified', 'expired', 'suspended');
  end if;
end$$;

-- Numeric rank for a training level (used for "level >= required" comparisons).
create or replace function training_level_rank(lvl training_level)
returns int
language sql
immutable
as $$
  select case lvl
    when 'level_0' then 0
    when 'level_1' then 1
    when 'level_2' then 2
    when 'level_3' then 3
    when 'level_4' then 4
  end;
$$;

-- ----------------------------------------------------------------------------
-- training_skills
-- ----------------------------------------------------------------------------
create table if not exists training_skills (
  id            uuid primary key default gen_random_uuid(),
  skill_code    text not null unique,
  skill_name_ar text,
  skill_name_en text,
  description   text,
  department    responsible_department,
  station_id    uuid references stations (id) on delete set null,
  validity_days int check (validity_days is null or validity_days > 0),
  is_mandatory  boolean not null default false,
  is_active     boolean not null default true,
  created_by    uuid references profiles (id),
  updated_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint training_skills_name_present check (
    coalesce(nullif(trim(skill_name_ar), ''), nullif(trim(skill_name_en), '')) is not null
  )
);

create index if not exists idx_skills_active on training_skills (is_active);
create index if not exists idx_skills_station on training_skills (station_id);

-- ----------------------------------------------------------------------------
-- station_required_skills
-- ----------------------------------------------------------------------------
create table if not exists station_required_skills (
  id             uuid primary key default gen_random_uuid(),
  station_id     uuid not null references stations (id) on delete cascade,
  skill_id       uuid not null references training_skills (id) on delete cascade,
  required_level training_level not null default 'level_3',
  is_mandatory   boolean not null default true,
  notes          text,
  is_active      boolean not null default true,
  created_by     uuid references profiles (id),
  updated_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Only one active requirement per station+skill.
create unique index if not exists uq_station_skill_active
  on station_required_skills (station_id, skill_id) where is_active;
create index if not exists idx_srs_station on station_required_skills (station_id);
create index if not exists idx_srs_skill on station_required_skills (skill_id);

-- ----------------------------------------------------------------------------
-- employee_training_records
-- ----------------------------------------------------------------------------
create table if not exists employee_training_records (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees (id) on delete cascade,
  skill_id       uuid not null references training_skills (id) on delete cascade,
  level          training_level not null default 'level_0',
  status         training_status not null default 'not_trained',
  training_date  date,
  expiry_date    date,
  trainer_id     uuid references employees (id) on delete set null,
  notes          text,
  attachment_url text,
  is_active      boolean not null default true,
  created_by     uuid references profiles (id),
  updated_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Only one active (current) record per employee+skill.
create unique index if not exists uq_employee_skill_active
  on employee_training_records (employee_id, skill_id) where is_active;
create index if not exists idx_etr_employee on employee_training_records (employee_id);
create index if not exists idx_etr_skill on employee_training_records (skill_id);
create index if not exists idx_etr_status on employee_training_records (status);
create index if not exists idx_etr_expiry on employee_training_records (expiry_date);

-- ----------------------------------------------------------------------------
-- training_sessions + attendees (schema only; ready for future UI)
-- ----------------------------------------------------------------------------
create table if not exists training_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_code  text unique,
  session_title text not null,
  skill_id      uuid references training_skills (id) on delete set null,
  trainer_id    uuid references employees (id) on delete set null,
  session_date  date,
  location      text,
  notes         text,
  created_by    uuid references profiles (id),
  updated_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists training_session_attendees (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references training_sessions (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  result      text,
  new_level   training_level,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_tsa_session on training_session_attendees (session_id);

-- ----------------------------------------------------------------------------
-- updated_at + actor-stamp triggers (reuse helpers from 0001 / 0007)
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array['training_skills', 'station_required_skills', 'employee_training_records', 'training_sessions']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', tbl);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at();', tbl);
    execute format('drop trigger if exists trg_%1$s_stamp on %1$s;', tbl);
    execute format('create trigger trg_%1$s_stamp before insert or update on %1$s for each row execute function employees_stamp_actor();', tbl);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- v_employee_training: records enriched with names + effective status
-- effective_status: suspended wins; else expired if past expiry; else stored.
-- ----------------------------------------------------------------------------
create or replace view v_employee_training
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
  r.level,
  training_level_rank(r.level) as level_rank,
  r.status,
  case
    when r.status = 'suspended' then 'suspended'::training_status
    when r.expiry_date is not null and r.expiry_date < current_date then 'expired'::training_status
    else r.status
  end as effective_status,
  r.training_date,
  r.expiry_date,
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
  left join employees tr on tr.id = r.trainer_id
where r.is_active = true;

-- ----------------------------------------------------------------------------
-- Row Level Security: read = authenticated, write = admin
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array['training_skills', 'station_required_skills', 'employee_training_records', 'training_sessions', 'training_session_attendees']
  loop
    execute format('alter table %1$s enable row level security;', tbl);
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('create policy %1$s_select on %1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_insert on %1$s;', tbl);
    execute format('create policy %1$s_insert on %1$s for insert to authenticated with check (has_role(''admin''));', tbl);
    execute format('drop policy if exists %1$s_update on %1$s;', tbl);
    execute format('create policy %1$s_update on %1$s for update to authenticated using (has_role(''admin'')) with check (has_role(''admin''));', tbl);
    execute format('drop policy if exists %1$s_delete on %1$s;', tbl);
    execute format('create policy %1$s_delete on %1$s for delete to authenticated using (has_role(''admin''));', tbl);
  end loop;
end$$;
