-- Admin CRUD for user accounts and custom system roles

-- Map system_roles.role_code -> legacy profiles.role (RLS fallback)
create or replace function legacy_role_for_system_code(p_code text)
returns user_role
language sql
immutable
as $$
  select case p_code
    when 'super_admin' then 'admin'::user_role
    when 'admin' then 'admin'::user_role
    when 'production_manager' then 'production'::user_role
    when 'general_manager' then 'production'::user_role
    when 'engineer' then 'production'::user_role
    when 'supervisor' then 'production'::user_role
    when 'qc_user' then 'quality'::user_role
    when 'data_entry' then 'warehouse'::user_role
    else 'viewer'::user_role
  end;
$$;

create or replace function sync_profile_legacy_role_from_system(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  select sr.role_code into code
  from profiles p
  left join system_roles sr on sr.id = p.system_role_id
  where p.id = p_user_id;

  if code is null then
    update profiles set role = 'viewer'::user_role where id = p_user_id;
  else
    update profiles set role = legacy_role_for_system_code(code) where id = p_user_id;
  end if;
end;
$$;

-- Keep link_user_to_employee + update_user_system_role in sync with legacy role
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

  perform sync_profile_legacy_role_from_system(p_user_id);

  perform write_security_audit('link_user_employee', 'profiles', p_user_id, null,
    jsonb_build_object('employee_id', p_employee_id, 'system_role_id', p_system_role_id, 'notes', p_notes), p_notes);
end;
$$;

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
  perform sync_profile_legacy_role_from_system(p_user_id);

  perform write_security_audit('update_user_role', 'profiles', p_user_id, null,
    jsonb_build_object('system_role_id', p_system_role_id), null);
end;
$$;

create or replace function update_user_account(
  p_user_id uuid,
  p_full_name text default null,
  p_system_role_id uuid default null,
  p_employee_id uuid default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
  old_row profiles%rowtype;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  select * into old_row from profiles where id = p_user_id for update;
  if not found then raise exception 'User not found.'; end if;

  if p_user_id = auth.uid() and p_is_active is not null and not p_is_active then
    raise exception 'Cannot deactivate your own account.' using errcode = '42501';
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
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    system_role_id = coalesce(p_system_role_id, system_role_id),
    employee_id = case when p_employee_id is not null then p_employee_id else employee_id end,
    is_active = coalesce(p_is_active, is_active)
  where id = p_user_id;

  if p_system_role_id is not null then
    perform sync_profile_legacy_role_from_system(p_user_id);
  end if;

  perform write_security_audit('update_user_account', 'profiles', p_user_id, to_jsonb(old_row),
    jsonb_build_object(
      'full_name', p_full_name,
      'system_role_id', p_system_role_id,
      'employee_id', p_employee_id,
      'is_active', p_is_active
    ), null);
end;
$$;

create or replace function deactivate_user_account(p_user_id uuid)
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
  if p_user_id = auth.uid() then
    raise exception 'Cannot deactivate your own account.' using errcode = '42501';
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
    raise exception 'Cannot deactivate the last active super admin.' using errcode = '42501';
  end if;

  update profiles set is_active = false where id = p_user_id;

  perform write_security_audit('deactivate_user', 'profiles', p_user_id, to_jsonb(old_row),
    jsonb_build_object('is_active', false), null);
end;
$$;

create or replace function remove_user_permission_override(p_user_id uuid, p_permission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  delete from user_permission_overrides
  where user_id = p_user_id and permission_id = p_permission_id;

  perform write_security_audit('remove_permission_override', 'user_permission_overrides', p_user_id, null,
    jsonb_build_object('permission_id', p_permission_id), null);
end;
$$;

create or replace function upsert_system_role(
  p_role_id uuid,
  p_role_code text,
  p_role_name_ar text,
  p_role_name_en text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  code text := lower(trim(regexp_replace(p_role_code, '\s+', '_', 'g')));
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if code = '' or trim(p_role_name_ar) = '' then
    raise exception 'Role code and Arabic name are required.' using errcode = '22023';
  end if;

  if p_role_id is null then
    insert into system_roles (role_code, role_name_ar, role_name_en, description, is_system, is_active)
    values (code, trim(p_role_name_ar), nullif(trim(p_role_name_en), ''), nullif(trim(p_description), ''), false, true)
    returning id into rid;
    perform write_security_audit('create_system_role', 'system_roles', rid, null,
      jsonb_build_object('role_code', code), null);
    return rid;
  end if;

  if exists (select 1 from system_roles where id = p_role_id and is_system) then
    update system_roles set
      role_name_ar = trim(p_role_name_ar),
      role_name_en = nullif(trim(p_role_name_en), ''),
      description = nullif(trim(p_description), '')
    where id = p_role_id;
  else
    update system_roles set
      role_code = code,
      role_name_ar = trim(p_role_name_ar),
      role_name_en = nullif(trim(p_role_name_en), ''),
      description = nullif(trim(p_description), ''),
      is_active = true
    where id = p_role_id;
  end if;

  rid := p_role_id;
  perform write_security_audit('update_system_role', 'system_roles', rid, null,
    jsonb_build_object('role_code', code), null);
  return rid;
end;
$$;

create or replace function delete_system_role(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  if exists (select 1 from system_roles where id = p_role_id and is_system) then
    raise exception 'Cannot delete a built-in system role.' using errcode = '42501';
  end if;

  if exists (select 1 from profiles where system_role_id = p_role_id and is_active) then
    raise exception 'Role is assigned to active users. Reassign them first.' using errcode = '23503';
  end if;

  delete from role_permissions where role_id = p_role_id;
  delete from system_roles where id = p_role_id;

  perform write_security_audit('delete_system_role', 'system_roles', p_role_id, null, null, null);
end;
$$;

grant execute on function update_user_account(uuid, text, uuid, uuid, boolean) to authenticated;
grant execute on function deactivate_user_account(uuid) to authenticated;
grant execute on function remove_user_permission_override(uuid, uuid) to authenticated;
grant execute on function upsert_system_role(uuid, text, text, text, text) to authenticated;
grant execute on function delete_system_role(uuid) to authenticated;
