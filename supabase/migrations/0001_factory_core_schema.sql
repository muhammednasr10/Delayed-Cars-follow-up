-- =============================================================================
-- 0001_factory_core_schema.sql
-- Normalized factory domain for the Delayed-Cars / missing-parts ERP module.
--
-- This migration is ADDITIVE. It does not touch the legacy `delayed_cars`
-- table, so the existing React app keeps working while the real model is built
-- alongside it. Business-critical rules (unique/immutable VIN, no closing a
-- missing part before it is installed + QC approved, no completing/delivering a
-- vehicle with open shortages, no negative stock) are enforced here in the
-- database via constraints and triggers, NOT in the frontend.
--
-- Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";          -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums (created idempotently so the migration can be re-run safely)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum
      ('admin', 'production', 'warehouse', 'purchasing', 'quality', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'production_order_status') then
    create type production_order_status as enum
      ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_production_status') then
    create type vehicle_production_status as enum
      ('planned', 'on_line', 'off_line_incomplete', 'rework', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_completion_status') then
    create type vehicle_completion_status as enum ('incomplete', 'complete');
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_qc_status') then
    create type vehicle_qc_status as enum ('pending', 'passed', 'failed', 'not_required');
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_delivery_status') then
    create type vehicle_delivery_status as enum ('blocked', 'ready', 'delivered');
  end if;

  if not exists (select 1 from pg_type where typname = 'missing_part_reason') then
    create type missing_part_reason as enum
      ('stock_shortage', 'supplier_delay', 'damaged_part', 'qc_rejection',
       'wrong_part', 'production_mistake', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'responsible_department') then
    create type responsible_department as enum
      ('warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management');
  end if;

  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type priority_level as enum ('low', 'normal', 'high', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'missing_part_status') then
    create type missing_part_status as enum
      ('open', 'waiting_purchase', 'available_in_stock', 'issued_to_production',
       'installed', 'qc_pending', 'closed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'stock_movement_type') then
    create type stock_movement_type as enum
      ('receipt', 'issue', 'reservation', 'reservation_release', 'adjustment', 'return');
  end if;

  if not exists (select 1 from pg_type where typname = 'qc_result') then
    create type qc_result as enum ('pass', 'fail');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Shared helper: updated_at maintenance + audit fields
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  -- updated_by is stamped from the authenticated user when available.
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

create or replace function set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

-- =============================================================================
-- profiles  (role anchor for RLS; one row per auth user)
-- =============================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role   not null default 'viewer',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Role lookup used throughout RLS. SECURITY DEFINER so policies can read the
-- caller's role without recursive RLS on `profiles`.
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid() and is_active),
    'viewer'::user_role
  );
$$;

create or replace function has_role(variadic roles user_role[])
returns boolean
language sql
stable
as $$
  select current_user_role() = any(roles);
$$;

-- =============================================================================
-- production_orders
-- =============================================================================
create table if not exists production_orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null,
  model_id      uuid references vehicle_models (id),
  planned_qty   integer not null default 1 check (planned_qty > 0),
  status        production_order_status not null default 'planned',
  planned_start date,
  planned_end   date,
  notes         text,
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint production_orders_order_number_key unique (order_number)
);

drop trigger if exists trg_po_created_by on production_orders;
create trigger trg_po_created_by
  before insert on production_orders
  for each row execute function set_created_by();

drop trigger if exists trg_po_updated_at on production_orders;
create trigger trg_po_updated_at
  before update on production_orders
  for each row execute function set_updated_at();

create index if not exists idx_po_status on production_orders (status);
create index if not exists idx_po_model on production_orders (model_id);

-- =============================================================================
-- vehicles  (the real, first-class vehicle entity)
-- =============================================================================
create table if not exists vehicles (
  id                  uuid primary key default gen_random_uuid(),
  vin                 text not null,
  production_order_id uuid not null references production_orders (id),
  model_id            uuid not null references vehicle_models (id),
  vehicle_color_id    uuid references vehicle_colors (id),
  current_station_id  uuid references stations (id),
  production_status   vehicle_production_status not null default 'planned',
  completion_status   vehicle_completion_status not null default 'incomplete',
  qc_status           vehicle_qc_status         not null default 'pending',
  delivery_status     vehicle_delivery_status   not null default 'blocked',
  delivery_blocked    boolean not null default true,
  open_missing_count  integer not null default 0,
  completion_percent  numeric(5,2) not null default 0,
  final_approved_by   uuid references auth.users (id),
  final_approved_at   timestamptz,
  delivered_at        timestamptz,
  notes               text,
  is_deleted          boolean not null default false,  -- soft delete only
  created_by          uuid references auth.users (id),
  updated_by          uuid references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- VIN must be globally unique among non-deleted vehicles.
  constraint vehicles_vin_key unique (vin)
);

drop trigger if exists trg_vehicle_created_by on vehicles;
create trigger trg_vehicle_created_by
  before insert on vehicles
  for each row execute function set_created_by();

drop trigger if exists trg_vehicle_updated_at on vehicles;
create trigger trg_vehicle_updated_at
  before update on vehicles
  for each row execute function set_updated_at();

create index if not exists idx_vehicles_po on vehicles (production_order_id);
create index if not exists idx_vehicles_model on vehicles (model_id);
create index if not exists idx_vehicles_delivery on vehicles (delivery_status);
create index if not exists idx_vehicles_completion on vehicles (completion_status);
create index if not exists idx_vehicles_qc on vehicles (qc_status);

-- VIN is immutable after creation (audited entity identity).
create or replace function enforce_vin_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.vin is distinct from old.vin and not has_role('admin') then
    raise exception 'VIN is immutable and cannot be changed (vehicle %).', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicle_vin_immutable on vehicles;
create trigger trg_vehicle_vin_immutable
  before update on vehicles
  for each row execute function enforce_vin_immutable();

-- =============================================================================
-- items  (inventory part master)
-- =============================================================================
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null,
  name        text not null,
  description text,
  unit        text not null default 'pcs',
  supplier    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint items_sku_key unique (sku)
);

drop trigger if exists trg_items_updated_at on items;
create trigger trg_items_updated_at
  before update on items
  for each row execute function set_updated_at();

create index if not exists idx_items_supplier on items (supplier);

-- =============================================================================
-- warehouses
-- =============================================================================
create table if not exists warehouses (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null,
  name                 text not null,
  allow_negative_stock boolean not null default false,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint warehouses_code_key unique (code)
);

drop trigger if exists trg_warehouses_updated_at on warehouses;
create trigger trg_warehouses_updated_at
  before update on warehouses
  for each row execute function set_updated_at();

-- =============================================================================
-- inventory_stock  (qty on hand / reserved per item x warehouse)
-- =============================================================================
create table if not exists inventory_stock (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references items (id),
  warehouse_id  uuid not null references warehouses (id),
  qty_on_hand   numeric(14,3) not null default 0,
  qty_reserved  numeric(14,3) not null default 0,
  updated_at    timestamptz not null default now(),
  constraint inventory_stock_item_wh_key unique (item_id, warehouse_id)
);

drop trigger if exists trg_stock_updated_at on inventory_stock;
create trigger trg_stock_updated_at
  before update on inventory_stock
  for each row execute function set_updated_at();

create index if not exists idx_stock_item on inventory_stock (item_id);

-- Prevent negative stock unless the warehouse explicitly allows it.
create or replace function enforce_non_negative_stock()
returns trigger
language plpgsql
as $$
declare
  allow_neg boolean;
begin
  select allow_negative_stock into allow_neg from warehouses where id = new.warehouse_id;

  if not coalesce(allow_neg, false) then
    if new.qty_on_hand < 0 then
      raise exception 'Negative on-hand stock not allowed for item % in warehouse %.',
        new.item_id, new.warehouse_id using errcode = 'check_violation';
    end if;
  end if;

  if new.qty_reserved < 0 then
    raise exception 'Reserved quantity cannot be negative.' using errcode = 'check_violation';
  end if;

  if new.qty_reserved > new.qty_on_hand and not coalesce(allow_neg, false) then
    raise exception 'Reserved quantity (%) cannot exceed on-hand (%).',
      new.qty_reserved, new.qty_on_hand using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stock_non_negative on inventory_stock;
create trigger trg_stock_non_negative
  before insert or update on inventory_stock
  for each row execute function enforce_non_negative_stock();

-- =============================================================================
-- bom_lines  (model -> item -> required qty)
-- =============================================================================
create table if not exists bom_lines (
  id            uuid primary key default gen_random_uuid(),
  model_id      uuid not null references vehicle_models (id) on delete cascade,
  item_id       uuid not null references items (id),
  required_qty  numeric(14,3) not null default 1 check (required_qty > 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint bom_lines_model_item_key unique (model_id, item_id)
);

drop trigger if exists trg_bom_updated_at on bom_lines;
create trigger trg_bom_updated_at
  before update on bom_lines
  for each row execute function set_updated_at();

create index if not exists idx_bom_model on bom_lines (model_id);

-- =============================================================================
-- missing_parts  (a shortage on a specific vehicle, linked to an inventory item)
-- =============================================================================
create table if not exists missing_parts (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references vehicles (id),
  item_id             uuid references items (id),
  part_description    text not null,             -- human label; kept even if item_id is null
  required_qty        numeric(14,3) not null default 1 check (required_qty > 0),
  installed_qty       numeric(14,3) not null default 0 check (installed_qty >= 0),
  remaining_qty       numeric(14,3) generated always as (required_qty - installed_qty) stored,
  reason              missing_part_reason     not null default 'stock_shortage',
  department          responsible_department  not null default 'warehouse',
  priority            priority_level          not null default 'normal',
  status              missing_part_status     not null default 'open',
  qc_approved         boolean not null default false,
  is_dr_item          boolean not null default false,
  assigned_to         uuid references auth.users (id),
  notes               text,
  closed_at           timestamptz,
  created_by          uuid references auth.users (id),
  updated_by          uuid references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_mp_created_by on missing_parts;
create trigger trg_mp_created_by
  before insert on missing_parts
  for each row execute function set_created_by();

drop trigger if exists trg_mp_updated_at on missing_parts;
create trigger trg_mp_updated_at
  before update on missing_parts
  for each row execute function set_updated_at();

create index if not exists idx_mp_vehicle on missing_parts (vehicle_id);
create index if not exists idx_mp_item on missing_parts (item_id);
create index if not exists idx_mp_status on missing_parts (status);
create index if not exists idx_mp_department on missing_parts (department);
create index if not exists idx_mp_priority on missing_parts (priority);
-- Fast "open shortages per vehicle" lookups for the delivery-block guard.
create index if not exists idx_mp_open
  on missing_parts (vehicle_id)
  where status not in ('closed', 'cancelled');

-- A missing part cannot be CLOSED until it is fully installed AND QC approved.
create or replace function enforce_missing_part_close()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' then
    if new.installed_qty < new.required_qty then
      raise exception
        'Cannot close missing part %: installed (%) < required (%).',
        new.id, new.installed_qty, new.required_qty
        using errcode = 'check_violation';
    end if;
    if not new.qc_approved then
      raise exception
        'Cannot close missing part %: QC approval is required first.', new.id
        using errcode = 'check_violation';
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mp_close_guard on missing_parts;
create trigger trg_mp_close_guard
  before insert or update on missing_parts
  for each row execute function enforce_missing_part_close();

-- =============================================================================
-- stock_movements  (append-only ledger of physical/logical stock changes)
-- =============================================================================
create table if not exists stock_movements (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references items (id),
  warehouse_id        uuid not null references warehouses (id),
  movement_type       stock_movement_type not null,
  quantity            numeric(14,3) not null check (quantity > 0),
  vehicle_id          uuid references vehicles (id),
  production_order_id uuid references production_orders (id),
  missing_part_id     uuid references missing_parts (id),
  reference           text,
  notes               text,
  created_by          uuid references auth.users (id),
  created_at          timestamptz not null default now()
);

drop trigger if exists trg_sm_created_by on stock_movements;
create trigger trg_sm_created_by
  before insert on stock_movements
  for each row execute function set_created_by();

create index if not exists idx_sm_item on stock_movements (item_id);
create index if not exists idx_sm_vehicle on stock_movements (vehicle_id);
create index if not exists idx_sm_po on stock_movements (production_order_id);
create index if not exists idx_sm_mp on stock_movements (missing_part_id);
create index if not exists idx_sm_created_at on stock_movements (created_at);

-- Stock movements are an immutable ledger: no UPDATE/DELETE (reverse with a new row).
create or replace function block_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_movements is append-only; create a reversing entry instead.'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists trg_sm_no_update on stock_movements;
create trigger trg_sm_no_update
  before update or delete on stock_movements
  for each row execute function block_ledger_mutation();

-- =============================================================================
-- qc_inspections  (+ defects)
-- =============================================================================
create table if not exists qc_inspections (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references vehicles (id),
  missing_part_id uuid references missing_parts (id),
  inspector_id    uuid references auth.users (id),
  result          qc_result not null,
  inspected_at    timestamptz not null default now(),
  notes           text,
  created_by      uuid references auth.users (id),
  created_at      timestamptz not null default now()
);

drop trigger if exists trg_qc_created_by on qc_inspections;
create trigger trg_qc_created_by
  before insert on qc_inspections
  for each row execute function set_created_by();

create index if not exists idx_qc_vehicle on qc_inspections (vehicle_id);
create index if not exists idx_qc_mp on qc_inspections (missing_part_id);

create table if not exists qc_defects (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references qc_inspections (id) on delete cascade,
  description   text not null,
  severity      priority_level not null default 'normal',
  created_at    timestamptz not null default now()
);

create index if not exists idx_qc_defects_inspection on qc_defects (inspection_id);

-- A QC result drives the linked missing part: pass -> qc_approved, fail -> reopen.
create or replace function apply_qc_result()
returns trigger
language plpgsql
as $$
begin
  if new.missing_part_id is not null then
    if new.result = 'pass' then
      update missing_parts
        set qc_approved = true,
            status = case when status = 'qc_pending' then 'qc_pending' else status end
      where id = new.missing_part_id;
    else
      -- QC rejected the installed part: reopen it for rework.
      update missing_parts
        set qc_approved = false,
            status = 'issued_to_production'
      where id = new.missing_part_id
        and status <> 'cancelled';
    end if;
  end if;

  -- Roll the most recent QC outcome up to the vehicle.
  update vehicles
    set qc_status = case when new.result = 'pass' then 'passed' else 'failed' end
  where id = new.vehicle_id;

  return new;
end;
$$;

drop trigger if exists trg_qc_apply on qc_inspections;
create trigger trg_qc_apply
  after insert on qc_inspections
  for each row execute function apply_qc_result();

-- =============================================================================
-- missing_part_comments  (follow-up thread)
-- =============================================================================
create table if not exists missing_part_comments (
  id              uuid primary key default gen_random_uuid(),
  missing_part_id uuid not null references missing_parts (id) on delete cascade,
  body            text not null,
  created_by      uuid references auth.users (id),
  created_at      timestamptz not null default now()
);

drop trigger if exists trg_mpc_created_by on missing_part_comments;
create trigger trg_mpc_created_by
  before insert on missing_part_comments
  for each row execute function set_created_by();

create index if not exists idx_mpc_mp on missing_part_comments (missing_part_id);

-- =============================================================================
-- attachments  (polymorphic file references)
-- =============================================================================
create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in
                ('vehicle', 'missing_part', 'qc_inspection', 'production_order')),
  entity_id   uuid not null,
  file_path   text not null,
  file_name   text,
  mime_type   text,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_attachments_entity on attachments (entity_type, entity_id);

-- =============================================================================
-- audit_log  (append-only trail for sensitive operations)
-- =============================================================================
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      uuid,
  action      text not null,                  -- INSERT | UPDATE | DELETE | custom
  actor_id    uuid references auth.users (id),
  actor_role  user_role,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_table_row on audit_log (table_name, row_id);
create index if not exists idx_audit_created_at on audit_log (created_at);

create or replace function write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  begin
    rid := coalesce((case when tg_op = 'DELETE' then old.id else new.id end));
  exception when others then
    rid := null;
  end;

  insert into audit_log (table_name, row_id, action, actor_id, actor_role, old_data, new_data)
  values (
    tg_table_name,
    rid,
    tg_op,
    auth.uid(),
    current_user_role(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Audit the sensitive tables.
drop trigger if exists trg_audit_vehicles on vehicles;
create trigger trg_audit_vehicles
  after insert or update or delete on vehicles
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_missing_parts on missing_parts;
create trigger trg_audit_missing_parts
  after insert or update or delete on missing_parts
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_qc on qc_inspections;
create trigger trg_audit_qc
  after insert or update or delete on qc_inspections
  for each row execute function write_audit_log();

-- =============================================================================
-- Vehicle rollups + delivery-block guard
-- =============================================================================
-- Recompute open-missing count, completion %, and the delivery block flag for a
-- vehicle whenever its missing parts change.
create or replace function recalc_vehicle_status(p_vehicle_id uuid)
returns void
language plpgsql
as $$
declare
  total_parts   integer;
  closed_parts  integer;
  open_parts    integer;
  pct           numeric(5,2);
begin
  select count(*),
         count(*) filter (where status = 'closed'),
         count(*) filter (where status not in ('closed', 'cancelled'))
    into total_parts, closed_parts, open_parts
  from missing_parts
  where vehicle_id = p_vehicle_id;

  if total_parts = 0 then
    pct := 100;
  else
    pct := round((closed_parts::numeric / total_parts::numeric) * 100, 2);
  end if;

  update vehicles
    set open_missing_count = open_parts,
        completion_percent = pct,
        -- A vehicle is delivery-blocked while any shortage is open.
        delivery_blocked = (open_parts > 0),
        delivery_status = case
          when open_parts > 0 then 'blocked'::vehicle_delivery_status
          else delivery_status
        end
  where id = p_vehicle_id;
end;
$$;

create or replace function trg_recalc_vehicle_from_mp()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform recalc_vehicle_status(old.vehicle_id);
    return old;
  else
    perform recalc_vehicle_status(new.vehicle_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_mp_recalc_vehicle on missing_parts;
create trigger trg_mp_recalc_vehicle
  after insert or update or delete on missing_parts
  for each row execute function trg_recalc_vehicle_from_mp();

-- Hard guard: a vehicle cannot be marked complete / ready / delivered while it
-- has open shortages or failed QC. This is the single most important rule and
-- it is enforced here so it cannot be bypassed from the frontend.
create or replace function enforce_vehicle_release_rules()
returns trigger
language plpgsql
as $$
declare
  open_parts integer;
begin
  select count(*) into open_parts
  from missing_parts
  where vehicle_id = new.id
    and status not in ('closed', 'cancelled');

  if new.completion_status = 'complete' and open_parts > 0 then
    raise exception 'Vehicle % cannot be completed: % open missing part(s).',
      new.vin, open_parts using errcode = 'check_violation';
  end if;

  if new.delivery_status in ('ready', 'delivered') then
    if open_parts > 0 then
      raise exception 'Vehicle % cannot be released for delivery: % open missing part(s).',
        new.vin, open_parts using errcode = 'check_violation';
    end if;
    if new.qc_status = 'failed' then
      raise exception 'Vehicle % cannot be released for delivery: QC failed.', new.vin
        using errcode = 'check_violation';
    end if;
    if new.qc_status = 'pending' then
      raise exception 'Vehicle % cannot be released for delivery: QC still pending.', new.vin
        using errcode = 'check_violation';
    end if;
    if new.delivery_status = 'ready' and new.final_approved_by is null then
      raise exception 'Vehicle % cannot be marked ready without final approval.', new.vin
        using errcode = 'check_violation';
    end if;
  end if;

  if new.delivery_status = 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vehicle_release_rules on vehicles;
create trigger trg_vehicle_release_rules
  before update on vehicles
  for each row execute function enforce_vehicle_release_rules();

-- Block hard deletes of vehicles that carry history; force soft delete instead.
create or replace function enforce_vehicle_soft_delete()
returns trigger
language plpgsql
as $$
declare
  has_history boolean;
begin
  select exists (
      select 1 from missing_parts   where vehicle_id = old.id
      union all
      select 1 from qc_inspections  where vehicle_id = old.id
      union all
      select 1 from stock_movements where vehicle_id = old.id
    ) into has_history;

  if has_history then
    raise exception
      'Vehicle % has missing parts / QC / stock history and cannot be deleted. Use is_deleted instead.',
      old.vin using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_vehicle_no_delete on vehicles;
create trigger trg_vehicle_no_delete
  before delete on vehicles
  for each row execute function enforce_vehicle_soft_delete();
