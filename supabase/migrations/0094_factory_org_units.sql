-- هيكل إدارات المصنع: إدارة ← قسم ← قسم فرعي (متداخل)

create table if not exists public.factory_org_units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  parent_id   uuid references public.factory_org_units (id) on delete cascade,
  unit_kind   text not null check (unit_kind in ('administration', 'section', 'subsection')),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint factory_org_units_root_admin check (
    (unit_kind = 'administration' and parent_id is null)
    or (unit_kind in ('section', 'subsection') and parent_id is not null)
  )
);

create index if not exists idx_factory_org_units_parent on public.factory_org_units (parent_id);
create index if not exists idx_factory_org_units_kind on public.factory_org_units (unit_kind);

drop trigger if exists trg_factory_org_units_updated_at on public.factory_org_units;
create trigger trg_factory_org_units_updated_at
  before update on public.factory_org_units
  for each row execute function set_updated_at();

alter table public.factory_org_units enable row level security;

drop policy if exists factory_org_units_select on public.factory_org_units;
create policy factory_org_units_select on public.factory_org_units
  for select to authenticated using (true);

drop policy if exists factory_org_units_write on public.factory_org_units;
create policy factory_org_units_write on public.factory_org_units
  for all to authenticated
  using (has_role('admin'))
  with check (has_role('admin'));

grant select, insert, update, delete on public.factory_org_units to authenticated;
