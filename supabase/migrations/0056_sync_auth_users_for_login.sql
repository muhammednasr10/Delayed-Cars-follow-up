-- Keep app passwords on profiles AND sync auth.users so login works without Edge Functions.
-- Admin still manages users 100% from the app (Settings → Users).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Admin create user: profiles + auth.users (invisible to admin — app-only)
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
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_name text := coalesce(nullif(trim(p_full_name), ''), v_email);
  v_encrypted_pw text;
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

  v_encrypted_pw := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.profiles (
    id, email, full_name, password_hash, system_role_id, employee_id, role, is_active
  ) values (
    v_user_id,
    v_email,
    v_name,
    v_encrypted_pw,
    p_system_role_id,
    p_employee_id,
    'viewer',
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    password_hash = excluded.password_hash,
    system_role_id = coalesce(excluded.system_role_id, profiles.system_role_id),
    employee_id = coalesce(excluded.employee_id, profiles.employee_id),
    is_active = true;

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
set search_path = public, auth, extensions
as $$
declare
  v_hash text;
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

  v_hash := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));

  update public.profiles
  set password_hash = v_hash,
      updated_at = now()
  where id = p_user_id;

  if exists (select 1 from auth.users where id = p_user_id) then
    update auth.users
    set encrypted_password = v_hash,
        updated_at = now()
    where id = p_user_id;
  end if;

  perform write_security_audit('admin_reset_password', 'profiles', p_user_id, null, null, null);
end;
$$;

-- Ensure profile bootstrap trigger exists for any auth.users row (safety net).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
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
  for each row execute function public.handle_new_auth_user();

-- Sync existing profiles that have password_hash but missing auth.users row
do $$
declare
  r record;
  v_hash text;
begin
  for r in
    select p.id, p.email, p.full_name, p.password_hash
    from public.profiles p
    left join auth.users u on u.id = p.id
    where u.id is null
      and p.email is not null
      and p.password_hash is not null
  loop
    begin
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        r.id, 'authenticated', 'authenticated', lower(r.email), r.password_hash,
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', coalesce(r.full_name, r.email)),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        r.id::text, r.id,
        jsonb_build_object('sub', r.id::text, 'email', lower(r.email), 'email_verified', true),
        'email', now(), now(), now()
      );
    exception when others then
      raise notice 'Skipped auth sync for %: %', r.email, sqlerrm;
    end;
  end loop;
end $$;

grant execute on function public.admin_create_user(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;
