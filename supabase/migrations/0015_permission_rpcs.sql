-- =============================================================================
-- 0015_permission_rpcs.sql
-- Session checks, permission resolution, admin RPCs, user account view.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Session allowed (login + API gate)
-- ---------------------------------------------------------------------------
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
      and (p.employee_id is null or e.employment_status = 'active')
  );
$$;

-- ---------------------------------------------------------------------------
-- Effective permissions for current user (jsonb map module.permission -> bool)
-- ---------------------------------------------------------------------------
create or replace function get_current_user_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  is_super boolean;
  result jsonb := '{}'::jsonb;
  rec record;
begin
  if uid is null then return '{}'::jsonb; end if;

  select p.system_role_id, coalesce(sr.role_code = 'super_admin', false)
  into rid, is_super
  from profiles p
  left join system_roles sr on sr.id = p.system_role_id
  where p.id = uid;

  if is_super then
    select jsonb_object_agg(sp.module_key || '.' || sp.permission_key, true)
    into result
    from system_permissions sp where sp.is_active;
    return coalesce(result, '{}'::jsonb);
  end if;

  for rec in
    select sp.module_key, sp.permission_key, coalesce(uo.allowed, rp.allowed, false) as allowed
    from system_permissions sp
    left join role_permissions rp on rp.permission_id = sp.id and rp.role_id = rid
    left join user_permission_overrides uo on uo.permission_id = sp.id and uo.user_id = uid
    where sp.is_active
  loop
    result := result || jsonb_build_object(rec.module_key || '.' || rec.permission_key, rec.allowed);
  end loop;

  return result;
end;
$$;

create or replace function has_permission(p_module text, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perms jsonb;
  key text;
begin
  if not is_session_allowed() then return false; end if;
  perms := get_current_user_permissions();
  key := p_module || '.' || p_permission;
  return coalesce((perms ->> key)::boolean, false);
end;
$$;

-- Legacy bridge: admin/super_admin still pass has_role('admin')
create or replace function has_role(variadic roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_session_allowed()
    and (
      current_user_role() = any(roles)
      or has_permission('users', 'manage')
      or exists (
        select 1 from profiles p
        join system_roles sr on sr.id = p.system_role_id
        where p.id = auth.uid() and sr.role_code in ('super_admin', 'admin')
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Security audit helper
-- ---------------------------------------------------------------------------
create or replace function write_security_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old jsonb default null,
  p_new jsonb default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into security_audit_events (actor_user_id, action, entity_type, entity_id, old_values, new_values, reason)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new, p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- Block / unblock user
-- ---------------------------------------------------------------------------
create or replace function block_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row profiles%rowtype;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized to block users.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot block your own account.' using errcode = '42501';
  end if;
  if not coalesce(trim(p_reason), '') <> '' then
    raise exception 'Block reason is required.' using errcode = '22023';
  end if;

  select * into old_row from profiles where id = p_user_id for update;
  if not found then raise exception 'User not found.'; end if;

  if exists (
    select 1 from profiles p
    join system_roles sr on sr.id = p.system_role_id
    where p.id = p_user_id and sr.role_code = 'super_admin'
  ) and (
    select count(*) from profiles p
    join system_roles sr on sr.id = p.system_role_id
    where sr.role_code = 'super_admin' and p.is_active and not p.is_blocked
  ) <= 1 then
    raise exception 'Cannot block the last active super admin.' using errcode = '42501';
  end if;

  update profiles set
    is_blocked = true,
    blocked_reason = trim(p_reason),
    blocked_at = now(),
    blocked_by = auth.uid()
  where id = p_user_id;

  perform write_security_audit('block_user', 'profiles', p_user_id, to_jsonb(old_row),
    jsonb_build_object('is_blocked', true, 'blocked_reason', trim(p_reason)), trim(p_reason));
end;
$$;

create or replace function unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row profiles%rowtype;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  select * into old_row from profiles where id = p_user_id for update;
  update profiles set
    is_blocked = false,
    blocked_reason = null,
    blocked_at = null,
    blocked_by = null
  where id = p_user_id;

  perform write_security_audit('unblock_user', 'profiles', p_user_id, to_jsonb(old_row),
    jsonb_build_object('is_blocked', false), null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Link user to employee
-- ---------------------------------------------------------------------------
create or replace function link_user_to_employee(
  p_user_id uuid,
  p_employee_id uuid,
  p_system_role_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  if p_employee_id is not null then
    select p.id into existing_user
    from profiles p
    where p.employee_id = p_employee_id
      and p.is_active and not p.is_blocked
      and p.id <> p_user_id
    limit 1;
    if existing_user is not null then
      raise exception 'Employee is already linked to another active user.' using errcode = '23505';
    end if;
  end if;

  update profiles set
    employee_id = p_employee_id,
    system_role_id = coalesce(p_system_role_id, system_role_id)
  where id = p_user_id;

  perform write_security_audit('link_user_employee', 'profiles', p_user_id, null,
    jsonb_build_object('employee_id', p_employee_id, 'system_role_id', p_system_role_id, 'notes', p_notes), p_notes);
end;
$$;

-- ---------------------------------------------------------------------------
-- Suspend / reactivate employee
-- ---------------------------------------------------------------------------
create or replace function suspend_employee(
  p_employee_id uuid,
  p_reason text,
  p_block_linked_user boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  emp employees%rowtype;
  linked uuid;
begin
  if not has_permission('employees', 'update') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if not coalesce(trim(p_reason), '') <> '' then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  select * into emp from employees where id = p_employee_id for update;
  if not found then raise exception 'Employee not found.'; end if;

  update employees set
    employment_status = 'suspended',
    is_active = false,
    stopped_reason = trim(p_reason),
    stopped_at = now(),
    stopped_by = auth.uid()
  where id = p_employee_id;

  select profile_id into linked from employees where id = p_employee_id;

  if p_block_linked_user and linked is not null and has_permission('users', 'manage') then
    perform block_user(linked, 'إيقاف تلقائي: ' || trim(p_reason));
  end if;

  perform write_security_audit('suspend_employee', 'employees', p_employee_id, to_jsonb(emp),
    jsonb_build_object('employment_status', 'suspended'), trim(p_reason));
end;
$$;

create or replace function reactivate_employee(p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  emp employees%rowtype;
begin
  if not has_permission('employees', 'update') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  select * into emp from employees where id = p_employee_id for update;

  update employees set
    employment_status = 'active',
    is_active = true,
    stopped_reason = null,
    stopped_at = null,
    stopped_by = null
  where id = p_employee_id;

  perform write_security_audit('reactivate_employee', 'employees', p_employee_id, to_jsonb(emp),
    jsonb_build_object('employment_status', 'active'), null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Update user system role
-- ---------------------------------------------------------------------------
create or replace function update_user_system_role(p_user_id uuid, p_system_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot change your own system role.' using errcode = '42501';
  end if;

  update profiles set system_role_id = p_system_role_id where id = p_user_id;

  perform write_security_audit('update_user_role', 'profiles', p_user_id, null,
    jsonb_build_object('system_role_id', p_system_role_id), null);
end;
$$;

create or replace function set_user_permission_override(
  p_user_id uuid,
  p_permission_id uuid,
  p_allowed boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot override your own permissions.' using errcode = '42501';
  end if;

  insert into user_permission_overrides (user_id, permission_id, allowed, reason, created_by)
  values (p_user_id, p_permission_id, p_allowed, p_reason, auth.uid())
  on conflict (user_id, permission_id) do update set
    allowed = excluded.allowed,
    reason = excluded.reason,
    created_by = auth.uid();

  perform write_security_audit('permission_override', 'user_permission_overrides', p_user_id, null,
    jsonb_build_object('permission_id', p_permission_id, 'allowed', p_allowed), p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- User accounts view
-- ---------------------------------------------------------------------------
create or replace view v_user_accounts_detail as
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
  sr.role_code as system_role_code,
  sr.role_name_ar as system_role_name_ar,
  e.employee_code,
  e.full_name as employee_full_name,
  e.job_role,
  e.department,
  e.employment_status,
  e.is_active as employee_is_active
from profiles p
left join system_roles sr on sr.id = p.system_role_id
left join employees e on e.id = p.employee_id;

-- ---------------------------------------------------------------------------
-- RLS on permission tables
-- ---------------------------------------------------------------------------
alter table system_roles enable row level security;
alter table system_permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_permission_overrides enable row level security;
alter table security_audit_events enable row level security;

drop policy if exists system_roles_read on system_roles;
create policy system_roles_read on system_roles for select to authenticated using (true);

drop policy if exists system_roles_write on system_roles;
create policy system_roles_write on system_roles for all to authenticated
  using (has_permission('users', 'manage')) with check (has_permission('users', 'manage'));

drop policy if exists system_permissions_read on system_permissions;
create policy system_permissions_read on system_permissions for select to authenticated using (true);

drop policy if exists system_permissions_write on system_permissions;
create policy system_permissions_write on system_permissions for all to authenticated
  using (has_permission('users', 'manage')) with check (has_permission('users', 'manage'));

drop policy if exists role_permissions_read on role_permissions;
create policy role_permissions_read on role_permissions for select to authenticated using (true);

drop policy if exists role_permissions_write on role_permissions;
create policy role_permissions_write on role_permissions for all to authenticated
  using (has_permission('users', 'manage')) with check (has_permission('users', 'manage'));

drop policy if exists user_overrides_read on user_permission_overrides;
create policy user_overrides_read on user_permission_overrides for select to authenticated
  using (user_id = auth.uid() or has_permission('users', 'manage'));

drop policy if exists user_overrides_write on user_permission_overrides;
create policy user_overrides_write on user_permission_overrides for all to authenticated
  using (has_permission('users', 'manage')) with check (has_permission('users', 'manage'));

drop policy if exists security_audit_read on security_audit_events;
create policy security_audit_read on security_audit_events for select to authenticated
  using (has_permission('users', 'manage'));

-- Profiles: users read own; managers read all with permission
drop policy if exists profiles_read_authenticated on profiles;
create policy profiles_read_authenticated on profiles for select to authenticated
  using (id = auth.uid() or has_permission('users', 'view'));

drop policy if exists profiles_admin_write on profiles;
drop policy if exists profiles_manage_write on profiles;
create policy profiles_manage_write on profiles for update to authenticated
  using (has_permission('users', 'manage') and id <> auth.uid())
  with check (has_permission('users', 'manage'));

-- Employees: suspend requires employees.update not only admin
drop policy if exists employees_update on employees;
create policy employees_update on employees for update to authenticated
  using (has_permission('employees', 'update') or has_role('admin'))
  with check (has_permission('employees', 'update') or has_role('admin'));
