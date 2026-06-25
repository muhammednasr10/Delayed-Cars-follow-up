-- Warehouse: model inventory view + line feeding (التغذية).

-- ---------------------------------------------------------------------------
-- v_model_part_inventory — BOM parts per model × warehouse stock
-- ---------------------------------------------------------------------------
create or replace view v_model_part_inventory
with (security_invoker = true) as
with bom_agg as (
  select
    bi.vehicle_model_id,
    bi.part_id,
    sum(bi.quantity)::numeric(14, 3) as qty_per_vehicle
  from bom_items bi
  where bi.is_active and bi.vehicle_model_id is not null
  group by bi.vehicle_model_id, bi.part_id
)
select
  ba.vehicle_model_id,
  vm.name as model_name,
  vm.model_kind,
  p.id as part_id,
  p.part_number,
  p.normalized_part_number,
  coalesce(nullif(trim(p.part_name_ar), ''), nullif(trim(p.part_name_en), ''), p.part_number) as part_name,
  ba.qty_per_vehicle,
  i.id as item_id,
  i.sku as item_sku,
  w.id as warehouse_id,
  w.code as warehouse_code,
  w.name as warehouse_name,
  coalesce(s.qty_on_hand, 0)::numeric(14, 3) as qty_on_hand,
  coalesce(s.qty_reserved, 0)::numeric(14, 3) as qty_reserved,
  (coalesce(s.qty_on_hand, 0) - coalesce(s.qty_reserved, 0))::numeric(14, 3) as qty_available,
  case
    when ba.qty_per_vehicle > 0 then
      floor((coalesce(s.qty_on_hand, 0) - coalesce(s.qty_reserved, 0)) / ba.qty_per_vehicle)::int
    else null
  end as vehicles_coverable
from bom_agg ba
  join vehicle_models vm on vm.id = ba.vehicle_model_id
  join parts p on p.id = ba.part_id
  left join items i on upper(trim(i.sku)) = upper(trim(p.normalized_part_number))
  left join inventory_stock s on s.item_id = i.id
  left join warehouses w on w.id = s.warehouse_id and w.is_active
where vm.is_active;

-- ---------------------------------------------------------------------------
-- warehouse_feeding — تغذية الخط
-- ---------------------------------------------------------------------------
create table if not exists warehouse_feeding (
  id               uuid primary key default gen_random_uuid(),
  vehicle_model_id uuid not null references vehicle_models (id),
  warehouse_id     uuid not null references warehouses (id),
  station_id       uuid references stations (id) on delete set null,
  feeding_date     date not null default current_date,
  reference        text,
  notes            text,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now()
);

create index if not exists idx_wh_feeding_model on warehouse_feeding (vehicle_model_id);
create index if not exists idx_wh_feeding_date on warehouse_feeding (feeding_date desc);

create table if not exists warehouse_feeding_lines (
  id          uuid primary key default gen_random_uuid(),
  feeding_id  uuid not null references warehouse_feeding (id) on delete cascade,
  part_id     uuid not null references parts (id),
  item_id     uuid references items (id),
  quantity    numeric(14, 3) not null check (quantity > 0),
  notes       text
);

create index if not exists idx_wh_feeding_lines_feeding on warehouse_feeding_lines (feeding_id);

-- ---------------------------------------------------------------------------
-- record_warehouse_feeding — issue stock for line feeding
-- ---------------------------------------------------------------------------
create or replace function record_warehouse_feeding(
  p_vehicle_model_id uuid,
  p_warehouse_id uuid,
  p_station_id uuid default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feeding_id uuid;
  v_line jsonb;
  v_part_id uuid;
  v_qty numeric(14, 3);
  v_item_id uuid;
  v_part_number text;
begin
  if not (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  ) then
    raise exception 'Not authorized to record warehouse feeding.';
  end if;

  if jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one feeding line is required.';
  end if;

  insert into warehouse_feeding (vehicle_model_id, warehouse_id, station_id, notes)
  values (p_vehicle_model_id, p_warehouse_id, p_station_id, nullif(trim(p_notes), ''))
  returning id into v_feeding_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_part_id := (v_line->>'part_id')::uuid;
    v_qty := (v_line->>'quantity')::numeric(14, 3);

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for part %.', v_part_id;
    end if;

    select p.part_number,
           coalesce(
             (select i.id from items i where upper(trim(i.sku)) = upper(trim(p.normalized_part_number)) limit 1),
             (select i.id from items i where upper(trim(i.sku)) = upper(trim(p.part_number)) limit 1)
           )
    into v_part_number, v_item_id
    from parts p
    where p.id = v_part_id;

    if v_part_number is null then
      raise exception 'Part % not found.', v_part_id;
    end if;

    insert into warehouse_feeding_lines (feeding_id, part_id, item_id, quantity, notes)
    values (v_feeding_id, v_part_id, v_item_id, v_qty, nullif(trim(v_line->>'notes'), ''));

    if v_item_id is not null then
      update inventory_stock
      set qty_on_hand = qty_on_hand - v_qty
      where item_id = v_item_id and warehouse_id = p_warehouse_id;

      if not found then
        raise exception 'No stock record for part % (item %) in warehouse.', v_part_number, v_item_id;
      end if;

      insert into stock_movements (item_id, warehouse_id, movement_type, quantity, reference, notes)
      values (
        v_item_id,
        p_warehouse_id,
        'issue',
        v_qty,
        'feeding:' || v_feeding_id::text,
        coalesce(nullif(trim(p_notes), ''), 'Line feeding')
      );
    end if;
  end loop;

  return v_feeding_id;
end;
$$;

grant execute on function record_warehouse_feeding(uuid, uuid, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table warehouse_feeding enable row level security;
alter table warehouse_feeding_lines enable row level security;

drop policy if exists warehouse_feeding_select on warehouse_feeding;
create policy warehouse_feeding_select on warehouse_feeding
  for select to authenticated using (true);

drop policy if exists warehouse_feeding_insert on warehouse_feeding;
create policy warehouse_feeding_insert on warehouse_feeding
  for insert to authenticated
  with check (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  );

drop policy if exists warehouse_feeding_lines_select on warehouse_feeding_lines;
create policy warehouse_feeding_lines_select on warehouse_feeding_lines
  for select to authenticated using (true);

drop policy if exists warehouse_feeding_lines_insert on warehouse_feeding_lines;
create policy warehouse_feeding_lines_insert on warehouse_feeding_lines
  for insert to authenticated
  with check (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  );
