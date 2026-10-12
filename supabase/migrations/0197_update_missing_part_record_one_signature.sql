-- Two update_missing_part_record overloads make PostgREST refuse the call
-- (merge and edit). Keep a single signature.

alter table public.missing_parts
  add column if not exists follow_up_employee_ids uuid[] not null default '{}';

do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_missing_part_record'
  loop
    execute format('drop function public.update_missing_part_record(%s)', r.args);
  end loop;
end $$;

create function public.update_missing_part_record(
  p_id uuid,
  p_part_description text,
  p_required_qty numeric,
  p_reason text,
  p_department text,
  p_priority priority_level,
  p_stopper_type text default 'car_stopper',
  p_notes text default null,
  p_completing_department text default null,
  p_follow_up_employee_id uuid default null,
  p_assign_follow_up boolean default false,
  p_follow_up_employee_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v_resolved timestamptz;
  v_stopper text;
  v_complete_dept text;
  v_follow_emp uuid;
  v_follow_emps uuid[];
begin
  if not can_manage_missing_parts(false) then
    raise exception 'Permission denied';
  end if;

  select * into mp from missing_parts where id = p_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  select shortage_resolved_at into v_resolved from vehicles where id = mp.vehicle_id;

  if v_resolved is null and mp.status in ('closed', 'cancelled') then
    raise exception 'Cannot edit a closed or cancelled line';
  end if;

  if p_required_qty is null or p_required_qty <= 0 then
    raise exception 'Required quantity must be positive';
  end if;

  if trim(coalesce(p_part_description, '')) = '' then
    raise exception 'Part description is required';
  end if;

  if p_required_qty < mp.installed_qty then
    raise exception 'Required quantity cannot be less than installed quantity (%)', mp.installed_qty;
  end if;

  v_stopper := coalesce(nullif(trim(p_stopper_type), ''), 'car_stopper');
  if v_stopper not in ('line_stopper', 'car_stopper') then
    raise exception 'Invalid stopper_type: %', v_stopper;
  end if;

  v_complete_dept := mp.completing_department;
  v_follow_emp := mp.follow_up_employee_id;
  v_follow_emps := coalesce(mp.follow_up_employee_ids, '{}');
  if p_assign_follow_up and can_assign_mp_follow_up() then
    v_complete_dept := nullif(trim(p_completing_department), '');
    if v_complete_dept is not null then
      v_complete_dept := mp_validate_department(v_complete_dept);
    end if;
    v_follow_emps := coalesce(
      p_follow_up_employee_ids,
      case when p_follow_up_employee_id is null then '{}'::uuid[] else array[p_follow_up_employee_id] end
    );
    v_follow_emp := v_follow_emps[1];
  end if;

  update missing_parts
  set part_description = trim(p_part_description),
      required_qty     = p_required_qty,
      reason           = mp_validate_reason(p_reason),
      department       = mp_validate_department(p_department),
      completing_department = v_complete_dept,
      follow_up_employee_id = v_follow_emp,
      follow_up_employee_ids = coalesce(v_follow_emps, '{}'),
      priority         = p_priority,
      stopper_type     = v_stopper,
      notes            = nullif(trim(p_notes), '')
  where id = p_id;
end;
$$;

grant execute on function public.update_missing_part_record(
  uuid, text, numeric, text, text, priority_level, text, text, text, uuid, boolean, uuid[]
) to authenticated;

notify pgrst, 'reload schema';
