-- Log role permission changes + richer payloads for permission audit UI.

create or replace function public.set_role_permission(
  p_role_id uuid,
  p_permission_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_allowed boolean;
  mod_key text;
  perm_key text;
begin
  if not public.can_manage_role_permissions() then
    raise exception 'FORBIDDEN';
  end if;

  select rp.allowed into old_allowed
  from public.role_permissions rp
  where rp.role_id = p_role_id and rp.permission_id = p_permission_id;

  select sp.module_key, sp.permission_key
  into mod_key, perm_key
  from public.system_permissions sp
  where sp.id = p_permission_id;

  insert into public.role_permissions (role_id, permission_id, allowed)
  values (p_role_id, p_permission_id, p_allowed)
  on conflict (role_id, permission_id)
  do update set allowed = excluded.allowed;

  if old_allowed is distinct from p_allowed then
    perform write_security_audit(
      'role_permission',
      'role_permissions',
      p_role_id,
      jsonb_build_object(
        'permission_id', p_permission_id,
        'module_key', mod_key,
        'permission_key', perm_key,
        'allowed', old_allowed
      ),
      jsonb_build_object(
        'permission_id', p_permission_id,
        'module_key', mod_key,
        'permission_key', perm_key,
        'allowed', p_allowed
      ),
      null
    );
  end if;
end;
$$;

create or replace function public.set_user_permission_override(
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
declare
  mod_key text;
  perm_key text;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot override your own permissions.' using errcode = '42501';
  end if;

  select sp.module_key, sp.permission_key
  into mod_key, perm_key
  from public.system_permissions sp
  where sp.id = p_permission_id;

  insert into user_permission_overrides (user_id, permission_id, allowed, reason, created_by)
  values (p_user_id, p_permission_id, p_allowed, p_reason, auth.uid())
  on conflict (user_id, permission_id) do update set
    allowed = excluded.allowed,
    reason = excluded.reason,
    created_by = auth.uid();

  perform write_security_audit(
    'permission_override',
    'user_permission_overrides',
    p_user_id,
    null,
    jsonb_build_object(
      'permission_id', p_permission_id,
      'module_key', mod_key,
      'permission_key', perm_key,
      'allowed', p_allowed
    ),
    p_reason
  );
end;
$$;

create or replace function public.remove_user_permission_override(p_user_id uuid, p_permission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mod_key text;
  perm_key text;
  old_allowed boolean;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  select sp.module_key, sp.permission_key
  into mod_key, perm_key
  from public.system_permissions sp
  where sp.id = p_permission_id;

  select uo.allowed into old_allowed
  from public.user_permission_overrides uo
  where uo.user_id = p_user_id and uo.permission_id = p_permission_id;

  if not found then
    return;
  end if;

  delete from user_permission_overrides
  where user_id = p_user_id and permission_id = p_permission_id;

  perform write_security_audit(
    'remove_permission_override',
    'user_permission_overrides',
    p_user_id,
    jsonb_build_object(
      'permission_id', p_permission_id,
      'module_key', mod_key,
      'permission_key', perm_key,
      'allowed', old_allowed
    ),
    null,
    null
  );
end;
$$;
