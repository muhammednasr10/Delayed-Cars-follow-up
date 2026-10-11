-- إشعارات إضافة وتعديل وحذف: خطة الإنتاج، أوامر الإنتاج، الدخول، الخروج، التوقفات، الخدوش.

alter table public.app_notifications
  drop constraint if exists app_notifications_event_type_check;

alter table public.app_notifications
  add constraint app_notifications_event_type_check
  check (event_type in (
    'shortage_added',
    'shortage_archived',
    'shortage_deleted',
    'transfer_requested',
    'mission_assigned',
    'mission_delegated',
    'plan_added',
    'plan_edited',
    'plan_deleted',
    'order_added',
    'order_edited',
    'order_deleted',
    'entry_added',
    'entry_edited',
    'entry_deleted',
    'exit_added',
    'exit_edited',
    'exit_deleted',
    'stop_added',
    'stop_edited',
    'stop_deleted',
    'scratch_added',
    'scratch_edited',
    'scratch_deleted'
  ));

create or replace function public.insert_activity_notification(
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_vin text default null,
  p_model_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.app_notifications (event_type, vin, model_name, actor_id, payload)
  values (
    p_event_type,
    nullif(trim(coalesce(p_vin, '')), ''),
    nullif(trim(coalesce(p_model_name, '')), ''),
    auth.uid(),
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.insert_activity_notification(text, jsonb, text, text) from public;

create or replace function public.trg_app_notify_plan_targets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_year int;
  v_month int;
  v_count int;
  v_model text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_event := 'plan_added';
    select i.plan_year, i.plan_month, count(*)::int,
      case when count(*) = 1 then min(vm.name) else null end
    into v_year, v_month, v_count, v_model
    from inserted i
    left join public.vehicle_models vm on vm.id = i.model_id
    group by i.plan_year, i.plan_month
    order by count(*) desc
    limit 1;
  elsif tg_op = 'UPDATE' then
    v_event := 'plan_edited';
    select i.plan_year, i.plan_month, count(*)::int,
      case when count(*) = 1 then min(vm.name) else null end
    into v_year, v_month, v_count, v_model
    from inserted i
    join deleted d on d.id = i.id
    left join public.vehicle_models vm on vm.id = i.model_id
    where i.target_qty is distinct from d.target_qty
       or i.wip_carryover_qty is distinct from d.wip_carryover_qty
    group by i.plan_year, i.plan_month
    order by count(*) desc
    limit 1;
  else
    v_event := 'plan_deleted';
    select d.plan_year, d.plan_month, count(*)::int,
      case when count(*) = 1 then min(vm.name) else null end
    into v_year, v_month, v_count, v_model
    from deleted d
    left join public.vehicle_models vm on vm.id = d.model_id
    group by d.plan_year, d.plan_month
    order by count(*) desc
    limit 1;
  end if;

  if coalesce(v_count, 0) = 0 then
    return null;
  end if;

  perform public.insert_activity_notification(
    v_event,
    jsonb_strip_nulls(jsonb_build_object(
      'title', v_model,
      'plan_year', v_year,
      'plan_month', v_month,
      'count', v_count
    )),
    null,
    v_model
  );
  return null;
end;
$$;

drop trigger if exists trg_app_notify_plan_insert on public.model_production_plan_targets;
create trigger trg_app_notify_plan_insert
  after insert on public.model_production_plan_targets
  referencing new table as inserted
  for each statement
  execute function public.trg_app_notify_plan_targets();

drop trigger if exists trg_app_notify_plan_update on public.model_production_plan_targets;
create trigger trg_app_notify_plan_update
  after update on public.model_production_plan_targets
  referencing new table as inserted old table as deleted
  for each statement
  execute function public.trg_app_notify_plan_targets();

drop trigger if exists trg_app_notify_plan_delete on public.model_production_plan_targets;
create trigger trg_app_notify_plan_delete
  after delete on public.model_production_plan_targets
  referencing old table as deleted
  for each statement
  execute function public.trg_app_notify_plan_targets();

create or replace function public.trg_app_notify_productivity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_event text;
  v_count int;
  v_date date;
  v_model text;
  v_qty int;
begin
  if auth.uid() is null then
    return null;
  end if;

  v_kind := case tg_table_name
    when 'exit_productivity_daily' then 'exit'
    else 'entry'
  end;

  if tg_op = 'INSERT' then
    v_event := v_kind || '_added';
    select count(*)::int,
      case when count(distinct i.work_date) = 1 then min(i.work_date) else null end,
      case when count(*) = 1 then min(vm.name) else null end,
      case when count(*) = 1 then min(i.quantity) else null end
    into v_count, v_date, v_model, v_qty
    from inserted i
    left join public.vehicle_models vm on vm.id = i.model_id;
  elsif tg_op = 'UPDATE' then
    v_event := v_kind || '_edited';
    select count(*)::int,
      case when count(distinct i.work_date) = 1 then min(i.work_date) else null end,
      case when count(*) = 1 then min(vm.name) else null end,
      case when count(*) = 1 then min(i.quantity) else null end
    into v_count, v_date, v_model, v_qty
    from inserted i
    join deleted d on d.id = i.id
    left join public.vehicle_models vm on vm.id = i.model_id
    where i.quantity is distinct from d.quantity
       or i.notes is distinct from d.notes
       or i.work_date is distinct from d.work_date
       or i.model_id is distinct from d.model_id;
  else
    v_event := v_kind || '_deleted';
    select count(*)::int,
      case when count(distinct d.work_date) = 1 then min(d.work_date) else null end,
      case when count(*) = 1 then min(vm.name) else null end,
      case when count(*) = 1 then min(d.quantity) else null end
    into v_count, v_date, v_model, v_qty
    from deleted d
    left join public.vehicle_models vm on vm.id = d.model_id;
  end if;

  if coalesce(v_count, 0) = 0 then
    return null;
  end if;

  perform public.insert_activity_notification(
    v_event,
    jsonb_strip_nulls(jsonb_build_object(
      'title', v_model,
      'work_date', v_date,
      'quantity', v_qty,
      'count', v_count
    )),
    null,
    v_model
  );
  return null;
end;
$$;

drop trigger if exists trg_app_notify_entry_insert on public.entry_productivity_daily;
create trigger trg_app_notify_entry_insert
  after insert on public.entry_productivity_daily
  referencing new table as inserted
  for each statement
  execute function public.trg_app_notify_productivity();

drop trigger if exists trg_app_notify_entry_update on public.entry_productivity_daily;
create trigger trg_app_notify_entry_update
  after update on public.entry_productivity_daily
  referencing new table as inserted old table as deleted
  for each statement
  execute function public.trg_app_notify_productivity();

drop trigger if exists trg_app_notify_entry_delete on public.entry_productivity_daily;
create trigger trg_app_notify_entry_delete
  after delete on public.entry_productivity_daily
  referencing old table as deleted
  for each statement
  execute function public.trg_app_notify_productivity();

drop trigger if exists trg_app_notify_exit_insert on public.exit_productivity_daily;
create trigger trg_app_notify_exit_insert
  after insert on public.exit_productivity_daily
  referencing new table as inserted
  for each statement
  execute function public.trg_app_notify_productivity();

drop trigger if exists trg_app_notify_exit_update on public.exit_productivity_daily;
create trigger trg_app_notify_exit_update
  after update on public.exit_productivity_daily
  referencing new table as inserted old table as deleted
  for each statement
  execute function public.trg_app_notify_productivity();

drop trigger if exists trg_app_notify_exit_delete on public.exit_productivity_daily;
create trigger trg_app_notify_exit_delete
  after delete on public.exit_productivity_daily
  referencing old table as deleted
  for each statement
  execute function public.trg_app_notify_productivity();

create or replace function public.trg_app_notify_production_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.production_orders;
  v_event text;
  v_model text;
  v_title text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := old;
    v_event := 'order_deleted';
  else
    v_row := new;
    v_event := case when tg_op = 'INSERT' then 'order_added' else 'order_edited' end;
  end if;

  select name into v_model from public.vehicle_models where id = v_row.model_id;
  v_title := v_row.order_number;
  if v_model is not null and btrim(v_model) <> '' then
    v_title := v_title || ' · ' || v_model;
  end if;

  perform public.insert_activity_notification(
    v_event,
    jsonb_build_object('title', v_title, 'count', 1),
    null,
    v_model
  );
  return null;
end;
$$;

drop trigger if exists trg_app_notify_order_insert on public.production_orders;
create trigger trg_app_notify_order_insert
  after insert on public.production_orders
  for each row
  execute function public.trg_app_notify_production_order();

drop trigger if exists trg_app_notify_order_update on public.production_orders;
create trigger trg_app_notify_order_update
  after update on public.production_orders
  for each row
  execute function public.trg_app_notify_production_order();

drop trigger if exists trg_app_notify_order_delete on public.production_orders;
create trigger trg_app_notify_order_delete
  after delete on public.production_orders
  for each row
  execute function public.trg_app_notify_production_order();

create or replace function public.trg_app_notify_line_stop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.production_line_stops;
  v_event text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := old;
    v_event := 'stop_deleted';
  else
    v_row := new;
    v_event := case when tg_op = 'INSERT' then 'stop_added' else 'stop_edited' end;
    if tg_op = 'UPDATE'
      and new.stop_reason is not distinct from old.stop_reason
      and new.stop_type is not distinct from old.stop_type
      and new.vehicle_model_id is not distinct from old.vehicle_model_id
      and new.started_at is not distinct from old.started_at
      and new.ended_at is not distinct from old.ended_at
      and new.department is not distinct from old.department
      and new.lost_vehicles is not distinct from old.lost_vehicles
      and new.notes is not distinct from old.notes
    then
      return null;
    end if;
  end if;

  perform public.insert_activity_notification(
    v_event,
    jsonb_build_object('title', v_row.stop_reason, 'count', 1)
  );
  return null;
end;
$$;

drop trigger if exists trg_app_notify_stop_insert on public.production_line_stops;
create trigger trg_app_notify_stop_insert
  after insert on public.production_line_stops
  for each row
  execute function public.trg_app_notify_line_stop();

drop trigger if exists trg_app_notify_stop_update on public.production_line_stops;
create trigger trg_app_notify_stop_update
  after update on public.production_line_stops
  for each row
  execute function public.trg_app_notify_line_stop();

drop trigger if exists trg_app_notify_stop_delete on public.production_line_stops;
create trigger trg_app_notify_stop_delete
  after delete on public.production_line_stops
  for each row
  execute function public.trg_app_notify_line_stop();

create or replace function public.trg_app_notify_scratch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.scratches;
  v_event text;
  v_title text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := old;
    v_event := 'scratch_deleted';
  else
    v_row := new;
    v_event := case when tg_op = 'INSERT' then 'scratch_added' else 'scratch_edited' end;
    if tg_op = 'UPDATE'
      and new.vin is not distinct from old.vin
      and new.body_area is not distinct from old.body_area
      and new.severity is not distinct from old.severity
      and new.recorded_at is not distinct from old.recorded_at
      and new.notes is not distinct from old.notes
      and new.will_stop is not distinct from old.will_stop
      and new.factory_org_unit_id is not distinct from old.factory_org_unit_id
      and new.parent_model_id is not distinct from old.parent_model_id
      and new.vehicle_model_id is not distinct from old.vehicle_model_id
      and new.completing_department is not distinct from old.completing_department
      and new.follow_up_employee_id is not distinct from old.follow_up_employee_id
      and new.resolved_at is not distinct from old.resolved_at
    then
      return null;
    end if;
  end if;

  v_title := nullif(btrim(split_part(coalesce(v_row.notes, ''), chr(31), 1)), '');
  if v_title is null then
    v_title := nullif(btrim(v_row.body_area), '');
  end if;

  perform public.insert_activity_notification(
    v_event,
    jsonb_strip_nulls(jsonb_build_object('title', v_title, 'count', 1)),
    v_row.vin,
    null
  );
  return null;
end;
$$;

drop trigger if exists trg_app_notify_scratch_insert on public.scratches;
create trigger trg_app_notify_scratch_insert
  after insert on public.scratches
  for each row
  execute function public.trg_app_notify_scratch();

drop trigger if exists trg_app_notify_scratch_update on public.scratches;
create trigger trg_app_notify_scratch_update
  after update on public.scratches
  for each row
  execute function public.trg_app_notify_scratch();

drop trigger if exists trg_app_notify_scratch_delete on public.scratches;
create trigger trg_app_notify_scratch_delete
  after delete on public.scratches
  for each row
  execute function public.trg_app_notify_scratch();
