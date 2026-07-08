-- Warehouse equipment: racks (الراكات) and carts (التاجرات)

create table if not exists warehouse_racks (
  id           uuid primary key default gen_random_uuid(),
  warehouse_id uuid references warehouses (id) on delete set null,
  station_id   uuid references stations (id) on delete set null,
  code         text not null,
  name         text,
  capacity     text,
  length_mm    numeric(12, 2),
  width_mm     numeric(12, 2),
  height_mm    numeric(12, 2),
  direction    text,
  status       text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint warehouse_racks_code_unique unique (code)
);

create index if not exists idx_warehouse_racks_wh on warehouse_racks (warehouse_id);
create index if not exists idx_warehouse_racks_station on warehouse_racks (station_id);

create table if not exists warehouse_carts (
  id           uuid primary key default gen_random_uuid(),
  warehouse_id uuid references warehouses (id) on delete set null,
  code         text not null,
  name         text,
  cart_type    text,
  capacity     text,
  status       text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint warehouse_carts_code_unique unique (code)
);

create index if not exists idx_warehouse_carts_wh on warehouse_carts (warehouse_id);

drop trigger if exists trg_warehouse_racks_updated_at on warehouse_racks;
create trigger trg_warehouse_racks_updated_at
  before update on warehouse_racks
  for each row execute function set_updated_at();

drop trigger if exists trg_warehouse_carts_updated_at on warehouse_carts;
create trigger trg_warehouse_carts_updated_at
  before update on warehouse_carts
  for each row execute function set_updated_at();

alter table warehouse_racks enable row level security;
alter table warehouse_carts enable row level security;

drop policy if exists warehouse_racks_select on warehouse_racks;
create policy warehouse_racks_select on warehouse_racks
  for select to authenticated using (true);

drop policy if exists warehouse_racks_write on warehouse_racks;
create policy warehouse_racks_write on warehouse_racks
  for all to authenticated
  using (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  )
  with check (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  );

drop policy if exists warehouse_carts_select on warehouse_carts;
create policy warehouse_carts_select on warehouse_carts
  for select to authenticated using (true);

drop policy if exists warehouse_carts_write on warehouse_carts;
create policy warehouse_carts_write on warehouse_carts
  for all to authenticated
  using (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  )
  with check (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  );
