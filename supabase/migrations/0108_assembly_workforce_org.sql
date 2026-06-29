-- Ensure الإنتاج / التجميع org unit exists and assign all current employees to it.

do $$
declare
  v_prod_id uuid;
  v_assembly_id uuid;
begin
  select id into v_prod_id
  from public.factory_org_units
  where parent_id is null
    and unit_kind = 'administration'
    and name = 'الإنتاج'
  limit 1;

  if v_prod_id is null then
    insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
    values ('الإنتاج', null, 'administration', 1, true)
    returning id into v_prod_id;
  end if;

  select id into v_assembly_id
  from public.factory_org_units
  where parent_id = v_prod_id
    and unit_kind = 'section'
    and name = 'التجميع'
  limit 1;

  if v_assembly_id is null then
    insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
    values ('التجميع', v_prod_id, 'section', 1, true)
    returning id into v_assembly_id;
  end if;

  update public.employees
  set factory_org_unit_id = v_assembly_id
  where factory_org_unit_id is distinct from v_assembly_id;
end $$;
