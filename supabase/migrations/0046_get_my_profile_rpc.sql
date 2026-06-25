-- Reliable profile + system role for the logged-in user (header badge, my account page)

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
    'employment_status', e.employment_status
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
