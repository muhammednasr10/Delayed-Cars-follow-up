-- Keep profiles.role aligned whenever system_role_id changes

create or replace function trg_profiles_sync_legacy_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.system_role_id is distinct from old.system_role_id then
    perform sync_profile_legacy_role_from_system(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_legacy_role on profiles;
create trigger trg_profiles_sync_legacy_role
  after insert or update of system_role_id on profiles
  for each row execute function trg_profiles_sync_legacy_role();

-- Backfill users stuck on viewer while system role is set
update profiles p
set role = legacy_role_for_system_code(sr.role_code)
from system_roles sr
where p.system_role_id = sr.id
  and p.role is distinct from legacy_role_for_system_code(sr.role_code);
