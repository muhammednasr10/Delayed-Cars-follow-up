-- Create / reset auth users from the app (no Edge Function required)
-- Requires pgcrypto (enabled by default on Supabase as extensions)

create extension if not exists pgcrypto with schema extensions;

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

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'A user with this email already exists.' using errcode = '23505';
  end if;

  if p_employee_id is not null then
    select p.id into existing_user
    from profiles p
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

  update public.profiles set
    email = v_email,
    full_name = v_name,
    system_role_id = coalesce(p_system_role_id, system_role_id),
    employee_id = p_employee_id,
    is_active = true
  where id = v_user_id;

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
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters.' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  perform write_security_audit('admin_reset_password', 'profiles', p_user_id, null, null, null);
end;
$$;

grant execute on function public.admin_create_user(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;
