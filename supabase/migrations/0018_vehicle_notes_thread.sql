-- =============================================================================
-- 0018_vehicle_notes_thread.sql
-- Per-vehicle follow-up notes (conversation thread on missing-parts vehicles).
-- =============================================================================

create table if not exists vehicle_notes (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles (id) on delete cascade,
  body        text not null check (char_length(trim(body)) > 0),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create or replace function vehicle_notes_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicle_notes_created_by on vehicle_notes;
create trigger trg_vehicle_notes_created_by
  before insert on vehicle_notes
  for each row execute function vehicle_notes_before_insert();

create index if not exists idx_vehicle_notes_vehicle on vehicle_notes (vehicle_id, created_at);

drop view if exists v_vehicle_notes_detail;

create view v_vehicle_notes_detail
with (security_invoker = true) as
select
  vn.id,
  vn.vehicle_id,
  vn.body,
  vn.created_by,
  p.full_name as created_by_name,
  p.email     as created_by_email,
  vn.created_at
from vehicle_notes vn
  left join profiles p on p.id = vn.created_by;

alter table vehicle_notes enable row level security;

drop policy if exists vehicle_notes_read on vehicle_notes;
create policy vehicle_notes_read on vehicle_notes
  for select using (auth.uid() is not null);

drop policy if exists vehicle_notes_insert on vehicle_notes;
create policy vehicle_notes_insert on vehicle_notes
  for insert with check (auth.uid() is not null);

drop policy if exists vehicle_notes_delete on vehicle_notes;
create policy vehicle_notes_delete on vehicle_notes
  for delete using (has_role('admin'));
