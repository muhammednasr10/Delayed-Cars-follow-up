-- Mission recurrence support (none/daily/weekly/monthly/custom)

alter table public.team_missions
  add column if not exists recurrence_type text not null default 'none',
  add column if not exists recurrence_custom text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_missions_recurrence_type_check'
  ) then
    alter table public.team_missions
      add constraint team_missions_recurrence_type_check
      check (recurrence_type in ('none','daily','weekly','monthly','custom'));
  end if;
end $$;

notify pgrst, 'reload schema';

