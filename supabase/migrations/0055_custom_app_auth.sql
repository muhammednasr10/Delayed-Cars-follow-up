-- Custom app authentication: passwords on profiles, no Supabase Auth dependency.
-- Admin manages users 100% from Settings → Users.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Schema: store credentials on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists password_hash text;

-- Copy existing Supabase Auth passwords (one-time) so current users keep working.
update public.profiles p
set password_hash = u.encrypted_password
from auth.users u
where p.id = u.id
  and p.password_hash is null
  and u.encrypted_password is not null;

-- Decouple profiles from auth.users
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

drop trigger if exists trg_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

-- Drop public-schema FK constraints pointing at auth.users (created_by, etc. stay as uuid).
-- Skip auth.* tables — we don't own those on hosted Supabase.
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where c.confrelid = 'auth.users'::regclass
      and c.contype = 'f'
      and n.nspname = 'public'
  loop
    execute format('alter table %s drop constraint if exists %I', r.tbl, r.conname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Login verification (service role only — called from app-auth edge function)
-- ---------------------------------------------------------------------------

create or replace function public.verify_profile_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile public.profiles%rowtype;
  v_emp_status text;
begin
  select * into v_profile
  from public.profiles
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_profile.id is null then
    return null;
  end if;

  if v_profile.password_hash is null
     or v_profile.password_hash <> extensions.crypt(trim(p_password), v_profile.password_hash) then
    return null;
  end if;

  if not v_profile.is_active or coalesce(v_profile.is_blocked, false) then
    return jsonb_build_object('error', 'blocked');
  end if;

  if v_profile.employee_id is not null then
    select e.employment_status into v_emp_status
    from public.employees e
    where e.id = v_profile.employee_id;

    if v_emp_status is distinct from 'active' then
      return jsonb_build_object('error', 'employee_inactive');
    end if;
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name
  );
end;
$$;

revoke all on function public.verify_profile_login(text, text) from public;
grant execute on function public.verify_profile_login(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Self-service password change
-- ---------------------------------------------------------------------------

create or replace function public.change_my_password(p_current text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if length(trim(p_new)) < 6 then
    raise exception 'Password must be at least 6 characters.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.password_hash is not null
      and p.password_hash = extensions.crypt(trim(p_current), p.password_hash)
  ) then
    raise exception 'WRONG_CURRENT_PASSWORD' using errcode = '22023';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(trim(p_new), extensions.gen_salt('bf')),
      updated_at = now()
  where id = uid;

  perform write_security_audit('change_my_password', 'profiles', uid, null, null, null);
end;
$$;

grant execute on function public.change_my_password(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin create / reset user (profiles only — no auth.users)
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text default null,
  p_system_role_id uuid default null,
  p_employee_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_name text := coalesce(nullif(trim(p_full_name), ''), v_email);
  existing_user uuid;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if v_email = '' or length(trim(p_password)) < 6 then
    raise exception 'Email and password (min 6 chars) are required.' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles p where lower(p.email) = v_email) then
    raise exception 'A user with this email already exists.' using errcode = '23505';
  end if;

  if p_employee_id is not null then
    select p.id into existing_user
    from public.profiles p
    where p.employee_id = p_employee_id
      and p.is_active and not p.is_blocked
    limit 1;
    if existing_user is not null then
      raise exception 'Employee is already linked to another active user.' using errcode = '23505';
    end if;
  end if;

  insert into public.profiles (
    id, email, full_name, password_hash, system_role_id, employee_id, role, is_active
  ) values (
    v_user_id,
    v_email,
    v_name,
    extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
    p_system_role_id,
    p_employee_id,
    'viewer',
    true
  );

  if p_system_role_id is not null then
    perform sync_profile_legacy_role_from_system(v_user_id);
  end if;

  perform write_security_audit('admin_create_user', 'profiles', v_user_id, null,
    jsonb_build_object('email', v_email, 'system_role_id', p_system_role_id), null);

  return v_user_id;
end;
$$;

create or replace function public.admin_reset_user_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  perform write_security_audit('admin_reset_password', 'profiles', p_user_id, null, null, null);
end;
$$;

grant execute on function public.admin_create_user(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;
