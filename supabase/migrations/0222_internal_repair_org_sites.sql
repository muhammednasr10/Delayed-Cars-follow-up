-- هيكل الإصلاح الداخلي تحت الإنتاج:
--   ريبير نهائى / إصلاح الدهان / التسليم النهائى
--   وكل قسم فيه: غبور + القصراوى

do $$
declare
  v_prod_id uuid;
  v_repair_id uuid;
  v_dept_id uuid;
  v_dept_name text;
  v_site_name text;
  v_sort int := 0;
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

  -- وحّد اسم قسم الإصلاح تحت الإنتاج (كان «الخارجى» في الهيكل).
  select id into v_repair_id
  from public.factory_org_units
  where parent_id = v_prod_id
    and name in (
      'الإصلاح الداخلي',
      'الإصلاح الداخلى',
      'الإصلاح الخارجي',
      'الإصلاح الخارجى'
    )
  order by case name
    when 'الإصلاح الداخلي' then 1
    when 'الإصلاح الداخلى' then 2
    when 'الإصلاح الخارجي' then 3
    else 4
  end
  limit 1;

  if v_repair_id is null then
    insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
    values ('الإصلاح الداخلي', v_prod_id, 'section', 4, true)
    returning id into v_repair_id;
  else
    update public.factory_org_units
    set name = 'الإصلاح الداخلي',
        unit_kind = 'section',
        is_active = true
    where id = v_repair_id
      and name is distinct from 'الإصلاح الداخلي';
  end if;

  -- إعادة تسمية القسم القديم إن وُجد.
  update public.factory_org_units
  set name = 'ريبير نهائى'
  where parent_id = v_repair_id
    and name in ('الإصلاح النهائى', 'الإصلاح النهائي', 'ريبير نهائي')
    and not exists (
      select 1 from public.factory_org_units x
      where x.parent_id = v_repair_id and x.name = 'ريبير نهائى'
    );

  foreach v_dept_name in array array['ريبير نهائى', 'إصلاح الدهان', 'التسليم النهائى']
  loop
    v_sort := v_sort + 1;
    select id into v_dept_id
    from public.factory_org_units
    where parent_id = v_repair_id
      and name = v_dept_name
    limit 1;

    if v_dept_id is null then
      insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
      values (v_dept_name, v_repair_id, 'subsection', v_sort, true)
      returning id into v_dept_id;
    else
      update public.factory_org_units
      set unit_kind = 'subsection',
          sort_order = v_sort,
          is_active = true
      where id = v_dept_id;
    end if;

    foreach v_site_name in array array['غبور', 'القصراوى']
    loop
      if not exists (
        select 1
        from public.factory_org_units
        where parent_id = v_dept_id
          and name = v_site_name
      ) then
        insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
        values (
          v_site_name,
          v_dept_id,
          'subsection',
          case when v_site_name = 'غبور' then 1 else 2 end,
          true
        );
      end if;
    end loop;
  end loop;
end $$;
