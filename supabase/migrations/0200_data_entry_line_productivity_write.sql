-- مدخل البيانات يكتب إنتاجية الدخول والخروج لما الصلاحية مفتوحة له.
-- مشرف القسم الأب يفضل على نفس القاعدة: التريمين للدخول، والشاسيه مع الفاينال للخروج.

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
  role_code text;
  role_name text;
begin
  if has_role('admin') then
    return true;
  end if;

  if p_line in ('entry', 'exit') then
    select sr.role_code, sr.role_name_ar
      into role_code, role_name
    from public.profiles p
    left join public.system_roles sr on sr.id = p.system_role_id
    where p.id = auth.uid();

    if role_code = 'data_entry'
      or coalesce(role_name, '') like '%مدخل بيانات%'
      or coalesce(role_name, '') like '%إدخال بيانات%'
    then
      return true;
    end if;
  end if;

  select * into emp from public.employees where id = public.auth_employee_id();
  if found and emp.job_role = 'data_entry'::public.job_role and p_line in ('entry', 'exit') then
    return true;
  end if;

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

revoke all on function public.can_edit_line_productivity(text) from public;
grant execute on function public.can_edit_line_productivity(text) to authenticated;
