-- Production orders: open time + color distribution; unfinished carry into later months via app filter

alter table public.production_orders
  add column if not exists opened_at timestamptz;

update public.production_orders
set opened_at = coalesce(opened_at, created_at, now())
where opened_at is null;

alter table public.production_orders
  alter column opened_at set default now();

alter table public.production_orders
  alter column opened_at set not null;

create table if not exists public.production_order_colors (
  id uuid primary key default gen_random_uuid(),
  production_order_id uuid not null references public.production_orders(id) on delete cascade,
  color_id uuid not null references public.vehicle_colors(id) on delete restrict,
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  unique (production_order_id, color_id)
);

create index if not exists production_order_colors_order_idx
  on public.production_order_colors (production_order_id);

alter table public.production_order_colors enable row level security;

drop policy if exists production_order_colors_select on public.production_order_colors;
create policy production_order_colors_select
  on public.production_order_colors for select to authenticated
  using (true);

drop policy if exists production_order_colors_write on public.production_order_colors;
create policy production_order_colors_write
  on public.production_order_colors for all to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.production_order_colors to authenticated;

-- Drop first: CREATE OR REPLACE cannot insert opened_at before created_at (Postgres treats it as a rename).
drop view if exists public.v_production_orders_detail;

create view public.v_production_orders_detail as
select
  po.id,
  po.order_number,
  po.model_id,
  po.planned_qty,
  po.status,
  po.chassis_start,
  po.chassis_end,
  po.planned_start,
  po.planned_end,
  po.notes,
  po.opened_at,
  po.created_at,
  po.updated_at,
  vm.name as model_name,
  coalesce(pf.name, vm.name) as family_name
from public.production_orders po
left join public.vehicle_models vm on vm.id = po.model_id
left join public.vehicle_models pf on pf.id = vm.parent_model_id;

grant select on public.v_production_orders_detail to authenticated;
