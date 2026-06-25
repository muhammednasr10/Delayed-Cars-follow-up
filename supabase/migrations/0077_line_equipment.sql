-- Line equipment registry (rivet guns, torque wrenches, other) + transaction log.

create table if not exists public.line_equipment (
  id                    uuid primary key default gen_random_uuid(),
  equipment_code        text not null,
  equipment_type        text not null
    check (equipment_type in ('rivet_gun', 'torque_wrench', 'other')),
  name                  text,
  model                 text,
  serial_number         text,
  location              text,
  status                text not null default 'active'
    check (status in ('active', 'calibration_due', 'out_of_service', 'scrapped')),
  last_calibration_at   timestamptz,
  next_calibration_due  date,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint line_equipment_code_unique unique (equipment_code)
);

create index if not exists idx_line_equipment_type on public.line_equipment (equipment_type);
create index if not exists idx_line_equipment_status on public.line_equipment (status);
create index if not exists idx_line_equipment_code on public.line_equipment (equipment_code);

create table if not exists public.line_equipment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  equipment_id          uuid not null references public.line_equipment (id) on delete restrict,
  transaction_type      text not null check (transaction_type in ('calibration', 'scrap')),
  occurred_at           timestamptz not null default now(),
  calibration_result    text check (calibration_result in ('pass', 'fail')),
  next_calibration_due  date,
  scrap_reason          text,
  scrap_qty             integer check (scrap_qty is null or scrap_qty >= 0),
  notes                 text,
  created_at            timestamptz not null default now(),
  constraint line_equipment_tx_calibration_fields check (
    transaction_type <> 'calibration'
    or (calibration_result is not null)
  ),
  constraint line_equipment_tx_scrap_fields check (
    transaction_type <> 'scrap'
    or (scrap_reason is not null and trim(scrap_reason) <> '')
  )
);

create index if not exists idx_line_equipment_tx_equipment on public.line_equipment_transactions (equipment_id);
create index if not exists idx_line_equipment_tx_type on public.line_equipment_transactions (transaction_type);
create index if not exists idx_line_equipment_tx_occurred on public.line_equipment_transactions (occurred_at desc);

drop trigger if exists trg_line_equipment_updated_at on public.line_equipment;
create trigger trg_line_equipment_updated_at
  before update on public.line_equipment
  for each row execute function set_updated_at();

alter table public.line_equipment enable row level security;
alter table public.line_equipment_transactions enable row level security;

drop policy if exists line_equipment_select on public.line_equipment;
create policy line_equipment_select on public.line_equipment
  for select to authenticated using (true);

drop policy if exists line_equipment_write on public.line_equipment;
create policy line_equipment_write on public.line_equipment
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

drop policy if exists line_equipment_tx_select on public.line_equipment_transactions;
create policy line_equipment_tx_select on public.line_equipment_transactions
  for select to authenticated using (true);

drop policy if exists line_equipment_tx_write on public.line_equipment_transactions;
create policy line_equipment_tx_write on public.line_equipment_transactions
  for all to authenticated
  using (has_role('admin', 'production'))
  with check (has_role('admin', 'production'));

grant select, insert, update, delete on public.line_equipment to authenticated;
grant select, insert, update, delete on public.line_equipment_transactions to authenticated;
