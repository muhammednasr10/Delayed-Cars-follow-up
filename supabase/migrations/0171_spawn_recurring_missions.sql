alter table public.team_missions
  add column if not exists recurrence_series_id uuid;

update public.team_missions
set recurrence_series_id = id
where recurrence_series_id is null;

alter table public.team_missions
  alter column recurrence_series_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_missions_recurrence_series_fkey'
  ) then
    alter table public.team_missions
      add constraint team_missions_recurrence_series_fkey
      foreign key (recurrence_series_id) references public.team_missions (id) on delete cascade;
  end if;
end $$;

create unique index if not exists team_missions_series_due_uidx
  on public.team_missions (recurrence_series_id, due_date)
  where due_date is not null;

create or replace function public.team_missions_set_series()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  if new.recurrence_series_id is null then
    new.recurrence_series_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_team_missions_set_series on public.team_missions;
create trigger trg_team_missions_set_series
  before insert on public.team_missions
  for each row execute function public.team_missions_set_series();

create or replace function public.team_missions_freeze_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp uuid;
  v_name text;
begin
  if tg_op = 'UPDATE' then
    new.created_by_employee_id := old.created_by_employee_id;
    new.created_by_name := old.created_by_name;
    return new;
  end if;

  if new.created_by_employee_id is not null then
    if new.created_by_name is null or nullif(trim(new.created_by_name), '') is null then
      select coalesce(nullif(trim(e.full_name), ''), '—') into v_name
      from public.employees e
      where e.id = new.created_by_employee_id;
      new.created_by_name := coalesce(v_name, '—');
    end if;
    return new;
  end if;

  v_emp := auth_employee_id();
  new.created_by_employee_id := v_emp;

  if v_emp is not null then
    select coalesce(nullif(trim(e.full_name), ''), '—') into v_name
    from public.employees e
    where e.id = v_emp;
  end if;

  if v_name is null then
    select coalesce(nullif(trim(p.full_name), ''), '—') into v_name
    from public.profiles p
    where p.id = auth.uid();
  end if;

  new.created_by_name := coalesce(v_name, '—');
  return new;
end;
$$;

create or replace function public.add_mission_recurrence_period(p_due date, p_type text)
returns date
language sql
immutable
as $$
  select case p_type
    when 'daily' then p_due + 1
    when 'weekly' then p_due + 7
    when 'monthly' then (p_due + interval '1 month')::date
    else null
  end;
$$;

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
              created_by_name
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
              src.created_by_name
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

grant execute on function public.add_mission_recurrence_period(date, text) to authenticated;
grant execute on function public.spawn_due_recurring_missions() to authenticated;

notify pgrst, 'reload schema';
