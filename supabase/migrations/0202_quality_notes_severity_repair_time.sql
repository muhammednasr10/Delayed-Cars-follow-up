-- Severity: recurring | critical. Add repair_time: little | medium | much.
-- Drop old severity check BEFORE rewriting values (old check only allowed low/medium/high/critical).

alter table public.quality_notes
  add column if not exists repair_time text;

-- Drop any existing severity checks (name may vary by Postgres).
alter table public.quality_notes
  drop constraint if exists quality_notes_severity_check;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'quality_notes'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%severity%'
  loop
    execute format('alter table public.quality_notes drop constraint if exists %I', r.conname);
  end loop;
end $$;

update public.quality_notes
set severity = 'recurring'
where severity in ('low', 'medium', 'high')
   or severity is distinct from 'critical' and severity is distinct from 'recurring';

update public.quality_notes
set severity = 'recurring'
where severity is null;

alter table public.quality_notes
  alter column severity set default 'recurring';

alter table public.quality_notes
  add constraint quality_notes_severity_check
  check (severity in ('recurring', 'critical'));

update public.quality_notes
set repair_time = 'medium'
where repair_time is null
   or repair_time not in ('little', 'medium', 'much');

alter table public.quality_notes
  alter column repair_time set default 'medium';

alter table public.quality_notes
  alter column repair_time set not null;

alter table public.quality_notes
  drop constraint if exists quality_notes_repair_time_check;

alter table public.quality_notes
  add constraint quality_notes_repair_time_check
  check (repair_time in ('little', 'medium', 'much'));

notify pgrst, 'reload schema';
