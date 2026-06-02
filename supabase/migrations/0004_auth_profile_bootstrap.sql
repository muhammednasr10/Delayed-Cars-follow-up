-- =============================================================================
-- 0004_auth_profile_bootstrap.sql
-- Auto-create a `profiles` row whenever a new auth user signs up, so RLS has a
-- role to evaluate. New users default to 'viewer' (least privilege); an admin
-- must elevate them.
--
-- NOTE: bootstrap your first admin manually after signing up, e.g.:
--   update profiles set role = 'admin' where email = 'you@example.com';
-- =============================================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
