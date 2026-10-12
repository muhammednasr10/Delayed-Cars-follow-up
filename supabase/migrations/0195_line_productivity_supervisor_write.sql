-- إنتاجية الدخول يكتبها مشرف قسم تريم أ وب، والخروج يكتبها مشرف الشاسيه والفاينال.
-- مسؤول النظام يفضل يقدر يكتب. المساعد وأي قسم فرعي واحد عرض فقط.

create or replace function public.assembly_areas_in_name(p_name text)
returns text[]
language plpgsql
immutable
as $$
declare
  n text := coalesce(btrim(p_name), '');
  areas text[] := array[]::text[];
  bare_trim boolean;
  trim_combined boolean;
begin
  if n = '' then
    return areas;
  end if;

  bare_trim := n ~* '^(تريم|trim)$';
  trim_combined := (n ~ 'تريم' and n ~ '[أا]' and n ~ 'ب')
    or (n ~* 'trim' and n ~* '\ma\M' and n ~* '\mb\M');

  if bare_trim or trim_combined or n ~ 'تريم\s*[أا]' or n ~* 'trim\s*a' then
    areas := areas || 'trim_a';
  end if;
  if bare_trim or trim_combined or n ~ 'تريم\s*[ب]' or n ~* 'trim\s*b' then
    areas := areas || 'trim_b';
  end if;
  if n ~ 'شاسيه' or n ~* 'chassis' then
    areas := areas || 'chassis';
  end if;
  if n ~ 'فاينال' or n ~* 'final' then
    areas := areas || 'final';
  end if;
  return areas;
end;
$$;

create or replace function public.org_subtree_areas(p_unit_id uuid)
returns text[]
language sql
stable
as $$
  select coalesce(
    array(
      select distinct area
      from (
        with recursive walk as (
          select id, name
          from public.factory_org_units
          where id = p_unit_id
          union all
          select child.id, child.name
          from public.factory_org_units child
          join walk parent on child.parent_id = parent.id
        )
        select unnest(public.assembly_areas_in_name(name)) as area
        from walk
      ) named
      where area is not null
    ),
    array[]::text[]
  );
$$;

create or replace function public.can_edit_line_productivity(p_line text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  emp public.employees%rowtype;
  areas text[] := array[]::text[];
  area_name text;
begin
  if has_role('admin') then
    return true;
  end if;

  select * into emp from public.employees where id = public.auth_employee_id();
  if not found or emp.job_role is distinct from 'supervisor'::public.job_role then
    return false;
  end if;

  if emp.factory_org_unit_id is not null then
    areas := public.org_subtree_areas(emp.factory_org_unit_id);
  else
    select wa.name into area_name
    from public.work_areas wa
    where wa.id = emp.work_area_id;
    areas := public.assembly_areas_in_name(area_name);
  end if;

  if p_line = 'entry' then
    return 'trim_a' = any(areas) and 'trim_b' = any(areas);
  end if;
  if p_line = 'exit' then
    return 'chassis' = any(areas) and 'final' = any(areas);
  end if;
  return false;
end;
$$;

revoke all on function public.assembly_areas_in_name(text) from public;
revoke all on function public.org_subtree_areas(uuid) from public;
revoke all on function public.can_edit_line_productivity(text) from public;
grant execute on function public.can_edit_line_productivity(text) to authenticated;

drop policy if exists entry_productivity_daily_write on public.entry_productivity_daily;
create policy entry_productivity_daily_write on public.entry_productivity_daily
  for all to authenticated
  using (public.can_edit_line_productivity('entry'))
  with check (public.can_edit_line_productivity('entry'));

drop policy if exists exit_productivity_daily_write on public.exit_productivity_daily;
create policy exit_productivity_daily_write on public.exit_productivity_daily
  for all to authenticated
  using (public.can_edit_line_productivity('exit'))
  with check (public.can_edit_line_productivity('exit'));

drop policy if exists productivity_delay_reasons_write on public.productivity_delay_reasons;
create policy productivity_delay_reasons_write on public.productivity_delay_reasons
  for all to authenticated
  using (
    case kind
      when 'entry' then public.can_edit_line_productivity('entry')
      when 'exit' then public.can_edit_line_productivity('exit')
      else has_role('admin', 'production')
    end
  )
  with check (
    case kind
      when 'entry' then public.can_edit_line_productivity('entry')
      when 'exit' then public.can_edit_line_productivity('exit')
      else has_role('admin', 'production')
    end
  );
