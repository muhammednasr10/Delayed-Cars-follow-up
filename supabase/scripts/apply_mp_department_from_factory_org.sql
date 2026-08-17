-- Causing/completing department may be a factory_org_units id (from Settings → Administrations).
-- Keep legacy mp_department_options codes valid for existing shortage rows.

alter table public.mp_department_reason_options
  drop constraint if exists mp_department_reason_options_department_code_fkey;

create or replace function public.mp_validate_department(p_code text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_code text := trim(p_code);
  v_org uuid;
begin
  if v_code = '' then
    raise exception 'Department is required';
  end if;

  begin
    v_org := v_code::uuid;
  exception
    when invalid_text_representation then
      v_org := null;
  end;

  if v_org is not null then
    if exists (select 1 from public.factory_org_units where id = v_org and is_active) then
      return v_org::text;
    end if;
  end if;

  if exists (select 1 from public.mp_department_options where code = v_code and is_active) then
    return v_code;
  end if;

  if exists (
    select 1 from public.factory_org_units
    where is_active and name = v_code
  ) then
    return (
      select id::text
      from public.factory_org_units
      where is_active and name = v_code
      order by sort_order, name
      limit 1
    );
  end if;

  raise exception 'Invalid or inactive department: %', v_code;
end;
$$;

grant execute on function public.mp_validate_department(text) to authenticated;
