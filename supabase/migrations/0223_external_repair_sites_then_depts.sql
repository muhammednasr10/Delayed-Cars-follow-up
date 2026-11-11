-- تصحيح هيكل الإصلاح الخارجي:
--   غبور / القصراوى
--   وتحت كل موقع: ريبير نهائى · إصلاح الدهان · التسليم النهائى

do $$
declare
  v_prod_id uuid;
  v_repair_id uuid;
  v_site_id uuid;
  v_site_name text;
  v_dept_name text;
  v_sort int;
  r record;
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

  select id into v_repair_id
  from public.factory_org_units
  where parent_id = v_prod_id
    and name in (
      'الإصلاح الخارجي',
      'الإصلاح الخارجى',
      'الاصلاح الخارجي',
      'الاصلاح الخارجى',
      'الإصلاح الداخلي',
      'الإصلاح الداخلى'
    )
  order by case name
    when 'الإصلاح الخارجي' then 1
    when 'الإصلاح الخارجى' then 2
    when 'الاصلاح الخارجي' then 3
    when 'الاصلاح الخارجى' then 4
    else 5
  end
  limit 1;

  if v_repair_id is null then
    insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
    values ('الإصلاح الخارجي', v_prod_id, 'section', 4, true)
    returning id into v_repair_id;
  else
    update public.factory_org_units
    set name = 'الإصلاح الخارجي',
        unit_kind = 'section',
        is_active = true
    where id = v_repair_id
      and name is distinct from 'الإصلاح الخارجي';
  end if;

  -- انقل المواقع اللي كانت تحت الأقسام الثلاثة للأعلى تحت الإصلاح، ثم أنشئ الأقسام تحت كل موقع.
  foreach v_site_name in array array['غبور', 'القصراوى']
  loop
    select id into v_site_id
    from public.factory_org_units
    where parent_id = v_repair_id
      and name = v_site_name
    limit 1;

    if v_site_id is null then
      -- خذ أول موقع بنفس الاسم تحت أي قسم إصلاح قديم إن وُجد.
      select u.id into v_site_id
      from public.factory_org_units u
      join public.factory_org_units d on d.id = u.parent_id
      where d.parent_id = v_repair_id
        and u.name = v_site_name
      order by d.sort_order, u.sort_order
      limit 1;

      if v_site_id is not null then
        update public.factory_org_units
        set parent_id = v_repair_id,
            unit_kind = 'subsection',
            sort_order = case when v_site_name = 'غبور' then 1 else 2 end,
            is_active = true
        where id = v_site_id;
      else
        insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
        values (
          v_site_name,
          v_repair_id,
          'subsection',
          case when v_site_name = 'غبور' then 1 else 2 end,
          true
        )
        returning id into v_site_id;
      end if;
    else
      update public.factory_org_units
      set unit_kind = 'subsection',
          sort_order = case when v_site_name = 'غبور' then 1 else 2 end,
          is_active = true
      where id = v_site_id;
    end if;

    v_sort := 0;
    foreach v_dept_name in array array['ريبير نهائى', 'إصلاح الدهان', 'التسليم النهائى']
    loop
      v_sort := v_sort + 1;
      if not exists (
        select 1
        from public.factory_org_units
        where parent_id = v_site_id
          and name = v_dept_name
      ) then
        insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
        values (v_dept_name, v_site_id, 'subsection', v_sort, true);
      else
        update public.factory_org_units
        set unit_kind = 'subsection',
            sort_order = v_sort,
            is_active = true
        where parent_id = v_site_id
          and name = v_dept_name;
      end if;
    end loop;
  end loop;

  -- عطّل الأقسام القديمة اللي كانت مباشرة تحت الإصلاح (الهيكل المقلوب / C.S / PDI)
  -- بعد ما بقى عندنا غبور والقصراوى كمواقع رئيسية.
  for r in
    select id, name
    from public.factory_org_units
    where parent_id = v_repair_id
      and name not in ('غبور', 'القصراوى', 'القصرواى')
  loop
    update public.factory_org_units
    set is_active = false
    where id = r.id;
  end loop;
end $$;
