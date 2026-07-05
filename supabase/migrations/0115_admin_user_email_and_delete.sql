-- Admin: update user email and permanently delete user accounts.

create or replace function public.admin_update_user_email(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  old_row public.profiles%rowtype;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'Email is required.' using errcode = '22023';
  end if;

  select * into old_row from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  if lower(coalesce(old_row.email, '')) = v_email then
    return;
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(p.email) = v_email and p.id <> p_user_id
  ) then
    raise exception 'A user with this email already exists.' using errcode = '23505';
  end if;

  update public.profiles
  set email = v_email, updated_at = now()
  where id = p_user_id;

  if exists (select 1 from auth.users where id = p_user_id) then
    update auth.users
    set email = v_email, updated_at = now()
    where id = p_user_id;

    update auth.identities
    set
      identity_data = jsonb_set(
        coalesce(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(v_email),
        true
      ),
      updated_at = now()
    where user_id = p_user_id and provider = 'email';
  end if;

  perform write_security_audit(
    'admin_update_user_email',
    'profiles',
    p_user_id,
    to_jsonb(old_row),
    jsonb_build_object('email', v_email),
    null
  );
end;
$$;

create or replace function public.nullify_profile_references(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select
      format('%I.%I', n.nspname, cl.relname) as tbl,
      a.attname as col
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join unnest(c.conkey) as ck(attnum) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = ck.attnum
    where c.confrelid = 'public.profiles'::regclass
      and c.contype = 'f'
      and n.nspname = 'public'
      and cl.relname <> 'profiles'
  loop
    execute format('update %s set %I = null where %I = $1', r.tbl, r.col, r.col) using p_user_id;
  end loop;

  update public.profiles set blocked_by = null where blocked_by = p_user_id;
end;
$$;

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  old_row public.profiles%rowtype;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account.' using errcode = '42501';
  end if;

  select * into old_row from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.profiles p
    join public.system_roles sr on sr.id = p.system_role_id
    where p.id = p_user_id and sr.role_code = 'super_admin'
  ) and (
    select count(*) from public.profiles p
    join public.system_roles sr on sr.id = p.system_role_id
    where sr.role_code = 'super_admin' and p.is_active and not p.is_blocked
  ) <= 1 then
    raise exception 'Cannot delete the last active super admin.' using errcode = '42501';
  end if;

  perform write_security_audit(
    'delete_user_account',
    'profiles',
    p_user_id,
    to_jsonb(old_row),
    null,
    null
  );

  perform public.nullify_profile_references(p_user_id);

  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

grant execute on function public.admin_update_user_email(uuid, text) to authenticated;
grant execute on function public.delete_user_account(uuid) to authenticated;
