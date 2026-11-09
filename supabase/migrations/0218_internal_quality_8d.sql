-- 8D study fields for internal quality issues.

alter table public.internal_quality_issues
  add column if not exists status text not null default 'open',
  add column if not exists study_8d jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'internal_quality_issues_status_check'
  ) then
    alter table public.internal_quality_issues
      add constraint internal_quality_issues_status_check
      check (status in ('open', 'under_study', 'closed'));
  end if;
end $$;

comment on column public.internal_quality_issues.study_8d is
  '8D study steps D1–D8 (JSON).';
comment on column public.internal_quality_issues.status is
  'open, under_study, or closed.';
