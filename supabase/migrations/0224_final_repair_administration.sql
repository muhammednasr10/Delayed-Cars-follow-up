-- إضافة «الإصلاح النهائي» كإدارة في الإدارات بتفريعاتها:
--   الإصلاح النهائي
--     ├ غبور → ريبير نهائى / إصلاح الدهان / التسليم النهائى
--     └ القصراوى → نفس الأقسام
-- ويُنقل الهيكل العامل من تحت الإنتاج/الإصلاح الخارجي إلى هذه الإدارة.

do $$
declare
  v_admin_id uuid;
  v_prod_id uuid;
  v_old_repair_id uuid;
  v_site_id uuid;
  v_site_name text;
  v_dept_name text;
  v_sort int;
  v_empty_id uuid;
begin
  -- إدارة علوية: الإصلاح النهائي
  select id into v_admin_id
  from public.factory_org_units
  where parent_id is null
    and unit_kind = 'administration'
    and name in (
      'الإصلاح النهائي',
      'الإصلاح النهائى',
      'الاصلاح النهائي',
      'الاصلاح النهائى',
      'الإصلاح الخارجي',
      'الإصلاح الخارجى'
    )
  order by case name
    when 'الإصلاح النهائي' then 1
    when 'الإصلاح النهائى' then 2
    when 'الاصلاح النهائي' then 3
    when 'الاصلاح النهائى' then 4
    else 5
  end
  limit 1;

  if v_admin_id is null then
    insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
    values ('الإصلاح النهائي', null, 'administration', 10, true)
    returning id into v_admin_id;
  else
    update public.factory_org_units
    set name = 'الإصلاح النهائي',
        unit_kind = 'administration',
        is_active = true
    where id = v_admin_id;
  end if;

  select id into v_prod_id
  from public.factory_org_units
  where parent_id is null
    and unit_kind = 'administration'
    and name = 'الإنتاج'
  limit 1;

  if v_prod_id is not null then
    select id into v_old_repair_id
    from public.factory_org_units
    where parent_id = v_prod_id
      and name in (
        'الإصلاح الخارجي',
        'الإصلاح الخارجى',
        'الاصلاح الخارجي',
        'الاصلاح الخارجى',
        'الإصلاح الداخلي',
        'الإصلاح الداخلى',
        'الإصلاح النهائي',
        'الإصلاح النهائى'
      )
    order by case name
      when 'الإصلاح الخارجي' then 1
      when 'الإصلاح الخارجى' then 2
      else 3
    end
    limit 1;
  end if;

  foreach v_site_name in array array['غبور', 'القصراوى']
  loop
    v_site_id := null;

    -- 1) موقع موجود تحت الإدارة الجديدة
    select id into v_site_id
    from public.factory_org_units
    where parent_id = v_admin_id
      and name = v_site_name
    limit 1;

    -- 2) انقل الموقع من تحت الإنتاج/الإصلاح الخارجي
    if v_site_id is null and v_old_repair_id is not null then
      select id into v_site_id
      from public.factory_org_units
      where parent_id = v_old_repair_id
        and name = v_site_name
      limit 1;

      if v_site_id is not null then
        update public.factory_org_units
        set parent_id = v_admin_id,
            unit_kind = 'section',
            sort_order = case when v_site_name = 'غبور' then 1 else 2 end,
            is_active = true
        where id = v_site_id;
      end if;
    end if;

    -- 3) حوّل الإدارة العلوية الفارغة غبور/القصراوى إلى قسم تحت الإصلاح النهائي
    if v_site_id is null then
      select id into v_empty_id
      from public.factory_org_units
      where parent_id is null
        and unit_kind = 'administration'
        and name = v_site_name
      limit 1;

      if v_empty_id is not null then
        update public.factory_org_units
        set parent_id = v_admin_id,
            unit_kind = 'section',
            sort_order = case when v_site_name = 'غبور' then 1 else 2 end,
            is_active = true
        where id = v_empty_id;
        v_site_id := v_empty_id;
      end if;
    end if;

    -- 4) أنشئ القسم إن لم يوجد
    if v_site_id is null then
      insert into public.factory_org_units (name, parent_id, unit_kind, sort_order, is_active)
      values (
        v_site_name,
        v_admin_id,
        'section',
        case when v_site_name = 'غبور' then 1 else 2 end,
        true
      )
      returning id into v_site_id;
    else
      update public.factory_org_units
      set unit_kind = 'section',
          parent_id = v_admin_id,
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

  -- عطّل الإدارات العلوية الفارغة غبور/القصراوى إن بقيت خارج الشجرة الجديدة
  update public.factory_org_units
  set is_active = false
  where parent_id is null
    and unit_kind = 'administration'
    and name in ('غبور', 'القصراوى', 'القصرواى')
    and id is distinct from v_admin_id;

  -- عطّل قسم الإنتاج/الإصلاح الخارجي القديم بعد نقل المواقع
  if v_old_repair_id is not null and v_old_repair_id is distinct from v_admin_id then
    update public.factory_org_units
    set is_active = false
    where id = v_old_repair_id;

    update public.factory_org_units
    set is_active = false
    where parent_id = v_old_repair_id
      and id not in (
        select id from public.factory_org_units where parent_id = v_admin_id
      );
  end if;

  -- عطّل بقايا الهيكل المقلوب (غبور/قصراوى تحت أقسام قديمة وليست تحت مواقع الإدارة الجديدة)
  update public.factory_org_units child
  set is_active = false
  where child.name in ('غبور', 'القصراوى', 'القصرواى')
    and child.parent_id is distinct from v_admin_id
    and child.id not in (
      select id from public.factory_org_units where parent_id = v_admin_id
    )
    and exists (
      select 1
      from public.factory_org_units parent
      where parent.id = child.parent_id
        and parent.name in ('ريبير نهائى', 'ريبير نهائي', 'إصلاح الدهان', 'التسليم النهائى', 'التسليم النهائي', 'C.S', 'PDI')
    );
end $$;
