-- =============================================================================
-- 0019_fix_set_created_by_trigger.sql
-- set_created_by() referenced NEW.updated_by; tables like vehicle_notes only
-- have created_by, which caused: record "new" has no field "updated_by"
-- =============================================================================

create or replace function set_created_by()
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

-- Dedicated insert stamp for vehicle_notes (no dependency on shared helper quirks)
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
