create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.spawn_due_recurring_missions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.team_missions%rowtype;
  v_today date := (timezone('Africa/Cairo', now()))::date;
  v_anchor date;
  v_due date;
  v_new_id uuid;
  v_assignee uuid;
  v_count int;
begin
  for src in
    select *
    from public.team_missions
    where id = recurrence_series_id
      and recurrence_type in ('daily', 'weekly', 'monthly')
      and status <> 'cancelled'
  loop
    v_anchor := coalesce(src.due_date, (timezone('Africa/Cairo', src.created_at))::date);
    v_due := public.add_mission_recurrence_period(v_anchor, src.recurrence_type);
    v_count := 0;

    while v_due is not null and v_due <= v_today and v_count < 14 loop
      if not exists (
        select 1
        from public.team_missions
        where recurrence_series_id = src.recurrence_series_id
          and due_date = v_due
      ) then
        select coalesce(
          (select tma.employee_id from public.team_mission_assignees tma where tma.mission_id = src.id order by tma.created_at limit 1),
          src.assignee_id
        )
        into v_assignee;

        if v_assignee is not null then
          v_new_id := gen_random_uuid();
          begin
            insert into public.team_missions (
              id,
              title,
              description,
              assignee_id,
              status,
              priority,
              due_date,
              notes,
              recurrence_type,
              recurrence_custom,
              recurrence_series_id,
              created_by_employee_id,
              created_by_name,
              source_vehicle_id,
              source_missing_part_id,
              source_vin,
              source_model_name
            )
            values (
              v_new_id,
              src.title,
              src.description,
              v_assignee,
              'pending',
              src.priority,
              v_due,
              src.notes,
              'none',
              null,
              src.recurrence_series_id,
              src.created_by_employee_id,
              src.created_by_name,
              src.source_vehicle_id,
              src.source_missing_part_id,
              src.source_vin,
              src.source_model_name
            );

            insert into public.team_mission_assignees (mission_id, employee_id)
            select v_new_id, tma.employee_id
            from public.team_mission_assignees tma
            where tma.mission_id = src.id
            on conflict do nothing;

            if not exists (select 1 from public.team_mission_assignees where mission_id = v_new_id) then
              insert into public.team_mission_assignees (mission_id, employee_id)
              values (v_new_id, v_assignee)
              on conflict do nothing;
            end if;
          exception
            when unique_violation then
              null;
          end;
        end if;
      end if;

      v_due := public.add_mission_recurrence_period(v_due, src.recurrence_type);
      v_count := v_count + 1;
    end loop;
  end loop;
end;
$$;

grant execute on function public.spawn_due_recurring_missions() to authenticated;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'spawn-due-recurring-missions'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end $$;

select cron.schedule(
  'spawn-due-recurring-missions',
  '0 0 * * *',
  $$select public.spawn_due_recurring_missions()$$
);

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'spawn-due-recurring-missions'
  order by jobid desc
  limit 1;

  if v_jobid is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'cron'
      and table_name = 'job'
      and column_name = 'timezone'
  ) then
    update cron.job
    set timezone = 'Africa/Cairo'
    where jobid = v_jobid;
  else
    perform cron.alter_job(v_jobid, schedule := '5 21,22 * * *');
  end if;
end $$;

select public.spawn_due_recurring_missions();

notify pgrst, 'reload schema';
