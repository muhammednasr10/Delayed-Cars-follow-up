-- Team missions: task distribution and completion tracking.

create table if not exists public.team_missions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  assignee_id   uuid not null references public.employees (id) on delete restrict,
  status        text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority      text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  due_date      date,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_team_missions_assignee on public.team_missions (assignee_id);
create index if not exists idx_team_missions_status on public.team_missions (status);
create index if not exists idx_team_missions_completed_at on public.team_missions (completed_at desc nulls last);

create or replace function public.team_missions_sync_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_team_missions_completed_at on public.team_missions;
create trigger trg_team_missions_completed_at
  before insert or update on public.team_missions
  for each row execute function public.team_missions_sync_completed_at();

drop trigger if exists trg_team_missions_updated_at on public.team_missions;
create trigger trg_team_missions_updated_at
  before update on public.team_missions
  for each row execute function set_updated_at();

alter table public.team_missions enable row level security;

drop policy if exists team_missions_select on public.team_missions;
create policy team_missions_select on public.team_missions
  for select to authenticated using (true);

drop policy if exists team_missions_write on public.team_missions;
create policy team_missions_write on public.team_missions
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.team_missions to authenticated;
