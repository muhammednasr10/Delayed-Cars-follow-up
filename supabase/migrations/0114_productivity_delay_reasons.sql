-- Daily productivity delay reasons (entry / exit monthly grids).

create table if not exists public.productivity_delay_reasons (
  id          uuid primary key default gen_random_uuid(),
  work_date   date not null,
  kind        text not null check (kind in ('entry', 'exit')),
  reasons     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint productivity_delay_reasons_unique unique (work_date, kind)
);

create index if not exists idx_productivity_delay_reasons_date
  on public.productivity_delay_reasons (work_date);

drop trigger if exists trg_productivity_delay_reasons_updated_at on public.productivity_delay_reasons;
create trigger trg_productivity_delay_reasons_updated_at
  before update on public.productivity_delay_reasons
  for each row execute function set_updated_at();

alter table public.productivity_delay_reasons enable row level security;

drop policy if exists productivity_delay_reasons_select on public.productivity_delay_reasons;
create policy productivity_delay_reasons_select on public.productivity_delay_reasons
  for select to authenticated using (true);

drop policy if exists productivity_delay_reasons_write on public.productivity_delay_reasons;
create policy productivity_delay_reasons_write on public.productivity_delay_reasons
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.productivity_delay_reasons to authenticated;
