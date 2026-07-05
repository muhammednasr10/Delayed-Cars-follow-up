-- Vehicle body scratches log (production line).

create table if not exists public.scratches (
  id                    uuid primary key default gen_random_uuid(),
  vin                   text not null,
  body_area             text not null,
  factory_org_unit_id   uuid references public.factory_org_units (id) on delete set null,
  severity              text not null default 'light'
    check (severity in ('light', 'medium', 'severe')),
  recorded_at           date not null default current_date,
  notes                 text,
  created_by            uuid references auth.users (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_scratches_recorded_at on public.scratches (recorded_at desc);
create index if not exists idx_scratches_vin on public.scratches (vin);
create index if not exists idx_scratches_severity on public.scratches (severity);
create index if not exists idx_scratches_org_unit on public.scratches (factory_org_unit_id);

drop trigger if exists trg_scratches_updated_at on public.scratches;
create trigger trg_scratches_updated_at
  before update on public.scratches
  for each row execute function set_updated_at();

drop trigger if exists trg_scratches_created_by on public.scratches;
create trigger trg_scratches_created_by
  before insert on public.scratches
  for each row execute function set_created_by();

alter table public.scratches enable row level security;

drop policy if exists scratches_select on public.scratches;
create policy scratches_select on public.scratches
  for select to authenticated using (true);

drop policy if exists scratches_insert on public.scratches;
create policy scratches_insert on public.scratches
  for insert to authenticated
  with check (has_role('admin', 'production'));

drop policy if exists scratches_update on public.scratches;
create policy scratches_update on public.scratches
  for update to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

drop policy if exists scratches_delete on public.scratches;
create policy scratches_delete on public.scratches
  for delete to authenticated
  using (has_role('admin', 'production'));

grant select, insert, update, delete on public.scratches to authenticated;
