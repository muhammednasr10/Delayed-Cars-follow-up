alter table public.scratches
  add column if not exists will_stop boolean not null default false,
  add column if not exists completing_department text,
  add column if not exists follow_up_employee_id uuid references public.employees (id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

create index if not exists idx_scratches_will_stop on public.scratches (will_stop) where resolved_at is null;
create index if not exists idx_scratches_follow_up on public.scratches (follow_up_employee_id)
  where follow_up_employee_id is not null;
create index if not exists idx_scratches_resolved_at on public.scratches (resolved_at);

create table if not exists public.scratch_notes (
  id          uuid primary key default gen_random_uuid(),
  scratch_id  uuid not null references public.scratches (id) on delete cascade,
  body        text not null check (char_length(trim(body)) > 0),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

drop trigger if exists trg_scratch_notes_created_by on public.scratch_notes;
create trigger trg_scratch_notes_created_by
  before insert on public.scratch_notes
  for each row execute function vehicle_notes_before_insert();

create index if not exists idx_scratch_notes_scratch on public.scratch_notes (scratch_id, created_at);

drop view if exists public.v_scratch_notes_detail;
create view public.v_scratch_notes_detail
with (security_invoker = true) as
select
  sn.id,
  sn.scratch_id,
  sn.body,
  sn.created_by,
  p.full_name as created_by_name,
  p.email as created_by_email,
  sn.created_at
from public.scratch_notes sn
  left join public.profiles p on p.id = sn.created_by;

alter table public.scratch_notes enable row level security;

drop policy if exists scratch_notes_read on public.scratch_notes;
create policy scratch_notes_read on public.scratch_notes
  for select to authenticated using (true);

drop policy if exists scratch_notes_insert on public.scratch_notes;
create policy scratch_notes_insert on public.scratch_notes
  for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists scratch_notes_delete on public.scratch_notes;
create policy scratch_notes_delete on public.scratch_notes
  for delete to authenticated
  using (has_role('admin'));

grant select, insert, delete on public.scratch_notes to authenticated;
grant select on public.v_scratch_notes_detail to authenticated;

alter table public.team_missions
  add column if not exists source_scratch_id uuid references public.scratches (id) on delete set null;

create index if not exists idx_team_missions_source_scratch
  on public.team_missions (source_scratch_id)
  where source_scratch_id is not null;

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
              source_scratch_id,
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
              src.source_scratch_id,
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
