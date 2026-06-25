-- Feeding plans (خطة التغذية) separate from actual line feeding.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'feeding_plan_status') then
    create type feeding_plan_status as enum ('planned', 'executed', 'cancelled');
  end if;
end$$;

create table if not exists warehouse_feeding_plans (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_model_id    uuid not null references vehicle_models (id),
  warehouse_id        uuid not null references warehouses (id),
  station_id          uuid references stations (id) on delete set null,
  planned_date        date not null default current_date,
  status              feeding_plan_status not null default 'planned',
  notes               text,
  executed_feeding_id uuid references warehouse_feeding (id) on delete set null,
  created_by          uuid references profiles (id),
  updated_by          uuid references profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_wh_feeding_plans_date on warehouse_feeding_plans (planned_date desc);
create index if not exists idx_wh_feeding_plans_status on warehouse_feeding_plans (status);

create table if not exists warehouse_feeding_plan_lines (
  id       uuid primary key default gen_random_uuid(),
  plan_id  uuid not null references warehouse_feeding_plans (id) on delete cascade,
  part_id  uuid not null references parts (id),
  quantity numeric(14, 3) not null check (quantity > 0),
  notes    text
);

create index if not exists idx_wh_feeding_plan_lines_plan on warehouse_feeding_plan_lines (plan_id);

drop trigger if exists trg_warehouse_feeding_plans_updated_at on warehouse_feeding_plans;
create trigger trg_warehouse_feeding_plans_updated_at
  before update on warehouse_feeding_plans
  for each row execute function set_updated_at();

drop trigger if exists trg_warehouse_feeding_plans_stamp on warehouse_feeding_plans;
create trigger trg_warehouse_feeding_plans_stamp
  before insert or update on warehouse_feeding_plans
  for each row execute function employees_stamp_actor();

-- ---------------------------------------------------------------------------
create or replace function create_warehouse_feeding_plan(
  p_vehicle_model_id uuid,
  p_warehouse_id uuid,
  p_station_id uuid default null,
  p_planned_date date default current_date,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_line jsonb;
  v_part_id uuid;
  v_qty numeric(14, 3);
begin
  if not (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  ) then
    raise exception 'Not authorized.';
  end if;

  if jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one plan line is required.';
  end if;

  insert into warehouse_feeding_plans (vehicle_model_id, warehouse_id, station_id, planned_date, notes)
  values (p_vehicle_model_id, p_warehouse_id, p_station_id, coalesce(p_planned_date, current_date), nullif(trim(p_notes), ''))
  returning id into v_plan_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_part_id := (v_line->>'part_id')::uuid;
    v_qty := (v_line->>'quantity')::numeric(14, 3);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for part %.', v_part_id;
    end if;
    insert into warehouse_feeding_plan_lines (plan_id, part_id, quantity, notes)
    values (v_plan_id, v_part_id, v_qty, nullif(trim(v_line->>'notes'), ''));
  end loop;

  return v_plan_id;
end;
$$;

create or replace function execute_warehouse_feeding_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan warehouse_feeding_plans%rowtype;
  v_lines jsonb;
  v_feeding_id uuid;
begin
  if not (
    has_role('admin', 'warehouse')
    or has_permission('inventory', 'manage')
    or has_permission('inventory', 'update')
    or has_permission('inventory', 'create')
  ) then
    raise exception 'Not authorized.';
  end if;

  select * into v_plan from warehouse_feeding_plans where id = p_plan_id;
  if not found then
    raise exception 'Feeding plan % not found.', p_plan_id;
  end if;
  if v_plan.status <> 'planned' then
    raise exception 'Plan is not in planned status.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'part_id', pl.part_id,
    'quantity', pl.quantity,
    'notes', pl.notes
  )), '[]'::jsonb)
  into v_lines
  from warehouse_feeding_plan_lines pl
  where pl.plan_id = p_plan_id;

  v_feeding_id := record_warehouse_feeding(
    v_plan.vehicle_model_id,
    v_plan.warehouse_id,
    v_plan.station_id,
    coalesce(nullif(trim(v_plan.notes), ''), 'From feeding plan'),
    v_lines
  );

  update warehouse_feeding_plans
  set status = 'executed', executed_feeding_id = v_feeding_id
  where id = p_plan_id;

  return v_feeding_id;
end;
$$;

grant execute on function create_warehouse_feeding_plan(uuid, uuid, uuid, date, text, jsonb) to authenticated;
grant execute on function execute_warehouse_feeding_plan(uuid) to authenticated;

alter table warehouse_feeding_plans enable row level security;
alter table warehouse_feeding_plan_lines enable row level security;

drop policy if exists warehouse_feeding_plans_select on warehouse_feeding_plans;
create policy warehouse_feeding_plans_select on warehouse_feeding_plans
  for select to authenticated using (true);

drop policy if exists warehouse_feeding_plans_write on warehouse_feeding_plans;
create policy warehouse_feeding_plans_write on warehouse_feeding_plans
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

drop policy if exists warehouse_feeding_plan_lines_select on warehouse_feeding_plan_lines;
create policy warehouse_feeding_plan_lines_select on warehouse_feeding_plan_lines
  for select to authenticated using (true);

drop policy if exists warehouse_feeding_plan_lines_write on warehouse_feeding_plan_lines;
create policy warehouse_feeding_plan_lines_write on warehouse_feeding_plan_lines
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
