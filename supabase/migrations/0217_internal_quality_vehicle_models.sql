-- Optional vehicle models linked to an internal quality issue.

alter table public.internal_quality_issues
  add column if not exists vehicle_model_ids uuid[] not null default '{}';

comment on column public.internal_quality_issues.vehicle_model_ids is
  'Selected vehicle models when the issue is limited to specific models. Empty means not model-specific.';
