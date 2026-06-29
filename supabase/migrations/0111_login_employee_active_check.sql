-- Align login gate with employees.is_active (not only employment_status enum).

create or replace function public.verify_profile_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile public.profiles%rowtype;
  v_emp_status text;
  v_emp_active boolean;
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
    select e.employment_status, e.is_active
    into v_emp_status, v_emp_active
    from public.employees e
    where e.id = v_profile.employee_id;

    if v_emp_status is distinct from 'active' or coalesce(v_emp_active, false) = false then
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

create or replace function get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'role', p.role,
    'is_active', p.is_active,
    'is_blocked', coalesce(p.is_blocked, false),
    'blocked_reason', p.blocked_reason,
    'employee_id', p.employee_id,
    'system_role_id', p.system_role_id,
    'system_role_code', sr.role_code,
    'system_role_name_ar', sr.role_name_ar,
    'employee_code', e.employee_code,
    'employee_full_name', e.full_name,
    'employment_status', e.employment_status,
    'employee_is_active', e.is_active
  )
  into result
  from profiles p
  left join system_roles sr on sr.id = p.system_role_id
  left join employees e on e.id = p.employee_id
  where p.id = uid;

  return result;
end;
$$;

grant execute on function get_my_profile() to authenticated;

create or replace function is_session_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    left join employees e on e.id = p.employee_id
    where p.id = auth.uid()
      and p.is_active
      and not p.is_blocked
      and (
        p.employee_id is null
        or (e.employment_status = 'active' and e.is_active)
      )
  );
$$;
