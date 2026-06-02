-- =============================================================================
-- 0002_rls_and_rpcs.sql
-- Row Level Security + role-based permissions, and transactional RPCs for the
-- multi-step operations (reserve / issue / install / QC / release).
--
-- Permission model (see user_role enum):
--   admin       - full control, can override VIN, adjust stock
--   production  - create vehicles/missing parts, install parts
--   warehouse   - manage items/stock, issue parts
--   purchasing  - manage supplier-side missing-part progress
--   quality     - record QC, approve/reject
--   viewer      - read only
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table production_orders   enable row level security;
alter table vehicles            enable row level security;
alter table items               enable row level security;
alter table warehouses          enable row level security;
alter table inventory_stock     enable row level security;
alter table bom_lines           enable row level security;
alter table missing_parts       enable row level security;
alter table stock_movements     enable row level security;
alter table qc_inspections      enable row level security;
alter table qc_defects          enable row level security;
alter table missing_part_comments enable row level security;
alter table attachments         enable row level security;
alter table audit_log           enable row level security;

-- ----------------------------------------------------------------------------
-- profiles: a user can read their own row; admins manage all.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or has_role('admin'));

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles
  for all using (has_role('admin')) with check (has_role('admin'));

-- ----------------------------------------------------------------------------
-- Generic read access for any authenticated, active user.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'production_orders','vehicles','items','warehouses','inventory_stock',
    'bom_lines','missing_parts','stock_movements','qc_inspections','qc_defects',
    'missing_part_comments','attachments'
  ]
  loop
    execute format('drop policy if exists %1$s_read on %1$I;', t);
    execute format(
      'create policy %1$s_read on %1$I for select using (auth.uid() is not null);', t);
  end loop;
end$$;

-- audit_log: admins + quality may read; nobody may modify.
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log
  for select using (has_role('admin', 'quality'));

-- ----------------------------------------------------------------------------
-- production_orders: production + admin manage.
-- ----------------------------------------------------------------------------
drop policy if exists po_write on production_orders;
create policy po_write on production_orders
  for all using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

-- ----------------------------------------------------------------------------
-- vehicles: production + admin create/update (release rules enforced by trigger).
-- ----------------------------------------------------------------------------
drop policy if exists vehicles_insert on vehicles;
create policy vehicles_insert on vehicles
  for insert with check (has_role('admin', 'production'));

drop policy if exists vehicles_update on vehicles;
create policy vehicles_update on vehicles
  for update using (has_role('admin', 'production', 'quality'))
  with check (has_role('admin', 'production', 'quality'));

drop policy if exists vehicles_delete on vehicles;
create policy vehicles_delete on vehicles
  for delete using (has_role('admin'));

-- ----------------------------------------------------------------------------
-- items / warehouses / inventory / bom: warehouse + admin manage.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['items','warehouses','inventory_stock','bom_lines']
  loop
    execute format('drop policy if exists %1$s_write on %1$I;', t);
    execute format(
      'create policy %1$s_write on %1$I for all using (has_role(''admin'',''warehouse'')) with check (has_role(''admin'',''warehouse''));',
      t);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- missing_parts: production/warehouse/purchasing/admin manage; closure still
-- gated by the DB trigger (installed + QC approved).
-- ----------------------------------------------------------------------------
drop policy if exists mp_insert on missing_parts;
create policy mp_insert on missing_parts
  for insert with check (has_role('admin', 'production', 'warehouse'));

drop policy if exists mp_update on missing_parts;
create policy mp_update on missing_parts
  for update using (has_role('admin', 'production', 'warehouse', 'purchasing', 'quality'))
  with check (has_role('admin', 'production', 'warehouse', 'purchasing', 'quality'));

drop policy if exists mp_delete on missing_parts;
create policy mp_delete on missing_parts
  for delete using (has_role('admin'));

drop policy if exists mp_comments_write on missing_part_comments;
create policy mp_comments_write on missing_part_comments
  for insert with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- stock_movements: inserts via RPC (warehouse/admin); ledger is append-only.
-- ----------------------------------------------------------------------------
drop policy if exists sm_insert on stock_movements;
create policy sm_insert on stock_movements
  for insert with check (has_role('admin', 'warehouse', 'production'));

-- ----------------------------------------------------------------------------
-- qc_inspections / defects: quality + admin only.
-- ----------------------------------------------------------------------------
drop policy if exists qc_insert on qc_inspections;
create policy qc_insert on qc_inspections
  for insert with check (has_role('admin', 'quality'));

drop policy if exists qc_defects_write on qc_defects;
create policy qc_defects_write on qc_defects
  for all using (has_role('admin', 'quality'))
  with check (has_role('admin', 'quality'));

-- ----------------------------------------------------------------------------
-- attachments: any authenticated user can attach.
-- ----------------------------------------------------------------------------
drop policy if exists attachments_write on attachments;
create policy attachments_write on attachments
  for insert with check (auth.uid() is not null);

-- =============================================================================
-- RPCs for multi-step (transaction-like) operations.
-- All are SECURITY DEFINER with an explicit role check so the critical logic
-- lives server-side and runs atomically.
-- =============================================================================

-- Generate missing-part records for a vehicle by comparing its model BOM
-- against available stock in a warehouse. Returns the number of shortages found.
create or replace function generate_missing_parts_from_bom(
  p_vehicle_id   uuid,
  p_warehouse_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model uuid;
  rec     record;
  avail   numeric(14,3);
  short   numeric(14,3);
  created integer := 0;
begin
  if not has_role('admin', 'production', 'warehouse') then
    raise exception 'Not authorized to generate missing parts.' using errcode = '42501';
  end if;

  select model_id into v_model from vehicles where id = p_vehicle_id;
  if v_model is null then
    raise exception 'Vehicle % not found.', p_vehicle_id;
  end if;

  for rec in
    select b.item_id, b.required_qty, i.name as item_name
    from bom_lines b join items i on i.id = b.item_id
    where b.model_id = v_model and b.is_active
  loop
    select coalesce(qty_on_hand - qty_reserved, 0) into avail
    from inventory_stock
    where item_id = rec.item_id and warehouse_id = p_warehouse_id;

    avail := coalesce(avail, 0);
    short := rec.required_qty - avail;

    if short > 0 then
      -- Only create if no open shortage already exists for this item+vehicle.
      if not exists (
        select 1 from missing_parts
        where vehicle_id = p_vehicle_id and item_id = rec.item_id
          and status not in ('closed', 'cancelled')
      ) then
        insert into missing_parts (vehicle_id, item_id, part_description, required_qty,
                                   reason, department, status)
        values (p_vehicle_id, rec.item_id, rec.item_name, short,
                'stock_shortage', 'warehouse', 'open');
        created := created + 1;
      end if;
    end if;
  end loop;

  return created;
end;
$$;

-- Issue a part from a warehouse to a vehicle: writes a stock movement, lowers
-- on-hand, and advances the missing part to 'issued_to_production'. Atomic.
create or replace function issue_part_to_vehicle(
  p_missing_part_id uuid,
  p_warehouse_id    uuid,
  p_quantity        numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp record;
begin
  if not has_role('admin', 'warehouse', 'production') then
    raise exception 'Not authorized to issue parts.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Issue quantity must be positive.';
  end if;

  select * into mp from missing_parts where id = p_missing_part_id for update;
  if mp.id is null then
    raise exception 'Missing part % not found.', p_missing_part_id;
  end if;
  if mp.item_id is null then
    raise exception 'Missing part % is not linked to an inventory item.', p_missing_part_id;
  end if;

  -- Decrement on-hand (and release any matching reservation). Negative-stock
  -- guard runs inside inventory_stock triggers.
  update inventory_stock
    set qty_on_hand  = qty_on_hand - p_quantity,
        qty_reserved = greatest(qty_reserved - p_quantity, 0)
  where item_id = mp.item_id and warehouse_id = p_warehouse_id;

  if not found then
    raise exception 'No stock record for item % in warehouse %.', mp.item_id, p_warehouse_id;
  end if;

  insert into stock_movements (item_id, warehouse_id, movement_type, quantity,
                               vehicle_id, missing_part_id, reference)
  values (mp.item_id, p_warehouse_id, 'issue', p_quantity,
          mp.vehicle_id, mp.id, 'issue_part_to_vehicle');

  update missing_parts
    set status = 'issued_to_production'
  where id = p_missing_part_id;
end;
$$;

-- Record installation of a quantity on a missing part. Advances to 'installed'
-- (or 'qc_pending') once fully installed. Does NOT close it (QC must approve).
create or replace function install_part(
  p_missing_part_id uuid,
  p_quantity        numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mp record;
  new_installed numeric(14,3);
begin
  if not has_role('admin', 'production') then
    raise exception 'Not authorized to install parts.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Install quantity must be positive.';
  end if;

  select * into mp from missing_parts where id = p_missing_part_id for update;
  if mp.id is null then
    raise exception 'Missing part % not found.', p_missing_part_id;
  end if;

  new_installed := mp.installed_qty + p_quantity;
  if new_installed > mp.required_qty then
    raise exception 'Installed (%) would exceed required (%).', new_installed, mp.required_qty;
  end if;

  update missing_parts
    set installed_qty = new_installed,
        status = case when new_installed >= mp.required_qty then 'qc_pending' else 'installed' end
  where id = p_missing_part_id;
end;
$$;

-- Record a QC inspection (the after-insert trigger applies pass/fail logic).
create or replace function record_qc_inspection(
  p_vehicle_id      uuid,
  p_result          qc_result,
  p_missing_part_id uuid default null,
  p_notes           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not has_role('admin', 'quality') then
    raise exception 'Not authorized to record QC.' using errcode = '42501';
  end if;

  insert into qc_inspections (vehicle_id, missing_part_id, inspector_id, result, notes)
  values (p_vehicle_id, p_missing_part_id, auth.uid(), p_result, p_notes)
  returning id into new_id;

  -- If QC passed and the part is fully installed, auto-close it.
  if p_result = 'pass' and p_missing_part_id is not null then
    update missing_parts
      set status = 'closed'
    where id = p_missing_part_id
      and installed_qty >= required_qty
      and qc_approved;     -- set true by the QC trigger
  end if;

  return new_id;
end;
$$;

-- Final release: mark a vehicle ready for delivery. The vehicle trigger blocks
-- this unless all parts are closed, QC passed, and final approval is present.
create or replace function release_vehicle_for_delivery(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role('admin', 'production') then
    raise exception 'Not authorized to release vehicles.' using errcode = '42501';
  end if;

  update vehicles
    set final_approved_by = auth.uid(),
        final_approved_at  = now(),
        completion_status  = 'complete',
        production_status  = 'completed',
        delivery_status    = 'ready'
  where id = p_vehicle_id;
end;
$$;
