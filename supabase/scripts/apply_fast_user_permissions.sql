-- Run in SQL Editor of the AFA project (gztpaeytqtarmcfspwvt).
-- Speeds up get_current_user_permissions / has_permission so the app can boot.

set lock_timeout = '8s';
set statement_timeout = '30s';

create or replace function public.get_current_user_permissions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select
      p.id,
      p.system_role_id,
      coalesce(sr.role_code = 'super_admin', false) as is_super
    from public.profiles p
    left join public.system_roles sr on sr.id = p.system_role_id
    where p.id = auth.uid()
  )
  select coalesce(
    case
      when exists (select 1 from me where is_super) then (
        select jsonb_object_agg(sp.module_key || '.' || sp.permission_key, true)
        from public.system_permissions sp
        where sp.is_active
      )
      else (
        select jsonb_object_agg(
          sp.module_key || '.' || sp.permission_key,
          coalesce(uo.allowed, rp.allowed, false)
        )
        from public.system_permissions sp
        left join public.role_permissions rp
          on rp.permission_id = sp.id
         and rp.role_id = (select system_role_id from me)
        left join public.user_permission_overrides uo
          on uo.permission_id = sp.id
         and uo.user_id = (select id from me)
        where sp.is_active
      )
    end,
    '{}'::jsonb
  );
$$;

create or replace function public.has_permission(p_module text, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_session_allowed()
    and (
      coalesce((public.get_current_user_permissions() ->> 'users.manage')::boolean, false)
      or (
        p_permission is distinct from 'manage'
        and coalesce(
          (public.get_current_user_permissions() ->> (p_module || '.manage'))::boolean,
          false
        )
      )
      or coalesce(
        (public.get_current_user_permissions() ->> (p_module || '.' || p_permission))::boolean,
        false
      )
    );
$$;

grant execute on function public.get_current_user_permissions() to authenticated;
grant execute on function public.has_permission(text, text) to authenticated;
