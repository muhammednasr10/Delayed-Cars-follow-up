-- Study rounds for internal quality: counter + last time the study card was filled.

alter table public.internal_quality_issues
  add column if not exists study_count integer not null default 0,
  add column if not exists last_study_at timestamptz;

comment on column public.internal_quality_issues.study_count is
  'How many times the 8D study card was filled. 0 until the first saved study.';
comment on column public.internal_quality_issues.last_study_at is
  'Last time the study card was saved with content. Drives تاريخ آخر تحديث.';
