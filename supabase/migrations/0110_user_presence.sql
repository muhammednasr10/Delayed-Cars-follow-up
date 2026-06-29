-- Online presence: last_seen on profiles for active users panel.

alter table public.profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_seen_path text;

create index if not exists idx_profiles_last_seen on public.profiles (last_seen_at desc nulls last);

create or replace function public.touch_my_presence(p_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
  set
    last_seen_at = now(),
    last_seen_path = coalesce(nullif(trim(p_path), ''), last_seen_path)
  where id = auth.uid()
    and is_active
    and not coalesce(is_blocked, false);
end;
$$;

grant execute on function public.touch_my_presence(text) to authenticated;

create or replace view public.v_user_accounts_detail as
select
  p.id,
  p.email,
  p.full_name,
  p.role as legacy_role,
  p.is_active,
  p.is_blocked,
  p.blocked_reason,
  p.blocked_at,
  p.employee_id,
  p.system_role_id,
  p.last_seen_at,
  p.last_seen_path,
  sr.role_code as system_role_code,
  sr.role_name_ar as system_role_name_ar,
  e.employee_code,
  e.full_name as employee_full_name,
  e.job_role,
  e.department,
  e.employment_status,
  e.is_active as employee_is_active
from public.profiles p
left join public.system_roles sr on sr.id = p.system_role_id
left join public.employees e on e.id = p.employee_id;
