alter table public.team_missions
  add column if not exists source_vehicle_id uuid references public.vehicles (id) on delete set null,
  add column if not exists source_missing_part_id uuid references public.missing_parts (id) on delete set null,
  add column if not exists source_vin text,
  add column if not exists source_model_name text;

create index if not exists idx_team_missions_source_vehicle
  on public.team_missions (source_vehicle_id)
  where source_vehicle_id is not null;

create or replace function public.spawn_due_recurring_missions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.team_missions%rowtype;
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
    v_anchor := coalesce(src.due_date, src.created_at::date);
    v_due := public.add_mission_recurrence_period(v_anchor, src.recurrence_type);
    v_count := 0;

    while v_due is not null and v_due <= current_date and v_count < 14 loop
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

notify pgrst, 'reload schema';
