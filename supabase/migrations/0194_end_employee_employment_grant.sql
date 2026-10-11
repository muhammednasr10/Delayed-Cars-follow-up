-- PostgREST couldn't see end_employee_employment: the enum argument
-- doesn't match the text the client sends, and execute was never granted.

drop function if exists public.end_employee_employment(uuid, text, employment_status, boolean);

create or replace function public.end_employee_employment(
  p_employee_id uuid,
  p_reason text,
  p_status text default 'resigned',
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
  final_status employment_status;
begin
  if not has_permission('employees', 'update') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if not coalesce(trim(p_reason), '') <> '' then
    raise exception 'Reason is required.' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in ('resigned', 'terminated') then
    raise exception 'Invalid departure status.' using errcode = '22023';
  end if;
  final_status := coalesce(nullif(trim(p_status), ''), 'resigned')::employment_status;

  select * into emp from employees where id = p_employee_id for update;
  if not found then raise exception 'Employee not found.'; end if;

  update employees set
    employment_status = final_status,
    is_active = false,
    stopped_reason = trim(p_reason),
    stopped_at = now(),
    stopped_by = auth.uid()
  where id = p_employee_id;

  select profile_id into linked from employees where id = p_employee_id;

  if p_block_linked_user and linked is not null and has_permission('users', 'manage') then
    perform block_user(linked, 'مغادرة العمل: ' || trim(p_reason));
  end if;

  perform write_security_audit(
    'end_employee_employment',
    'employees',
    p_employee_id,
    to_jsonb(emp),
    jsonb_build_object('employment_status', final_status),
    trim(p_reason)
  );
end;
$$;

grant execute on function public.end_employee_employment(uuid, text, text, boolean) to authenticated;
