-- Link warehouse feeding to planning production orders
alter table warehouse_feeding
  add column if not exists production_order_id uuid references production_orders (id) on delete set null;

create index if not exists idx_wh_feeding_po on warehouse_feeding (production_order_id);

drop function if exists record_warehouse_feeding(uuid, uuid, uuid, text, jsonb);

create or replace function record_warehouse_feeding(
  p_vehicle_model_id uuid,
  p_warehouse_id uuid,
  p_station_id uuid default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_reference text default null,
  p_production_order_id uuid default null
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

  if p_production_order_id is not null then
    if exists (
      select 1 from warehouse_feeding wf
      where wf.production_order_id = p_production_order_id
    ) then
      raise exception 'Feeding already recorded for this production order.';
    end if;
  end if;

  insert into warehouse_feeding (
    vehicle_model_id,
    warehouse_id,
    station_id,
    notes,
    reference,
    production_order_id
  )
  values (
    p_vehicle_model_id,
    p_warehouse_id,
    p_station_id,
    nullif(trim(p_notes), ''),
    nullif(trim(p_reference), ''),
    p_production_order_id
  )
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
    values (
      v_feeding_id,
      v_part_id,
      v_item_id,
      v_qty,
      nullif(trim(v_line->>'notes'), '')
    );

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
        coalesce(nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), 'Line feeding')
      );
    end if;
  end loop;

  return v_feeding_id;
end;
$$;

grant execute on function record_warehouse_feeding(uuid, uuid, uuid, text, jsonb, text, uuid) to authenticated;
