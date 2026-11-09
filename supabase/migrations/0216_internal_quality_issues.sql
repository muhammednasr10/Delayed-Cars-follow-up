-- Assembly internal quality log (production department).

create table if not exists public.internal_quality_issues (
  id uuid primary key default gen_random_uuid(),
  problem_type text not null,
  problem text not null,
  reporting_workshop text not null,
  first_reported_at date not null default (current_date),
  study_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.internal_quality_issues is
  'Internal quality issues logged by production on the assembly line (الجودة الداخلية).';

create index if not exists idx_internal_quality_issues_reported
  on public.internal_quality_issues (first_reported_at desc);

drop trigger if exists trg_internal_quality_issues_updated_at on public.internal_quality_issues;
create trigger trg_internal_quality_issues_updated_at
  before update on public.internal_quality_issues
  for each row execute function set_updated_at();

grant select, insert, update, delete on public.internal_quality_issues to authenticated;
grant all on public.internal_quality_issues to service_role;

alter table public.internal_quality_issues enable row level security;

drop policy if exists internal_quality_issues_select on public.internal_quality_issues;
create policy internal_quality_issues_select
  on public.internal_quality_issues for select to authenticated
  using (true);

drop policy if exists internal_quality_issues_write on public.internal_quality_issues;
create policy internal_quality_issues_write
  on public.internal_quality_issues for all to authenticated
  using (true)
  with check (true);
